import { describe, expect, it } from "vitest";
import type { MetadataSearchRecord } from "../domain/datasetTypes";
import { searchSourceIndex } from "./endpointLoader";

describe("searchSourceIndex", () => {
  const index: MetadataSearchRecord[] = [
    {
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "",
      modified: "2026-05-12",
      organizationUnit: "Amt für Umwelt",
      keywords: ["Nitrat"],
      sourceId: "dev"
    },
    {
      identifier: "so.agi.gemeindegrenzen",
      title: "Gemeindegrenzen",
      description: "",
      modified: "2026-05-10",
      organizationUnit: "Amt für Geoinformation",
      keywords: ["Grenzen"],
      sourceId: "dev"
    }
  ];

  it("filters by organization unit and full text", () => {
    const results = searchSourceIndex(index, "nitrat", "Amt für Umwelt");
    expect(results).toHaveLength(1);
    expect(results[0]?.identifier).toBe("so.afu.nitratmessungen");
  });
});
