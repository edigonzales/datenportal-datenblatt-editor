import type { ImportPreview, MetadataSearchRecord } from "../domain/datasetTypes";
import { isDatasetSeriesRoot, normalizeImportedJson } from "../domain/normalize";
import { validateImportedStructure } from "../domain/validation";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function loadSourceIndex(indexUrl: string): Promise<MetadataSearchRecord[]> {
  const response = await fetch(indexUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error("Die Quelle konnte nicht geladen werden.");
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("Die dataset.index.json ist ungültig.");
  }

  return payload.map((document) => {
    const root = isObjectRecord(document) ? document : {};
    const draftRoot = normalizeImportedJson(root).root;
    const entry = isDatasetSeriesRoot(draftRoot) ? draftRoot.series : draftRoot.dataset;
    const contactPoint = isObjectRecord(entry.contactPoint) ? entry.contactPoint : {};

    return {
      identifier: toStringValue(entry.identifier),
      title: toStringValue(entry.title),
      description: toStringValue(entry.description),
      modified: toStringValue(entry.modified),
      organizationUnit: toStringValue(contactPoint.organizationUnit),
      keywords: toStringArray(entry.keywords),
      document
    };
  });
}

export function searchSourceIndex(
  entries: MetadataSearchRecord[],
  query: string,
  organizationUnit: string
): MetadataSearchRecord[] {
  const search = query.trim().toLocaleLowerCase();

  return entries.filter((entry) => {
    const matchesOrganization = organizationUnit ? entry.organizationUnit === organizationUnit : true;
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
  const payload = entry.document;
  const structureIssues = validateImportedStructure(payload);
  const blockingIssue = structureIssues.find((issue) => issue.severity === "error");
  if (blockingIssue) {
    throw new Error(blockingIssue.message);
  }

  const normalized = normalizeImportedJson(payload);
  return {
    draftKind: normalized.draftKind,
    root: normalized.root,
    importShape: normalized.importShape,
    sourceType: "endpoint",
    sourceLabel,
    sourceUrl
  };
}
