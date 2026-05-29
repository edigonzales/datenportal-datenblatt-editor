<script setup lang="ts">
import { computed } from "vue";
import type { EditableRootJson } from "../domain/datasetTypes";
import { serializeDataset } from "../services/exportService";

const props = defineProps<{
  root: EditableRootJson;
}>();

const preview = computed(() => serializeDataset(props.root));
</script>

<template>
  <section class="json-panel">
    <div class="header-line">
      <div>
        <h2>Datenblatt-Vorschau</h2>
        <p class="muted">Readonly-Vorschau des Exportformats, das beim Export geschrieben wird.</p>
      </div>
    </div>
    <pre class="mono">{{ preview }}</pre>
  </section>
</template>
