/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_METADATA_SOURCE_URL?: string;
  readonly VITE_OFFICE_CATALOG_URL?: string;
}
