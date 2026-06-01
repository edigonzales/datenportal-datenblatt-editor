import type { MetadataSource } from "../domain/datasetTypes";

export const defaultMetadataSource: MetadataSource = {
  label: "Datenportal",
  indexUrl: "/mock-sources/dataset.index.xtf",
  version: "2026-05-25"
};

export const defaultSourceIndexUrl = defaultMetadataSource.indexUrl;

const legacyMockSourceIndexPath = "/mock-sources/dataset.index.json";

export function normalizeSourceIndexUrl(sourceUrl?: string): string {
  const trimmed = sourceUrl?.trim() ?? "";
  if (!trimmed) {
    return defaultSourceIndexUrl;
  }

  if (trimmed === legacyMockSourceIndexPath) {
    return defaultSourceIndexUrl;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === legacyMockSourceIndexPath) {
      parsed.pathname = defaultSourceIndexUrl;
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
