import type {
  ContactPoint,
  Dataset,
  DatasetAttribute,
  DatasetIssue,
  DatasetRootJson,
  DatasetSeries,
  DatasetSeriesRootJson,
  DraftKind,
  EditableRootJson,
  ImportShape,
  JsonObject,
  TemporalCoverage
} from "./datasetTypes";

export const DEFAULT_SCHEMA_VERSION = "2026-05-23";

export class DatasetImportError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DatasetImportError";
    this.code = code;
  }
}

export function createEmptyDatasetRoot(): DatasetRootJson {
  return {
    type: "Dataset",
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    dataset: createEmptyDataset()
  };
}

export function createEmptyDatasetSeriesRoot(): DatasetSeriesRootJson {
  return {
    type: "DatasetSeries",
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    series: {
      ...createEmptyDataset(),
      issues: [createEmptyDatasetIssue({ isCurrentIssue: true })]
    }
  };
}

export function createEmptyDatasetIssue(options: { isCurrentIssue?: boolean } = {}): DatasetIssue {
  return {
    __localIssueId: crypto.randomUUID(),
    identifier: "",
    title: "",
    description: "",
    issueLabel: "",
    isCurrentIssue: options.isCurrentIssue ?? false,
    accrualPeriodicity: "",
    issued: "",
    modified: "",
    temporalCoverage: {},
    surveyMethod: "",
    attributes: [],
    dataAvailableFrom: "",
    furtherUses: "",
    auxiliaryData: "",
    remarks: ""
  };
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDatasetRoot(value: unknown): value is DatasetRootJson {
  return isObject(value) && value.type === "Dataset" && isObject(value.dataset);
}

export function isDatasetSeriesRoot(value: unknown): value is DatasetSeriesRootJson {
  return isObject(value) && value.type === "DatasetSeries" && isObject(value.series);
}

export function isDatasetSeriesLike(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return value.type === "DatasetSeries" || isObject(value.series) || Array.isArray(value.issues);
}

export function isDatasetIssueLike(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  if ("issues" in value || "series" in value || "dataset" in value) {
    return false;
  }

  return "issueLabel" in value || "isCurrentIssue" in value;
}

export function getDraftKindFromRoot(root: EditableRootJson | unknown): DraftKind {
  return isDatasetSeriesRoot(root) ? "series" : "dataset";
}

export function getRootIdentifier(root: EditableRootJson): string {
  return isDatasetSeriesRoot(root) ? root.series.identifier ?? "" : root.dataset.identifier ?? "";
}

export function getRootTitle(root: EditableRootJson): string {
  return isDatasetSeriesRoot(root) ? root.series.title ?? "" : root.dataset.title ?? "";
}

export function normalizeImportedJson(
  input: unknown
): { root: EditableRootJson; importShape: ImportShape; draftKind: DraftKind } {
  if (!isObject(input)) {
    throw new DatasetImportError("invalid-structure", "Die Datei enthält kein gültiges Objekt.");
  }

  if ("series" in input) {
    if (input.type !== "DatasetSeries") {
      throw new DatasetImportError("invalid-root-type", "Das Root-Objekt muss den Typ \"DatasetSeries\" haben.");
    }

    if (!isObject(input.series)) {
      throw new DatasetImportError("missing-series", "Das Root-Objekt enthält keine gültige Datensatzserie.");
    }

    const { schemaVersion, series, type, ...rest } = input;
    return {
      draftKind: "series",
      importShape: "root",
      root: {
        ...rest,
        type: "DatasetSeries",
        schemaVersion: typeof schemaVersion === "string" ? schemaVersion : DEFAULT_SCHEMA_VERSION,
        series: hydrateSeries(series)
      }
    };
  }

  if ("dataset" in input) {
    if (input.type !== "Dataset") {
      throw new DatasetImportError("invalid-root-type", "Das Root-Objekt muss den Typ \"Dataset\" haben.");
    }

    if (!isObject(input.dataset)) {
      throw new DatasetImportError("missing-dataset", "Das Root-Objekt enthält kein gültiges Datenblatt.");
    }

    const { dataset, schemaVersion, type, ...rest } = input;
    return {
      draftKind: "dataset",
      importShape: "root",
      root: {
        ...rest,
        type: "Dataset",
        schemaVersion: typeof schemaVersion === "string" ? schemaVersion : DEFAULT_SCHEMA_VERSION,
        dataset: hydrateDataset(dataset)
      }
    };
  }

  if (isDatasetSeriesLike(input)) {
    return {
      draftKind: "series",
      importShape: "naked",
      root: {
        type: "DatasetSeries",
        schemaVersion: DEFAULT_SCHEMA_VERSION,
        series: hydrateSeries(input)
      }
    };
  }

  if (isDatasetIssueLike(input)) {
    throw new DatasetImportError(
      "dataset-issue",
      "Diese Datei enthält nur eine einzelne Ausgabe. Der Editor erwartet ein ganzes Datenblatt oder eine Datensatzserie."
    );
  }

  return {
    draftKind: "dataset",
    importShape: "naked",
    root: {
      type: "Dataset",
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      dataset: hydrateDataset(input)
    }
  };
}

export function cloneRoot(root: EditableRootJson): EditableRootJson {
  return JSON.parse(JSON.stringify(root)) as EditableRootJson;
}

export function toExportRoot(root: EditableRootJson): EditableRootJson {
  const cloned = cloneRoot(root);

  if (!isDatasetSeriesRoot(cloned)) {
    return cloned;
  }

  cloned.series.issues = (cloned.series.issues ?? []).map((issue) => {
    const { __localIssueId, ...rest } = issue;
    return rest;
  });

  return cloned;
}

function createEmptyDataset(): Dataset {
  return {
    identifier: "",
    title: "",
    description: "",
    publisherRef: "",
    creatorRef: "",
    contactPoint: {
      name: "",
      organizationUnit: "",
      email: "",
      phone: "",
      url: ""
    },
    themes: [],
    keywords: [],
    accrualPeriodicity: "",
    issued: "",
    modified: "",
    temporalCoverage: {},
    surveyMethod: "",
    attributes: [],
    dataAvailableFrom: "",
    furtherUses: "",
    auxiliaryData: "",
    remarks: ""
  };
}

function hydrateDataset(dataset: JsonObject): Dataset {
  const base = createEmptyDataset();
  const {
    contactPoint,
    themes,
    keywords,
    attributes,
    temporalCoverage,
    ...rest
  } = dataset;

  return {
    ...base,
    ...rest,
    contactPoint: hydrateContactPoint(contactPoint),
    themes: Array.isArray(themes) ? themes.filter(isString) : [],
    keywords: Array.isArray(keywords) ? keywords.filter(isString) : [],
    attributes: Array.isArray(attributes) ? attributes.filter(isObject).map(hydrateAttribute) : [],
    temporalCoverage: hydrateTemporalCoverage(temporalCoverage)
  };
}

function hydrateSeries(series: JsonObject): DatasetSeries {
  const base = createEmptyDatasetSeriesRoot().series;
  const {
    contactPoint,
    themes,
    keywords,
    attributes,
    temporalCoverage,
    issues,
    ...rest
  } = series;

  return {
    ...base,
    ...rest,
    contactPoint: hydrateContactPoint(contactPoint),
    themes: Array.isArray(themes) ? themes.filter(isString) : [],
    keywords: Array.isArray(keywords) ? keywords.filter(isString) : [],
    attributes: Array.isArray(attributes) ? attributes.filter(isObject).map(hydrateAttribute) : [],
    temporalCoverage: hydrateTemporalCoverage(temporalCoverage),
    issues: Array.isArray(issues) ? issues.filter(isObject).map(hydrateIssue) : []
  };
}

function hydrateIssue(issue: JsonObject): DatasetIssue {
  const base = createEmptyDatasetIssue();
  const { attributes, temporalCoverage, ...rest } = issue;

  return {
    ...base,
    ...rest,
    __localIssueId: typeof issue.__localIssueId === "string" ? issue.__localIssueId : crypto.randomUUID(),
    attributes: Array.isArray(attributes) ? attributes.filter(isObject).map(hydrateAttribute) : [],
    temporalCoverage: hydrateTemporalCoverage(temporalCoverage)
  };
}

function hydrateContactPoint(value: unknown): ContactPoint {
  const base = createEmptyDataset().contactPoint ?? {};
  return isObject(value) ? { ...base, ...value } : base;
}

function hydrateAttribute(value: JsonObject): DatasetAttribute {
  return {
    name: typeof value.name === "string" ? value.name : "",
    dataType: typeof value.dataType === "string" ? value.dataType : "",
    description: typeof value.description === "string" ? value.description : "",
    unit: typeof value.unit === "string" ? value.unit : "",
    codeList: typeof value.codeList === "string" ? value.codeList : "",
    mandatory: typeof value.mandatory === "boolean" ? value.mandatory : false,
    ...value
  };
}

function hydrateTemporalCoverage(value: unknown): TemporalCoverage {
  return isObject(value) ? { ...value } : {};
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
