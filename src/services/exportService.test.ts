import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot, createEmptyDatasetSeriesRoot } from "../domain/normalize";
import { getExportFileName, serializeDataset } from "./exportService";

describe("exportService", () => {
  it("creates a dataset filename from the identifier", () => {
    expect(getExportFileName("so.afu.nitratmessungen")).toBe("so.afu.nitratmessungen.xtf");
    expect(getExportFileName("")).toBe("dataset.xtf");
  });

  it("serializes the dataset as xtf", () => {
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

    const xml = serializeDataset(root);

    expect(xml).toContain("<Dataset");
    expect(xml).toContain("<identifier>so.afu.test</identifier>");
    expect(xml).toContain("<creatorRef>ch.so.afu</creatorRef>");
  });

  it("strips local issue editor metadata from series exports", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.bevoelkerung";
    root.series.title = "Serie";
    root.series.description = "Beschreibung";
    root.series.accessLevel = "open";
    root.series.publicationStatus = "published";
    root.series.creatorRef = "ch.so.astat";
    root.series.contactPoint!.email = "mailto:astat@bd.so.ch";
    root.series.themes = ["Bevoelkerung"];
    root.series.modified = "2026-05-12";
    root.series.issues = [
      {
        __localIssueId: "local-1",
        __localIssueState: {
          autoIdentifier: true,
          autoTitle: true,
          inheritedGroups: {
            description: true
          }
        },
        identifier: "so.astat.bevoelkerung.2026",
        issueLabel: "2026",
        isCurrentIssue: true,
        accessLevel: "open",
        publicationStatus: "published"
      }
    ];

    const xml = serializeDataset(root);

    expect(xml).toContain("<DatasetSeries");
    expect(xml).not.toContain("__localIssueId");
    expect(xml).not.toContain("__localIssueState");
  });
});
