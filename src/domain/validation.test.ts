import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot, createEmptyDatasetSeriesRoot } from "./normalize";
import { validateDataset, validateDatasetSeries, validateImportedStructure } from "./validation";

describe("validateImportedStructure", () => {
  it("accepts dataset series structures", () => {
    const issues = validateImportedStructure({
      type: "DatasetSeries",
      series: {
        issues: []
      }
    });

    expect(issues).toEqual([]);
  });
});

describe("validateDataset", () => {
  it("reports required field errors", () => {
    const result = validateDataset(createEmptyDatasetRoot());
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.issues.some((entry) => entry.path === "$.dataset.identifier")).toBe(true);
  });

  it("detects invalid temporal coverage and date order", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "open";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mailto:mail@example.org";
    root.dataset.contactPoint!.url = "https://example.org/contact";
    root.dataset.themes = ["Raum_und_Umwelt"];
    root.dataset.modified = "2026-05-01";
    root.dataset.temporalCoverage = {
      startDate: "2026-06-01",
      endDate: "2026-05-01"
    };

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "temporal-range-order")).toBe(true);
  });

  it("warns about duplicate attribute names and missing descriptions", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "open";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mailto:mail@example.org";
    root.dataset.contactPoint!.url = "https://example.org/contact";
    root.dataset.themes = ["Raum_und_Umwelt"];
    root.dataset.modified = "2026-05-01";
    root.dataset.attributes = [
      { name: "wert", description: "", dataType: "TEXT", mandatory: true },
      { name: "WERT", description: "vorhanden", dataType: "TEXT", mandatory: false }
    ];

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "attribute-duplicate")).toBe(true);
    expect(result.issues.some((entry) => entry.code === "attribute-description")).toBe(true);
  });

  it("allows a missing contact url for datasets", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "open";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mailto:mail@example.org";
    root.dataset.themes = ["Raum_und_Umwelt"];
    root.dataset.modified = "2026-05-01";

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.path === "$.dataset.contactPoint.url")).toBe(false);
  });

  it("validates model vocabularies and mandatory attribute data types", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "not-a-model-value";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mailto:mail@example.org";
    root.dataset.themes = ["not-a-theme"];
    root.dataset.modified = "2026-05-01";
    root.dataset.attributes = [{ name: "wert", dataType: "", mandatory: false }];

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "invalid-code" && entry.path === "$.dataset.accessLevel")).toBe(true);
    expect(result.issues.some((entry) => entry.code === "invalid-code" && entry.path === "$.dataset.themes[0]")).toBe(true);
    expect(result.issues.some((entry) => entry.code === "attribute-data-type")).toBe(true);
  });
});

describe("validateDatasetSeries", () => {
  it("reports series-level and issue-level problems separately", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.bevoelkerung";
    root.series.title = "Bevölkerungsreihe";
    root.series.description = "Serie";
    root.series.accessLevel = "open";
    root.series.publicationStatus = "published";
    root.series.creatorRef = "creator";
    root.series.contactPoint!.email = "mailto:mail@example.org";
    root.series.contactPoint!.url = "https://example.org/contact";
    root.series.themes = ["Bevoelkerung"];
    root.series.modified = "2026-05-01";
    root.series.issues = [
      {
        __localIssueId: "issue-a",
        identifier: " so.astat.bevoelkerung.2026 ",
        title: "Ausgabe 2026",
        description: "Beschreibung",
        issueLabel: "2026",
        isCurrentIssue: false,
        modified: "not-a-date",
        temporalCoverage: {},
        attributes: []
      }
    ];

    const result = validateDatasetSeries(root, "issue-a");

    expect(result.groups?.find((entry) => entry.scope === "series")?.issues.some((entry) => entry.code === "series-current-issue")).toBe(true);
    expect(result.groups?.find((entry) => entry.issueId === "issue-a")?.issues.some((entry) => entry.code === "identifier-whitespace")).toBe(true);
    expect(result.groups?.find((entry) => entry.issueId === "issue-a")?.issues.some((entry) => entry.code === "date-format")).toBe(true);
  });

  it("accepts inherited issue defaults without duplicating series-level required errors", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "ch.foo";
    root.series.title = "Ch Foo";
    root.series.description = "Serienbeschreibung";
    root.series.accessLevel = "";
    root.series.publicationStatus = "";
    root.series.creatorRef = "creator";
    root.series.contactPoint!.email = "mailto:mail@example.org";
    root.series.contactPoint!.url = "https://example.org/contact";
    root.series.themes = ["Bevoelkerung"];
    root.series.modified = "2026-05-01";

    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }

    issue.issueLabel = "2026";

    const result = validateDatasetSeries(root, issue.__localIssueId);
    const seriesGroup = result.groups?.find((entry) => entry.scope === "series");
    const issueGroup = result.groups?.find((entry) => entry.issueId === issue.__localIssueId);

    expect(seriesGroup?.issues.some((entry) => entry.path === "$.series.accessLevel")).toBe(true);
    expect(issueGroup?.issues.some((entry) => entry.path === "$.series.issues[0].accessLevel")).toBe(false);
    expect(issueGroup?.errorCount).toBe(0);
    expect(result.issueSummaries?.[0]?.title).toBe("Ch Foo 2026");
  });

  it("allows a missing contact url for series metadata", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.bevoelkerung";
    root.series.title = "Bevölkerungsreihe";
    root.series.description = "Serie";
    root.series.accessLevel = "open";
    root.series.publicationStatus = "published";
    root.series.creatorRef = "creator";
    root.series.contactPoint!.email = "mailto:mail@example.org";
    root.series.themes = ["Bevoelkerung"];
    root.series.modified = "2026-05-01";

    const result = validateDatasetSeries(root);

    expect(result.groups?.find((entry) => entry.scope === "series")?.issues.some((entry) => entry.path === "$.series.contactPoint.url")).toBe(false);
  });

  it("still validates invalid contact urls when present", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.accessLevel = "open";
    root.dataset.publicationStatus = "published";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mailto:mail@example.org";
    root.dataset.contactPoint!.url = "not-a-uri";
    root.dataset.themes = ["Raum_und_Umwelt"];
    root.dataset.modified = "2026-05-01";

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "uri-format" && entry.path === "$.dataset.contactPoint.url")).toBe(true);
  });
});
