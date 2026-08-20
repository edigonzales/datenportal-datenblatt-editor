import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DatasetSeries } from "../domain/datasetTypes";
import SharedMetadataSections from "./SharedMetadataSections.vue";

describe("SharedMetadataSections temporal coverage", () => {
  it("keeps an explicitly selected mode while its dates are still empty", async () => {
    const user = userEvent.setup();
    const series: DatasetSeries = {
      contactPoint: {
        name: "",
        organizationUnit: "",
        email: "",
        phone: "",
        url: ""
      },
      themes: [],
      keywords: [],
      temporalCoverage: {}
    };

    render(SharedMetadataSections, {
      props: {
        entry: series,
        kind: "dataset",
        idPrefix: "series"
      }
    });

    const rangeRadio = screen.getByLabelText("Zeitraum");
    const referenceRadio = screen.getByLabelText("Stichtag");
    const noneRadio = screen.getByLabelText("Kein Zeitbezug");

    await user.click(rangeRadio);
    expect(rangeRadio).toBeChecked();
    expect(noneRadio).not.toBeChecked();
    expect(screen.getByLabelText("Von")).toBeInTheDocument();
    expect(screen.getByLabelText("Bis")).toBeInTheDocument();

    await user.click(referenceRadio);
    expect(referenceRadio).toBeChecked();
    expect(rangeRadio).not.toBeChecked();
    expect(series.temporalCoverage).toEqual({ startDate: "", endDate: "", referenceDate: "" });
    expect(screen.getByLabelText("Datum")).toBeInTheDocument();

    await user.click(noneRadio);
    expect(noneRadio).toBeChecked();
    expect(referenceRadio).not.toBeChecked();
    expect(series.temporalCoverage).toEqual({ startDate: "", endDate: "", referenceDate: "" });
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();
  });
});
