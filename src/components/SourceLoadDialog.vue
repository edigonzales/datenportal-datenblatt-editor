<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { defaultSourceId, metadataSources } from "../config/metadataSources";
import type { ImportPreview, MetadataSearchRecord } from "../domain/datasetTypes";
import { loadDatasetFromSource, loadSourceIndex, searchSourceIndex } from "../services/endpointLoader";

const props = defineProps<{
  initialSourceId?: string;
  initialOrganizationUnit?: string;
}>();

const emit = defineEmits<{
  close: [];
  imported: [preview: ImportPreview];
  remember: [payload: { sourceId: string; organizationUnit: string }];
}>();

const sourceId = ref(props.initialSourceId || defaultSourceId);
const organizationUnit = ref(props.initialOrganizationUnit || "");
const query = ref("");
const entries = ref<MetadataSearchRecord[]>([]);
const results = ref<MetadataSearchRecord[]>([]);
const preview = ref<ImportPreview | null>(null);
const loading = ref(false);
const error = ref("");

const source = computed(() => metadataSources.find((entry) => entry.id === sourceId.value) ?? metadataSources[0]);

onMounted(async () => {
  await reloadIndex();
});

watch(sourceId, async () => {
  preview.value = null;
  await reloadIndex();
});

async function reloadIndex(): Promise<void> {
  loading.value = true;
  error.value = "";
  results.value = [];
  try {
    entries.value = await loadSourceIndex(source.value);
    results.value = searchSourceIndex(entries.value, query.value, organizationUnit.value);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Die Quelle konnte nicht geladen werden.";
  } finally {
    loading.value = false;
  }
}

function runSearch(): void {
  emit("remember", { sourceId: sourceId.value, organizationUnit: organizationUnit.value });
  results.value = searchSourceIndex(entries.value, query.value, organizationUnit.value);
}

async function loadIdentifier(identifier: string): Promise<void> {
  loading.value = true;
  error.value = "";
  preview.value = null;
  try {
    preview.value = await loadDatasetFromSource(source.value, identifier.trim());
    emit("remember", { sourceId: sourceId.value, organizationUnit: organizationUnit.value });
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Das Datenblatt konnte nicht geladen werden.";
  } finally {
    loading.value = false;
  }
}

function selectResult(entry: MetadataSearchRecord): void {
  void loadIdentifier(entry.identifier);
}
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <div>
          <h2>Datenblatt von Quelle laden</h2>
          <p class="muted">Offline-Snapshots der konfigurierten Quellen laden, filtern und vor der Übernahme prüfen.</p>
        </div>
        <button class="button" type="button" @click="emit('close')">Schließen</button>
      </div>

      <div class="section-stack">
        <div class="inline-grid">
          <div class="field-row">
            <label for="source-select">Quelle</label>
            <select id="source-select" v-model="sourceId" class="select">
              <option v-for="entry in metadataSources" :key="entry.id" :value="entry.id">{{ entry.label }}</option>
            </select>
          </div>
          <div class="field-row">
            <label for="organization-filter">Organisationseinheit</label>
            <select id="organization-filter" v-model="organizationUnit" class="select">
              <option value="">Alle</option>
              <option v-for="entry in source.organizationUnits" :key="entry" :value="entry">{{ entry }}</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <label for="source-query">Datenblatt suchen oder Identifier eingeben</label>
          <input id="source-query" v-model="query" class="text-input" type="text" placeholder="z. B. so.afu.nitratmessungen" />
        </div>

        <div class="action-row">
          <button class="button button--primary" type="button" :disabled="loading" @click="runSearch">Suchen</button>
          <button class="button" type="button" :disabled="loading || !query.trim()" @click="loadIdentifier(query)">
            Direkt laden
          </button>
        </div>

        <div v-if="error" class="notice" data-tone="danger">
          <strong>Quelle konnte nicht geladen werden</strong>
          <span>{{ error }}</span>
        </div>

        <div class="grid-main" style="grid-template-columns: minmax(0, 1fr) 320px">
          <section class="surface section-stack">
            <div class="header-line">
              <div>
                <h3>Treffer</h3>
                <p class="muted">{{ loading ? "Lade..." : `${results.length} Datenblätter gefunden` }}</p>
              </div>
            </div>

            <div v-if="results.length" class="draft-list">
              <button
                v-for="entry in results"
                :key="entry.identifier"
                class="draft-card"
                type="button"
                style="text-align: left"
                @click="selectResult(entry)"
              >
                <h3>{{ entry.title }}</h3>
                <p class="mono">{{ entry.identifier }}</p>
                <p>{{ entry.description }}</p>
              </button>
            </div>
            <div v-else class="empty-state" style="padding: 24px">
              <h3>Keine Treffer</h3>
              <p>Versuchen Sie eine andere Organisationseinheit oder einen anderen Suchbegriff.</p>
            </div>
          </section>

          <section class="sidebar-panel">
            <h3>Vorschau</h3>
            <div v-if="preview" class="section-stack">
              <div>
                <strong>{{ preview.root.dataset.title || "Unbenanntes Datenblatt" }}</strong>
                <p class="mono">{{ preview.root.dataset.identifier || "ohne Identifier" }}</p>
                <p class="muted">Geändert: {{ preview.root.dataset.modified || "unbekannt" }}</p>
              </div>
              <p>{{ preview.root.dataset.description }}</p>
              <button class="button button--primary" type="button" @click="emit('imported', preview)">
                In Editor übernehmen
              </button>
            </div>
            <p v-else class="muted">Wählen Sie links ein Datenblatt oder laden Sie direkt per Identifier.</p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
