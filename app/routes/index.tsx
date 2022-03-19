import { Link } from 'remix';

export default function Index() {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/file">File Upload</Link>
        </li>
        <li>
          <Link to="/s3">S3 Upload</Link>
        </li>
      </ul>
    </nav>
  );
}
