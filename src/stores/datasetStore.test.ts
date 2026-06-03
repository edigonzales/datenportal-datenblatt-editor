import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createEmptyDatasetRoot, isDatasetRoot } from "../domain/normalize";
import type { DatasetDraftRecord, ImportPreview, SettingRecord } from "../domain/datasetTypes";

const repositoryState = vi.hoisted(() => ({
  drafts: new Map<string, DatasetDraftRecord>(),
  settings: new Map<string, SettingRecord["value"]>()
}));

vi.mock("../services/datasetRepository", () => {
  class MockDatasetRepository {
    async listDrafts(): Promise<DatasetDraftRecord[]> {
      return Array.from(repositoryState.drafts.values()).map(cloneDraft);
    }

    async getDraft(id: string): Promise<DatasetDraftRecord | undefined> {
      const draft = repositoryState.drafts.get(id);
      return draft ? cloneDraft(draft) : undefined;
    }

    async saveDraft(draft: DatasetDraftRecord): Promise<DatasetDraftRecord> {
      const cloned = cloneDraft(draft);
      repositoryState.drafts.set(cloned.id, cloned);
      return cloneDraft(cloned);
    }

    async deleteDraft(id: string): Promise<void> {
      repositoryState.drafts.delete(id);
    }

    async deleteAllDrafts(): Promise<void> {
      repositoryState.drafts.clear();
    }

    async duplicateDraft(id: string): Promise<DatasetDraftRecord> {
      const original = repositoryState.drafts.get(id);
      if (!original) {
        throw new Error("Der lokale Entwurf konnte nicht gefunden werden.");
      }

      const copy = cloneDraft({
        ...original,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString()
      });
      repositoryState.drafts.set(copy.id, copy);
      return cloneDraft(copy);
    }

    async findByIdentifier(
      identifier: string,
      draftKind: DatasetDraftRecord["draftKind"],
      excludeId?: string
    ): Promise<DatasetDraftRecord | undefined> {
      for (const draft of repositoryState.drafts.values()) {
        if (draft.identifier === identifier && draft.draftKind === draftKind && draft.id !== excludeId) {
          return cloneDraft(draft);
        }
      }

      return undefined;
    }

    async getSetting<T = unknown>(key: string): Promise<T | undefined> {
      return repositoryState.settings.get(key) as T | undefined;
    }

    async setSetting(key: string, value: unknown): Promise<void> {
      repositoryState.settings.set(key, value);
    }
  }

  return { DatasetRepository: MockDatasetRepository };
});

import { useDatasetStore } from "./datasetStore";

describe("datasetStore access level enforcement", () => {
  beforeEach(() => {
    repositoryState.drafts.clear();
    repositoryState.settings.clear();
    setActivePinia(createPinia());
  });

  it("normalizes existing drafts to open when opening them in the editor", async () => {
    const root = createEmptyDatasetRoot();
    root.dataset.accessLevel = "restricted";

    const draft: DatasetDraftRecord = {
      id: "draft-1",
      draftKind: "dataset",
      identifier: "so.test",
      title: "Test",
      updatedAt: "2026-06-03T12:00:00.000Z",
      sourceType: "indexeddb",
      schemaVersion: root.schemaVersion,
      data: root,
      dirty: false
    };

    repositoryState.drafts.set(draft.id, cloneDraft(draft));

    const store = useDatasetStore();
    const openedDraft = await store.openDraft(draft.id);

    expect(openedDraft).not.toBeNull();
    expect(store.currentDraft).not.toBeNull();
    expect(openedDraft && isDatasetRoot(openedDraft.data) ? openedDraft.data.dataset.accessLevel : null).toBe("open");
    expect(
      store.currentDraft && isDatasetRoot(store.currentDraft.data) ? store.currentDraft.data.dataset.accessLevel : null
    ).toBe("open");
  });

  it("normalizes imported previews before persisting them", async () => {
    const store = useDatasetStore();
    const root = createEmptyDatasetRoot();
    root.dataset.accessLevel = "internal";

    const preview: ImportPreview = {
      draftKind: "dataset",
      root,
      importShape: "xtf",
      sourceType: "file",
      sourceLabel: "Datei test.xtf",
      originalFileName: "test.xtf"
    };

    const persistedDraft = await store.stageImport(preview);

    expect(persistedDraft).not.toBeNull();
    expect(store.currentDraft).not.toBeNull();
    expect(
      persistedDraft && isDatasetRoot(persistedDraft.data) ? persistedDraft.data.dataset.accessLevel : null
    ).toBe("open");
    expect(
      store.currentDraft && isDatasetRoot(store.currentDraft.data) ? store.currentDraft.data.dataset.accessLevel : null
    ).toBe("open");
  });
});

function cloneDraft(draft: DatasetDraftRecord): DatasetDraftRecord {
  return JSON.parse(JSON.stringify(draft)) as DatasetDraftRecord;
}
