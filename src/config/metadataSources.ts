import type { MetadataSource } from "../domain/datasetTypes";

export const defaultMetadataSource: MetadataSource = {
  label: "Datenportal",
  indexUrl: "/mock-sources/dataset.index.xtf",
  version: "2026-05-25"
};

export const defaultSourceIndexUrl = defaultMetadataSource.indexUrl;
const localOfficeCatalogUrl = "/mock-sources/offices.xtf";
export const defaultOfficeCatalogUrl = import.meta.env.VITE_OFFICE_CATALOG_URL?.trim() || localOfficeCatalogUrl;

export function normalizeSourceIndexUrl(sourceUrl?: string): string {
  const trimmed = sourceUrl?.trim() ?? "";
  if (!trimmed) {
    return defaultSourceIndexUrl;
  }

  return trimmed;
}
