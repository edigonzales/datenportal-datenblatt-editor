import { fireEvent, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TemporalCoverage } from "../domain/datasetTypes";
import TemporalCoverageForm from "./TemporalCoverageForm.vue";

describe("TemporalCoverageForm", () => {
  it("switches between exclusive modes and clears incompatible dates", async () => {
    const user = userEvent.setup();
    const coverage: TemporalCoverage = {};

    render(TemporalCoverageForm, {
      props: {
        coverage
      }
    });

    const rangeRadio = screen.getByLabelText("Zeitraum");
    const referenceRadio = screen.getByLabelText("Stichtag");
    const noneRadio = screen.getByLabelText("Kein Zeitbezug");

    expect(noneRadio).toBeChecked();
    expect(rangeRadio).not.toBeChecked();
    expect(referenceRadio).not.toBeChecked();
    expect(screen.queryByLabelText("Von")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Bis")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();

    await user.click(rangeRadio);

    expect(rangeRadio).toBeChecked();
    expect(referenceRadio).not.toBeChecked();
    expect(noneRadio).not.toBeChecked();

    const startInput = screen.getByLabelText("Von");
    const endInput = screen.getByLabelText("Bis");

    await fireEvent.update(startInput, "2026-05-01");
    await fireEvent.update(endInput, "2026-05-31");

    expect(coverage.startDate).toBe("2026-05-01");
    expect(coverage.endDate).toBe("2026-05-31");
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();

    await user.click(referenceRadio);

    expect(referenceRadio).toBeChecked();
    expect(rangeRadio).not.toBeChecked();
    expect(noneRadio).not.toBeChecked();
    expect(screen.queryByLabelText("Von")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Bis")).not.toBeInTheDocument();
    expect(coverage.startDate).toBe("");
    expect(coverage.endDate).toBe("");
    expect(coverage.referenceDate).toBe("");

    const referenceInput = screen.getByLabelText("Datum");

    await fireEvent.update(referenceInput, "2026-05-15");

    expect(coverage.referenceDate).toBe("2026-05-15");

    await user.click(noneRadio);

    expect(noneRadio).toBeChecked();
    expect(rangeRadio).not.toBeChecked();
    expect(referenceRadio).not.toBeChecked();
    expect(screen.queryByLabelText("Von")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Bis")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();
    expect(coverage.startDate).toBe("");
    expect(coverage.endDate).toBe("");
    expect(coverage.referenceDate).toBe("");
  });
});
