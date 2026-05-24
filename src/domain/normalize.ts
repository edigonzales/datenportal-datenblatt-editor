import type {
  ContactPoint,
  Dataset,
  DatasetAttribute,
  DatasetRootJson,
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
    dataset: {
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
    }
  };
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDatasetSeriesLike(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  if (value.type === "DatasetSeries" || "series" in value || "issues" in value) {
    return true;
  }

  if ("issueLabel" in value || "isCurrentIssue" in value) {
    return true;
  }

  if (isObject(value.dataset) && ("issues" in value.dataset || "series" in value.dataset)) {
    return true;
  }

  return false;
}

export function normalizeImportedJson(input: unknown): { root: DatasetRootJson; importShape: ImportShape } {
  if (!isObject(input)) {
    throw new DatasetImportError("invalid-structure", "Die Datei enthält kein gültiges Objekt.");
  }

  if (isDatasetSeriesLike(input)) {
    throw new DatasetImportError(
      "dataset-series",
      "Diese Datei enthält eine Datensatzserie. Der MVP unterstützt nur einzelne Datenblätter."
    );
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
      importShape: "root",
      root: {
        ...rest,
        type: "Dataset",
        schemaVersion: typeof schemaVersion === "string" ? schemaVersion : DEFAULT_SCHEMA_VERSION,
        dataset: hydrateDataset(dataset)
      }
    };
  }

  return {
    importShape: "naked",
    root: {
      type: "Dataset",
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      dataset: hydrateDataset(input)
    }
  };
}

export function cloneDatasetRoot(root: DatasetRootJson): DatasetRootJson {
  return JSON.parse(JSON.stringify(root)) as DatasetRootJson;
}

function hydrateDataset(dataset: JsonObject): Dataset {
  const base = createEmptyDatasetRoot().dataset;
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

function hydrateContactPoint(value: unknown): ContactPoint {
  const base = createEmptyDatasetRoot().dataset.contactPoint ?? {};
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
