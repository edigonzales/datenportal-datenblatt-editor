import { describe, expect, it } from "vitest";
import { createEmptyDatasetSeriesRoot } from "./normalize";
import {
  createEffectiveIssue,
  ensureIssueLocalState,
  markIssueGroupOverridden,
  syncIssueFromSeriesDefaults
} from "./seriesIssues";

describe("seriesIssues model inheritance", () => {
  it("propagates the series model to inherited issues", () => {
    const root = createEmptyDatasetSeriesRoot();
    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }

    root.series.model = "SO_AGI_Series_Model";
    syncIssueFromSeriesDefaults(root.series, issue);

    expect(issue.model).toBe("SO_AGI_Series_Model");

    root.series.model = "SO_AGI_Series_Model_V2";
    syncIssueFromSeriesDefaults(root.series, issue);

    expect(issue.model).toBe("SO_AGI_Series_Model_V2");
  });

  it("keeps an overridden issue model untouched and effective", () => {
    const root = createEmptyDatasetSeriesRoot();
    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }

    root.series.model = "SO_AGI_Series_Model";
    syncIssueFromSeriesDefaults(root.series, issue);
    markIssueGroupOverridden(issue, "model");
    issue.model = "SO_AGI_Issue_Model";

    root.series.model = "SO_AGI_Series_Model_V2";
    syncIssueFromSeriesDefaults(root.series, issue);

    expect(issue.model).toBe("SO_AGI_Issue_Model");
    expect(createEffectiveIssue(root.series, issue).model).toBe("SO_AGI_Issue_Model");
  });

  it("does not replace local issue state while creating effective values", () => {
    const root = createEmptyDatasetSeriesRoot();
    const issue = root.series.issues?.[0];
    if (!issue) {
      throw new Error("Expected initial issue");
    }

    const localState = ensureIssueLocalState(issue);

    createEffectiveIssue(root.series, issue);
    createEffectiveIssue(root.series, issue);

    expect(issue.__localIssueState).toBe(localState);
  });
});
