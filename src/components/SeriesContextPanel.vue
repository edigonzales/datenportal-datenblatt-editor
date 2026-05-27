<script setup lang="ts">
import { computed } from "vue";
import type { DatasetSeries } from "../domain/datasetTypes";

const props = defineProps<{
  series: DatasetSeries;
}>();

const keywords = computed(() => props.series.keywords ?? []);
const themes = computed(() => props.series.themes ?? []);
const attributeCount = computed(() => props.series.attributes?.length ?? 0);
</script>

<template>
  <aside class="surface section-stack series-context-panel">
    <div>
      <h3>Serienkontext</h3>
      <p class="muted">Gemeinsame Felder der Datensatzserie. Bearbeitung erfolgt im Reiter `Serie`.</p>
    </div>

    <div class="context-summary">
      <div class="context-summary__row">
        <span class="muted">Identifier</span>
        <strong class="mono">{{ series.identifier || "noch nicht gesetzt" }}</strong>
      </div>
      <div class="context-summary__row">
        <span class="muted">Titel</span>
        <strong>{{ series.title || "Unbenannte Datensatzserie" }}</strong>
      </div>
      <div class="context-summary__row">
        <span class="muted">Publisher / Creator</span>
        <span>{{ series.publisherRef || "offen" }} / {{ series.creatorRef || "offen" }}</span>
      </div>
      <div class="context-summary__row">
        <span class="muted">Kontakt</span>
        <span>{{ series.contactPoint?.email || "keine Kontakt-E-Mail" }}</span>
      </div>
      <div class="context-summary__row">
        <span class="muted">Serienattribute</span>
        <span>{{ attributeCount }}</span>
      </div>
    </div>

    <div class="field-row">
      <span class="fieldset-label">Themen</span>
      <div class="chip-row">
        <span v-for="theme in themes" :key="theme" class="chip">{{ theme }}</span>
        <span v-if="!themes.length" class="muted">Keine Themen gewählt</span>
      </div>
    </div>

    <div class="field-row">
      <span class="fieldset-label">Keywords</span>
      <div class="chip-row">
        <span v-for="keyword in keywords" :key="keyword" class="chip">{{ keyword }}</span>
        <span v-if="!keywords.length" class="muted">Keine Keywords gepflegt</span>
      </div>
    </div>
  </aside>
</template>
