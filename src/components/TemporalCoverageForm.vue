<script setup lang="ts">
import { ref, watch } from "vue";
import type { TemporalCoverage } from "../domain/datasetTypes";

const props = defineProps<{
  coverage: TemporalCoverage;
}>();

type TemporalCoverageMode = "range" | "reference" | "none";

function deriveMode(coverage: TemporalCoverage): TemporalCoverageMode {
  if (coverage.referenceDate) {
    return "reference";
  }
  if (coverage.startDate || coverage.endDate) {
    return "range";
  }
  return "none";
}

const mode = ref<TemporalCoverageMode>(deriveMode(props.coverage));

watch(
  () => props.coverage,
  (coverage) => {
    const derivedMode = deriveMode(coverage);
    if (derivedMode !== "none" || mode.value === "none") {
      mode.value = derivedMode;
    }
  }
);

function setMode(nextMode: TemporalCoverageMode): void {
  mode.value = nextMode;

  if (nextMode === "range") {
    props.coverage.referenceDate = "";
    props.coverage.startDate ??= "";
    props.coverage.endDate ??= "";
    return;
  }

  if (nextMode === "reference") {
    props.coverage.startDate = "";
    props.coverage.endDate = "";
    props.coverage.referenceDate ??= "";
    return;
  }

  props.coverage.startDate = "";
  props.coverage.endDate = "";
  props.coverage.referenceDate = "";
}
</script>

<template>
  <div class="field-grid">
    <div class="field-row">
      <span class="fieldset-label">Zeitbezug der Daten</span>
      <div class="checkbox-list">
        <label class="radio-item">
          <input
            :checked="mode === 'range'"
            name="temporal-coverage-mode"
            type="radio"
            @change="setMode('range')"
          />
          <span>Zeitraum</span>
        </label>
        <label class="radio-item">
          <input
            :checked="mode === 'reference'"
            name="temporal-coverage-mode"
            type="radio"
            @change="setMode('reference')"
          />
          <span>Stichtag</span>
        </label>
        <label class="radio-item">
          <input
            :checked="mode === 'none'"
            name="temporal-coverage-mode"
            type="radio"
            @change="setMode('none')"
          />
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
