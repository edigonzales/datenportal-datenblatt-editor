import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DatasetDraftRecord } from "../domain/datasetTypes";
import { createEmptyDatasetRoot } from "../domain/normalize";
import LocalDraftList from "./LocalDraftList.vue";

function createDraft(id: string): DatasetDraftRecord {
  const root = createEmptyDatasetRoot();
  root.dataset.identifier = `so.test.${id}`;
  root.dataset.title = `Test ${id}`;

  return {
    id,
    draftKind: "dataset",
    identifier: root.dataset.identifier ?? "",
    title: root.dataset.title ?? "",
    updatedAt: "2026-05-24T09:00:00.000Z",
    sourceType: "new",
    schemaVersion: root.schemaVersion,
    data: root,
    dirty: false
  };
}

describe("LocalDraftList", () => {
  it("shows the bulk delete button only when drafts exist", () => {
    render(LocalDraftList, {
      props: {
        drafts: []
      }
    });

    expect(screen.queryByRole("button", { name: "Alle löschen" })).not.toBeInTheDocument();
  });

  it("emits delete-all when the bulk delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDeleteAll = vi.fn();

    render(LocalDraftList, {
      props: {
        drafts: [createDraft("draft-1")],
        "onDelete-all": onDeleteAll
      }
    });

    await user.click(screen.getByRole("button", { name: "Alle löschen" }));

    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });
});
