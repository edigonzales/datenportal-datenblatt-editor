<script setup lang="ts">
import { computed, watch } from "vue";
import type { DatasetIssue, DatasetSeries, IssueValidationSummary, ValidationResult } from "../domain/datasetTypes";
import { createEmptyDatasetIssue } from "../domain/normalize";
import { syncIssueFromSeriesDefaults } from "../domain/seriesIssues";
import AttributeTable from "./AttributeTable.vue";
import DatasetIssueForm from "./DatasetIssueForm.vue";

const props = defineProps<{
  series: DatasetSeries;
  validation: ValidationResult;
  activeIssueId?: string;
}>();

const emit = defineEmits<{
  select: [issueId: string];
}>();

const issues = computed(() => props.series.issues ?? (props.series.issues = []));

const validationByIssueId = computed(() => {
  return new Map((props.validation.issueSummaries ?? []).map((summary) => [summary.issueId, summary]));
});

const activeIssue = computed(() => {
  return (
    issues.value.find((entry) => entry.__localIssueId === props.activeIssueId) ??
    issues.value.find((entry) => typeof entry.__localIssueId === "string") ??
    null
  );
});

function summaryForIssue(entry: DatasetIssue, index: number): IssueValidationSummary {
  const issueId = entry.__localIssueId ?? `issue-${index + 1}`;
  return (
    validationByIssueId.value.get(issueId) ?? {
      issueId,
      label: entry.issueLabel?.trim() || `Ausgabe ${index + 1}`,
      title: entry.title?.trim() || "Unbenannte Ausgabe",
      isCurrentIssue: entry.isCurrentIssue === true,
      errorCount: 0,
      warningCount: 0
    }
  );
}

function selectIssue(issueId?: string): void {
  if (!issueId) {
    return;
  }
  emit("select", issueId);
}

function addIssue(): void {
  const issue = createEmptyDatasetIssue(props.series, {
    isCurrentIssue: !issues.value.some((entry) => entry.isCurrentIssue)
  });
  issues.value.push(issue);
  selectIssue(issue.__localIssueId);
}

function duplicateIssue(issueId?: string): void {
  const index = issues.value.findIndex((entry) => entry.__localIssueId === issueId);
  if (index < 0) {
    return;
  }

  const copy = JSON.parse(JSON.stringify(issues.value[index])) as DatasetIssue;
  copy.__localIssueId = crypto.randomUUID();
  if (copy.isCurrentIssue) {
    copy.isCurrentIssue = false;
  }
  issues.value.splice(index + 1, 0, copy);
  selectIssue(copy.__localIssueId);
}

function deleteIssue(issueId?: string): void {
  if (!issueId || issues.value.length <= 1) {
    return;
  }

  const index = issues.value.findIndex((entry) => entry.__localIssueId === issueId);
  if (index < 0) {
    return;
  }

  const wasCurrentIssue = issues.value[index].isCurrentIssue === true;
  issues.value.splice(index, 1);

  if (wasCurrentIssue && !issues.value.some((entry) => entry.isCurrentIssue) && issues.value[0]) {
    issues.value[0].isCurrentIssue = true;
  }

  const nextIssue = issues.value[Math.min(index, issues.value.length - 1)];
  selectIssue(nextIssue?.__localIssueId);
}

function setCurrentIssue(issueId: string | undefined, value: boolean): void {
  if (!issueId) {
    return;
  }

  for (const entry of issues.value) {
    entry.isCurrentIssue = entry.__localIssueId === issueId ? value : false;
  }
}

function syncIssues(): void {
  for (const issue of issues.value) {
    syncIssueFromSeriesDefaults(props.series, issue);
  }
}

const seriesDefaultsSignature = computed(() =>
  JSON.stringify({
    identifier: props.series.identifier ?? "",
    title: props.series.title ?? "",
    description: props.series.description ?? "",
    publisherRef: props.series.publisherRef ?? "",
    creatorRef: props.series.creatorRef ?? "",
    contactPoint: props.series.contactPoint ?? {},
    themes: props.series.themes ?? [],
    keywords: props.series.keywords ?? [],
    accrualPeriodicity: props.series.accrualPeriodicity ?? "",
    issued: props.series.issued ?? "",
    modified: props.series.modified ?? "",
    temporalCoverage: props.series.temporalCoverage ?? {},
    surveyMethod: props.series.surveyMethod ?? "",
    dataAvailableFrom: props.series.dataAvailableFrom ?? "",
    furtherUses: props.series.furtherUses ?? "",
    auxiliaryData: props.series.auxiliaryData ?? "",
    remarks: props.series.remarks ?? ""
  })
);

const issueDerivationSignature = computed(() =>
  JSON.stringify(
    issues.value.map((entry) => ({
      issueId: entry.__localIssueId ?? "",
      issueLabel: entry.issueLabel ?? "",
      autoIdentifier: entry.__localIssueState?.autoIdentifier !== false,
      autoTitle: entry.__localIssueState?.autoTitle !== false
    }))
  )
);

watch([seriesDefaultsSignature, issueDerivationSignature], syncIssues, { immediate: true });
</script>

<template>
  <div class="series-workspace">
    <section class="surface section-stack series-issue-list">
      <div class="header-line">
        <div>
          <h2>Ausgaben</h2>
          <p class="muted">{{ issues.length }} Ausgaben im aktuellen Serienentwurf</p>
        </div>
        <button class="button button--primary" type="button" @click="addIssue">Ausgabe hinzufügen</button>
      </div>

      <div v-if="issues.length" class="series-issue-grid">
        <button
          v-for="(entry, index) in issues"
          :key="entry.__localIssueId || index"
          class="draft-card draft-card--selectable series-issue-card"
          :data-selected="entry.__localIssueId === activeIssue?.__localIssueId"
          type="button"
          @click="selectIssue(entry.__localIssueId)"
        >
          <div class="header-line">
            <div>
              <h3>{{ summaryForIssue(entry, index).label }}</h3>
              <p>{{ summaryForIssue(entry, index).title }}</p>
            </div>
            <span v-if="entry.isCurrentIssue" class="status-pill" data-state="saved">Aktuell</span>
          </div>

          <div class="inline-actions">
            <span
              class="status-pill"
              :data-state="
                summaryForIssue(entry, index).errorCount
                  ? 'error'
                  : summaryForIssue(entry, index).warningCount
                    ? 'dirty'
                    : 'saved'
              "
            >
              {{
                summaryForIssue(entry, index).errorCount
                  ? `${summaryForIssue(entry, index).errorCount} Fehler`
                  : summaryForIssue(entry, index).warningCount
                    ? `${summaryForIssue(entry, index).warningCount} Warnungen`
                    : 'OK'
              }}
            </span>
          </div>

          <div class="draft-actions">
            <button class="button" type="button" @click.stop="duplicateIssue(entry.__localIssueId)">Duplizieren</button>
            <button
              class="button button--danger"
              type="button"
              :disabled="issues.length <= 1"
              @click.stop="deleteIssue(entry.__localIssueId)"
            >
              Löschen
            </button>
          </div>
        </button>
      </div>
    </section>

    <div v-if="activeIssue" class="section-stack series-workspace__editor">
      <DatasetIssueForm :issue="activeIssue" @set-current="setCurrentIssue(activeIssue.__localIssueId, $event)" />
      <AttributeTable
        :attributes="activeIssue.attributes ?? (activeIssue.attributes = [])"
        title="Attribute der Ausgabe"
        description="Attribute, die nur für diese Ausgabe gelten."
        empty-title="Noch keine Ausgabe-Attribute"
        empty-message="Fügen Sie hier ausgabespezifische Attribute hinzu."
      />
    </div>
  </div>
</template>
