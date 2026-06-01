import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot, createEmptyDatasetSeriesRoot, isDatasetSeriesRoot } from "../domain/normalize";
import { parseXtfTransfer, serializeToXtf } from "./xtfService";

const exampleTransfer = `<?xml version="1.0" encoding="UTF-8"?>
<ili:transfer xmlns="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Datasheet_20260523" xmlns:base="http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Base_20260529" xmlns:ili="http://www.interlis.ch/xtf/2.4/INTERLIS">
  <ili:headersection>
    <ili:models>
      <ili:model>SO_AGI_DataCatalog_Datasheet_20260523</ili:model>
      <ili:model>SO_AGI_DataCatalog_Base_20260529</ili:model>
    </ili:models>
  </ili:headersection>
  <ili:datasection>
    <Metadata ili:bid="x1">
      <Dataset ili:tid="ch.so.grundwasser.qualitaet">
        <identifier>ch.so.grundwasser.qualitaet</identifier>
        <title>Wasserqualität Grundwasser Kanton Solothurn</title>
        <description>Messdaten der Grundwasserqualitätsuntersuchungen im Kanton Solothurn.</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.afu</creatorRef>
        <contactPoint>
          <base:ContactPoint>
            <base:email>mailto:afu@bd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Raum_und_Umwelt</themes>
        <modified>2025-05-19</modified>
      </Dataset>
      <DatasetSeries ili:tid="ch.so.bevoelkerung.altersstruktur">
        <identifier>ch.so.bevoelkerung.altersstruktur</identifier>
        <title>Altersstruktur der Wohnbevölkerung</title>
        <description>Altersstruktur im Kanton Solothurn.</description>
        <accessLevel>open</accessLevel>
        <publicationStatus>published</publicationStatus>
        <creatorRef>ch.so.afin</creatorRef>
        <contactPoint>
          <base:ContactPoint>
            <base:email>mailto:statistik@fd.so.ch</base:email>
          </base:ContactPoint>
        </contactPoint>
        <themes>Bevoelkerung</themes>
        <modified>2025-12-31</modified>
        <issues>
          <DatasetIssue>
            <identifier>ch.so.bevoelkerung.altersstruktur_2025</identifier>
            <issueLabel>2025</issueLabel>
            <isCurrentIssue>true</isCurrentIssue>
            <accessLevel>open</accessLevel>
            <publicationStatus>published</publicationStatus>
          </DatasetIssue>
        </issues>
      </DatasetSeries>
    </Metadata>
  </ili:datasection>
</ili:transfer>`;

describe("xtfService", () => {
  it("parses dataset and dataset series transfers", () => {
    const roots = parseXtfTransfer(exampleTransfer);

    expect(roots).toHaveLength(2);
    expect(roots[0]?.type).toBe("Dataset");
    expect(isDatasetSeriesRoot(roots[1])).toBe(true);
    if (!isDatasetSeriesRoot(roots[1])) {
      throw new Error("Expected dataset series root");
    }
    expect(roots[1].series.issues).toHaveLength(1);
  });

  it("serializes a dataset to xtf", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "open";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "ch.so.afu";
    root.dataset.contactPoint!.email = "mailto:afu@bd.so.ch";
    root.dataset.themes = ["Raum_und_Umwelt"];
    root.dataset.modified = "2026-05-12";

    const xml = serializeToXtf(root);

    expect(xml).toContain("<Dataset");
    expect(xml).toContain('ili:tid="so.afu.test"');
  });

  it("serializes a dataset series without local issue metadata", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.reihe";
    root.series.title = "Reihe";
    root.series.description = "Beschreibung";
    root.series.accessLevel = "open";
    root.series.publicationStatus = "published";
    root.series.creatorRef = "ch.so.astat";
    root.series.contactPoint!.email = "mailto:astat@bd.so.ch";
    root.series.themes = ["Bevoelkerung"];
    root.series.modified = "2026-05-12";

    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }
    issue.identifier = "so.astat.reihe_2026";
    issue.issueLabel = "2026";
    issue.isCurrentIssue = true;
    issue.accessLevel = "open";
    issue.publicationStatus = "published";
    issue.__localIssueId = "local-1";

    const xml = serializeToXtf(root);

    expect(xml).toContain("<DatasetSeries");
    expect(xml).not.toContain("__localIssueId");
  });
});
