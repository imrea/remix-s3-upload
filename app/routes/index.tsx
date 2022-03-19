import {
  ActionFunction,
  Form,
  json,
  unstable_parseMultipartFormData as parseMultipartFormData,
  UploadHandler,
  useActionData,
  useTransition,
} from 'remix';
import { uploadStreamToS3 } from '~/services/upload.server';

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
    let upload = await uploadStreamToS3(stream);
    console.log(`Field [${name}] finished upload`);
    return JSON.stringify(upload);
  } catch (error) {
    console.log(`Field [${name}] failed upload`);
    console.log(error);
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

  console.log(`Field [cover] `, cover);

  return json({ success: !cover.error, fields: { cover } });
};

export default function Index() {
  let data = useActionData();
  let { submission } = useTransition();
  let isPending = !!submission;

  return (
    <main>
      <Form method="post" encType="multipart/form-data">
        <div style={isPending ? { opacity: 50, pointerEvents: 'none' } : {}}>
          <label htmlFor="cover" style={{ display: 'block' }}>
            Cover
          </label>
          <input
            type="file"
            name="cover"
            id="cover"
            placeholder="Cover"
            disabled={isPending}
          />
        </div>
        {/* <div>
          <label htmlFor="test">Test</label>
          <input
            type="file"
            name="test"
            id="test"
            placeholder="Test"
            disabled={isPending}
          />
        </div> */}
        <div>
          <button type="submit" disabled={isPending}>
            {isPending ? 'Loading...' : 'Submit'}
          </button>
        </div>
      </Form>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
