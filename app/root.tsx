import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'remix';
import type { MetaFunction } from 'remix';

export const meta: MetaFunction = () => {
  return { title: 'New Remix App' };
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: any) {
  console.log('>>> ErrorBoundary:');
  console.log(error);
  return (
    <html>
      <head>
        <title>Oh damn :S</title>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>Oh damn :S</h1>
        {/* add the UI you want your users to see */}
        <Scripts />
      </body>
    </html>
  );
}
