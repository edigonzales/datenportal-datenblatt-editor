import type { EditableRootJson } from "../domain/datasetTypes";
import { getRootIdentifier } from "../domain/normalize";
import { serializeToXtf } from "./xtfService";

export function getExportFileName(identifier?: string): string {
  const clean = identifier?.trim();
  return clean ? `${clean}.xtf` : "dataset.xtf";
}

export function serializeDataset(root: EditableRootJson): string {
  return serializeToXtf(root);
}

export function downloadDataset(root: EditableRootJson): void {
  const blob = new Blob([serializeDataset(root)], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getExportFileName(getRootIdentifier(root));
  anchor.click();
  URL.revokeObjectURL(url);
}
