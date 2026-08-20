<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AttributeTable from "./AttributeTable.vue";
import DatasetForm from "./DatasetForm.vue";
import SeriesIssueWorkspace from "./SeriesIssueWorkspace.vue";
import ValidationPanel from "./ValidationPanel.vue";
import XtfPreview from "./XtfPreview.vue";
import { isDatasetSeriesRoot } from "../domain/normalize";
import { useDatasetStore } from "../stores/datasetStore";
import { validateEditableRoot } from "../domain/validation";

const props = defineProps<{
  tab: "main" | "issues" | "xtf";
}>();

const route = useRoute();
const router = useRouter();
const store = useDatasetStore();

const currentDraft = computed(() => store.currentDraft);
const activeIssueId = computed(() => (typeof route.params.issueId === "string" ? route.params.issueId : undefined));
const currentSeriesRoot = computed(() =>
  currentDraft.value && isDatasetSeriesRoot(currentDraft.value.data) ? currentDraft.value.data : null
);
const currentDatasetRoot = computed(() =>
  currentDraft.value && !isDatasetSeriesRoot(currentDraft.value.data) ? currentDraft.value.data : null
);
const validation = computed(() =>
  currentDraft.value ? validateEditableRoot(currentDraft.value.data, activeIssueId.value) : null
);
const isFramelessEditorView = computed(() => props.tab === "main" || props.tab === "issues");

function markDraftChanged(): void {
  store.markDirty();
}

watch(
  () => route.params.id,
  async (id) => {
    if (typeof id !== "string") {
      return;
    }
    if (store.currentDraft?.id === id) {
      return;
    }
    const draft = await store.openDraft(id, "indexeddb");
    if (!draft) {
      void router.push("/");
    }
  },
  { immediate: true }
);

watch(
  [currentDraft, currentSeriesRoot, activeIssueId, () => props.tab],
  ([draft, seriesRoot, issueId, tab]) => {
    if (!draft) {
      return;
    }

    if (draft.draftKind === "dataset") {
      if (tab === "issues") {
        void router.replace(`/draft/${draft.id}`);
      }
      return;
    }

    if (tab !== "issues") {
      return;
    }

    const availableIssueIds = (seriesRoot?.series.issues ?? [])
      .map((entry) => entry.__localIssueId)
      .filter((entry): entry is string => typeof entry === "string");
    const targetIssueId = issueId && availableIssueIds.includes(issueId) ? issueId : availableIssueIds[0];

    if (targetIssueId && issueId !== targetIssueId) {
      void router.replace(`/draft/${draft.id}/issues/${targetIssueId}`);
    }
  },
  { immediate: true }
);

function openSeriesIssue(issueId: string): void {
  if (!currentDraft.value) {
    return;
  }
  void router.push(`/draft/${currentDraft.value.id}/issues/${issueId}`);
}
</script>

<template>
  <div v-if="currentDraft && validation" class="grid-main" :class="{ 'grid-main--frameless': isFramelessEditorView }">
    <div class="section-stack">
      <section v-if="store.saveState === 'error'" class="surface surface--alert section-stack">
        <div>
          <h2>Speichern fehlgeschlagen</h2>
          <p class="muted">{{ store.saveError }}</p>
        </div>
      </section>

      <template v-if="currentDatasetRoot">
        <div v-if="tab === 'main'" class="section-stack">
          <DatasetForm :dataset="currentDatasetRoot.dataset" @changed="markDraftChanged" />
          <AttributeTable
            :attributes="currentDatasetRoot.dataset.attributes ?? (currentDatasetRoot.dataset.attributes = [])"
            title="Datensatzattribute"
            description="Attribute, die zu diesem Datensatz gehören."
            empty-title="Noch keine Datensatzattribute"
            empty-message="Fügen Sie hier die Attribute dieses Datensatzes hinzu."
            @changed="markDraftChanged"
          />
        </div>
        <XtfPreview v-else :root="currentDatasetRoot" />
      </template>

      <template v-else-if="currentSeriesRoot">
        <div v-if="tab === 'main'" class="section-stack">
          <DatasetForm :dataset="currentSeriesRoot.series" mode="series" @changed="markDraftChanged" />
          <AttributeTable
            :attributes="currentSeriesRoot.series.attributes ?? (currentSeriesRoot.series.attributes = [])"
            title="Serien-Attribute"
            description="Gemeinsame Attribute der Datensatzserie."
            empty-title="Noch keine Serien-Attribute"
            empty-message="Fügen Sie hier Attribute hinzu, die für alle Ausgaben gelten."
            @changed="markDraftChanged"
          />
        </div>
        <SeriesIssueWorkspace
          v-else-if="tab === 'issues'"
          :series="currentSeriesRoot.series"
          :validation="validation"
          :active-issue-id="activeIssueId"
          @changed="markDraftChanged"
          @select="openSeriesIssue($event)"
        />
        <XtfPreview v-else :root="currentSeriesRoot" />
      </template>
    </div>

    <div class="validation-column">
      <ValidationPanel :validation="validation" />
    </div>
  </div>

  <div v-else class="empty-state" style="padding: 24px">
    <h2>Entwurf wird geladen</h2>
    <p>Falls kein Entwurf gefunden wird, wechseln Sie zur Startseite und laden Sie ein Datenblatt oder eine Datensatzserie.</p>
  </div>
</template>
