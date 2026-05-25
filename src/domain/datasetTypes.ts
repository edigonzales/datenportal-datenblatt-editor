export type JsonObject = Record<string, unknown>;

export interface ContactPoint extends JsonObject {
  name?: string;
  organizationUnit?: string;
  email?: string;
  phone?: string;
  url?: string;
}

export interface TemporalCoverage extends JsonObject {
  startDate?: string;
  endDate?: string;
  referenceDate?: string;
}

export interface DatasetAttribute extends JsonObject {
  name?: string;
  dataType?: string;
  description?: string;
  unit?: string;
  codeList?: string;
  mandatory?: boolean;
}

export interface Dataset extends JsonObject {
  identifier?: string;
  title?: string;
  description?: string;
  publisherRef?: string;
  creatorRef?: string;
  contactPoint?: ContactPoint;
  themes?: string[];
  keywords?: string[];
  accrualPeriodicity?: string;
  issued?: string;
  modified?: string;
  temporalCoverage?: TemporalCoverage;
  surveyMethod?: string;
  attributes?: DatasetAttribute[];
  dataAvailableFrom?: string;
  furtherUses?: string;
  auxiliaryData?: string;
  remarks?: string;
}

export interface DatasetRootJson extends JsonObject {
  type: "Dataset";
  schemaVersion: string;
  dataset: Dataset;
}

export type DatasetSourceType = "endpoint" | "file" | "new" | "indexeddb";
export type AppMode =
  | "empty"
  | "loading-from-endpoint"
  | "importing-file"
  | "editing-dataset"
  | "validation-error";
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type ImportShape = "root" | "naked";
export type ImportConflictAction = "open-existing" | "save-copy" | "overwrite";

export interface MetadataSource {
  label: string;
  indexUrl: string;
  version: string;
}

export interface MetadataSearchRecord {
  identifier: string;
  title: string;
  description: string;
  modified?: string;
  organizationUnit?: string;
  keywords: string[];
  document: unknown;
}

export interface DatasetDraftRecord {
  id: string;
  identifier: string;
  title: string;
  updatedAt: string;
  sourceType: DatasetSourceType;
  sourceLabel?: string;
  sourceUrl?: string;
  originalFileName?: string;
  schemaVersion: string;
  data: DatasetRootJson;
  dirty: boolean;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "success";
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export interface ImportPreview {
  root: DatasetRootJson;
  importShape: ImportShape;
  sourceType: DatasetSourceType;
  sourceLabel?: string;
  sourceUrl?: string;
  originalFileName?: string;
}

export interface ConflictResolutionContext {
  existingDraft: DatasetDraftRecord;
  preview: ImportPreview;
}
