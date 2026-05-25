<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { defaultMetadataSource, defaultSourceIndexUrl } from "../config/metadataSources";
import type { ImportPreview, MetadataSearchRecord } from "../domain/datasetTypes";
import { loadDatasetFromSource, loadSourceIndex, searchSourceIndex } from "../services/endpointLoader";

const props = defineProps<{
  initialSourceUrl?: string;
  initialOrganizationUnit?: string;
}>();

const emit = defineEmits<{
  close: [];
  imported: [preview: ImportPreview];
  remember: [payload: { sourceUrl: string; organizationUnit: string }];
}>();

const sourceUrl = ref(props.initialSourceUrl || defaultSourceIndexUrl);
const organizationUnit = ref(props.initialOrganizationUnit || "");
const query = ref("");
const entries = ref<MetadataSearchRecord[]>([]);
const results = ref<MetadataSearchRecord[]>([]);
const selectedIdentifier = ref("");
const loading = ref(false);
const error = ref("");

const organizationUnits = computed(() =>
  [...new Set(entries.value.map((entry) => entry.organizationUnit?.trim() ?? "").filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "de-CH")
  )
);

const selectedEntry = computed(
  () => results.value.find((entry) => entry.identifier === selectedIdentifier.value) ?? null
);

onMounted(async () => {
  await reloadIndex();
});

function rememberFilters(): void {
  emit("remember", {
    sourceUrl: sourceUrl.value.trim(),
    organizationUnit: organizationUnit.value
  });
}

function updateResults(): void {
  results.value = searchSourceIndex(entries.value, query.value, organizationUnit.value);

  if (!results.value.some((entry) => entry.identifier === selectedIdentifier.value)) {
    selectedIdentifier.value = "";
  }
}

async function reloadIndex(): Promise<void> {
  loading.value = true;
  error.value = "";
  selectedIdentifier.value = "";
  try {
    entries.value = await loadSourceIndex(sourceUrl.value.trim());

    if (organizationUnit.value && !organizationUnits.value.includes(organizationUnit.value)) {
      organizationUnit.value = "";
    }

    updateResults();
    rememberFilters();
  } catch (reason) {
    entries.value = [];
    results.value = [];
    error.value = reason instanceof Error ? reason.message : "Die Quelle konnte nicht geladen werden.";
  } finally {
    loading.value = false;
  }
}

function runSearch(): void {
  error.value = "";
  updateResults();
  rememberFilters();
}

function selectResult(entry: MetadataSearchRecord): void {
  selectedIdentifier.value = entry.identifier;
  error.value = "";
}

async function importSelected(): Promise<void> {
  if (!selectedEntry.value) {
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const preview = await loadDatasetFromSource(
      defaultMetadataSource.label,
      sourceUrl.value.trim(),
      selectedEntry.value
    );
    rememberFilters();
    emit("imported", preview);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Das Datenblatt konnte nicht übernommen werden.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
        <div class="dialog-header">
          <div>
            <h2>Metadaten von Quelle laden</h2>
            <p class="muted">Eine dataset.index.json laden, durchsuchen und den gewählten Eintrag in den Editor übernehmen.</p>
          </div>
          <button class="button" type="button" @click="emit('close')">Schließen</button>
        </div>

      <div class="section-stack">
        <div class="inline-grid">
          <div class="field-row">
            <label for="source-url">Quelle</label>
            <input
              id="source-url"
              v-model="sourceUrl"
              class="text-input"
              type="url"
              placeholder="https://example.org/dataset.index.json"
            />
            <p class="field-help">Direkte URL zur externen dataset.index.json-Datei.</p>
          </div>
          <div class="field-row">
            <label for="organization-filter">Organisationseinheit</label>
            <select id="organization-filter" v-model="organizationUnit" class="select">
              <option value="">Alle</option>
              <option v-for="entry in organizationUnits" :key="entry" :value="entry">{{ entry }}</option>
            </select>
          </div>
        </div>

        <div class="action-row">
          <button class="button" type="button" :disabled="loading || !sourceUrl.trim()" @click="void reloadIndex()">
            Quelle laden
          </button>
        </div>

        <div class="field-row">
          <label for="source-query">Eintrag suchen oder Identifier eingeben</label>
          <input id="source-query" v-model="query" class="text-input" type="text" placeholder="z. B. so.afu.nitratmessungen" />
        </div>

        <div class="action-row">
          <button class="button button--primary" type="button" :disabled="loading" @click="runSearch">Suchen</button>
        </div>

        <div v-if="error" class="notice" data-tone="danger">
          <strong>Vorgang fehlgeschlagen</strong>
          <span>{{ error }}</span>
        </div>

        <section class="surface section-stack">
          <div class="header-line">
            <div>
              <h3>Treffer</h3>
              <p class="muted">{{ loading ? "Lade..." : `${results.length} Einträge gefunden` }}</p>
            </div>
          </div>

          <div v-if="results.length" class="draft-list">
            <button
              v-for="entry in results"
              :key="entry.identifier"
              class="draft-card draft-card--selectable"
              :data-selected="selectedIdentifier === entry.identifier"
              type="button"
              style="text-align: left"
              @click="selectResult(entry)"
            >
              <h3>{{ entry.title || "Unbenanntes Datenblatt" }}</h3>
              <p class="mono">{{ entry.identifier || "ohne Identifier" }}</p>
              <p>{{ entry.description || "Keine Beschreibung vorhanden." }}</p>
            </button>
          </div>
          <div v-else class="empty-state" style="padding: 24px">
            <h3>Keine Treffer</h3>
            <p>Versuchen Sie eine andere Organisationseinheit, eine andere URL oder einen anderen Suchbegriff.</p>
          </div>

          <div class="action-row">
            <button class="button button--primary" type="button" :disabled="loading || !selectedEntry" @click="void importSelected()">
              In Editor übernehmen
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
