<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useDatasetStore } from "../stores/datasetStore";
import { downloadDataset } from "../services/exportService";
import { validateDataset } from "../domain/validation";

const store = useDatasetStore();
const route = useRoute();
const router = useRouter();

const currentDraftId = computed(() => store.currentDraft?.id ?? "");
const activeTab = computed(() => String(route.meta.tab ?? "start"));
const validation = computed(() => (store.currentDraft ? validateDataset(store.currentDraft.data) : null));
const downloadDisabled = computed(() => !store.currentDraft || (validation.value?.errorCount ?? 0) > 0);
const currentDraftTitle = computed(() => store.currentDraft?.data.dataset.title?.trim() || "Unbenanntes Datenblatt");
const currentDraftIdentifier = computed(() => store.currentDraft?.data.dataset.identifier?.trim() || "Identifier noch nicht gesetzt");

onMounted(async () => {
  await store.initialize();
});

function goToStart(): void {
  void router.push("/");
}

function downloadCurrent(): void {
  if (!store.currentDraft || (validation.value?.errorCount ?? 0) > 0) {
    return;
  }
  downloadDataset(store.currentDraft.data);
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__identity">
        <p class="eyebrow">Kanton Solothurn <span class="eyebrow__dot">•</span> Datenportal</p>
        <h1>Metadaten und Daten lokal bearbeiten</h1>
      </div>
      <div class="toolbar-actions">
        <button class="button button--subtle" type="button" @click="goToStart">Datenblatt laden</button>
        <button
          class="button button--primary"
          type="button"
          :disabled="downloadDisabled"
          title="Export ist nur ohne Validierungsfehler möglich."
          @click="downloadCurrent"
        >
          Datenblatt exportieren
        </button>
      </div>
    </header>

    <nav class="tabs">
      <RouterLink class="tab" :class="{ 'tab--active': activeTab === 'start' }" to="/">Start</RouterLink>
      <RouterLink
        class="tab"
        :class="{ 'tab--active': activeTab === 'dataset' }"
        :to="currentDraftId ? `/draft/${currentDraftId}` : '/'"
        :aria-disabled="!currentDraftId"
      >
        Datensatz
      </RouterLink>
      <RouterLink
        class="tab"
        :class="{ 'tab--active': activeTab === 'attributes' }"
        :to="currentDraftId ? `/draft/${currentDraftId}/attributes` : '/'"
        :aria-disabled="!currentDraftId"
      >
        Attribute
      </RouterLink>
      <RouterLink
        class="tab"
        :class="{ 'tab--active': activeTab === 'json' }"
        :to="currentDraftId ? `/draft/${currentDraftId}/json` : '/'"
        :aria-disabled="!currentDraftId"
      >
        Datenblatt-Vorschau
      </RouterLink>
    </nav>

    <div v-if="store.currentDraft" class="context-bar">
      <div class="context-bar__text">
        <div class="context-bar__group">
          <span>{{ store.contextLabel }}</span>
          <span class="context-bar__dot">•</span>
          <span>Datenblatt</span>
          <span class="context-bar__dot">•</span>
          <span>{{ store.contextMeta }}</span>
        </div>
        <div class="context-bar__detail">
          <strong>{{ currentDraftTitle }}</strong>
          <span class="mono">{{ currentDraftIdentifier }}</span>
        </div>
      </div>
      <span class="status-pill" :data-state="store.saveState">{{ store.saveStatusLabel }}</span>
    </div>

    <main class="page">
      <RouterView />
    </main>
  </div>
</template>
