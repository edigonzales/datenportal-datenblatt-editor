import { defineStore } from "pinia";
import { normalizeSourceIndexUrl } from "../config/metadataSources";
import type {
  AppMode,
  ConflictResolutionContext,
  DatasetDraftRecord,
  DatasetSourceType,
  EditableRootJson,
  ImportConflictAction,
  ImportPreview,
  SaveState
} from "../domain/datasetTypes";
import {
  cloneRoot,
  createEmptyDatasetRoot,
  createEmptyDatasetSeriesRoot,
  enforceOpenAccessLevel,
  getRootIdentifier,
  getRootTitle
} from "../domain/normalize";
import { formatTime } from "../services/dateFormat";
import { DatasetRepository } from "../services/datasetRepository";

const repository = new DatasetRepository();
const AUTOSAVE_DELAY = 750;

function timestamp(): string {
  return new Date().toISOString();
}

function snapshot(root: EditableRootJson | null): string {
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
    lastSourceUrl: "",
    lastOrganizationUnit: ""
  }),
  getters: {
    contextLabel(state): string {
      if (!state.currentDraft) {
        return "";
      }
      const entityLabel = state.currentDraft.draftKind === "series" ? "Datensatzserie" : "Datenblatt";
      if (state.sessionSourceType === "file") {
        return `Importierte ${entityLabel}`;
      }
      if (state.sessionSourceType === "endpoint") {
        return "Von Quelle geladen";
      }
      if (state.sessionSourceType === "new") {
        return state.currentDraft.draftKind === "series" ? "Neue Datensatzserie" : "Neues Datenblatt";
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
        return `zuletzt gespeichert ${formatTime(state.currentDraft.updatedAt)}`;
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
      const storedSourceUrl = await repository.getSetting<string>("lastSourceUrl");
      this.lastSourceUrl = normalizeSourceIndexUrl(storedSourceUrl);
      if (storedSourceUrl !== this.lastSourceUrl) {
        await repository.setSetting("lastSourceUrl", this.lastSourceUrl);
      }
      this.lastOrganizationUnit = (await repository.getSetting<string>("lastOrganizationUnit")) ?? "";
    },

    async rememberSourceFilters(sourceUrl: string, organizationUnit: string): Promise<void> {
      this.lastSourceUrl = normalizeSourceIndexUrl(sourceUrl);
      this.lastOrganizationUnit = organizationUnit;
      await repository.setSetting("lastSourceUrl", this.lastSourceUrl);
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

      enforceOpenAccessLevel(draft.data);
      this.currentDraft = draft;
      this.sessionSourceType = sourceType;
      this.sessionSourceLabel = draft.sourceLabel ?? "";
      this.appMode = draft.draftKind === "series" ? "editing-series" : "editing-dataset";
      this.saveState = "saved";
      this.saveError = "";
      this.lastPersistedSnapshot = snapshot(draft.data);
      return draft;
    },

    async createNewDraft(): Promise<DatasetDraftRecord> {
      const draft = await repository.saveDraft({
        id: crypto.randomUUID(),
        draftKind: "dataset",
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

    async createNewSeriesDraft(): Promise<DatasetDraftRecord> {
      const root = createEmptyDatasetSeriesRoot();
      const draft = await repository.saveDraft({
        id: crypto.randomUUID(),
        draftKind: "series",
        identifier: "",
        title: "",
        updatedAt: timestamp(),
        sourceType: "new",
        schemaVersion: root.schemaVersion,
        data: root,
        dirty: false
      });
      await this.refreshDrafts();
      await this.openDraft(draft.id, "new");
      return draft;
    },

    async stageImport(preview: ImportPreview): Promise<DatasetDraftRecord | null> {
      const identifier = getRootIdentifier(preview.root).trim();
      const existingDraft = identifier ? await repository.findByIdentifier(identifier, preview.draftKind) : undefined;

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
        this.resetEditorState();
      }
      await this.refreshDrafts();
    },

    async deleteAllDrafts(): Promise<void> {
      await repository.deleteAllDrafts();
      this.resetEditorState();
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
        enforceOpenAccessLevel(this.currentDraft.data);
        const persisted = await repository.saveDraft({
          ...this.currentDraft,
          identifier: getRootIdentifier(this.currentDraft.data).trim(),
          title: getRootTitle(this.currentDraft.data).trim(),
          schemaVersion: this.currentDraft.data.schemaVersion,
          updatedAt: timestamp(),
          dirty: false,
          data: cloneRoot(this.currentDraft.data)
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

    setCurrentDraftData(root: EditableRootJson): void {
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

    resetEditorState(): void {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }

      this.currentDraft = null;
      this.sessionSourceType = null;
      this.sessionSourceLabel = "";
      this.appMode = "empty";
      this.saveState = "idle";
      this.saveError = "";
      this.lastPersistedSnapshot = snapshot(null);
    },

    async persistPreview(preview: ImportPreview, overrideId?: string): Promise<DatasetDraftRecord> {
      const now = timestamp();
      const root = cloneRoot(preview.root);
      enforceOpenAccessLevel(root);
      const draft = await repository.saveDraft({
        id: overrideId ?? crypto.randomUUID(),
        draftKind: preview.draftKind,
        identifier: getRootIdentifier(root).trim(),
        title: getRootTitle(root).trim(),
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
