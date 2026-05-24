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

const router = useRouter();
const store = useDatasetStore();

const sourceDialogOpen = ref(false);
const fileDialogOpen = ref(false);
const deleteId = ref("");

const drafts = computed(() => store.drafts);

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
  if (draft) {
    downloadDataset(draft.data);
  }
}

async function deleteDraft(): Promise<void> {
  const id = deleteId.value;
  deleteId.value = "";
  await store.deleteDraft(id);
}

function scrollToDrafts(): void {
  document.getElementById("drafts")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="section-stack">
    <section class="action-grid">
      <article class="action-card">
        <h3>Datenblatt von Quelle laden</h3>
        <p>Metadaten aus einer konfigurierten Quelle durchsuchen, prüfen und übernehmen.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--primary" type="button" @click="sourceDialogOpen = true">Quelle öffnen</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Datenblatt importieren</h3>
        <p>Eine lokale Datei vom Computer öffnen, validieren und in den Editor laden.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--primary" type="button" @click="fileDialogOpen = true">Datenblatt importieren</button>
        </div>
      </article>

      <article class="action-card">
        <h3>Lokalen Entwurf öffnen</h3>
        <p>In diesem Browser gespeicherte Bearbeitungsstände fortsetzen oder exportieren.</p>
        <div class="card-actions" style="margin-top: 16px">
          <button class="button button--primary" type="button" @click="scrollToDrafts">Zu den Entwürfen</button>
          <button class="button" type="button" @click="createNew">Neues Datenblatt anlegen</button>
        </div>
      </article>
    </section>

    <section id="drafts">
      <LocalDraftList
        :drafts="drafts"
        @open="void openDraft($event)"
        @duplicate="void duplicateDraft($event)"
        @delete="deleteId = $event"
        @export="exportDraft($event)"
      />
    </section>

    <SourceLoadDialog
      v-if="sourceDialogOpen"
      :initial-source-id="store.lastSelectedSourceId"
      :initial-organization-unit="store.lastOrganizationUnit"
      @close="sourceDialogOpen = false"
      @imported="void handleImported($event)"
      @remember="void store.rememberSourceFilters($event.sourceId, $event.organizationUnit)"
    />

    <FileImportDialog v-if="fileDialogOpen" @close="fileDialogOpen = false" @imported="void handleImported($event)" />

    <ConflictDialog
      v-if="store.pendingConflict"
      :context="store.pendingConflict"
      @close="store.cancelConflict()"
      @resolve="void resolveConflict($event)"
    />

    <ConfirmDialog
      v-if="deleteId"
      title="Entwurf löschen"
      message="Möchten Sie diesen lokalen Entwurf wirklich löschen?"
      confirm-label="Löschen"
      @close="deleteId = ''"
      @confirm="void deleteDraft()"
    />
  </div>
</template>
