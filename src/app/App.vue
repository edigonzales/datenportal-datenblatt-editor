<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { downloadDataset } from "../services/exportService";
import { getRootIdentifier, getRootTitle } from "../domain/normalize";
import { validateEditableRoot } from "../domain/validation";
import { useDatasetStore } from "../stores/datasetStore";

const store = useDatasetStore();
const route = useRoute();

const currentDraftId = computed(() => store.currentDraft?.id ?? "");
const activeTab = computed(() => String(route.meta.tab ?? "start"));
const currentIssueId = computed(() => (typeof route.params.issueId === "string" ? route.params.issueId : undefined));
const currentDraftKind = computed(() => store.currentDraft?.draftKind ?? "dataset");
const currentDraftTitle = computed(() => {
  const title = store.currentDraft ? getRootTitle(store.currentDraft.data).trim() : "";
  if (title) {
    return title;
  }
  return currentDraftKind.value === "series" ? "Unbenannte Datensatzserie" : "Unbenanntes Datenblatt";
});
const currentDraftIdentifier = computed(() => {
  const identifier = store.currentDraft ? getRootIdentifier(store.currentDraft.data).trim() : "";
  return identifier || "Identifier noch nicht gesetzt";
});
const currentValidation = computed(() =>
  store.currentDraft ? validateEditableRoot(store.currentDraft.data, currentIssueId.value) : null
);
const editorTabs = computed(() => {
  if (currentDraftKind.value === "series") {
    return [
      { key: "main", label: "Serie", to: currentDraftId.value ? `/draft/${currentDraftId.value}` : "/" },
      { key: "issues", label: "Ausgaben", to: currentDraftId.value ? `/draft/${currentDraftId.value}/issues` : "/" },
      { key: "json", label: "Datenblatt-Vorschau", to: currentDraftId.value ? `/draft/${currentDraftId.value}/json` : "/" }
    ];
  }

  return [
    { key: "main", label: "Datensatz", to: currentDraftId.value ? `/draft/${currentDraftId.value}` : "/" },
    { key: "attributes", label: "Attribute", to: currentDraftId.value ? `/draft/${currentDraftId.value}/attributes` : "/" },
    { key: "json", label: "Datenblatt-Vorschau", to: currentDraftId.value ? `/draft/${currentDraftId.value}/json` : "/" }
  ];
});
const exportDisabled = computed(() => !store.currentDraft || (currentValidation.value?.errorCount ?? 0) > 0);

function exportCurrentDraft(): void {
  if (!store.currentDraft || exportDisabled.value) {
    return;
  }

  downloadDataset(store.currentDraft.data);
}

onMounted(async () => {
  await store.initialize();
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <h1>Metadaten lokal bearbeiten</h1>
    </header>

    <nav class="tabs">
      <RouterLink class="tab" :class="{ 'tab--active': activeTab === 'start' }" to="/">Start</RouterLink>
      <RouterLink
        v-for="tab in editorTabs"
        :key="tab.key"
        class="tab"
        :class="{ 'tab--active': activeTab === tab.key }"
        :to="tab.to"
        :aria-disabled="!currentDraftId"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <div v-if="store.currentDraft" class="context-bar">
      <div class="context-bar__text">
        <div class="context-bar__group">
          <span>{{ store.contextLabel }}</span>
          <span class="context-bar__dot">|</span>
          <span>{{ currentDraftKind === "series" ? "Datensatzserie" : "Datenblatt" }}</span>
          <span class="context-bar__dot">|</span>
          <span>{{ store.contextMeta }}</span>
        </div>
        <div class="context-bar__detail">
          <strong>{{ currentDraftTitle }}</strong>
          <span class="mono">{{ currentDraftIdentifier }}</span>
        </div>
      </div>
      <div class="context-bar__actions">
        <button class="button" type="button" :disabled="exportDisabled" @click="exportCurrentDraft">
          <i class="bi bi-download"></i> Datenblatt exportieren
        </button>
        <span class="status-pill" :data-state="store.saveState">{{ store.saveStatusLabel }}</span>
      </div>
    </div>

    <main class="page">
      <RouterView />
    </main>
  </div>
</template>
