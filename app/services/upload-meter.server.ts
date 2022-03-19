import { Transform, TransformCallback } from 'stream';

export class UploadMeter extends Transform {
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
