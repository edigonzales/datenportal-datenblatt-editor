import type { Dataset, DatasetIssue, DatasetSeries, EditableRootJson, JsonObject } from "../domain/datasetTypes";
import { DEFAULT_SCHEMA_VERSION, normalizeImportedJson, toExportRoot } from "../domain/normalize";

const INTERLIS_NS = "http://www.interlis.ch/xtf/2.4/INTERLIS";
const DATASHEET_NS = "http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Datasheet_20260523";
const BASE_NS = "http://www.interlis.ch/xtf/2.4/SO_AGI_DataCatalog_Base_20260529";

export function parseXtfTransfer(text: string): EditableRootJson[] {
  const document = parseXml(text);
  const transfer = document.documentElement;
  if (!transfer || transfer.localName !== "transfer") {
    throw new Error("Die Datei enthält keinen gültigen XTF-Transfer.");
  }

  const dataSection = firstChildElement(transfer, "datasection");
  const metadataBasket = dataSection ? firstChildElement(dataSection, "Metadata") : null;
  if (!metadataBasket) {
    throw new Error("Der XTF-Transfer enthält keinen Metadata-Basket.");
  }

  const records = childElements(metadataBasket)
    .filter((element) => element.localName === "Dataset" || element.localName === "DatasetSeries")
    .map((element) => {
      if (element.localName === "DatasetSeries") {
        return normalizeImportedJson({
          type: "DatasetSeries",
          schemaVersion: DEFAULT_SCHEMA_VERSION,
          series: parseSeriesElement(element)
        }).root;
      }

      return normalizeImportedJson({
        type: "Dataset",
        schemaVersion: DEFAULT_SCHEMA_VERSION,
        dataset: parseDatasetElement(element)
      }).root;
    });

  if (!records.length) {
    throw new Error("Der XTF-Transfer enthält keine Dataset- oder DatasetSeries-Objekte.");
  }

  return records;
}

export function parseSingleXtfTransfer(text: string): EditableRootJson {
  const records = parseXtfTransfer(text);
  if (records.length !== 1) {
    throw new Error("Die Datei muss genau ein Dataset oder genau eine DatasetSeries enthalten.");
  }
  return records[0];
}

export function serializeToXtf(root: EditableRootJson): string {
  const exportedRoot = toExportRoot(root);
  const document = parseXml(
    `<?xml version="1.0" encoding="UTF-8"?><ili:transfer xmlns="${DATASHEET_NS}" xmlns:base="${BASE_NS}" xmlns:ili="${INTERLIS_NS}"></ili:transfer>`
  );
  const transfer = document.documentElement;

  const headerSection = document.createElementNS(INTERLIS_NS, "ili:headersection");
  const models = document.createElementNS(INTERLIS_NS, "ili:models");
  for (const modelName of ["SO_AGI_DataCatalog_Datasheet_20260523", "SO_AGI_DataCatalog_Base_20260529"]) {
    const model = document.createElementNS(INTERLIS_NS, "ili:model");
    model.textContent = modelName;
    models.appendChild(model);
  }
  headerSection.appendChild(models);
  appendTextElement(document, headerSection, INTERLIS_NS, "ili:sender", "datenblatt-editor");
  transfer.appendChild(headerSection);

  const dataSection = document.createElementNS(INTERLIS_NS, "ili:datasection");
  const metadata = document.createElementNS(DATASHEET_NS, "Metadata");
  metadata.setAttributeNS(INTERLIS_NS, "ili:bid", "x1");

  const entity =
    exportedRoot.type === "Dataset"
      ? buildDatasetNode(document, exportedRoot.dataset)
      : buildSeriesNode(document, exportedRoot.series);

  metadata.appendChild(entity);
  dataSection.appendChild(metadata);
  transfer.appendChild(dataSection);

  return formatXml(new XMLSerializer().serializeToString(document));
}

function buildDatasetNode(document: XMLDocument, dataset: Dataset): Element {
  const element = document.createElementNS(DATASHEET_NS, "Dataset");
  element.setAttributeNS(INTERLIS_NS, "ili:tid", dataset.identifier?.trim() || "dataset");
  appendDatasetFields(document, element, dataset);
  return element;
}

function buildSeriesNode(document: XMLDocument, series: DatasetSeries): Element {
  const element = document.createElementNS(DATASHEET_NS, "DatasetSeries");
  element.setAttributeNS(INTERLIS_NS, "ili:tid", series.identifier?.trim() || "dataset-series");
  appendDatasetFields(document, element, series);

  for (const issue of series.issues ?? []) {
    const issueWrapper = document.createElementNS(DATASHEET_NS, "issues");
    issueWrapper.appendChild(buildIssueNode(document, issue));
    element.appendChild(issueWrapper);
  }

  return element;
}

function buildIssueNode(document: XMLDocument, issue: DatasetIssue): Element {
  const element = document.createElementNS(DATASHEET_NS, "DatasetIssue");
  appendTextElement(document, element, DATASHEET_NS, "identifier", issue.identifier);
  appendOptionalTextElement(document, element, DATASHEET_NS, "title", issue.title);
  appendOptionalTextElement(document, element, DATASHEET_NS, "description", issue.description);
  appendTextElement(document, element, DATASHEET_NS, "issueLabel", issue.issueLabel);
  appendBooleanElement(document, element, DATASHEET_NS, "isCurrentIssue", issue.isCurrentIssue);
  appendTextElement(document, element, DATASHEET_NS, "accessLevel", issue.accessLevel);
  appendTextElement(document, element, DATASHEET_NS, "publicationStatus", issue.publicationStatus);
  appendOptionalTextElement(document, element, DATASHEET_NS, "accrualPeriodicity", issue.accrualPeriodicity);
  appendOptionalTextElement(document, element, DATASHEET_NS, "issued", issue.issued);
  appendOptionalTextElement(document, element, DATASHEET_NS, "modified", issue.modified);
  appendTemporalCoverage(document, element, issue.temporalCoverage);
  appendOptionalTextElement(document, element, DATASHEET_NS, "surveyMethod", issue.surveyMethod);
  appendAttributes(document, element, issue.attributes);
  appendOptionalTextElement(document, element, DATASHEET_NS, "dataAvailableFrom", issue.dataAvailableFrom);
  appendOptionalTextElement(document, element, DATASHEET_NS, "furtherUses", issue.furtherUses);
  appendOptionalTextElement(document, element, DATASHEET_NS, "auxiliaryData", issue.auxiliaryData);
  appendOptionalTextElement(document, element, DATASHEET_NS, "remarks", issue.remarks);
  return element;
}

function appendDatasetFields(document: XMLDocument, element: Element, dataset: Dataset): void {
  appendTextElement(document, element, DATASHEET_NS, "identifier", dataset.identifier);
  appendTextElement(document, element, DATASHEET_NS, "title", dataset.title);
  appendTextElement(document, element, DATASHEET_NS, "description", dataset.description);
  appendTextElement(document, element, DATASHEET_NS, "accessLevel", dataset.accessLevel);
  appendTextElement(document, element, DATASHEET_NS, "publicationStatus", dataset.publicationStatus);
  appendTextElement(document, element, DATASHEET_NS, "creatorRef", dataset.creatorRef);
  appendContactPoint(document, element, dataset.contactPoint);
  for (const theme of dataset.themes ?? []) {
    appendOptionalTextElement(document, element, DATASHEET_NS, "themes", theme);
  }
  for (const keyword of dataset.keywords ?? []) {
    appendOptionalTextElement(document, element, DATASHEET_NS, "keywords", keyword);
  }
  appendOptionalTextElement(document, element, DATASHEET_NS, "accrualPeriodicity", dataset.accrualPeriodicity);
  appendTextElement(document, element, DATASHEET_NS, "modified", dataset.modified);
  appendTemporalCoverage(document, element, dataset.temporalCoverage);
  appendOptionalTextElement(document, element, DATASHEET_NS, "surveyMethod", dataset.surveyMethod);
  appendAttributes(document, element, dataset.attributes);
  appendOptionalTextElement(document, element, DATASHEET_NS, "dataAvailableFrom", dataset.dataAvailableFrom);
  appendOptionalTextElement(document, element, DATASHEET_NS, "furtherUses", dataset.furtherUses);
  appendOptionalTextElement(document, element, DATASHEET_NS, "remarks", dataset.remarks);
}

function appendContactPoint(document: XMLDocument, parent: Element, contactPoint?: Dataset["contactPoint"]): void {
  const email = contactPoint?.email?.trim();
  if (!email) {
    return;
  }

  const wrapper = document.createElementNS(DATASHEET_NS, "contactPoint");
  const contact = document.createElementNS(BASE_NS, "base:ContactPoint");
  appendOptionalTextElement(document, contact, BASE_NS, "base:name", contactPoint?.name);
  appendOptionalTextElement(document, contact, BASE_NS, "base:organizationUnit", contactPoint?.organizationUnit);
  appendTextElement(document, contact, BASE_NS, "base:email", email);
  appendOptionalTextElement(document, contact, BASE_NS, "base:phone", contactPoint?.phone);
  appendOptionalTextElement(document, contact, BASE_NS, "base:url", contactPoint?.url);
  wrapper.appendChild(contact);
  parent.appendChild(wrapper);
}

function appendTemporalCoverage(document: XMLDocument, parent: Element, coverage?: JsonObject): void {
  if (!coverage || !Object.values(coverage).some((value) => typeof value === "string" && value.trim())) {
    return;
  }

  const wrapper = document.createElementNS(DATASHEET_NS, "temporalCoverage");
  const temporal = document.createElementNS(BASE_NS, "base:TemporalCoverage");
  appendOptionalTextElement(document, temporal, BASE_NS, "base:startDate", stringOrEmpty(coverage.startDate));
  appendOptionalTextElement(document, temporal, BASE_NS, "base:endDate", stringOrEmpty(coverage.endDate));
  appendOptionalTextElement(document, temporal, BASE_NS, "base:referenceDate", stringOrEmpty(coverage.referenceDate));
  wrapper.appendChild(temporal);
  parent.appendChild(wrapper);
}

function appendAttributes(document: XMLDocument, parent: Element, attributes?: Dataset["attributes"]): void {
  for (const attribute of attributes ?? []) {
    const wrapper = document.createElementNS(DATASHEET_NS, "attributes");
    const node = document.createElementNS(BASE_NS, "base:DatasetAttribute");
    appendTextElement(document, node, BASE_NS, "base:name", attribute.name);
    appendTextElement(document, node, BASE_NS, "base:dataType", attribute.dataType);
    appendOptionalTextElement(document, node, BASE_NS, "base:description", attribute.description);
    appendOptionalTextElement(document, node, BASE_NS, "base:unit", attribute.unit);
    appendOptionalTextElement(document, node, BASE_NS, "base:codeList", attribute.codeList);
    appendBooleanElement(document, node, BASE_NS, "base:mandatory", attribute.mandatory);
    wrapper.appendChild(node);
    parent.appendChild(wrapper);
  }
}

function appendTextElement(document: XMLDocument, parent: Element, namespace: string, name: string, value?: string): void {
  const element = document.createElementNS(namespace, name);
  element.textContent = value ?? "";
  parent.appendChild(element);
}

function appendOptionalTextElement(
  document: XMLDocument,
  parent: Element,
  namespace: string,
  name: string,
  value?: string
): void {
  if (!value?.trim()) {
    return;
  }

  appendTextElement(document, parent, namespace, name, value.trim());
}

function appendBooleanElement(
  document: XMLDocument,
  parent: Element,
  namespace: string,
  name: string,
  value?: boolean
): void {
  const element = document.createElementNS(namespace, name);
  element.textContent = value ? "true" : "false";
  parent.appendChild(element);
}

function parseDatasetElement(element: Element): JsonObject {
  return {
    identifier: childText(element, "identifier"),
    title: childText(element, "title"),
    description: childText(element, "description"),
    accessLevel: childText(element, "accessLevel"),
    publicationStatus: childText(element, "publicationStatus"),
    creatorRef: childText(element, "creatorRef"),
    contactPoint: parseContactPoint(firstChildElement(element, "contactPoint")),
    themes: childTexts(element, "themes"),
    keywords: childTexts(element, "keywords"),
    accrualPeriodicity: childText(element, "accrualPeriodicity"),
    modified: childText(element, "modified"),
    temporalCoverage: parseTemporalCoverage(firstChildElement(element, "temporalCoverage")),
    surveyMethod: childText(element, "surveyMethod"),
    attributes: childElementsByName(element, "attributes").map(parseAttributeWrapper),
    dataAvailableFrom: childText(element, "dataAvailableFrom"),
    furtherUses: childText(element, "furtherUses"),
    remarks: childText(element, "remarks")
  };
}

function parseSeriesElement(element: Element): JsonObject {
  return {
    ...parseDatasetElement(element),
    issues: childElementsByName(element, "issues").map((wrapper) => {
      const issueElement = firstChildElement(wrapper, "DatasetIssue");
      if (!issueElement) {
        throw new Error("Eine DatasetSeries enthält einen ungültigen Issue-Eintrag.");
      }

      return parseIssueElement(issueElement);
    })
  };
}

function parseIssueElement(element: Element): JsonObject {
  return {
    identifier: childText(element, "identifier"),
    title: childText(element, "title"),
    description: childText(element, "description"),
    issueLabel: childText(element, "issueLabel"),
    isCurrentIssue: childText(element, "isCurrentIssue") === "true",
    accessLevel: childText(element, "accessLevel"),
    publicationStatus: childText(element, "publicationStatus"),
    accrualPeriodicity: childText(element, "accrualPeriodicity"),
    issued: childText(element, "issued"),
    modified: childText(element, "modified"),
    temporalCoverage: parseTemporalCoverage(firstChildElement(element, "temporalCoverage")),
    surveyMethod: childText(element, "surveyMethod"),
    attributes: childElementsByName(element, "attributes").map(parseAttributeWrapper),
    dataAvailableFrom: childText(element, "dataAvailableFrom"),
    furtherUses: childText(element, "furtherUses"),
    auxiliaryData: childText(element, "auxiliaryData"),
    remarks: childText(element, "remarks")
  };
}

function parseContactPoint(wrapper: Element | null): JsonObject {
  const contact = wrapper ? childElements(wrapper)[0] : null;
  if (!contact) {
    return {};
  }

  return {
    name: childText(contact, "name"),
    organizationUnit: childText(contact, "organizationUnit"),
    email: childText(contact, "email"),
    phone: childText(contact, "phone"),
    url: childText(contact, "url")
  };
}

function parseTemporalCoverage(wrapper: Element | null): JsonObject {
  const temporal = wrapper ? childElements(wrapper)[0] : null;
  if (!temporal) {
    return {};
  }

  return {
    startDate: childText(temporal, "startDate"),
    endDate: childText(temporal, "endDate"),
    referenceDate: childText(temporal, "referenceDate")
  };
}

function parseAttributeWrapper(wrapper: Element): JsonObject {
  const attribute = childElements(wrapper)[0];
  if (!attribute) {
    return {};
  }

  return {
    name: childText(attribute, "name"),
    dataType: childText(attribute, "dataType"),
    description: childText(attribute, "description"),
    unit: childText(attribute, "unit"),
    codeList: childText(attribute, "codeList"),
    mandatory: childText(attribute, "mandatory") === "true"
  };
}

function parseXml(text: string): XMLDocument {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Die Datei ist nicht lesbar oder enthält kein gültiges XTF/XML.");
  }
  return document;
}

function childText(parent: Element, localName: string): string {
  return firstChildElement(parent, localName)?.textContent?.trim() ?? "";
}

function childTexts(parent: Element, localName: string): string[] {
  return childElementsByName(parent, localName)
    .map((element) => element.textContent?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function firstChildElement(parent: Element, localName: string): Element | null {
  return childElements(parent).find((element) => element.localName === localName) ?? null;
}

function childElementsByName(parent: Element, localName: string): Element[] {
  return childElements(parent).filter((element) => element.localName === localName);
}

function childElements(parent: Element): Element[] {
  return Array.from(parent.children);
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatXml(xml: string): string {
  const withBreaks = xml.replace(/></g, ">\n<");
  const lines = withBreaks.split("\n");
  let indent = 0;

  return `${lines
    .map((line) => {
      if (line.match(/^<\/.+/)) {
        indent = Math.max(0, indent - 1);
      }

      const formatted = `${"  ".repeat(indent)}${line}`;
      if (line.match(/^<[^!?/][^>]*[^/]>/) && !line.includes("</")) {
        indent += 1;
      }
      return formatted;
    })
    .join("\n")}\n`;
}
