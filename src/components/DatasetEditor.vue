<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AttributeTable from "./AttributeTable.vue";
import DatasetForm from "./DatasetForm.vue";
import JsonPreview from "./JsonPreview.vue";
import ValidationPanel from "./ValidationPanel.vue";
import { useDatasetStore } from "../stores/datasetStore";
import { validateDataset } from "../domain/validation";

const props = defineProps<{
  tab: "dataset" | "attributes" | "json";
}>();

const route = useRoute();
const router = useRouter();
const store = useDatasetStore();

const currentDraft = computed(() => store.currentDraft);
const validation = computed(() => (currentDraft.value ? validateDataset(currentDraft.value.data) : null));

watch(
  () => route.params.id,
  async (id) => {
    if (typeof id !== "string") {
      return;
    }
    if (store.currentDraft?.id === id) {
      return;
    }
    const draft = await store.openDraft(id, "indexeddb");
    if (!draft) {
      void router.push("/");
    }
  },
  { immediate: true }
);

watch(
  () => store.currentDraft?.data,
  () => {
    store.markDirty();
  },
  { deep: true }
);
</script>

<template>
  <div v-if="currentDraft && validation" class="grid-main">
    <div class="section-stack">
      <section v-if="store.saveState === 'error'" class="surface surface--alert section-stack">
        <div>
          <h2>Speichern fehlgeschlagen</h2>
          <p class="muted">{{ store.saveError }}</p>
        </div>
      </section>

      <DatasetForm v-if="tab === 'dataset'" :dataset="currentDraft.data.dataset" />
      <AttributeTable v-else-if="tab === 'attributes'" :attributes="currentDraft.data.dataset.attributes ?? []" />
      <JsonPreview v-else :root="currentDraft.data" />
    </div>

    <ValidationPanel :validation="validation" />
  </div>

  <div v-else class="empty-state" style="padding: 24px">
    <h2>Entwurf wird geladen</h2>
    <p>Falls kein Entwurf gefunden wird, wechseln Sie zur Startseite und laden Sie ein Datenblatt.</p>
  </div>
</template>
