import {
  ActionFunction,
  json,
  unstable_parseMultipartFormData as parseMultipartFormData,
  UploadHandler,
  useActionData,
  useTransition,
} from 'remix';
import { FilesForm } from '~/components/files-form';
import { uploadImageStreamToS3 } from '~/services/s3-upload.server';

let s3UploadHandler: UploadHandler = async ({ name, stream }) => {
  if (name !== 'cover') {
    console.log(`Field [${name}] not accepted, skipping`);
    stream.resume();
    return;
  }

  // TODO: Check for `mimetype` here as well
  // if (!['image/jpeg', 'image/jpg'].includes(mimetype)) {
  //   console.log(`Field [${name}] not supported '${mimetype}', skipping`);
  //   stream.resume();
  //   return;
  // }

  console.log(`Field [${name}] starting upload...`);

  try {
    let upload = await uploadImageStreamToS3(stream, {
      maxFileSize: 5_000_000,
    });
    console.log(`Field [${name}] finished upload`);
    return JSON.stringify(upload);
  } catch (error) {
    console.log(`Field [${name}] failed upload: ${error}`);
    return JSON.stringify({ error });
  }
};

export const action: ActionFunction = async ({ request }) => {
  let formData = await parseMultipartFormData(request, s3UploadHandler);

  // let formData;
  // try {
  //   formData = await parseMultipartFormData(request, s3UploadHandler);
  // } catch (error) {
  //   console.log('Caught: ', error);
  //   return json({ error }, { status: 400 });
  // }

  let cover = JSON.parse(formData.get('cover') as string);

  return json(
    {
      fields: { cover },
    },
    { status: cover.error ? 400 : 200 }
  );
};

export default function S3Upload() {
  let data = useActionData();
  let { submission } = useTransition();
  let isPending = !!submission;

  return (
    <main style={{ display: 'flex' }}>
      <div style={{ flex: 'auto' }}>
        <FilesForm isPending={isPending} />
      </div>
      <div style={{ flex: 'auto' }}>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </main>
  );
}
