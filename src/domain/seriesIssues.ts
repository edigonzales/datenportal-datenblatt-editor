import type {
  ContactPoint,
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
  "publisherRef",
  "creatorRef",
  "contactPoint",
  "themes",
  "keywords",
  "accrualPeriodicity",
  "issued",
  "modified",
  "temporalCoverage",
  "surveyMethod",
  "dataAvailableFrom",
  "furtherUses",
  "auxiliaryData",
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
      publisherRef: !hasOwn(rawIssue, "publisherRef"),
      creatorRef: !hasOwn(rawIssue, "creatorRef"),
      contactPoint: !hasOwn(rawIssue, "contactPoint"),
      themes: !hasOwn(rawIssue, "themes"),
      keywords: !hasOwn(rawIssue, "keywords"),
      accrualPeriodicity: !hasOwn(rawIssue, "accrualPeriodicity"),
      issued: !hasOwn(rawIssue, "issued"),
      modified: !hasOwn(rawIssue, "modified"),
      temporalCoverage: !hasOwn(rawIssue, "temporalCoverage"),
      surveyMethod: !hasOwn(rawIssue, "surveyMethod"),
      dataAvailableFrom: !hasOwn(rawIssue, "dataAvailableFrom"),
      furtherUses: !hasOwn(rawIssue, "furtherUses"),
      auxiliaryData: !hasOwn(rawIssue, "auxiliaryData"),
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
    contactPoint: cloneContactPoint(issue.contactPoint),
    themes: copyStringArray(issue.themes),
    keywords: copyStringArray(issue.keywords),
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
      publisherRef: !hasText(issue.publisherRef),
      creatorRef: !hasText(issue.creatorRef),
      contactPoint: isEmptyContactPoint(issue.contactPoint),
      themes: !issue.themes?.length,
      keywords: !issue.keywords?.length,
      accrualPeriodicity: !hasText(issue.accrualPeriodicity),
      issued: !hasText(issue.issued),
      modified: !hasText(issue.modified),
      temporalCoverage: isEmptyTemporalCoverage(issue.temporalCoverage),
      surveyMethod: !hasText(issue.surveyMethod),
      dataAvailableFrom: !hasText(issue.dataAvailableFrom),
      furtherUses: !hasText(issue.furtherUses),
      auxiliaryData: !hasText(issue.auxiliaryData),
      remarks: !hasText(issue.remarks)
    }
  });
}

function assignGroupFromSeries(target: DatasetIssue, series: DatasetSeries, group: IssueInheritedGroup): void {
  switch (group) {
    case "description":
      target.description = series.description ?? "";
      return;
    case "publisherRef":
      target.publisherRef = series.publisherRef ?? "";
      return;
    case "creatorRef":
      target.creatorRef = series.creatorRef ?? "";
      return;
    case "contactPoint":
      target.contactPoint = cloneContactPoint(series.contactPoint);
      return;
    case "themes":
      target.themes = copyStringArray(series.themes);
      return;
    case "keywords":
      target.keywords = copyStringArray(series.keywords);
      return;
    case "accrualPeriodicity":
      target.accrualPeriodicity = series.accrualPeriodicity ?? "";
      return;
    case "issued":
      target.issued = series.issued ?? "";
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
    case "auxiliaryData":
      target.auxiliaryData = series.auxiliaryData ?? "";
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

function isEmptyContactPoint(contactPoint?: ContactPoint): boolean {
  return !hasText(contactPoint?.name) &&
    !hasText(contactPoint?.organizationUnit) &&
    !hasText(contactPoint?.email) &&
    !hasText(contactPoint?.phone) &&
    !hasText(contactPoint?.url);
}

function isEmptyTemporalCoverage(coverage?: TemporalCoverage): boolean {
  return !hasText(coverage?.startDate) && !hasText(coverage?.endDate) && !hasText(coverage?.referenceDate);
}

function cloneContactPoint(contactPoint?: ContactPoint): ContactPoint {
  return {
    name: "",
    organizationUnit: "",
    email: "",
    phone: "",
    url: "",
    ...(contactPoint ?? {})
  };
}

function cloneTemporalCoverage(coverage?: TemporalCoverage): TemporalCoverage {
  return { ...(coverage ?? {}) };
}

function copyStringArray(values?: string[]): string[] {
  return [...(values ?? [])];
}

function cloneAttributes(attributes?: DatasetAttribute[]): DatasetAttribute[] {
  return (attributes ?? []).map((attribute) => ({ ...attribute }));
}
