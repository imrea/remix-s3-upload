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

type ImageStreamUploadResult = {
  uploadId: string;
  files: Array<{ size: number; key: string; url: string }>;
};

type ImageUploadOptions = {
  maxFileSize?: number;
  sizes?: number[];
  format?: 'jpeg' | 'jpg' | 'webp' | 'png';
};

export async function uploadImageStreamToS3(
  file: Readable,
  {
    maxFileSize = 5_000_000,
    sizes = [600, 1200, 2400],
    format = 'webp',
  }: ImageUploadOptions = {}
) {
  return new Promise<ImageStreamUploadResult>((resolve, reject) => {
    let id = cuid();
    let meter = new UploadMeter(maxFileSize);
    let meta = sharp().metadata((_err, meta) => {
      meta &&
        console.log(`meta [${id}] format: ${meta.format} | size: ${meta.size}`);
    });

    // Initialize root transform writestream
    let transform = sharp();

    let transforms = sizes.map((size) => {
      let key = getS3Key(`${id}-${size}.${format}`);
      let url = getS3KeyUrl(key);
      let resizeStream = transform.clone().resize(size).toFormat(format);
      let { stream: uploadStream, upload } = s3Upload({
        key,
        mime: `image/${format}`,
      });
      return { key, url, size, resizeStream, uploadStream, upload };
    });

    // Handle abort flow globally
    function abort(reason: string) {
      file.unpipe();
      meter.unpipe();
      meta.unpipe();

      transforms.forEach((t) => {
        t.resizeStream.unpipe();
        t.upload.abort();
      });

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
    transforms.forEach((t) => t.resizeStream.pipe(t.uploadStream));

    // Kick off stream handling by piping it into the root transform sstream
    file.pipe(meter).pipe(meta).pipe(transform);

    // Wait for all streams being uploaded to S3
    Promise.all(transforms.map((t) => t.upload.done()))
      .then(() =>
        resolve({
          uploadId: id,
          files: transforms.map(({ key, url, size }) => ({ key, url, size })),
        })
      )
      .catch((err) => {
        console.log('upload [ERROR]: ', err);
        abort('S3_UPLOAD_ERROR');
      });
  });
}
