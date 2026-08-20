<script setup lang="ts">
import { computed } from "vue";
import type { ValidationGroup, ValidationResult } from "../domain/datasetTypes";

const props = defineProps<{
  validation: ValidationResult;
}>();

function sortIssues(group: ValidationGroup | Pick<ValidationResult, "issues">) {
  const order = { error: 0, warning: 1, success: 2 };
  return [...group.issues].sort((left, right) => order[left.severity] - order[right.severity]);
}

const orderedIssues = computed(() => sortIssues(props.validation));
const groups = computed(() => props.validation.groups ?? []);
const seriesGroup = computed(() => groups.value.find((entry) => entry.scope === "series") ?? null);
const activeIssueGroup = computed(
  () => groups.value.find((entry) => entry.scope === "issue" && entry.active) ?? groups.value.find((entry) => entry.scope === "issue") ?? null
);
const otherIssueGroups = computed(() =>
  groups.value.filter((entry) => entry.scope === "issue" && entry.id !== activeIssueGroup.value?.id)
);
</script>

<template>
  <aside class="sidebar-panel validation-panel">
    <div class="validation-panel__intro">
      <h3>Prüfstatus</h3>
      <p class="muted">
        {{ validation.errorCount }} Fehler, {{ validation.warningCount }} Warnungen
      </p>
    </div>

    <div v-if="groups.length" class="section-stack">
      <section v-if="seriesGroup" class="status-section">
        <div class="status-section__header">
          <h4>Serie</h4>
          <span class="status-pill" :data-state="seriesGroup.errorCount ? 'error' : seriesGroup.warningCount ? 'dirty' : 'saved'">
            {{ seriesGroup.errorCount ? `${seriesGroup.errorCount} Fehler` : seriesGroup.warningCount ? `${seriesGroup.warningCount} Warnungen` : "Keine offenen Probleme" }}
          </span>
        </div>
        <div class="status-list">
          <article
            v-for="entry in sortIssues(seriesGroup)"
            :key="`${seriesGroup.id}-${entry.code}-${entry.path}`"
            class="status-item"
            :data-severity="entry.severity"
          >
            <span class="status-item__title">{{ entry.message }}</span>
            <span v-if="entry.path !== '$'" class="muted mono">{{ entry.path }}</span>
          </article>
        </div>
      </section>

      <section v-if="activeIssueGroup" class="status-section">
        <div class="status-section__header">
          <h4>Aktuelle Ausgabe</h4>
          <span class="status-pill" :data-state="activeIssueGroup.errorCount ? 'error' : activeIssueGroup.warningCount ? 'dirty' : 'saved'">
            {{
              activeIssueGroup.errorCount
                ? `${activeIssueGroup.errorCount} Fehler`
                : activeIssueGroup.warningCount
                  ? `${activeIssueGroup.warningCount} Warnungen`
                  : "Keine offenen Probleme"
            }}
          </span>
        </div>
        <p class="status-section__summary muted">{{ activeIssueGroup.title }}</p>
        <div class="status-list">
          <article
            v-for="entry in sortIssues(activeIssueGroup)"
            :key="`${activeIssueGroup.id}-${entry.code}-${entry.path}`"
            class="status-item"
            :data-severity="entry.severity"
          >
            <span class="status-item__title">{{ entry.message }}</span>
            <span v-if="entry.path !== '$'" class="muted mono">{{ entry.path }}</span>
          </article>
        </div>
      </section>

      <section v-if="otherIssueGroups.length" class="status-section">
        <h4>Weitere Ausgaben</h4>
        <div class="status-list">
          <article
            v-for="group in otherIssueGroups"
            :key="group.id"
            class="status-item"
            :data-severity="group.errorCount ? 'error' : group.warningCount ? 'warning' : 'success'"
          >
            <span class="status-item__title">{{ group.title }}</span>
            <span class="muted">
              {{
                group.errorCount
                  ? `${group.errorCount} Fehler`
                  : group.warningCount
                    ? `${group.warningCount} Warnungen`
                    : "Keine offenen Probleme"
              }}
            </span>
          </article>
        </div>
      </section>
    </div>

    <div v-else class="status-list">
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
