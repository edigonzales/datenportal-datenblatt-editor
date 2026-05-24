import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot } from "./normalize";
import { validateDataset, validateImportedStructure } from "./validation";

describe("validateImportedStructure", () => {
  it("rejects dataset series structures", () => {
    const issues = validateImportedStructure({
      type: "DatasetSeries",
      series: {}
    });

    expect(issues[0]?.code).toBe("dataset-series");
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
