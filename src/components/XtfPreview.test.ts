import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";
import { createEmptyDatasetRoot } from "../domain/normalize";
import XtfPreview from "./XtfPreview.vue";

describe("XtfPreview", () => {
  it("renders the preview heading and highlighted xml tokens", () => {
    const root = createEmptyDatasetRoot();
    root.dataset.identifier = "so.afu.test";
    root.dataset.title = "Test";

    const { container } = render(XtfPreview, {
      props: {
        root
      }
    });

    expect(screen.getByRole("heading", { name: "Vorschau" })).toBeInTheDocument();
    expect(container.querySelector(".xml-token--tag")).not.toBeNull();
    expect(container.querySelector(".xml-token--attr-name")).not.toBeNull();
    expect(container.querySelector(".xml-token--attr-value")).not.toBeNull();
  });
});
