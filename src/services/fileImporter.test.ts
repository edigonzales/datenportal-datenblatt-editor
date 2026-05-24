import { describe, expect, it } from "vitest";
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
    expect(preview.root.dataset.identifier).toBe("so.afu.nitratmessungen");
  });

  it("rejects invalid json", () => {
    expect(() => parseImportedText("{not-json}")).toThrow("Die Datei ist nicht lesbar oder enthält kein gültiges Datenblatt.");
  });
});
