import { describe, expect, it } from "vitest";
import { DatasetImportError, normalizeImportedJson } from "./normalize";

describe("normalizeImportedJson", () => {
  it("wraps naked dataset objects", () => {
    const result = normalizeImportedJson({
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "Messwerte"
    });

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

    expect(result.importShape).toBe("root");
    expect(result.root.schemaVersion).toBe("2026-05-23");
    expect(result.root.dataset.title).toBe("Gemeindegrenzen");
  });

  it("rejects dataset series payloads", () => {
    expect(() =>
      normalizeImportedJson({
        type: "DatasetSeries",
        series: {}
      })
    ).toThrowError(DatasetImportError);
  });
});
