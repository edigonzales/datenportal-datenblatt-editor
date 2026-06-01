import type { ImportPreview, MetadataSearchRecord } from "../domain/datasetTypes";
import { isDatasetSeriesRoot } from "../domain/normalize";
import { parseXtfTransfer } from "./xtfService";

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function loadSourceIndex(indexUrl: string): Promise<MetadataSearchRecord[]> {
  const response = await fetch(indexUrl, { headers: { Accept: "application/xml,text/xml" } });
  if (!response.ok) {
    throw new Error("Die Quelle konnte nicht geladen werden.");
  }

  const payload = await response.text();
  const roots = parseXtfTransfer(payload);

  return roots.map((document) => {
    const entry = isDatasetSeriesRoot(document) ? document.series : document.dataset;
    const contactPoint = entry.contactPoint ?? {};

    return {
      identifier: toStringValue(entry.identifier),
      title: toStringValue(entry.title),
      description: toStringValue(entry.description),
      modified: toStringValue(entry.modified),
      creatorRef: toStringValue(entry.creatorRef),
      organizationUnit: toStringValue(contactPoint.organizationUnit),
      keywords: toStringArray(entry.keywords),
      document
    };
  });
}

export function searchSourceIndex(
  entries: MetadataSearchRecord[],
  query: string,
  creatorRefFilter: string
): MetadataSearchRecord[] {
  const search = query.trim().toLocaleLowerCase();

  return entries.filter((entry) => {
    const matchesOrganization = creatorRefFilter ? entry.creatorRef === creatorRefFilter : true;
    if (!matchesOrganization) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      entry.identifier,
      entry.title,
      entry.description,
      entry.creatorRef ?? "",
      entry.organizationUnit ?? "",
      ...entry.keywords
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(search);
  });
}

export async function loadDatasetFromSource(
  sourceLabel: string,
  sourceUrl: string,
  entry: MetadataSearchRecord
): Promise<ImportPreview> {
  return {
    draftKind: isDatasetSeriesRoot(entry.document) ? "series" : "dataset",
    root: entry.document,
    importShape: "xtf",
    sourceType: "endpoint",
    sourceLabel,
    sourceUrl
  };
}
