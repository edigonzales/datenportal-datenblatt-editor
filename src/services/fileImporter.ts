import type { ImportPreview } from "../domain/datasetTypes";
import { normalizeImportedJson } from "../domain/normalize";
import { validateImportedStructure } from "../domain/validation";

export async function importJsonFile(file: File): Promise<ImportPreview> {
  const text = await file.text();
  return parseImportedText(text, file.name);
}

export function parseImportedText(text: string, fileName = "dataset.json"): ImportPreview {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Die Datei ist nicht lesbar oder enthält kein gültiges Datenblatt.");
  }

  const structureIssues = validateImportedStructure(payload);
  const blockingIssue = structureIssues.find((entry) => entry.severity === "error");
  if (blockingIssue) {
    throw new Error(blockingIssue.message);
  }

  const normalized = normalizeImportedJson(payload);
  return {
    root: normalized.root,
    importShape: normalized.importShape,
    sourceType: "file",
    sourceLabel: `Datei ${fileName}`,
    originalFileName: fileName
  };
}
