import type {
  DatasetAttribute,
  DatasetIssue,
  DatasetSeries,
  IssueInheritedGroup,
  JsonObject,
  LocalIssueState,
  TemporalCoverage
} from "./datasetTypes";

export const issueInheritedGroups = [
  "description",
  "accessLevel",
  "publicationStatus",
  "accrualPeriodicity",
  "modified",
  "temporalCoverage",
  "surveyMethod",
  "dataAvailableFrom",
  "furtherUses",
  "remarks"
] as const satisfies readonly IssueInheritedGroup[];

export function createLocalIssueState(partial: Partial<LocalIssueState> = {}): LocalIssueState {
  const inheritedGroups = Object.fromEntries(issueInheritedGroups.map((group) => [group, true])) as Record<
    IssueInheritedGroup,
    boolean
  >;

  const state: LocalIssueState = {
    inheritedGroups,
    autoIdentifier: true,
    autoTitle: true,
    ...partial
  };

  state.inheritedGroups = {
    ...inheritedGroups,
    ...(partial.inheritedGroups ?? {})
  };

  return state;
}

export function deriveImportedIssueState(rawIssue: JsonObject): LocalIssueState {
  return createLocalIssueState({
    autoIdentifier: !hasOwn(rawIssue, "identifier"),
    autoTitle: !hasOwn(rawIssue, "title"),
    inheritedGroups: {
      description: !hasOwn(rawIssue, "description"),
      accessLevel: !hasOwn(rawIssue, "accessLevel"),
      publicationStatus: !hasOwn(rawIssue, "publicationStatus"),
      accrualPeriodicity: !hasOwn(rawIssue, "accrualPeriodicity"),
      modified: !hasOwn(rawIssue, "modified"),
      temporalCoverage: !hasOwn(rawIssue, "temporalCoverage"),
      surveyMethod: !hasOwn(rawIssue, "surveyMethod"),
      dataAvailableFrom: !hasOwn(rawIssue, "dataAvailableFrom"),
      furtherUses: !hasOwn(rawIssue, "furtherUses"),
      remarks: !hasOwn(rawIssue, "remarks")
    }
  });
}

export function ensureIssueLocalState(issue: DatasetIssue): LocalIssueState {
  issue.__localIssueState = issue.__localIssueState
    ? createLocalIssueState(issue.__localIssueState)
    : inferIssueStateFromCurrentValues(issue);
  return issue.__localIssueState;
}

export function isIssueGroupInherited(issue: DatasetIssue, group: IssueInheritedGroup): boolean {
  return ensureIssueLocalState(issue).inheritedGroups?.[group] !== false;
}

export function markIssueGroupOverridden(issue: DatasetIssue, group: IssueInheritedGroup): void {
  ensureIssueLocalState(issue).inheritedGroups![group] = false;
}

export function isIssueIdentifierAuto(issue: DatasetIssue): boolean {
  return ensureIssueLocalState(issue).autoIdentifier !== false;
}

export function disableIssueIdentifierAuto(issue: DatasetIssue): void {
  ensureIssueLocalState(issue).autoIdentifier = false;
}

export function isIssueTitleAuto(issue: DatasetIssue): boolean {
  return ensureIssueLocalState(issue).autoTitle !== false;
}

export function disableIssueTitleAuto(issue: DatasetIssue): void {
  ensureIssueLocalState(issue).autoTitle = false;
}

export function buildDerivedIssueIdentifier(seriesIdentifier?: string, issueLabel?: string): string {
  const identifier = (seriesIdentifier ?? "").trim();
  const label = (issueLabel ?? "").trim();
  if (identifier && label) {
    return `${identifier}_${label}`;
  }
  return identifier || label;
}

export function buildDerivedIssueTitle(seriesTitle?: string, issueLabel?: string): string {
  const title = (seriesTitle ?? "").trim();
  const label = (issueLabel ?? "").trim();
  if (title && label) {
    return `${title} ${label}`;
  }
  return title || label;
}

export function syncIssueFromSeriesDefaults(series: DatasetSeries, issue: DatasetIssue): void {
  const localState = ensureIssueLocalState(issue);

  for (const group of issueInheritedGroups) {
    if (localState.inheritedGroups?.[group] !== false) {
      assignGroupFromSeries(issue, series, group);
    }
  }

  if (localState.autoIdentifier !== false) {
    issue.identifier = buildDerivedIssueIdentifier(series.identifier, issue.issueLabel);
  }

  if (localState.autoTitle !== false) {
    issue.title = buildDerivedIssueTitle(series.title, issue.issueLabel);
  }
}

export function createEffectiveIssue(series: DatasetSeries, issue: DatasetIssue): DatasetIssue {
  const effective: DatasetIssue = {
    ...issue,
    temporalCoverage: cloneTemporalCoverage(issue.temporalCoverage),
    attributes: cloneAttributes(issue.attributes)
  };

  const localState = ensureIssueLocalState(issue);
  for (const group of issueInheritedGroups) {
    if (localState.inheritedGroups?.[group] !== false) {
      assignGroupFromSeries(effective, series, group);
    }
  }

  if (localState.autoIdentifier !== false) {
    effective.identifier = buildDerivedIssueIdentifier(series.identifier, issue.issueLabel);
  }

  if (localState.autoTitle !== false) {
    effective.title = buildDerivedIssueTitle(series.title, issue.issueLabel);
  }

  return effective;
}

function inferIssueStateFromCurrentValues(issue: DatasetIssue): LocalIssueState {
  return createLocalIssueState({
    autoIdentifier: !hasText(issue.identifier),
    autoTitle: !hasText(issue.title),
    inheritedGroups: {
      description: !hasText(issue.description),
      accessLevel: !hasText(issue.accessLevel),
      publicationStatus: !hasText(issue.publicationStatus),
      accrualPeriodicity: !hasText(issue.accrualPeriodicity),
      modified: !hasText(issue.modified),
      temporalCoverage: isEmptyTemporalCoverage(issue.temporalCoverage),
      surveyMethod: !hasText(issue.surveyMethod),
      dataAvailableFrom: !hasText(issue.dataAvailableFrom),
      furtherUses: !hasText(issue.furtherUses),
      remarks: !hasText(issue.remarks)
    }
  });
}

function assignGroupFromSeries(target: DatasetIssue, series: DatasetSeries, group: IssueInheritedGroup): void {
  switch (group) {
    case "description":
      target.description = series.description ?? "";
      return;
    case "accessLevel":
      target.accessLevel = series.accessLevel ?? "";
      return;
    case "publicationStatus":
      target.publicationStatus = series.publicationStatus ?? "";
      return;
    case "accrualPeriodicity":
      target.accrualPeriodicity = series.accrualPeriodicity ?? "";
      return;
    case "modified":
      target.modified = series.modified ?? "";
      return;
    case "temporalCoverage":
      target.temporalCoverage = cloneTemporalCoverage(series.temporalCoverage);
      return;
    case "surveyMethod":
      target.surveyMethod = series.surveyMethod ?? "";
      return;
    case "dataAvailableFrom":
      target.dataAvailableFrom = series.dataAvailableFrom ?? "";
      return;
    case "furtherUses":
      target.furtherUses = series.furtherUses ?? "";
      return;
    case "remarks":
      target.remarks = series.remarks ?? "";
      return;
  }
}

function hasOwn(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasText(value?: string): boolean {
  return (value ?? "").trim().length > 0;
}

function isEmptyTemporalCoverage(coverage?: TemporalCoverage): boolean {
  return !hasText(coverage?.startDate) && !hasText(coverage?.endDate) && !hasText(coverage?.referenceDate);
}

function cloneTemporalCoverage(coverage?: TemporalCoverage): TemporalCoverage {
  return { ...(coverage ?? {}) };
}

function cloneAttributes(attributes?: DatasetAttribute[]): DatasetAttribute[] {
  return (attributes ?? []).map((attribute) => ({ ...attribute }));
}
