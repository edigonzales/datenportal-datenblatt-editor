<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Dataset, DatasetSeries } from "../domain/datasetTypes";
import { accrualPeriodicityOptions, themeOptions } from "../config/vocabularies";
import ContactPointForm from "./ContactPointForm.vue";
import TemporalCoverageForm from "./TemporalCoverageForm.vue";

const props = defineProps<{
  dataset: Dataset | DatasetSeries;
  mode?: "dataset" | "series";
}>();

function toggleTheme(theme: string, checked: boolean): void {
  const current = new Set(props.dataset.themes ?? []);
  if (checked) {
    current.add(theme);
  } else {
    current.delete(theme);
  }
  props.dataset.themes = [...current];
}

function formatKeywords(keywords: string[] | undefined): string {
  return (keywords ?? []).join(", ");
}

function parseKeywords(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const keywordsText = ref(formatKeywords(props.dataset.keywords));

watch(
  () => props.dataset.keywords,
  (keywords) => {
    const formattedKeywords = formatKeywords(keywords);
    const normalizedInput = formatKeywords(parseKeywords(keywordsText.value));
    if (formattedKeywords !== normalizedInput) {
      keywordsText.value = formattedKeywords;
    }
  },
  { deep: true }
);

function updateKeywords(value: string): void {
  keywordsText.value = value;
  props.dataset.keywords = parseKeywords(value);
}

function normalizeKeywordsInput(): void {
  keywordsText.value = formatKeywords(props.dataset.keywords);
}

const temporalCoverage = computed(() => props.dataset.temporalCoverage ?? (props.dataset.temporalCoverage = {}));
const isSeries = computed(() => props.mode === "series");
</script>

<template>
  <section class="surface section-stack">
    <div class="header-line">
      <div>
        <h2>{{ isSeries ? "Serien-Metadaten" : "Datensatz-Metadaten" }}</h2>
        <p class="muted">
          {{
            dataset.description ||
            (isSeries
              ? "Bearbeiten Sie die gemeinsamen Metadaten dieser Datensatzserie."
              : "Bearbeiten Sie die Metadaten dieses Datenblatts lokal im Browser.")
          }}
        </p>
      </div>
    </div>

    <section class="form-section section-stack">
      <div>
        <h3>Grundangaben</h3>
        <p class="field-help">Identifier, Titel und Beschreibung sind Pflichtfelder.</p>
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
            <label for="publisherRef">PublisherRef *</label>
            <input id="publisherRef" v-model="dataset.publisherRef" class="text-input" type="text" />
          </div>
          <div class="field-row">
            <label for="creatorRef">CreatorRef *</label>
            <input id="creatorRef" v-model="dataset.creatorRef" class="text-input" type="text" />
          </div>
        </div>
      </div>
    </section>

    <section class="form-section section-stack">
      <div>
        <h3>Zuständigkeiten / Kontakt</h3>
      </div>
      <ContactPointForm :contact-point="dataset.contactPoint ?? {}" />
    </section>

    <section class="form-section section-stack">
      <div>
        <h3>Themen und Keywords</h3>
      </div>
      <div class="field-grid">
        <div class="field-row">
          <span class="fieldset-label">Themen</span>
          <div class="checkbox-list">
            <label v-for="theme in themeOptions" :key="theme.value" class="checkbox-item">
              <input
                :checked="dataset.themes?.includes(theme.value)"
                type="checkbox"
                @change="toggleTheme(theme.value, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ theme.label }}</span>
            </label>
          </div>
        </div>
        <div class="field-row">
          <label for="keywords">Keywords</label>
          <input
            id="keywords"
            :value="keywordsText"
            class="text-input"
            type="text"
            placeholder="Komma-getrennte Liste"
            @input="updateKeywords(($event.target as HTMLInputElement).value)"
            @blur="normalizeKeywordsInput"
          />
          <div class="chip-row">
            <span v-for="keyword in dataset.keywords" :key="keyword" class="chip">{{ keyword }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="form-section section-stack">
      <div>
        <h3>Zeit und Nachführung</h3>
      </div>
      <div class="field-grid">
        <div class="field-row">
          <label for="accrual">Nachführung</label>
          <select id="accrual" v-model="dataset.accrualPeriodicity" class="select">
            <option v-for="option in accrualPeriodicityOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="inline-grid">
          <div class="field-row">
            <label for="issued">Issued</label>
            <input id="issued" v-model="dataset.issued" class="text-input" type="date" />
          </div>
          <div class="field-row">
            <label for="modified">Modified</label>
            <input id="modified" v-model="dataset.modified" class="text-input" type="date" />
          </div>
        </div>
        <TemporalCoverageForm :coverage="temporalCoverage" />
      </div>
    </section>

    <section class="form-section section-stack">
      <div>
        <h3>Inhaltliche Beschreibung</h3>
      </div>
      <div class="field-grid">
        <div class="field-row">
          <label for="surveyMethod">Erhebungsmethode</label>
          <textarea id="surveyMethod" v-model="dataset.surveyMethod" class="textarea" rows="4" />
        </div>
        <div class="field-row">
          <label for="dataAvailableFrom">Daten verfügbar ab / URL</label>
          <input id="dataAvailableFrom" v-model="dataset.dataAvailableFrom" class="text-input" type="text" />
        </div>
        <div class="field-row">
          <label for="furtherUses">Weitere Nutzungen</label>
          <textarea id="furtherUses" v-model="dataset.furtherUses" class="textarea" rows="3" />
        </div>
        <div class="field-row">
          <label for="auxiliaryData">Hilfsdaten</label>
          <textarea id="auxiliaryData" v-model="dataset.auxiliaryData" class="textarea" rows="3" />
        </div>
      </div>
    </section>

    <section class="form-section section-stack">
      <div>
        <h3>Bemerkungen</h3>
      </div>
      <div class="field-row">
        <textarea id="remarks" v-model="dataset.remarks" class="textarea" rows="4" />
      </div>
    </section>
  </section>
</template>
