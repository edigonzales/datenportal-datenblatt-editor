<script setup lang="ts">
import type { ConflictResolutionContext, ImportConflictAction } from "../domain/datasetTypes";
import { formatDateTime } from "../services/dateFormat";

defineProps<{
  context: ConflictResolutionContext;
}>();

const emit = defineEmits<{
  close: [];
  resolve: [action: ImportConflictAction];
}>();
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog dialog--narrow">
      <div class="dialog-header">
        <div>
          <h2>Identifier-Konflikt</h2>
          <p class="muted">Es existiert bereits ein lokaler Entwurf für dieses Datenblatt.</p>
        </div>
      </div>

      <div class="notice" data-tone="warning">
        <strong>{{ context.existingDraft.title || context.existingDraft.identifier || "Lokaler Entwurf" }}</strong>
        <span>Zuletzt bearbeitet: {{ formatDateTime(context.existingDraft.updatedAt) }}</span>
      </div>

      <div class="section-stack">
        <button class="button button--primary" type="button" @click="emit('resolve', 'open-existing')">
          Lokalen Entwurf öffnen
        </button>
        <button class="button" type="button" @click="emit('resolve', 'save-copy')">Import als neue Kopie speichern</button>
        <button class="button button--danger" type="button" @click="emit('resolve', 'overwrite')">
          Lokalen Entwurf überschreiben
        </button>
        <button class="button" type="button" @click="emit('close')">Abbrechen</button>
      </div>
    </div>
  </div>
</template>
