<script setup lang="ts">
import { computed } from "vue";
import type { TemporalCoverage } from "../domain/datasetTypes";

const props = defineProps<{
  coverage: TemporalCoverage;
}>();

const mode = computed({
  get: () => {
    if (props.coverage.referenceDate) {
      return "reference";
    }
    if (props.coverage.startDate || props.coverage.endDate) {
      return "range";
    }
    return "none";
  },
  set: (value: string) => {
    if (value === "range") {
      props.coverage.referenceDate = "";
      props.coverage.startDate ??= "";
      props.coverage.endDate ??= "";
      return;
    }
    if (value === "reference") {
      props.coverage.startDate = "";
      props.coverage.endDate = "";
      props.coverage.referenceDate ??= "";
      return;
    }
    props.coverage.startDate = "";
    props.coverage.endDate = "";
    props.coverage.referenceDate = "";
  }
});
</script>

<template>
  <div class="field-grid">
    <div class="field-row">
      <span class="fieldset-label">Zeitbezug der Daten</span>
      <div class="checkbox-list">
        <label class="radio-item">
          <input v-model="mode" type="radio" value="range" />
          <span>Zeitraum</span>
        </label>
        <label class="radio-item">
          <input v-model="mode" type="radio" value="reference" />
          <span>Stichtag</span>
        </label>
        <label class="radio-item">
          <input v-model="mode" type="radio" value="none" />
          <span>Kein Zeitbezug</span>
        </label>
      </div>
    </div>

    <div v-if="mode === 'range'" class="inline-grid">
      <div class="field-row">
        <label for="coverage-start">Von</label>
        <input id="coverage-start" v-model="coverage.startDate" class="text-input" type="date" />
      </div>
      <div class="field-row">
        <label for="coverage-end">Bis</label>
        <input id="coverage-end" v-model="coverage.endDate" class="text-input" type="date" />
      </div>
    </div>

    <div v-if="mode === 'reference'" class="field-row">
      <label for="coverage-reference">Datum</label>
      <input id="coverage-reference" v-model="coverage.referenceDate" class="text-input" type="date" />
    </div>
  </div>
</template>
