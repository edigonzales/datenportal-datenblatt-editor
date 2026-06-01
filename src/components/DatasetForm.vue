<script setup lang="ts">
import { computed } from "vue";
import type { Dataset, DatasetSeries } from "../domain/datasetTypes";
import { accessLevelOptions, publicationStatusOptions } from "../config/vocabularies";
import SharedMetadataSections from "./SharedMetadataSections.vue";

const props = defineProps<{
  dataset: Dataset | DatasetSeries;
  mode?: "dataset" | "series";
}>();

const isSeries = computed(() => props.mode === "series");
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
            <select id="access-level" v-model="dataset.accessLevel" class="select">
              <option v-for="option in accessLevelOptions" :key="option.value" :value="option.value">
                {{ option.label }}
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
          <label for="creatorRef">CreatorRef *</label>
          <input id="creatorRef" v-model="dataset.creatorRef" class="text-input" type="text" />
        </div>
      </div>
    </section>

    <SharedMetadataSections :entry="dataset" kind="dataset" id-prefix="dataset" />
  </section>
</template>
