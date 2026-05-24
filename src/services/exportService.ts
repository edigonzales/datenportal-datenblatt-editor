import type { DatasetRootJson } from "../domain/datasetTypes";

export function getExportFileName(identifier?: string): string {
  const clean = identifier?.trim();
  return clean ? `${clean}.json` : "dataset.json";
}

export function serializeDataset(root: DatasetRootJson): string {
  return `${JSON.stringify(root, null, 2)}\n`;
}

export function downloadDataset(root: DatasetRootJson): void {
  const blob = new Blob([serializeDataset(root)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getExportFileName(root.dataset.identifier);
  anchor.click();
  URL.revokeObjectURL(url);
}
