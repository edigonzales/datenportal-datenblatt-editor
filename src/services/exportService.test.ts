import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot } from "../domain/normalize";
import { getExportFileName, serializeDataset } from "./exportService";

describe("exportService", () => {
  it("creates a dataset filename from the identifier", () => {
    expect(getExportFileName("so.afu.nitratmessungen")).toBe("so.afu.nitratmessungen.json");
    expect(getExportFileName("")).toBe("dataset.json");
  });

  it("serializes the root wrapper", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";

    const json = serializeDataset(root);

    expect(json).toContain('"type": "Dataset"');
    expect(json).toContain('"identifier": "so.afu.test"');
  });
});
