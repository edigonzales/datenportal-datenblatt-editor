import type { MetadataSource } from "../domain/datasetTypes";

export const defaultMetadataSource: MetadataSource = {
  label: "Datenportal",
  indexUrl: "/mock-sources/dataset.index.json",
  version: "2026-05-25"
};

export const defaultSourceIndexUrl = defaultMetadataSource.indexUrl;
