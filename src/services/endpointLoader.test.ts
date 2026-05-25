import { afterEach, describe, expect, it, vi } from "vitest";
import type { MetadataSearchRecord } from "../domain/datasetTypes";
import { loadDatasetFromSource, loadSourceIndex, searchSourceIndex } from "./endpointLoader";

const datasetIndexPayload = [
  {
    type: "Dataset",
    schemaVersion: "2026-05-23",
    dataset: {
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "Messwerte zur Wasserqualität",
      modified: "2026-05-12",
      keywords: ["Nitrat"],
      contactPoint: {
        organizationUnit: "Amt für Umwelt"
      }
    }
  },
  {
    type: "Dataset",
    schemaVersion: "2026-05-23",
    dataset: {
      identifier: "so.agi.gemeindegrenzen",
      title: "Gemeindegrenzen",
      description: "Amtliche Grenzen",
      modified: "2026-05-10",
      keywords: ["Grenzen"],
      contactPoint: {
        organizationUnit: "Amt für Geoinformation"
      }
    }
  }
];

function createIndexEntry(overrides: Partial<MetadataSearchRecord> = {}): MetadataSearchRecord {
  return {
    identifier: "so.afu.nitratmessungen",
    title: "Nitratmessungen",
    description: "Messwerte zur Wasserqualität",
    modified: "2026-05-12",
    organizationUnit: "Amt für Umwelt",
    keywords: ["Nitrat"],
    document: datasetIndexPayload[0],
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSourceIndex", () => {
  it("loads dataset.index.json and derives search records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(datasetIndexPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const records = await loadSourceIndex("/mock-sources/dataset.index.json");

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "Messwerte zur Wasserqualität",
      modified: "2026-05-12",
      organizationUnit: "Amt für Umwelt",
      keywords: ["Nitrat"]
    });
    expect(records[0]?.document).toEqual(datasetIndexPayload[0]);
  });

  it("rejects an invalid dataset index payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ datasets: datasetIndexPayload }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(loadSourceIndex("/mock-sources/dataset.index.json")).rejects.toThrow(
      "Die dataset.index.json ist ungültig."
    );
  });
});

describe("searchSourceIndex", () => {
  const index: MetadataSearchRecord[] = [
    createIndexEntry(),
    createIndexEntry({
      identifier: "so.agi.gemeindegrenzen",
      title: "Gemeindegrenzen",
      description: "Amtliche Grenzen",
      modified: "2026-05-10",
      organizationUnit: "Amt für Geoinformation",
      keywords: ["Grenzen"],
      document: datasetIndexPayload[1]
    })
  ];

  it("filters by organization unit and full text", () => {
    const results = searchSourceIndex(index, "nitrat", "Amt für Umwelt");
    expect(results).toHaveLength(1);
    expect(results[0]?.identifier).toBe("so.afu.nitratmessungen");
  });
});

describe("loadDatasetFromSource", () => {
  it("imports a selected dataset and keeps the source url", async () => {
    const preview = await loadDatasetFromSource("Datenportal", "https://example.test/dataset.index.json", createIndexEntry());

    expect(preview.sourceType).toBe("endpoint");
    expect(preview.sourceLabel).toBe("Datenportal");
    expect(preview.sourceUrl).toBe("https://example.test/dataset.index.json");
    expect(preview.root.dataset.identifier).toBe("so.afu.nitratmessungen");
  });
});
