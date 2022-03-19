import { Readable } from 'stream';
import sharp from 'sharp';
import cuid from 'cuid';
import fs from 'fs';
import { UploadMeter } from './upload-meter.server';

export async function uploadStreamToFile(file: Readable) {
  return new Promise((resolve, reject) => {
    let id = cuid();
    let meter = new UploadMeter(5_000_000);
    let meta = sharp().metadata((_err, meta) => {
      meta &&
        console.log(`meta [${id}] format: ${meta.format} | size: ${meta.size}`);
    });

    let transform = sharp();

    // Handle 600px WebP transformation
    let resize600 = transform.clone().resize(600).webp();
    let write600 = fs.createWriteStream(
      `${process.cwd()}/uploads/${id}-600.webp`
    );

    // Handle 1200px WebP transformation
    let resize1200 = transform.clone().resize(1200).webp();
    let write1200 = fs.createWriteStream(
      `${process.cwd()}/uploads/${id}-1200.webp`
    );

    function abort(reason: string) {
      file.unpipe();
      meter.unpipe();
      meta.unpipe();

      resize600.unpipe();
      resize1200.unpipe();

      transform.unpipe();
      transform.removeAllListeners();

      meta.removeAllListeners();
      meter.removeAllListeners();

      fs.rmSync(`${process.cwd()}/uploads/${id}-600.webp`, { recursive: true });
      fs.rmSync(`${process.cwd()}/uploads/${id}-1200.webp`, {
        recursive: true,
      });

      file.resume();
      reject(reason);
    }

    meta.on('error', (err) => {
      console.log('meta [ERROR]: ', err);
      abort('INVALID_FILE');
    });

    transform.on('error', (err) => {
      console.log('transform [ERROR]: ', err);
      abort('IMAGE_TRANSFORM_ERROR');
    });

    meter.on('limit', () => abort('LIMIT_REACHED'));

    transform.on('finish', () =>
      resolve({
        key: id,
        success: true,
        error: null,
      })
    );

    resize600.pipe(write600);
    resize1200.pipe(write1200);

    file.pipe(meter).pipe(meta).pipe(transform);
  });
}
