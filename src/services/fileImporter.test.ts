import { describe, expect, it } from "vitest";
import { isDatasetRoot, isDatasetSeriesRoot } from "../domain/normalize";
import { parseImportedText } from "./fileImporter";

describe("parseImportedText", () => {
  it("parses valid dataset json", () => {
    const preview = parseImportedText(
      JSON.stringify({
        type: "Dataset",
        dataset: {
          identifier: "so.afu.nitratmessungen",
          title: "Nitratmessungen",
          description: "Messwerte"
        }
      }),
      "nitrat.json"
    );

    expect(preview.originalFileName).toBe("nitrat.json");
    expect(preview.draftKind).toBe("dataset");
    expect(isDatasetRoot(preview.root)).toBe(true);
    if (!isDatasetRoot(preview.root)) {
      throw new Error("Expected dataset root");
    }
    expect(preview.root.dataset.identifier).toBe("so.afu.nitratmessungen");
  });

  it("parses valid dataset series json", () => {
    const preview = parseImportedText(
      JSON.stringify({
        type: "DatasetSeries",
        series: {
          identifier: "so.astat.bevoelkerung",
          title: "Bevölkerungsreihe",
          description: "Serie",
          issues: [
            {
              identifier: "so.astat.bevoelkerung.2026",
              issueLabel: "2026"
            }
          ]
        }
      }),
      "serie.json"
    );

    expect(preview.draftKind).toBe("series");
    expect(isDatasetSeriesRoot(preview.root)).toBe(true);
    if (!isDatasetSeriesRoot(preview.root)) {
      throw new Error("Expected series root");
    }
    expect(preview.root.type).toBe("DatasetSeries");
  });

  it("rejects invalid json", () => {
    expect(() => parseImportedText("{not-json}")).toThrow("Die Datei ist nicht lesbar oder enthält kein gültiges Datenblatt.");
  });
});
