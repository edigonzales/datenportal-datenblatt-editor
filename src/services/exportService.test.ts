import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot, createEmptyDatasetSeriesRoot } from "../domain/normalize";
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

  it("strips local issue ids from series exports", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.bevoelkerung";
    root.series.issues = [
      {
        __localIssueId: "local-1",
        identifier: "so.astat.bevoelkerung.2026",
        issueLabel: "2026"
      }
    ];

    const json = serializeDataset(root);

    expect(json).toContain('"type": "DatasetSeries"');
    expect(json).not.toContain("__localIssueId");
  });
});
