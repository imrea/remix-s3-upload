import { Form } from 'remix';

type FilesFormProps = {
  isPending?: boolean;
};

export function FilesForm({ isPending }: FilesFormProps) {
  return (
    <Form
      method="post"
      encType="multipart/form-data"
      style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}
    >
      <div style={isPending ? { opacity: 50, pointerEvents: 'none' } : {}}>
        <label htmlFor="cover" style={{ display: 'block' }}>
          Cover
        </label>
        <input
          type="file"
          accept="image/jpg,image/jpeg"
          name="cover"
          id="cover"
          placeholder="Cover"
          disabled={isPending}
        />
      </div>

      <div style={isPending ? { opacity: 50, pointerEvents: 'none' } : {}}>
        <label htmlFor="test" style={{ display: 'block' }}>
          Test
        </label>

        <input
          type="file"
          name="test"
          id="test"
          placeholder="Test"
          disabled={isPending}
        />
      </div>

      <div>
        <button type="submit" disabled={isPending}>
          {isPending ? 'Loading...' : 'Submit'}
        </button>
      </div>
    </Form>
  );
}
