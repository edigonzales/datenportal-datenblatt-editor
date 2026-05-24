import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { DatasetRootJson, JsonObject, ValidationIssue, ValidationResult } from "./datasetTypes";
import { DEFAULT_SCHEMA_VERSION, isDatasetSeriesLike, isObject } from "./normalize";

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const rootSchema = {
  type: "object",
  required: ["type", "dataset"],
  additionalProperties: true,
  properties: {
    type: { const: "Dataset" },
    schemaVersion: { type: "string" },
    dataset: {
      type: "object",
      additionalProperties: true
    }
  }
} as const;

const nakedDatasetSchema = {
  type: "object",
  additionalProperties: true
} as const;

const validateRootSchema = ajv.compile(rootSchema);
const validateNakedSchema = ajv.compile(nakedDatasetSchema);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateImportedStructure(input: unknown): ValidationIssue[] {
  if (!isObject(input)) {
    return [issue("error", "invalid-json", "$", "Die Datei enthält kein gültiges Datenblatt-Objekt.")];
  }

  if (isDatasetSeriesLike(input)) {
    return [
      issue(
        "error",
        "dataset-series",
        "$",
        "Diese Datei enthält eine Datensatzserie. Der MVP unterstützt nur einzelne Datenblätter."
      )
    ];
  }

  const ok = "dataset" in input ? validateRootSchema(input) : validateNakedSchema(input);
  if (ok) {
    return [];
  }

  const errors = ("dataset" in input ? validateRootSchema.errors : validateNakedSchema.errors) ?? [];
  return errors.map((entry) =>
    issue("error", "schema", entry.instancePath || "$", entry.message ?? "Die Struktur des Datenblatts ist ungültig.")
  );
}

export function validateDataset(root: DatasetRootJson): ValidationResult {
  const issues: ValidationIssue[] = [];
  const dataset = root.dataset;

  if (root.schemaVersion !== DEFAULT_SCHEMA_VERSION) {
    issues.push(
      issue(
        "warning",
        "schema-version",
        "$.schemaVersion",
        `Schema-Version ${root.schemaVersion} weicht vom MVP-Export ${DEFAULT_SCHEMA_VERSION} ab.`
      )
    );
  }

  pushRequired(issues, dataset.identifier, "$.dataset.identifier", "Identifier ist ein Pflichtfeld.");
  pushRequired(issues, dataset.title, "$.dataset.title", "Titel ist ein Pflichtfeld.");
  pushRequired(issues, dataset.description, "$.dataset.description", "Beschreibung ist ein Pflichtfeld.");
  pushRequired(issues, dataset.publisherRef, "$.dataset.publisherRef", "PublisherRef ist ein Pflichtfeld.");
  pushRequired(issues, dataset.creatorRef, "$.dataset.creatorRef", "CreatorRef ist ein Pflichtfeld.");
  pushRequired(
    issues,
    dataset.contactPoint?.email,
    "$.dataset.contactPoint.email",
    "Die Kontakt-E-Mail ist ein Pflichtfeld."
  );

  if ((dataset.description ?? "").length > 1024) {
    issues.push(
      issue(
        "error",
        "description-length",
        "$.dataset.description",
        "Die Beschreibung darf maximal 1024 Zeichen lang sein."
      )
    );
  }

  if (dataset.identifier && dataset.identifier !== dataset.identifier.trim()) {
    issues.push(
      issue(
        "error",
        "identifier-whitespace",
        "$.dataset.identifier",
        "Der Identifier darf keine führenden oder nachgestellten Leerzeichen enthalten."
      )
    );
  }

  const email = dataset.contactPoint?.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push(issue("error", "email-format", "$.dataset.contactPoint.email", "Die E-Mail-Adresse ist ungültig."));
  }

  const url = dataset.contactPoint?.url?.trim();
  if (url) {
    try {
      new URL(url);
    } catch {
      issues.push(issue("error", "url-format", "$.dataset.contactPoint.url", "Die URL ist ungültig."));
    }
  }

  validateDateField(issues, dataset.issued, "$.dataset.issued", "Issued");
  validateDateField(issues, dataset.modified, "$.dataset.modified", "Modified");
  validateTemporalCoverage(issues, dataset.temporalCoverage);

  if (dataset.issued && dataset.modified && isIsoDate(dataset.issued) && isIsoDate(dataset.modified)) {
    if (dataset.modified < dataset.issued) {
      issues.push(
        issue("error", "date-order", "$.dataset.modified", "Modified darf nicht vor Issued liegen.")
      );
    }
  }

  const seen = new Set<string>();
  let missingDescriptionCount = 0;
  for (const [index, attribute] of (dataset.attributes ?? []).entries()) {
    const name = (attribute.name ?? "").trim();
    if (!name) {
      issues.push(
        issue(
          "error",
          "attribute-name",
          `$.dataset.attributes[${index}].name`,
          "Attributnamen dürfen nicht leer sein."
        )
      );
    } else {
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) {
        issues.push(
          issue(
            "error",
            "attribute-duplicate",
            `$.dataset.attributes[${index}].name`,
            `Der Attributname "${name}" ist doppelt vorhanden.`
          )
        );
      }
      seen.add(key);
    }

    if (!((attribute.description ?? "").trim())) {
      missingDescriptionCount += 1;
    }
  }

  if (missingDescriptionCount > 0) {
    issues.push(
      issue(
        "warning",
        "attribute-description",
        "$.dataset.attributes",
        `${missingDescriptionCount} Attribute ohne Beschreibung.`
      )
    );
  }

  issues.push(success("required-ok", "$", "Pflichtfelder vollständig"));
  issues.push(success("single-dataset", "$", "Genau ein Datensatz im Datenblatt"));

  return {
    issues: foldSuccesses(issues),
    errorCount: issues.filter((entry) => entry.severity === "error").length,
    warningCount: issues.filter((entry) => entry.severity === "warning").length
  };
}

function validateTemporalCoverage(issues: ValidationIssue[], coverage: JsonObject | undefined): void {
  if (!coverage) {
    return;
  }

  const startDate = typeof coverage.startDate === "string" ? coverage.startDate : "";
  const endDate = typeof coverage.endDate === "string" ? coverage.endDate : "";
  const referenceDate = typeof coverage.referenceDate === "string" ? coverage.referenceDate : "";

  const hasRange = Boolean(startDate || endDate);
  const hasReference = Boolean(referenceDate);

  if (hasRange && hasReference) {
    issues.push(
      issue(
        "error",
        "temporal-exclusive",
        "$.dataset.temporalCoverage",
        "Zeitbezug muss entweder Zeitraum oder Stichtag sein."
      )
    );
  }

  if (hasRange) {
    validateDateField(issues, startDate, "$.dataset.temporalCoverage.startDate", "StartDate");
    validateDateField(issues, endDate, "$.dataset.temporalCoverage.endDate", "EndDate");
    if (!startDate || !endDate) {
      issues.push(
        issue(
          "error",
          "temporal-range-incomplete",
          "$.dataset.temporalCoverage",
          "Bei Zeitraum müssen Start- und Enddatum gesetzt sein."
        )
      );
    } else if (isIsoDate(startDate) && isIsoDate(endDate) && startDate > endDate) {
      issues.push(
        issue(
          "error",
          "temporal-range-order",
          "$.dataset.temporalCoverage",
          "Das Startdatum darf nicht nach dem Enddatum liegen."
        )
      );
    }
  }

  if (hasReference) {
    validateDateField(issues, referenceDate, "$.dataset.temporalCoverage.referenceDate", "ReferenceDate");
  }
}

function validateDateField(issues: ValidationIssue[], value: string | undefined, path: string, label: string): void {
  if (!value) {
    return;
  }
  if (!isIsoDate(value)) {
    issues.push(issue("error", "date-format", path, `${label} muss das Format YYYY-MM-DD haben.`));
  }
}

function pushRequired(
  issues: ValidationIssue[],
  value: string | undefined,
  path: string,
  message: string
): void {
  if (!value?.trim()) {
    issues.push(issue("error", "required", path, message));
  }
}

function isIsoDate(value: string): boolean {
  return isoDatePattern.test(value);
}

function issue(severity: ValidationIssue["severity"], code: string, path: string, message: string): ValidationIssue {
  return { severity, code, path, message };
}

function success(code: string, path: string, message: string): ValidationIssue {
  return issue("success", code, path, message);
}

function foldSuccesses(issues: ValidationIssue[]): ValidationIssue[] {
  const hasRequiredErrors = issues.some((entry) => entry.code === "required" && entry.severity === "error");
  const hasDatasetErrors = issues.some((entry) => entry.code === "schema" && entry.severity === "error");

  return issues.filter((entry) => {
    if (entry.code === "required-ok") {
      return !hasRequiredErrors;
    }
    if (entry.code === "single-dataset") {
      return !hasDatasetErrors;
    }
    return true;
  });
}
