import { defineStore } from "pinia";
import type {
  AppMode,
  ConflictResolutionContext,
  DatasetDraftRecord,
  DatasetRootJson,
  DatasetSourceType,
  ImportConflictAction,
  ImportPreview,
  SaveState
} from "../domain/datasetTypes";
import { createEmptyDatasetRoot, cloneDatasetRoot } from "../domain/normalize";
import { DatasetRepository } from "../services/datasetRepository";

const repository = new DatasetRepository();
const AUTOSAVE_DELAY = 750;

function timestamp(): string {
  return new Date().toISOString();
}

function snapshot(root: DatasetRootJson | null): string {
  return JSON.stringify(root ?? null);
}

export const useDatasetStore = defineStore("dataset", {
  state: () => ({
    appMode: "empty" as AppMode,
    drafts: [] as DatasetDraftRecord[],
    currentDraft: null as DatasetDraftRecord | null,
    sessionSourceType: null as DatasetSourceType | null,
    sessionSourceLabel: "" as string,
    saveState: "idle" as SaveState,
    saveError: "" as string,
    pendingConflict: null as ConflictResolutionContext | null,
    lastPersistedSnapshot: snapshot(null),
    autosaveTimer: null as ReturnType<typeof setTimeout> | null,
    lastSelectedSourceId: "",
    lastOrganizationUnit: ""
  }),
  getters: {
    contextLabel(state): string {
      if (!state.currentDraft) {
        return "";
      }
      if (state.sessionSourceType === "file") {
        return "Importierte Datei";
      }
      if (state.sessionSourceType === "endpoint") {
        return "Von Quelle geladen";
      }
      if (state.sessionSourceType === "new") {
        return "Neues Datenblatt";
      }
      return "Lokaler Entwurf";
    },
    contextMeta(state): string {
      if (!state.currentDraft) {
        return "";
      }
      if (state.sessionSourceType === "endpoint") {
        return state.sessionSourceLabel || "Quelle";
      }
      if (state.sessionSourceType === "file") {
        return state.sessionSourceLabel || "Datei";
      }
      if (state.saveState === "saved") {
        return `zuletzt gespeichert ${new Date(state.currentDraft.updatedAt).toLocaleTimeString("de-CH", {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
      }
      return state.sessionSourceLabel || "lokal";
    },
    saveStatusLabel(state): string {
      switch (state.saveState) {
        case "dirty":
          return "Ungespeicherte Änderungen";
        case "saving":
          return "Speichern...";
        case "saved":
          return "Gespeichert lokal";
        case "error":
          return "Speicherfehler";
        default:
          return "Bereit";
      }
    }
  },
  actions: {
    async initialize(): Promise<void> {
      await this.refreshDrafts();
      this.lastSelectedSourceId = (await repository.getSetting<string>("lastSourceId")) ?? "dev";
      this.lastOrganizationUnit = (await repository.getSetting<string>("lastOrganizationUnit")) ?? "";
    },

    async rememberSourceFilters(sourceId: string, organizationUnit: string): Promise<void> {
      this.lastSelectedSourceId = sourceId;
      this.lastOrganizationUnit = organizationUnit;
      await repository.setSetting("lastSourceId", sourceId);
      await repository.setSetting("lastOrganizationUnit", organizationUnit);
    },

    async refreshDrafts(): Promise<void> {
      this.drafts = await repository.listDrafts();
    },

    async openDraft(id: string, sourceType: DatasetSourceType = "indexeddb"): Promise<DatasetDraftRecord | null> {
      const draft = await repository.getDraft(id);
      if (!draft) {
        return null;
      }

      this.currentDraft = draft;
      this.sessionSourceType = sourceType;
      this.sessionSourceLabel = draft.sourceLabel ?? "";
      this.appMode = "editing-dataset";
      this.saveState = "saved";
      this.saveError = "";
      this.lastPersistedSnapshot = snapshot(draft.data);
      return draft;
    },

    async createNewDraft(): Promise<DatasetDraftRecord> {
      const draft = await repository.saveDraft({
        id: crypto.randomUUID(),
        identifier: "",
        title: "",
        updatedAt: timestamp(),
        sourceType: "new",
        schemaVersion: createEmptyDatasetRoot().schemaVersion,
        data: createEmptyDatasetRoot(),
        dirty: false
      });
      await this.refreshDrafts();
      await this.openDraft(draft.id, "new");
      return draft;
    },

    async stageImport(preview: ImportPreview): Promise<DatasetDraftRecord | null> {
      const identifier = preview.root.dataset.identifier?.trim() ?? "";
      const existingDraft = identifier ? await repository.findByIdentifier(identifier) : undefined;

      if (existingDraft) {
        this.pendingConflict = { existingDraft, preview };
        return null;
      }

      return this.persistPreview(preview);
    },

    async resolveConflict(action: ImportConflictAction): Promise<DatasetDraftRecord | null> {
      const context = this.pendingConflict;
      this.pendingConflict = null;
      if (!context) {
        return null;
      }

      if (action === "open-existing") {
        await this.openDraft(context.existingDraft.id, "indexeddb");
        return context.existingDraft;
      }

      if (action === "overwrite") {
        return this.persistPreview(context.preview, context.existingDraft.id);
      }

      return this.persistPreview(context.preview);
    },

    cancelConflict(): void {
      this.pendingConflict = null;
    },

    async duplicateDraft(id: string): Promise<DatasetDraftRecord> {
      const draft = await repository.duplicateDraft(id);
      await this.refreshDrafts();
      return draft;
    },

    async deleteDraft(id: string): Promise<void> {
      await repository.deleteDraft(id);
      if (this.currentDraft?.id === id) {
        this.currentDraft = null;
        this.sessionSourceType = null;
        this.sessionSourceLabel = "";
        this.appMode = "empty";
        this.saveState = "idle";
      }
      await this.refreshDrafts();
    },

    markDirty(): void {
      if (!this.currentDraft) {
        return;
      }

      const currentSnapshot = snapshot(this.currentDraft.data);
      if (currentSnapshot === this.lastPersistedSnapshot) {
        return;
      }

      this.saveState = "dirty";
      this.saveError = "";
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
      }
      this.autosaveTimer = setTimeout(() => {
        void this.persistCurrentDraft();
      }, AUTOSAVE_DELAY);
    },

    async persistCurrentDraft(): Promise<void> {
      if (!this.currentDraft) {
        return;
      }

      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }

      this.saveState = "saving";
      this.saveError = "";
      try {
        const persisted = await repository.saveDraft({
          ...this.currentDraft,
          identifier: this.currentDraft.data.dataset.identifier?.trim() ?? "",
          title: this.currentDraft.data.dataset.title?.trim() ?? "",
          schemaVersion: this.currentDraft.data.schemaVersion,
          updatedAt: timestamp(),
          dirty: false,
          data: cloneDatasetRoot(this.currentDraft.data)
        });
        this.currentDraft = persisted;
        this.lastPersistedSnapshot = snapshot(persisted.data);
        this.saveState = "saved";
        await this.refreshDrafts();
      } catch (error) {
        this.saveState = "error";
        this.saveError = error instanceof Error ? error.message : "Der Entwurf konnte nicht gespeichert werden.";
      }
    },

    setCurrentDraftData(root: DatasetRootJson): void {
      if (!this.currentDraft) {
        return;
      }
      this.currentDraft.data = root;
      this.markDirty();
    },

    updateSessionSource(sourceType: DatasetSourceType, label = ""): void {
      this.sessionSourceType = sourceType;
      this.sessionSourceLabel = label;
    },

    async persistPreview(preview: ImportPreview, overrideId?: string): Promise<DatasetDraftRecord> {
      const now = timestamp();
      const root = cloneDatasetRoot(preview.root);
      const draft = await repository.saveDraft({
        id: overrideId ?? crypto.randomUUID(),
        identifier: root.dataset.identifier?.trim() ?? "",
        title: root.dataset.title?.trim() ?? "",
        updatedAt: now,
        sourceType: preview.sourceType,
        sourceLabel: preview.sourceLabel,
        sourceUrl: preview.sourceUrl,
        originalFileName: preview.originalFileName,
        schemaVersion: root.schemaVersion,
        data: root,
        dirty: false
      });
      await this.refreshDrafts();
      await this.openDraft(draft.id, preview.sourceType);
      return draft;
    }
  }
});
