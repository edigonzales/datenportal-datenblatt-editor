import { fireEvent, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot } from "../domain/normalize";
import DatasetForm from "./DatasetForm.vue";

describe("DatasetForm", () => {
  it("preserves keyword separators while typing and normalizes the dataset values", async () => {
    const user = userEvent.setup();
    const dataset = createEmptyDatasetRoot().dataset;

    render(DatasetForm, {
      props: {
        dataset
      }
    });

    const keywordsInput = screen.getByLabelText("Keywords");

    await user.type(keywordsInput, "Wasser, ");

    expect(keywordsInput).toHaveValue("Wasser, ");
    expect(dataset.keywords).toEqual(["Wasser"]);

    await user.type(keywordsInput, "Nitrat");

    expect(keywordsInput).toHaveValue("Wasser, Nitrat");
    expect(dataset.keywords).toEqual(["Wasser", "Nitrat"]);
    expect(screen.getByText("Wasser")).toBeInTheDocument();
    expect(screen.getByText("Nitrat")).toBeInTheDocument();

    await fireEvent.blur(keywordsInput);

    expect(keywordsInput).toHaveValue("Wasser, Nitrat");
  });
});
