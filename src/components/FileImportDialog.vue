<script setup lang="ts">
import { ref } from "vue";
import type { ImportPreview } from "../domain/datasetTypes";
import { importJsonFile } from "../services/fileImporter";

const emit = defineEmits<{
  close: [];
  imported: [preview: ImportPreview];
}>();

const preview = ref<ImportPreview | null>(null);
const error = ref("");
const dragging = ref(false);

async function handleFiles(files: FileList | null): Promise<void> {
  const file = files?.item(0);
  if (!file) {
    return;
  }

  error.value = "";
  preview.value = null;
  try {
    preview.value = await importJsonFile(file);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Das Datenblatt konnte nicht importiert werden.";
  }
}
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <div>
          <h2>Datenblatt importieren</h2>
          <p class="muted">Datei lokal lesen, validieren und vor der Übernahme als Vorschau anzeigen.</p>
        </div>
        <button class="button" type="button" @click="emit('close')">Schließen</button>
      </div>

      <div class="section-stack">
        <label
          class="drop-zone"
          :data-active="dragging"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="
            dragging = false;
            void handleFiles($event.dataTransfer?.files ?? null);
          "
        >
          <strong>Datenblatt hier ablegen oder Datei wählen</strong>
          <p class="muted">Akzeptiert werden lokale Dateien mit genau einem Datenblatt.</p>
          <input class="sr-only" type="file" accept="application/json,.json" @change="void handleFiles(($event.target as HTMLInputElement).files)" />
        </label>

        <div v-if="error" class="notice" data-tone="danger">
          <strong>Import fehlgeschlagen</strong>
          <span>{{ error }}</span>
        </div>

        <section v-if="preview" class="surface section-stack">
          <div>
            <h3>Vorschau</h3>
            <p class="muted">Importform: {{ preview.importShape === "root" ? "Root-Format" : "Nacktes Datenblatt" }}</p>
          </div>
          <div>
            <strong>{{ preview.root.dataset.title || "Unbenanntes Datenblatt" }}</strong>
            <p class="mono">{{ preview.root.dataset.identifier || "ohne Identifier" }}</p>
            <p>{{ preview.root.dataset.description }}</p>
          </div>
          <div class="action-row">
            <button class="button button--primary" type="button" @click="emit('imported', preview)">
              In Editor übernehmen
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
