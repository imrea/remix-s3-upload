/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />

declare namespace NodeJS {
  interface ProcessEnv {
    MF_SPACES_API_KEY: string;
    MF_SPACES_API_SECRET: string;
    MF_SPACES_ENDPOINT: string;
    MF_SPACES_REGION: string;
    MF_SPACES_BUCKET: string;
    MF_SPACES_KEY_PREFIX: string;
  }
}
