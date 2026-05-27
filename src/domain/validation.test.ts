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
    root.dataset.publisherRef = "pub";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mail@example.org";
    root.dataset.issued = "2026-05-12";
    root.dataset.modified = "2026-05-01";
    root.dataset.temporalCoverage = {
      startDate: "2026-06-01",
      endDate: "2026-05-01"
    };

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "date-order")).toBe(true);
    expect(result.issues.some((entry) => entry.code === "temporal-range-order")).toBe(true);
  });

  it("warns about duplicate attribute names and missing descriptions", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";
    root.dataset.description = "Beschreibung";
    root.dataset.publisherRef = "pub";
    root.dataset.creatorRef = "creator";
    root.dataset.contactPoint!.email = "mail@example.org";
    root.dataset.attributes = [
      { name: "wert", description: "", dataType: "TEXT", mandatory: true },
      { name: "WERT", description: "vorhanden", dataType: "TEXT", mandatory: false }
    ];

    const result = validateDataset(root);

    expect(result.issues.some((entry) => entry.code === "attribute-duplicate")).toBe(true);
    expect(result.issues.some((entry) => entry.code === "attribute-description")).toBe(true);
  });
});

describe("validateDatasetSeries", () => {
  it("reports series-level and issue-level problems separately", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "so.astat.bevoelkerung";
    root.series.title = "Bevölkerungsreihe";
    root.series.description = "Serie";
    root.series.publisherRef = "pub";
    root.series.creatorRef = "creator";
    root.series.contactPoint!.email = "mail@example.org";
    root.series.issues = [
      {
        __localIssueId: "issue-a",
        identifier: " so.astat.bevoelkerung.2026 ",
        title: "Ausgabe 2026",
        description: "Beschreibung",
        issueLabel: "2026",
        isCurrentIssue: false,
        issued: "2026-05-12",
        modified: "2026-05-01",
        temporalCoverage: {},
        attributes: []
      }
    ];

    const result = validateDatasetSeries(root, "issue-a");

    expect(result.groups?.find((entry) => entry.scope === "series")?.issues.some((entry) => entry.code === "series-current-issue")).toBe(true);
    expect(result.groups?.find((entry) => entry.issueId === "issue-a")?.issues.some((entry) => entry.code === "identifier-whitespace")).toBe(true);
    expect(result.groups?.find((entry) => entry.issueId === "issue-a")?.issues.some((entry) => entry.code === "date-order")).toBe(true);
  });

  it("accepts inherited issue defaults without duplicating series-level required errors", () => {
    const root = createEmptyDatasetSeriesRoot();
    root.series.identifier = "ch.foo";
    root.series.title = "Ch Foo";
    root.series.description = "Serienbeschreibung";
    root.series.publisherRef = "";
    root.series.creatorRef = "creator";
    root.series.contactPoint!.email = "mail@example.org";

    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }

    issue.issueLabel = "2026";

    const result = validateDatasetSeries(root, issue.__localIssueId);
    const seriesGroup = result.groups?.find((entry) => entry.scope === "series");
    const issueGroup = result.groups?.find((entry) => entry.issueId === issue.__localIssueId);

    expect(seriesGroup?.issues.some((entry) => entry.path === "$.series.publisherRef")).toBe(true);
    expect(issueGroup?.issues.some((entry) => entry.path === "$.series.issues[0].publisherRef")).toBe(false);
    expect(issueGroup?.errorCount).toBe(0);
    expect(result.issueSummaries?.[0]?.title).toBe("Ch Foo 2026");
  });
});
