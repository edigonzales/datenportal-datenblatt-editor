import { describe, expect, it } from "vitest";
import { isDatasetRoot, isDatasetSeriesRoot, normalizeImportedJson } from "./normalize";

describe("normalizeImportedJson", () => {
  it("wraps naked dataset objects", () => {
    const result = normalizeImportedJson({
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "Messwerte"
    });

    expect(isDatasetRoot(result.root)).toBe(true);
    if (!isDatasetRoot(result.root)) {
      throw new Error("Expected dataset root");
    }
    expect(result.importShape).toBe("naked");
    expect(result.root.type).toBe("Dataset");
    expect(result.root.dataset.identifier).toBe("so.afu.nitratmessungen");
  });

  it("keeps root wrapped datasets", () => {
    const result = normalizeImportedJson({
      type: "Dataset",
      schemaVersion: "2026-05-23",
      dataset: {
        identifier: "so.agi.gemeindegrenzen",
        title: "Gemeindegrenzen",
        description: "Grenzen"
      }
    });

    expect(isDatasetRoot(result.root)).toBe(true);
    if (!isDatasetRoot(result.root)) {
      throw new Error("Expected dataset root");
    }
    expect(result.importShape).toBe("root");
    expect(result.root.schemaVersion).toBe("2026-05-23");
    expect(result.root.dataset.title).toBe("Gemeindegrenzen");
  });

  it("normalizes dataset series payloads", () => {
    const result = normalizeImportedJson({
      type: "DatasetSeries",
      series: {
        identifier: "so.astat.bevoelkerung",
        title: "Bevölkerungsreihe",
        description: "Statistische Ausgaben",
        issues: [
          {
            identifier: "so.astat.bevoelkerung.2026",
            issueLabel: "2026"
          }
        ]
      }
    });

    expect(isDatasetSeriesRoot(result.root)).toBe(true);
    if (!isDatasetSeriesRoot(result.root)) {
      throw new Error("Expected series root");
    }
    expect(result.draftKind).toBe("series");
    expect(result.root.type).toBe("DatasetSeries");
    expect(result.root.series.issues).toHaveLength(1);
  });
});
