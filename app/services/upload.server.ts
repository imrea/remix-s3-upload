import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable, PassThrough, Transform, TransformCallback } from 'stream';
import sharp from 'sharp';
import cuid from 'cuid';
import fs from 'fs';

class Meter extends Transform {
  public bytes = 0;

  constructor(public maxBytes: number) {
    super();
  }

  _transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
    this.bytes += chunk.length;
    if (this.bytes > this.maxBytes) {
      console.log(`bytes: ${this.bytes} | maxBytes: ${this.maxBytes}`);

      this.emit('limit');
    }
    callback(undefined, chunk);
  }
}

const s3Client = new S3({
  endpoint: 'https://fra1.digitaloceanspaces.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MF_SPACES_API_KEY,
    secretAccessKey: process.env.MF_SPACES_API_SECRET,
  },
});

function s3Upload({ key, mime }: any) {
  let stream = new PassThrough();
  let upload = new Upload({
    client: s3Client,
    params: {
      ACL: 'public-read',
      Bucket: process.env.MF_SPACES_BUCKET,
      Key: key,
      ContentType: mime,
      Body: stream,
    },
  });

  return { stream, upload };
}

function getS3Key(filename: string) {
  return `${process.env.MF_SPACES_KEY_PREFIX}/${filename}`;
}

function getS3KeyUrl(key: string) {
  return `https://${process.env.MF_SPACES_BUCKET}.${process.env.MF_SPACES_ENDPOINT}/${key}`;
}

export async function uploadStreamToS3(file: Readable) {
  return new Promise((resolve, reject) => {
    let id = cuid();
    let meter = new Meter(5_000_000);
    // let write = fs.createWriteStream(`${process.cwd()}/uploads/${id}.webp`);
    let meta = sharp().metadata((_err, meta) => {
      meta &&
        console.log(`meta [${id}] format: ${meta.format} | size: ${meta.size}`);
    });

    let imgTransform = sharp();
    let resize600 = imgTransform.clone().resize(600).webp();
    let resize1200 = imgTransform.clone().resize(1200).webp();
    let write600 = fs.createWriteStream(
      `${process.cwd()}/uploads/${id}-600.webp`
    );
    let write1200 = fs.createWriteStream(
      `${process.cwd()}/uploads/${id}-1200.webp`
    );

    function abort(reason: string) {
      file.unpipe();
      meter.unpipe();
      meta.unpipe();

      resize600.unpipe();
      resize1200.unpipe();

      imgTransform.unpipe();
      imgTransform.removeAllListeners();

      meta.removeAllListeners();
      meter.removeAllListeners();

      // write.removeAllListeners();

      fs.rmSync(`${process.cwd()}/uploads/${id}-600.webp`, { recursive: true });
      fs.rmSync(`${process.cwd()}/uploads/${id}-1200.webp`, {
        recursive: true,
      });

      file.resume();
      reject(reason);
    }

    meta.on('error', (err) => {
      console.log(err);
      abort('IVALID_FILE');
    });

    imgTransform.on('error', (err) => {
      console.log(err);
      abort('IMAGE_TRANSFORM_ERROR');
    });

    meter.on('limit', () => abort('LIMIT_REACHED'));

    // file.once(
    //   'readable',
    //   () => file.readableLength === 0 && abort('MISSING_FILE')
    // );

    imgTransform.on('finish', () =>
      resolve({
        key: id,
        success: true,
        error: null,
      })
    );

    resize600.pipe(write600);
    resize1200.pipe(write1200);

    file.pipe(meter).pipe(meta).pipe(imgTransform);
  });
}

// export async function uploadStreamToS3(file: Readable) {
//   let id = cuid();
//   let sharp = Sharp();
//   let meter = new Meter(1000);

//   meter.on('end', () => console.log('meter ended'));
//   file.on('end', () => console.log('file ended'));

//   meter.on('close', () => console.log('meter closed'));
//   file.on('close', () => console.log('file closed'));

//   function initUpload(size: number) {
//     let { stream, upload } = s3Upload({
//       key: getS3Key(`${id}-${size}.webp`),
//       mime: 'image/webp',
//     });
//     sharp.clone().resize(size).webp().pipe(stream);
//     return upload;
//   }

//   let uploads = [initUpload(600), initUpload(1200), initUpload(2400)];

//   // meter.on('resume', () => {
//   //   file.emit('limit');
//   //   return Promise.resolve('Kill it!');
//   // });
//   // file.on('resume', () => console.log('file resumed'));

//   // await pipeline(file, meter, sharp);
//   file.pipe(meter).pipe(sharp);

//   try {
//     await Promise.all(uploads.map((u) => u.done()));
//   } catch (error) {
//     console.log('Promise all threw');
//     return undefined;
//   }

//   return id;
// }

// export async function uploadStreamToS3(file: Readable) {
//   let id = cuid();
//   let meter = new Meter(1000);
//   let sharp = Sharp();
//   let s3_600 = s3Upload({ filename: `${id}-600.webp` });
//   let s3_1200 = s3Upload({ filename: `${id}-1200.webp` });
//   let sharp600 = sharp.clone().resize(600).webp();
//   let sharp1200 = sharp.clone().resize(1200).webp();

//   sharp600.pipe(s3_600.stream);
//   sharp1200.pipe(s3_1200.stream);

//   try {
//     await pipeline(file, meter, sharp);
//     await Promise.all([s3_600.upload.done(), s3_1200.upload.done()]);
//   } catch (error) {
//     console.log('uploadStreamToS3: ', error);
//     sharp600.unpipe();
//     sharp1200.unpipe();
//     sharp.unpipe();
//     meter.unpipe();
//     file.unpipe();
//     return;
//   }

//   return id;
// }
