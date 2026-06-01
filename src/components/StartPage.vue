<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import LocalDraftList from "./LocalDraftList.vue";
import SourceLoadDialog from "./SourceLoadDialog.vue";
import FileImportDialog from "./FileImportDialog.vue";
import ConflictDialog from "./ConflictDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import type { ImportConflictAction, ImportPreview } from "../domain/datasetTypes";
import { useDatasetStore } from "../stores/datasetStore";
import { downloadDataset } from "../services/exportService";
import { validateEditableRoot } from "../domain/validation";

const router = useRouter();
const store = useDatasetStore();

const sourceDialogOpen = ref(false);
const fileDialogOpen = ref(false);
const deleteId = ref("");
const deleteAllRequested = ref(false);

const drafts = computed(() => store.drafts);
const exportableDraftIds = computed(() =>
  drafts.value.filter((entry) => validateEditableRoot(entry.data).errorCount === 0).map((entry) => entry.id)
);
const deleteDialogOpen = computed(() => Boolean(deleteId.value) || deleteAllRequested.value);
const bulkDeleteMessage = computed(() => {
  const draftCount = drafts.value.length;
  const target = draftCount === 1 ? "den lokalen Entwurf" : `alle ${draftCount} lokalen Entwürfe`;
  const activeDraftNotice = store.currentDraft
    ? " Auch der aktuell geladene Entwurf wird gelöscht und der Editor zurückgesetzt."
    : "";
  return `Möchten Sie wirklich ${target} löschen?${activeDraftNotice}`;
});

async function handleImported(preview: ImportPreview): Promise<void> {
  sourceDialogOpen.value = false;
  fileDialogOpen.value = false;
  const draft = await store.stageImport(preview);
  if (draft) {
    void router.push(`/draft/${draft.id}`);
  }
}

async function resolveConflict(action: ImportConflictAction): Promise<void> {
  const draft = await store.resolveConflict(action);
  if (draft) {
    void router.push(`/draft/${draft.id}`);
  }
}

async function createNew(): Promise<void> {
  const draft = await store.createNewDraft();
  void router.push(`/draft/${draft.id}`);
}

async function createNewSeries(): Promise<void> {
  const draft = await store.createNewSeriesDraft();
  void router.push(`/draft/${draft.id}`);
}

async function openDraft(id: string): Promise<void> {
  await store.openDraft(id, "indexeddb");
  void router.push(`/draft/${id}`);
}

async function duplicateDraft(id: string): Promise<void> {
  const draft = await store.duplicateDraft(id);
  await store.openDraft(draft.id, "indexeddb");
  void router.push(`/draft/${draft.id}`);
}

function exportDraft(id: string): void {
  const draft = drafts.value.find((entry) => entry.id === id);
  if (draft && exportableDraftIds.value.includes(id)) {
    downloadDataset(draft.data);
  }
}

async function deleteDraft(): Promise<void> {
  const id = deleteId.value;
  deleteId.value = "";
  await store.deleteDraft(id);
}

async function confirmDelete(): Promise<void> {
  if (deleteAllRequested.value) {
    deleteAllRequested.value = false;
    await store.deleteAllDrafts();
    return;
  }

  await deleteDraft();
}

function closeDeleteDialog(): void {
  deleteId.value = "";
  deleteAllRequested.value = false;
}

function scrollToDrafts(): void {
  document.getElementById("drafts")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="section-stack">
    <section class="action-grid">
      <article class="action-card">
        <h3>Metadaten von Quelle laden</h3>
        <p>Einen XTF-Katalog per URL laden, durchsuchen und Datasets oder DatasetSeries in den Editor übernehmen.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--primary" type="button" @click="sourceDialogOpen = true">Quelle öffnen</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Datenblatt (einzelner Datensatz) importieren</h3>
        <p>Eine lokale XTF/XML-Datei mit genau einem Dataset öffnen und im Editor weiterbearbeiten.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--secondary" type="button" @click="fileDialogOpen = true">Datenblatt importieren</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Neues Datenblatt (einzelner Datensatz) anlegen</h3>
        <p>Mit einem leeren Datenblatt beginnen und Inhalte direkt im Editor erfassen.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--secondary" type="button" @click="createNew">Neues Datenblatt anlegen</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Datenblatt (Serie) importieren</h3>
        <p>Eine lokale XTF/XML-Datei mit Serienkopf und Ausgaben importieren und im Serien-Workspace bearbeiten.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--secondary" type="button" @click="fileDialogOpen = true">Datenblatt importieren</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Neues Datenblatt (Serie) anlegen</h3>
        <p>Mit einem Serienkopf und einer ersten leeren Ausgabe starten.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--secondary" type="button" @click="createNewSeries">Neues Datenblatt anlegen</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Lokalen Entwurf öffnen</h3>
        <p>In diesem Browser gespeicherte Bearbeitungsstände fortsetzen oder exportieren.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--secondary" type="button" @click="scrollToDrafts">Zu den Entwürfen</button>
        </div>
      </article>
    </section>

    <section id="drafts">
      <LocalDraftList
        :drafts="drafts"
        :exportable-ids="exportableDraftIds"
        @open="void openDraft($event)"
        @duplicate="void duplicateDraft($event)"
        @delete="deleteId = $event"
        @delete-all="deleteAllRequested = true"
        @export="exportDraft($event)"
      />
    </section>

    <SourceLoadDialog
      v-if="sourceDialogOpen"
      :initial-source-url="store.lastSourceUrl"
      :initial-organization-unit="store.lastOrganizationUnit"
      @close="sourceDialogOpen = false"
      @imported="void handleImported($event)"
      @remember="void store.rememberSourceFilters($event.sourceUrl, $event.organizationUnit)"
    />

    <FileImportDialog v-if="fileDialogOpen" @close="fileDialogOpen = false" @imported="void handleImported($event)" />

    <ConflictDialog
      v-if="store.pendingConflict"
      :context="store.pendingConflict"
      @close="store.cancelConflict()"
      @resolve="void resolveConflict($event)"
    />

    <ConfirmDialog
      v-if="deleteDialogOpen"
      :title="deleteAllRequested ? 'Alle Entwürfe löschen' : 'Entwurf löschen'"
      :message="deleteAllRequested ? bulkDeleteMessage : 'Möchten Sie diesen lokalen Entwurf wirklich löschen?'"
      confirm-label="Löschen"
      @close="closeDeleteDialog()"
      @confirm="void confirmDelete()"
    />
  </div>
</template>
