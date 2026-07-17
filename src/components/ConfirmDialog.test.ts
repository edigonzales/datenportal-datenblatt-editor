import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog.vue";

describe("ConfirmDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the title as h3 with standard message styling", () => {
    const { container } = render(ConfirmDialog, {
      props: {
        title: "Alle Entwürfe löschen",
        message: "Möchten Sie wirklich den lokalen Entwurf löschen?"
      }
    });

    expect(screen.getByRole("heading", { name: "Alle Entwürfe löschen" })).toHaveProperty("tagName", "H3");
    expect(container.querySelector("h2")).not.toBeInTheDocument();
    expect(screen.getByText("Möchten Sie wirklich den lokalen Entwurf löschen?")).not.toHaveClass("muted");
  });

  it("keeps cancel and confirm actions emitting their events", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(ConfirmDialog, {
      props: {
        title: "Entwurf löschen",
        message: "Bitte bestätigen.",
        "onClose": onClose,
        "onConfirm": onConfirm
      }
    });

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await user.click(screen.getByRole("button", { name: "Bestätigen" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
