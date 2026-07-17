import { describe, expect, it } from "vitest";
import { isDatasetRoot, isDatasetSeriesRoot } from "../domain/normalize";
import { parseImportedText } from "./fileImporter";

const datasetXtf = `<?xml version="1.0" encoding="UTF-8"?>
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
        <description>Messwerte</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.afu</creatorRef>
        <model>SO_AGI_Dataset_Model</model>
        <contactPoint>
          <base:ContactPoint>
            <base:email>mailto:afu@bd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Raum_und_Umwelt</themes>
        <modified>2026-05-12</modified>
      </Dataset>
    </Metadata>
  </ili:datasection>
</ili:transfer>`;

const seriesXtf = `<?xml version="1.0" encoding="UTF-8"?>
<ili:transfer xmlns="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Datasheet_20260523" xmlns:base="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Base_20260529" xmlns:ili="http://www.interlis.ch/xtf/2.4/INTERLIS">
  <ili:headersection>
    <ili:models>
      <ili:model>SO_AGI_DataCatalog_Datasheet_20260523</ili:model>
      <ili:model>SO_AGI_DataCatalog_Base_20260529</ili:model>
    </ili:models>
  </ili:headersection>
  <ili:datasection>
    <Metadata ili:bid="x1">
      <DatasetSeries ili:tid="so.astat.bevoelkerung">
        <identifier>so.astat.bevoelkerung</identifier>
        <title>Bevölkerungsreihe</title>
        <description>Serie</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.astat</creatorRef>
        <model>SO_AGI_Series_Model</model>
        <contactPoint>
          <base:ContactPoint>
            <base:email>mailto:astat@bd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Bevoelkerung</themes>
        <modified>2026-05-12</modified>
        <issues>
          <DatasetIssue>
            <identifier>so.astat.bevoelkerung.2026</identifier>
            <issueLabel>2026</issueLabel>
            <isCurrentIssue>true</isCurrentIssue>
            <publicationStatus>published</publicationStatus>
          </DatasetIssue>
        </issues>
      </DatasetSeries>
    </Metadata>
  </ili:datasection>
</ili:transfer>`;

describe("parseImportedText", () => {
  it("parses valid dataset xtf", () => {
    const preview = parseImportedText(datasetXtf, "nitrat.xtf");

    expect(preview.originalFileName).toBe("nitrat.xtf");
    expect(preview.draftKind).toBe("dataset");
    expect(isDatasetRoot(preview.root)).toBe(true);
    if (!isDatasetRoot(preview.root)) {
      throw new Error("Expected dataset root");
    }
    expect(preview.root.dataset.identifier).toBe("so.afu.nitratmessungen");
    expect(preview.root.dataset.model).toBe("SO_AGI_Dataset_Model");
  });

  it("parses valid dataset series xtf", () => {
    const preview = parseImportedText(seriesXtf, "serie.xtf");

    expect(preview.draftKind).toBe("series");
    expect(isDatasetSeriesRoot(preview.root)).toBe(true);
    if (!isDatasetSeriesRoot(preview.root)) {
      throw new Error("Expected series root");
    }
    expect(preview.root.type).toBe("DatasetSeries");
    expect(preview.root.series.model).toBe("SO_AGI_Series_Model");
    expect(preview.root.series.issues?.[0]?.model).toBe("SO_AGI_Series_Model");
  });

  it("rejects invalid xml", () => {
    expect(() => parseImportedText("<broken>", "broken.xtf")).toThrow(
      "Die Datei ist nicht lesbar oder enthält kein gültiges XTF/XML."
    );
  });
});
