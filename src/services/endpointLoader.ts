import type { ImportPreview, MetadataSearchRecord, OfficeCatalogEntry } from "../domain/datasetTypes";
import { isDatasetSeriesRoot } from "../domain/normalize";
import { parseOfficeCatalogTransfer, parseXtfTransfer } from "./xtfService";

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function loadSourceIndex(indexUrl: string): Promise<MetadataSearchRecord[]> {
  const url = new URL(indexUrl, document.baseURI);
  const isManifest = url.pathname.endsWith(".json");
  const response = await fetch(indexUrl, {
    headers: { Accept: isManifest ? "application/json" : "application/xml,text/xml" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Die Quelle konnte nicht geladen werden.");
  let payload: string;
  if (isManifest) {
    if (url.username || url.password || url.search || url.hash) throw new Error("Ungültige Manifest-URL.");
    const manifest: unknown = await response.json();
    if (!isPublicationManifest(manifest)) throw new Error("Ungültiger Veröffentlichungsverweis.");
    const sheet = await fetch(new URL(manifest.datasheets, url).href, {
      headers: { Accept: "application/xml,text/xml" }, cache: "no-store"
    });
    if (!sheet.ok) throw new Error("Die veröffentlichte Datenblattsammlung konnte nicht geladen werden.");
    payload = await sheet.text();
  } else {
    payload = await response.text();
  }
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

export async function loadOfficeCatalog(catalogUrl: string): Promise<OfficeCatalogEntry[]> {
  const response = await fetch(catalogUrl, { headers: { Accept: "application/xml,text/xml" } });
  if (!response.ok) {
    throw new Error("Der Datenherr-Katalog konnte nicht geladen werden.");
  }

  const payload = await response.text();
  return parseOfficeCatalogTransfer(payload).sort((left, right) => left.name.localeCompare(right.name, "de-CH"));
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

interface PublicationManifest {
  schemaVersion: 1;
  releaseId: string;
  datasheets: string;
  catalog: string | null;
}

function isPublicationManifest(value: unknown): value is PublicationManifest {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<PublicationManifest>;
  return m.schemaVersion === 1 && typeof m.releaseId === "string"
    && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(m.releaseId)
    && m.datasheets === `datasheets-${m.releaseId}.xtf`
    && (m.catalog === null || m.catalog === `published-catalog-${m.releaseId}.xtf`);
}
