import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable, PassThrough } from 'stream';
import sharp from 'sharp';
import cuid from 'cuid';
import { UploadMeter } from './upload-meter.server';

const s3Client = new S3({
  endpoint: `https://${process.env.MF_SPACES_ENDPOINT}`,
  region: process.env.MF_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.MF_SPACES_API_KEY,
    secretAccessKey: process.env.MF_SPACES_API_SECRET,
  },
});

type S3UploadParams = {
  key: string;
  mime: string;
};

function s3Upload({ key, mime }: S3UploadParams) {
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

type StreamUploadResult = {
  uploadId: string;
  files: Array<{ size: number; key: string; url: string }>;
};

export async function uploadStreamToS3(file: Readable) {
  return new Promise<StreamUploadResult>((resolve, reject) => {
    let id = cuid();
    let meter = new UploadMeter(5_000_000);
    let meta = sharp().metadata((_err, meta) => {
      meta &&
        console.log(`meta [${id}] format: ${meta.format} | size: ${meta.size}`);
    });

    // Initialize root transform writestream
    let transform = sharp();

    // Initialize 600px transform substream
    let resize600 = transform.clone().resize(600).webp();
    let upload600Key = getS3Key(`${id}-600.webp`);
    let upload600Url = getS3KeyUrl(upload600Key);
    let upload600 = s3Upload({
      key: upload600Key,
      mime: 'image/webp',
    });

    // Initialize 1200px transform substream
    let resize1200 = transform.clone().resize(1200).webp();
    let upload1200Key = getS3Key(`${id}-1200.webp`);
    let upload1200Url = getS3KeyUrl(upload1200Key);
    let upload1200 = s3Upload({
      key: upload1200Key,
      mime: 'image/webp',
    });

    // Handle abort flow globally
    function abort(reason: string) {
      file.unpipe();
      meter.unpipe();
      meta.unpipe();

      resize600.unpipe();
      upload600.upload.abort();
      resize1200.unpipe();
      upload1200.upload.abort();

      transform.unpipe();
      transform.removeAllListeners();

      meta.removeAllListeners();
      meter.removeAllListeners();

      file.resume();
      reject(reason);
    }

    // Register event handlers
    meter.on('limit', () => {
      console.log('meter [ERROR]: File size limit exceeded');
      abort('LIMIT_REACHED');
    });

    meta.on('error', (err) => {
      console.log('meta [ERROR]: ', err);
      abort('INVALID_FILE');
    });

    transform.on('error', (err) => {
      console.log('transform [ERROR]: ', err);
      abort('IMAGE_TRANSFORM_ERROR');
    });

    // Register transform substream uploads
    resize600.pipe(upload600.stream);
    resize1200.pipe(upload1200.stream);

    // Kick off stream handling by piping it into the root transform sstream
    file.pipe(meter).pipe(meta).pipe(transform);

    // Wait for all streams being uploaded to S3
    Promise.all([upload600.upload.done(), upload1200.upload.done()])
      .then(() =>
        resolve({
          uploadId: id,
          files: [
            { size: 600, key: upload600Key, url: upload600Url },
            { size: 1200, key: upload1200Key, url: upload1200Url },
          ],
        })
      )
      .catch((err) => {
        console.log('upload [ERROR]: ', err);
        abort('S3_UPLOAD_ERROR');
      });
  });
}
