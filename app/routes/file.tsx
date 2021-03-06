import {
  ActionFunction,
  json,
  unstable_parseMultipartFormData as parseMultipartFormData,
  UploadHandler,
  useActionData,
  useTransition,
} from 'remix';
import { FilesForm } from '~/components/files-form';
import { uploadStreamToFile } from '~/services/file-upload.server';

let fileUploadHandler: UploadHandler = async ({ name, stream }) => {
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
    let upload = await uploadStreamToFile(stream);
    console.log(`Field [${name}] finished upload`);
    return JSON.stringify(upload);
  } catch (error) {
    console.log(`Field [${name}] failed upload`);
    console.log(error);
    return JSON.stringify({ error });
  }
};

export const action: ActionFunction = async ({ request }) => {
  let formData = await parseMultipartFormData(request, fileUploadHandler);

  // let formData;
  // try {
  //   formData = await parseMultipartFormData(request, fileUploadHandler);
  // } catch (error) {
  //   console.log('Caught: ', error);
  //   return json({ error }, { status: 400 });
  // }

  return json({
    fields: { cover: JSON.parse(formData.get('cover') as string) },
  });
};

export default function FileUpload() {
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
