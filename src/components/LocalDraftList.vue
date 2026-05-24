<script setup lang="ts">
import type { DatasetDraftRecord } from "../domain/datasetTypes";
import { formatDateTime } from "../services/dateFormat";

defineProps<{
  drafts: DatasetDraftRecord[];
}>();

const emit = defineEmits<{
  open: [id: string];
  duplicate: [id: string];
  delete: [id: string];
  export: [id: string];
}>();
</script>

<template>
  <div class="section-stack">
    <div class="header-line">
      <div>
        <h2>Lokale Entwürfe</h2>
        <p class="muted">Bearbeitungsstände aus diesem Browser, sortiert nach letzter Änderung.</p>
      </div>
    </div>

    <div v-if="drafts.length" class="draft-list">
      <article v-for="draft in drafts" :key="draft.id" class="draft-card">
        <div class="header-line">
          <div>
            <h3>{{ draft.title || "Unbenanntes Datenblatt" }}</h3>
            <p>Identifier: <span class="mono">{{ draft.identifier || "noch nicht gesetzt" }}</span></p>
          </div>
          <span class="status-pill" :data-state="draft.dirty ? 'dirty' : 'saved'">
            {{ draft.dirty ? "Ungesichert" : "Gespeichert" }}
          </span>
        </div>
        <div class="section-stack">
          <p class="muted">Zuletzt bearbeitet: {{ formatDateTime(draft.updatedAt) }}</p>
          <p class="muted">Quelle: {{ draft.sourceLabel || draft.sourceType }}</p>
        </div>
        <div class="draft-actions" style="margin-top: 16px">
          <button class="button button--primary" type="button" @click="emit('open', draft.id)">Öffnen</button>
          <button class="button" type="button" @click="emit('duplicate', draft.id)">Duplizieren</button>
          <button class="button" type="button" @click="emit('export', draft.id)">Datenblatt exportieren</button>
          <button class="button button--danger" type="button" @click="emit('delete', draft.id)">Löschen</button>
        </div>
      </article>
    </div>

    <div v-else class="empty-state" style="padding: 24px">
      <h3>Noch keine lokalen Entwürfe</h3>
      <p>Importierte oder neu angelegte Datenblätter erscheinen nach der ersten Übernahme automatisch hier.</p>
    </div>
  </div>
</template>
