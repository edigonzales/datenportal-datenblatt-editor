<script setup lang="ts">
import { computed } from "vue";
import type { ValidationResult } from "../domain/datasetTypes";

const props = defineProps<{
  validation: ValidationResult;
}>();

const orderedIssues = computed(() => {
  const order = { error: 0, warning: 1, success: 2 };
  return [...props.validation.issues].sort((left, right) => order[left.severity] - order[right.severity]);
});
</script>

<template>
  <aside class="sidebar-panel">
    <h3>Prüfstatus</h3>
    <div class="status-list">
      <article
        v-for="entry in orderedIssues"
        :key="`${entry.code}-${entry.path}`"
        class="status-item"
        :data-severity="entry.severity"
      >
        <span class="status-item__title">{{ entry.message }}</span>
        <span v-if="entry.path !== '$'" class="muted mono">{{ entry.path }}</span>
      </article>
    </div>
  </aside>
</template>
