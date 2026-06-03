<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { defaultOfficeCatalogUrl } from "../config/metadataSources";
import type { Dataset, DatasetSeries } from "../domain/datasetTypes";
import { accessLevelOptions, publicationStatusOptions } from "../config/vocabularies";
import { loadOfficeCatalog } from "../services/endpointLoader";
import SharedMetadataSections from "./SharedMetadataSections.vue";

const props = defineProps<{
  dataset: Dataset | DatasetSeries;
  mode?: "dataset" | "series";
}>();

const isSeries = computed(() => props.mode === "series");
const readOnlyAccessLevelOption =
  accessLevelOptions.find((option) => option.value === "open") ?? {
    value: "open",
    label: "Öffentlich, frei zugänglich"
  };

const officeCatalogLoading = ref(false);
const officeCatalogError = ref("");
const officeOptions = ref<{ identifier: string; name: string }[]>([]);

const officeSelectDisabled = computed(
  () => officeCatalogLoading.value || Boolean(officeCatalogError.value) || officeOptions.value.length === 0
);

function normalizeCreatorRef(): void {
  const currentValue = props.dataset.creatorRef?.trim() ?? "";
  if (!currentValue || officeOptions.value.length === 0) {
    return;
  }

  if (!officeOptions.value.some((entry) => entry.identifier === currentValue)) {
    props.dataset.creatorRef = "";
  }
}

watch(officeOptions, () => {
  normalizeCreatorRef();
});

watch(
  () => props.dataset,
  () => {
    normalizeCreatorRef();
  }
);

onMounted(async () => {
  officeCatalogLoading.value = true;
  officeCatalogError.value = "";

  try {
    officeOptions.value = await loadOfficeCatalog(defaultOfficeCatalogUrl);
    normalizeCreatorRef();
  } catch (reason) {
    officeOptions.value = [];
    officeCatalogError.value =
      reason instanceof Error ? reason.message : "Der Datenherr-Katalog konnte nicht geladen werden.";
  } finally {
    officeCatalogLoading.value = false;
  }
});
</script>

<template>
  <section class="surface surface--editor section-stack">
    <div class="header-line">
      <div>
        <h2>{{ isSeries ? "Serien-Metadaten" : "Datensatz-Metadaten" }}</h2>
      </div>
    </div>

    <section class="form-section section-stack">
      <div>
        <h3>Grundangaben</h3>
      </div>
      <div class="field-grid">
        <div class="field-row">
          <label for="identifier">Identifier *</label>
          <input id="identifier" v-model="dataset.identifier" class="text-input mono" type="text" />
        </div>
        <div class="field-row">
          <label for="title">Titel *</label>
          <input id="title" v-model="dataset.title" class="text-input" type="text" />
        </div>
        <div class="field-row">
          <label for="description">Beschreibung *</label>
          <textarea id="description" v-model="dataset.description" class="textarea" rows="5" />
          <p class="field-help">{{ (dataset.description ?? "").length }} / 1024 Zeichen</p>
        </div>
        <div class="inline-grid">
          <div class="field-row">
            <label for="access-level">Zugänglichkeit *</label>
            <select id="access-level" v-model="dataset.accessLevel" class="select" disabled aria-readonly="true">
              <option :value="readOnlyAccessLevelOption.value">
                {{ readOnlyAccessLevelOption.label }}
              </option>
            </select>
          </div>
          <div class="field-row">
            <label for="publication-status">Publikationsstatus *</label>
            <select id="publication-status" v-model="dataset.publicationStatus" class="select">
              <option v-for="option in publicationStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <label for="creatorRef">Datenherr *</label>
          <select id="creatorRef" v-model="dataset.creatorRef" class="select" :disabled="officeSelectDisabled">
            <option value="">Bitte wählen</option>
            <option v-for="office in officeOptions" :key="office.identifier" :value="office.identifier">
              {{ office.name }}
            </option>
          </select>
          <p v-if="officeCatalogLoading" class="field-help">Datenherren werden geladen.</p>
          <div v-if="officeCatalogError" class="notice" data-tone="danger">
            <span>{{ officeCatalogError }}</span>
          </div>
        </div>
      </div>
    </section>

    <SharedMetadataSections :entry="dataset" kind="dataset" id-prefix="dataset" />
  </section>
</template>
