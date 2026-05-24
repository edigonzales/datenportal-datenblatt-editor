import type {
  DatasetRootJson,
  ImportPreview,
  MetadataSearchRecord,
  MetadataSource
} from "../domain/datasetTypes";
import { normalizeImportedJson } from "../domain/normalize";
import { validateImportedStructure } from "../domain/validation";

export async function loadSourceIndex(source: MetadataSource): Promise<MetadataSearchRecord[]> {
  const response = await fetch(source.searchIndexPath, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Die Quelle ${source.label} konnte nicht geladen werden.`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error(`Der Suchindex von ${source.label} ist ungültig.`);
  }

  return payload.map((entry) => ({
    identifier: String((entry as Record<string, unknown>).identifier ?? ""),
    title: String((entry as Record<string, unknown>).title ?? ""),
    description: String((entry as Record<string, unknown>).description ?? ""),
    modified: String((entry as Record<string, unknown>).modified ?? ""),
    organizationUnit: String((entry as Record<string, unknown>).organizationUnit ?? ""),
    keywords: Array.isArray((entry as Record<string, unknown>).keywords)
      ? ((entry as Record<string, unknown>).keywords as string[])
      : [],
    sourceId: source.id
  }));
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

    return [entry.identifier, entry.title, entry.organizationUnit ?? "", ...entry.keywords]
      .join(" ")
      .toLocaleLowerCase()
      .includes(search);
  });
}

export async function loadDatasetFromSource(source: MetadataSource, identifier: string): Promise<ImportPreview> {
  const path = source.datasetPathTemplate.replace("{identifier}", encodeURIComponent(identifier));
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Das Datenblatt ${identifier} wurde in ${source.label} nicht gefunden.`);
  }

  const payload = (await response.json()) as unknown;
  const structureIssues = validateImportedStructure(payload);
  const blockingIssue = structureIssues.find((entry) => entry.severity === "error");
  if (blockingIssue) {
    throw new Error(blockingIssue.message);
  }

  const normalized = normalizeImportedJson(payload);
  return {
    root: normalized.root,
    importShape: normalized.importShape,
    sourceType: "endpoint",
    sourceLabel: source.label,
    sourceUrl: path
  };
}

export function previewSummary(root: DatasetRootJson): string {
  return root.dataset.title || root.dataset.identifier || "Unbenanntes Datenblatt";
}
