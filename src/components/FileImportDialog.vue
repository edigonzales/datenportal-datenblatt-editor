<script setup lang="ts">
import { ref } from "vue";
import type { ImportPreview } from "../domain/datasetTypes";
import { getRootIdentifier, getRootTitle } from "../domain/normalize";
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
          <h2>JSON importieren</h2>
          <p class="muted">Lokale Datei lesen, validieren und als Datenblatt oder Datensatzserie in den Editor übernehmen.</p>
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
          <strong>JSON hier ablegen oder Datei wählen</strong>
          <p class="muted">Akzeptiert werden lokale Dateien mit genau einem Datenblatt oder einer Datensatzserie.</p>
          <input class="sr-only" type="file" accept="application/json,.json" @change="void handleFiles(($event.target as HTMLInputElement).files)" />
        </label>

        <div v-if="error" class="notice" data-tone="danger">
          <strong>Import fehlgeschlagen</strong>
          <span>{{ error }}</span>
        </div>

        <section v-if="preview" class="surface section-stack">
          <div>
            <h3>Vorschau</h3>
            <p class="muted">
              {{ preview.draftKind === "series" ? "Datensatzserie" : "Datenblatt" }} •
              {{ preview.importShape === "root" ? "Root-Format" : "Nacktes Objekt" }}
            </p>
          </div>
          <div>
            <strong>{{ getRootTitle(preview.root) || (preview.draftKind === "series" ? "Unbenannte Datensatzserie" : "Unbenanntes Datenblatt") }}</strong>
            <p class="mono">{{ getRootIdentifier(preview.root) || "ohne Identifier" }}</p>
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
