import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditableRootJson, MetadataSearchRecord } from "../domain/datasetTypes";
import { isDatasetRoot } from "../domain/normalize";
import { loadDatasetFromSource, loadOfficeCatalog, loadSourceIndex, searchSourceIndex } from "./endpointLoader";

const datasetIndexPayload = `<?xml version="1.0" encoding="UTF-8"?>
<ili:transfer xmlns="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Datasheet_20260523" xmlns:base="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Base_20260529" xmlns:ili="http://www.interlis.ch/xtf/2.4/INTERLIS">
  <ili:headersection>
    <ili:models>
      <ili:model>SO_AGI_DataCatalog_Datasheet_20260523</ili:model>
      <ili:model>SO_AGI_DataCatalog_Base_20260529</ili:model>
    </ili:models>
  </ili:headersection>
  <ili:datasection>
    <Metadata ili:bid="x1">
      <Dataset ili:tid="so.afu.nitratmessungen">
        <identifier>so.afu.nitratmessungen</identifier>
        <title>Nitratmessungen</title>
        <description>Messwerte zur Wasserqualität</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.afu</creatorRef>
        <contactPoint>
          <base:ContactPoint>
            <base:organizationUnit>Amt für Umwelt</base:organizationUnit>
            <base:email>mailto:afu@bd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Raum_und_Umwelt</themes>
        <keywords>Nitrat</keywords>
        <modified>2026-05-12</modified>
      </Dataset>
      <Dataset ili:tid="so.agi.gemeindegrenzen">
        <identifier>so.agi.gemeindegrenzen</identifier>
        <title>Gemeindegrenzen</title>
        <description>Amtliche Grenzen</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.agi</creatorRef>
        <contactPoint>
          <base:ContactPoint>
            <base:organizationUnit>Amt für Geoinformation</base:organizationUnit>
            <base:email>mailto:agi@bd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Geografie</themes>
        <keywords>Grenzen</keywords>
        <modified>2026-05-10</modified>
      </Dataset>
    </Metadata>
  </ili:datasection>
</ili:transfer>`;

const officeCatalogPayload = `<?xml version="1.0" encoding="UTF-8"?>
<ili:transfer xmlns:ili="http://www.interlis.ch/xtf/2.4/INTERLIS" xmlns:base="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Base_20260529">
  <ili:headersection>
    <ili:models>
      <ili:model>SO_AGI_DataCatalog_Base_20260529</ili:model>
    </ili:models>
  </ili:headersection>
  <ili:datasection>
    <base:Office ili:bid="SO_AGI_DataCatalog_Base_20260529.Office">
      <base:Office.Office ili:tid="ch.so.afu">
        <base:identifier>ch.so.afu</base:identifier>
        <base:name>Amt für Umwelt</base:name>
      </base:Office.Office>
      <base:Office.Office ili:tid="ch.so.agi">
        <base:identifier>ch.so.agi</base:identifier>
        <base:name>Amt für Geoinformation</base:name>
      </base:Office.Office>
    </base:Office>
  </ili:datasection>
</ili:transfer>`;

function createDocument(identifier = "so.afu.nitratmessungen"): EditableRootJson {
  return {
    type: "Dataset",
    schemaVersion: "2026-05-23",
    dataset: {
      identifier,
      title: identifier === "so.afu.nitratmessungen" ? "Nitratmessungen" : "Gemeindegrenzen",
      description: identifier === "so.afu.nitratmessungen" ? "Messwerte zur Wasserqualität" : "Amtliche Grenzen",
      accessLevel: "open",
      publicationStatus: "published",
      creatorRef: identifier === "so.afu.nitratmessungen" ? "ch.so.afu" : "ch.so.agi",
      contactPoint: {
        organizationUnit: identifier === "so.afu.nitratmessungen" ? "Amt für Umwelt" : "Amt für Geoinformation",
        email: identifier === "so.afu.nitratmessungen" ? "mailto:afu@bd.so.ch" : "mailto:agi@bd.so.ch"
      },
      themes: [identifier === "so.afu.nitratmessungen" ? "Raum_und_Umwelt" : "Geografie"],
      keywords: [identifier === "so.afu.nitratmessungen" ? "Nitrat" : "Grenzen"],
      modified: identifier === "so.afu.nitratmessungen" ? "2026-05-12" : "2026-05-10"
    }
  };
}

function createIndexEntry(overrides: Partial<MetadataSearchRecord> = {}): MetadataSearchRecord {
  return {
    identifier: "so.afu.nitratmessungen",
    title: "Nitratmessungen",
    description: "Messwerte zur Wasserqualität",
    modified: "2026-05-12",
    creatorRef: "ch.so.afu",
    organizationUnit: "Amt für Umwelt",
    keywords: ["Nitrat"],
    document: createDocument(),
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSourceIndex", () => {
  it("loads dataset.index.xtf and derives search records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(datasetIndexPayload, {
        status: 200,
        headers: { "Content-Type": "application/xml" }
      })
    );

    const records = await loadSourceIndex("/mock-sources/dataset.index.xtf");

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      identifier: "so.afu.nitratmessungen",
      title: "Nitratmessungen",
      description: "Messwerte zur Wasserqualität",
      modified: "2026-05-12",
      creatorRef: "ch.so.afu",
      organizationUnit: "Amt für Umwelt",
      keywords: ["Nitrat"]
    });
  });

  it("rejects an invalid xtf payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<broken>", {
        status: 200,
        headers: { "Content-Type": "application/xml" }
      })
    );

    await expect(loadSourceIndex("/mock-sources/dataset.index.xtf")).rejects.toThrow(
      "Die Datei ist nicht lesbar oder enthält kein gültiges XTF/XML."
    );
  });
});

describe("loadOfficeCatalog", () => {
  it("loads offices.xtf and sorts entries by display name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(officeCatalogPayload, {
        status: 200,
        headers: { "Content-Type": "application/xml" }
      })
    );

    const entries = await loadOfficeCatalog("/mock-sources/offices.xtf");

    expect(entries).toEqual([
      { identifier: "ch.so.agi", name: "Amt für Geoinformation" },
      { identifier: "ch.so.afu", name: "Amt für Umwelt" }
    ]);
  });

  it("rejects an invalid office catalog payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<broken>", {
        status: 200,
        headers: { "Content-Type": "application/xml" }
      })
    );

    await expect(loadOfficeCatalog("/mock-sources/offices.xtf")).rejects.toThrow(
      "Die Datei ist nicht lesbar oder enthält kein gültiges XTF/XML."
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
      creatorRef: "ch.so.agi",
      organizationUnit: "Amt für Geoinformation",
      keywords: ["Grenzen"],
      document: createDocument("so.agi.gemeindegrenzen")
    })
  ];

  it("filters by creator ref and full text", () => {
    const results = searchSourceIndex(index, "nitrat", "ch.so.afu");
    expect(results).toHaveLength(1);
    expect(results[0]?.identifier).toBe("so.afu.nitratmessungen");
  });
});

describe("loadDatasetFromSource", () => {
  it("imports a selected dataset and keeps the source url", async () => {
    const preview = await loadDatasetFromSource("Datenportal", "https://example.test/dataset.index.xtf", createIndexEntry());

    expect(preview.sourceType).toBe("endpoint");
    expect(preview.sourceLabel).toBe("Datenportal");
    expect(preview.sourceUrl).toBe("https://example.test/dataset.index.xtf");
    expect(isDatasetRoot(preview.root)).toBe(true);
    if (!isDatasetRoot(preview.root)) {
      throw new Error("Expected dataset root");
    }
    expect(preview.root.dataset.identifier).toBe("so.afu.nitratmessungen");
    expect(preview.root.dataset.creatorRef).toBe("ch.so.afu");
  });
});
