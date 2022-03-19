import {
  ActionFunction,
  Form,
  json,
  unstable_parseMultipartFormData as parseMultipartFormData,
  unstable_createMemoryUploadHandler,
  useActionData,
  useTransition,
} from 'remix';

export const action: ActionFunction = async ({ request }) => {
  let memoryHandler = unstable_createMemoryUploadHandler({
    maxFileSize: 1_000,
  });

  let formData: any;

  try {
    formData = await parseMultipartFormData(
      request,
      memoryHandler
      // s3UploadHandler
    );
  } catch (error) {
    console.log('Caught: ', error);
    return json({ success: false });
  }

  console.log(`Field [cover]: `, formData.get('cover'));
  return json({ success: true });
};

export default function Index() {
  let data = useActionData();
  let { submission } = useTransition();
  let isPending = !!submission;

  console.log('action data');
  console.log(data);

  return (
    <main>
      <Form method="post" encType="multipart/form-data">
        <input type="file" name="cover" id="cover" disabled={isPending} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Töltés...' : 'Küldés'}
        </button>
      </Form>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
