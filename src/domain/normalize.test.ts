import { describe, expect, it } from "vitest";
import {
  createEmptyDatasetRoot,
  createEmptyDatasetSeriesRoot,
  enforceOpenAccessLevel,
  isDatasetRoot,
  isDatasetSeriesRoot,
  normalizeImportedJson
} from "./normalize";

describe("createEmptyDatasetRoot", () => {
  it("prefills access level with open for datasets and series issues", () => {
    const datasetRoot = createEmptyDatasetRoot();
    const seriesRoot = createEmptyDatasetSeriesRoot();

    expect(datasetRoot.dataset.accessLevel).toBe("open");
    expect(seriesRoot.series.accessLevel).toBe("open");
    expect(seriesRoot.series.issues?.[0]?.accessLevel).toBe("open");
  });
});

describe("enforceOpenAccessLevel", () => {
  it("overwrites non-open values in datasets and series issues", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.accessLevel = "restricted";
    root.series.issues = [
      {
        ...root.series.issues![0],
        accessLevel: "internal"
      }
    ];

    enforceOpenAccessLevel(root);

    expect(root.series.accessLevel).toBe("open");
    expect(root.series.issues?.[0]?.accessLevel).toBe("open");
  });

  it("fills empty dataset access levels with open", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.accessLevel = "";

    enforceOpenAccessLevel(root);

    expect(root.dataset.accessLevel).toBe("open");
  });
});

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
    expect(result.importShape).toBe("xtf");
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
    expect(result.importShape).toBe("xtf");
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

  it("prefills imported issues from the series and derives identifier and title", () => {
    const result = normalizeImportedJson({
      type: "DatasetSeries",
      series: {
        identifier: "ch.foo",
        title: "Ch Foo",
        description: "Serienbeschreibung",
        accessLevel: "open",
        publicationStatus: "published",
        creatorRef: "creator",
        contactPoint: {
          email: "kontakt@example.org"
        },
        themes: ["Geografie"],
        keywords: ["foo"],
        surveyMethod: "Vermessung",
        model: "SO_AGI_DataModel",
        issues: [
          {
            issueLabel: "2026"
          }
        ]
      }
    });

    expect(isDatasetSeriesRoot(result.root)).toBe(true);
    if (!isDatasetSeriesRoot(result.root)) {
      throw new Error("Expected series root");
    }

    const issue = result.root.series.issues?.[0];

    expect(issue?.identifier).toBe("ch.foo_2026");
    expect(issue?.title).toBe("Ch Foo 2026");
    expect(issue?.accessLevel).toBe("open");
    expect(issue?.publicationStatus).toBe("published");
    expect(issue?.model).toBe("SO_AGI_DataModel");
    expect(issue?.__localIssueState?.inheritedGroups?.accessLevel).toBe(true);
    expect(issue?.__localIssueState?.inheritedGroups?.model).toBe(true);
    expect(issue?.__localIssueState?.autoIdentifier).toBe(true);
    expect(issue?.__localIssueState?.autoTitle).toBe(true);
  });

  it("keeps an explicitly imported issue model as overridden", () => {
    const result = normalizeImportedJson({
      type: "DatasetSeries",
      series: {
        identifier: "ch.foo",
        title: "Ch Foo",
        description: "Serienbeschreibung",
        model: "SO_AGI_Series_Model",
        issues: [
          {
            issueLabel: "2026",
            model: "SO_AGI_Issue_Model"
          }
        ]
      }
    });

    expect(isDatasetSeriesRoot(result.root)).toBe(true);
    if (!isDatasetSeriesRoot(result.root)) {
      throw new Error("Expected series root");
    }

    const issue = result.root.series.issues?.[0];

    expect(issue?.model).toBe("SO_AGI_Issue_Model");
    expect(issue?.__localIssueState?.inheritedGroups?.model).toBe(false);
  });
});
