import type { ImportPreview } from "../domain/datasetTypes";
import { isDatasetSeriesRoot } from "../domain/normalize";
import { parseSingleXtfTransfer } from "./xtfService";

export async function importXtfFile(file: File): Promise<ImportPreview> {
  const text = await file.text();
  return parseImportedText(text, file.name);
}

export function parseImportedText(text: string, fileName = "dataset.xtf"): ImportPreview {
  const root = parseSingleXtfTransfer(text);

  return {
    draftKind: isDatasetSeriesRoot(root) ? "series" : "dataset",
    root,
    importShape: "xtf",
    sourceType: "file",
    sourceLabel: `Datei ${fileName}`,
    originalFileName: fileName
  };
}
