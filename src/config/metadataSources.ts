import type { MetadataSource } from "../domain/datasetTypes";

export const metadataSources: MetadataSource[] = [
  {
    id: "dev",
    label: "Datenportal Testsystem",
    searchIndexPath: "/mock-sources/dev/index.json",
    datasetPathTemplate: "/mock-sources/dev/datasets/{identifier}.json",
    organizationUnits: ["Amt für Umwelt", "Amt für Geoinformation", "Amt für Statistik"],
    version: "2026-05-23"
  },
  {
    id: "prod",
    label: "Datenportal Produktion",
    searchIndexPath: "/mock-sources/prod/index.json",
    datasetPathTemplate: "/mock-sources/prod/datasets/{identifier}.json",
    organizationUnits: ["Amt für Umwelt", "Amt für Geoinformation", "Amt für Statistik"],
    version: "2026-05-23"
  }
];

export const defaultSourceId = metadataSources[0].id;
