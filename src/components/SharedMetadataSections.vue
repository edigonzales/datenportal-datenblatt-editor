<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Dataset, DatasetIssue, DatasetSeries, IssueInheritedGroup, TemporalCoverage } from "../domain/datasetTypes";
import { accrualPeriodicityOptions, themeOptions } from "../config/vocabularies";

const props = withDefaults(
  defineProps<{
    entry: Dataset | DatasetSeries | DatasetIssue;
    kind: "dataset" | "issue";
    idPrefix?: string;
    trackOverrides?: boolean;
  }>(),
  {
    idPrefix: "dataset",
    trackOverrides: false
  }
);

const emit = defineEmits<{
  "override-group": [group: IssueInheritedGroup];
}>();

type TemporalCoverageMode = "range" | "reference" | "none";

const datasetEntry = computed(() => (props.kind === "issue" ? null : (props.entry as Dataset | DatasetSeries)));
const issueEntry = computed(() => (props.kind === "issue" ? (props.entry as DatasetIssue) : null));

const contactPoint = computed(() => {
  if (!datasetEntry.value) {
    return null;
  }

  return (
    datasetEntry.value.contactPoint ??
    (datasetEntry.value.contactPoint = {
      name: "",
      organizationUnit: "",
      email: "",
      phone: "",
      url: ""
    })
  );
});

const temporalCoverage = computed(() => props.entry.temporalCoverage ?? (props.entry.temporalCoverage = {}));
const temporalModeName = computed(() => `${props.idPrefix}-temporal-mode`);

function emitOverride(group: IssueInheritedGroup): void {
  if (props.trackOverrides) {
    emit("override-group", group);
  }
}

function toggleTheme(theme: string, checked: boolean): void {
  if (!datasetEntry.value) {
    return;
  }

  const current = new Set(datasetEntry.value.themes ?? []);
  if (checked) {
    current.add(theme);
  } else {
    current.delete(theme);
  }
  datasetEntry.value.themes = [...current];
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

const keywordsText = ref(formatKeywords(datasetEntry.value?.keywords));

watch(
  () => datasetEntry.value?.keywords,
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
  if (!datasetEntry.value) {
    return;
  }

  keywordsText.value = value;
  datasetEntry.value.keywords = parseKeywords(value);
}

function normalizeKeywordsInput(): void {
  if (datasetEntry.value) {
    keywordsText.value = formatKeywords(datasetEntry.value.keywords);
  }
}

function deriveMode(coverage: TemporalCoverage): TemporalCoverageMode {
  if (coverage.referenceDate) {
    return "reference";
  }
  if (coverage.startDate || coverage.endDate) {
    return "range";
  }
  return "none";
}

const temporalMode = ref<TemporalCoverageMode>(deriveMode(temporalCoverage.value));

watch(
  () => temporalCoverage.value,
  (coverage) => {
    temporalMode.value = deriveMode(coverage);
  },
  { deep: true }
);

function setTemporalMode(nextMode: TemporalCoverageMode): void {
  emitOverride("temporalCoverage");
  temporalMode.value = nextMode;

  if (nextMode === "range") {
    temporalCoverage.value.referenceDate = "";
    temporalCoverage.value.startDate ??= "";
    temporalCoverage.value.endDate ??= "";
    return;
  }

  if (nextMode === "reference") {
    temporalCoverage.value.startDate = "";
    temporalCoverage.value.endDate = "";
    temporalCoverage.value.referenceDate ??= "";
    return;
  }

  temporalCoverage.value.startDate = "";
  temporalCoverage.value.endDate = "";
  temporalCoverage.value.referenceDate = "";
}
</script>

<template>
  <section v-if="contactPoint" class="form-section section-stack">
    <div>
      <h3>Zuständigkeiten / Kontakt</h3>
    </div>
    <div class="field-grid">
      <div class="inline-grid">
        <div class="field-row">
          <label :for="`${idPrefix}-contact-name`">Name</label>
          <input :id="`${idPrefix}-contact-name`" v-model="contactPoint.name" class="text-input" type="text" />
        </div>
        <div class="field-row">
          <label :for="`${idPrefix}-contact-organization`">Organisationseinheit</label>
          <input
            :id="`${idPrefix}-contact-organization`"
            v-model="contactPoint.organizationUnit"
            class="text-input"
            type="text"
          />
        </div>
      </div>
      <div class="inline-grid">
        <div class="field-row">
          <label :for="`${idPrefix}-contact-email`">E-Mail / URI *</label>
          <input :id="`${idPrefix}-contact-email`" v-model="contactPoint.email" class="text-input" type="text" />
        </div>
        <div class="field-row">
          <label :for="`${idPrefix}-contact-phone`">Telefon</label>
          <input :id="`${idPrefix}-contact-phone`" v-model="contactPoint.phone" class="text-input" type="text" />
        </div>
      </div>
      <div class="field-row">
        <label :for="`${idPrefix}-contact-url`">URL</label>
        <input :id="`${idPrefix}-contact-url`" v-model="contactPoint.url" class="text-input" type="text" />
      </div>
    </div>
  </section>

  <section v-if="datasetEntry" class="form-section section-stack">
    <div>
      <h3>Themen und Keywords</h3>
    </div>
    <div class="field-grid">
      <div class="field-row">
        <span class="fieldset-label">Themen *</span>
        <div class="checkbox-list checkbox-list--themes">
          <label v-for="theme in themeOptions" :key="theme.value" class="checkbox-item checkbox-item--theme">
            <input
              :checked="datasetEntry.themes?.includes(theme.value)"
              type="checkbox"
              @change="toggleTheme(theme.value, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ theme.label }}</span>
          </label>
        </div>
      </div>
      <div class="field-row">
        <label :for="`${idPrefix}-keywords`">Keywords</label>
        <input
          :id="`${idPrefix}-keywords`"
          :value="keywordsText"
          class="text-input"
          type="text"
          placeholder="Komma-getrennte Liste"
          @input="updateKeywords(($event.target as HTMLInputElement).value)"
          @blur="normalizeKeywordsInput"
        />
        <div class="chip-row">
          <span v-for="keyword in datasetEntry.keywords" :key="keyword" class="chip">{{ keyword }}</span>
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
        <label :for="`${idPrefix}-accrual`">Nachführung</label>
        <select
          :id="`${idPrefix}-accrual`"
          v-model="entry.accrualPeriodicity"
          class="select"
          @change="emitOverride('accrualPeriodicity')"
        >
          <option v-for="option in accrualPeriodicityOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="inline-grid">
        <div v-if="issueEntry" class="field-row">
          <label :for="`${idPrefix}-issued`">Issued</label>
          <input :id="`${idPrefix}-issued`" v-model="issueEntry.issued" class="text-input" type="date" />
        </div>
        <div class="field-row">
          <label :for="`${idPrefix}-modified`">{{ issueEntry ? "Modified" : "Modified *" }}</label>
          <input
            :id="`${idPrefix}-modified`"
            v-model="entry.modified"
            class="text-input"
            type="date"
            @input="emitOverride('modified')"
          />
        </div>
      </div>

      <div class="field-grid">
        <div class="field-row">
          <span class="fieldset-label">Zeitbezug der Daten</span>
          <div class="checkbox-list">
            <label class="radio-item">
              <input
                :checked="temporalMode === 'range'"
                :name="temporalModeName"
                type="radio"
                @change="setTemporalMode('range')"
              />
              <span>Zeitraum</span>
            </label>
            <label class="radio-item">
              <input
                :checked="temporalMode === 'reference'"
                :name="temporalModeName"
                type="radio"
                @change="setTemporalMode('reference')"
              />
              <span>Stichtag</span>
            </label>
            <label class="radio-item">
              <input
                :checked="temporalMode === 'none'"
                :name="temporalModeName"
                type="radio"
                @change="setTemporalMode('none')"
              />
              <span>Kein Zeitbezug</span>
            </label>
          </div>
        </div>

        <div v-if="temporalMode === 'range'" class="inline-grid">
          <div class="field-row">
            <label :for="`${idPrefix}-coverage-start`">Von</label>
            <input
              :id="`${idPrefix}-coverage-start`"
              v-model="temporalCoverage.startDate"
              class="text-input"
              type="date"
              @input="emitOverride('temporalCoverage')"
            />
          </div>
          <div class="field-row">
            <label :for="`${idPrefix}-coverage-end`">Bis</label>
            <input
              :id="`${idPrefix}-coverage-end`"
              v-model="temporalCoverage.endDate"
              class="text-input"
              type="date"
              @input="emitOverride('temporalCoverage')"
            />
          </div>
        </div>

        <div v-if="temporalMode === 'reference'" class="field-row">
          <label :for="`${idPrefix}-coverage-reference`">Datum</label>
          <input
            :id="`${idPrefix}-coverage-reference`"
            v-model="temporalCoverage.referenceDate"
            class="text-input"
            type="date"
            @input="emitOverride('temporalCoverage')"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="form-section section-stack">
    <div>
      <h3>Inhaltliche Beschreibung</h3>
    </div>
    <div class="field-grid">
      <div class="field-row">
        <label :for="`${idPrefix}-survey-method`">Erhebungsmethode</label>
        <textarea
          :id="`${idPrefix}-survey-method`"
          v-model="entry.surveyMethod"
          class="textarea"
          rows="4"
          @input="emitOverride('surveyMethod')"
        />
      </div>
      <div class="field-row">
        <label :for="`${idPrefix}-data-available-from`">Verfügbare Daten ab</label>
        <input
          :id="`${idPrefix}-data-available-from`"
          v-model="entry.dataAvailableFrom"
          class="text-input"
          type="text"
          @input="emitOverride('dataAvailableFrom')"
        />
      </div>
      <div class="field-row">
        <label :for="`${idPrefix}-further-uses`">Weitere Verwendungen</label>
        <textarea
          :id="`${idPrefix}-further-uses`"
          v-model="entry.furtherUses"
          class="textarea"
          rows="3"
          @input="emitOverride('furtherUses')"
        />
      </div>
      <div v-if="issueEntry" class="field-row">
        <label :for="`${idPrefix}-auxiliary-data`">Hilfsdaten</label>
        <textarea
          :id="`${idPrefix}-auxiliary-data`"
          v-model="issueEntry.auxiliaryData"
          class="textarea"
          rows="3"
        />
      </div>
    </div>
  </section>

  <section class="form-section section-stack">
    <div>
      <h3>Bemerkungen</h3>
    </div>
    <div class="field-row">
      <textarea
        :id="`${idPrefix}-remarks`"
        v-model="entry.remarks"
        class="textarea"
        rows="4"
        @input="emitOverride('remarks')"
      />
    </div>
  </section>
</template>
