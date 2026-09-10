import type { MetadataSource } from "../domain/datasetTypes";
import { getPublicBasePath } from "../app/publicBase";

const localMockSourcePath = (filename: string) => getPublicBasePath() + "mock-sources/" + filename;

export const defaultMetadataSource: MetadataSource = {
  label: "Datenportal",
  indexUrl: import.meta.env.VITE_METADATA_SOURCE_URL?.trim() || localMockSourcePath("dataset.index.xtf"),
  version: "2026-05-25"
};

export const defaultSourceIndexUrl = defaultMetadataSource.indexUrl;
const localOfficeCatalogUrl = localMockSourcePath("offices.xtf");
export const defaultOfficeCatalogUrl = import.meta.env.VITE_OFFICE_CATALOG_URL?.trim() || localOfficeCatalogUrl;

export function normalizeSourceIndexUrl(sourceUrl?: string): string {
  const trimmed = sourceUrl?.trim() ?? "";
  if (!trimmed) {
    return defaultSourceIndexUrl;
  }

  return trimmed;
}
