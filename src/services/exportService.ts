import type { EditableRootJson } from "../domain/datasetTypes";
import { getRootIdentifier, toExportRoot } from "../domain/normalize";

export function getExportFileName(identifier?: string): string {
  const clean = identifier?.trim();
  return clean ? `${clean}.json` : "dataset.json";
}

export function serializeDataset(root: EditableRootJson): string {
  return `${JSON.stringify(toExportRoot(root), null, 2)}\n`;
}

export function downloadDataset(root: EditableRootJson): void {
  const blob = new Blob([serializeDataset(root)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getExportFileName(getRootIdentifier(root));
  anchor.click();
  URL.revokeObjectURL(url);
}
