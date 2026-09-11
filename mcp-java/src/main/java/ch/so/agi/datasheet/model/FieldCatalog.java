package ch.so.agi.datasheet.model;

import java.util.*;
import ch.so.agi.datasheet.service.ToolError;

/** The supported model's fields, shared by MCP schemas, patches and IOM mapping. */
public final class FieldCatalog {
    public record Field(String iliName, String type, boolean mandatory, int maxLength,
                        List<String> choices, String description) {
        public Map<String, Object> schema() {
            Map<String, Object> schema = new LinkedHashMap<>();
            schema.put("type", List.of(type.equals("boolean") ? "boolean" :
                    type.startsWith("list:") ? "array" :
                    isStructure(type) ? "object" : "string", "null"));
            schema.put("description", description);
            if (type.equals("date")) schema.put("format", "date");
            if (type.equals("uri")) schema.put("format", "uri");
            if (maxLength > 0) schema.put("maxLength", maxLength);
            if (!choices.isEmpty()) {
                List<Object> values = new ArrayList<>(choices); values.add(null);
                schema.put("enum", values);
            }
            if (isStructure(type)) {
                schema.put("properties", properties(type, false));
                schema.put("additionalProperties", false);
            }
            if (type.startsWith("list:")) {
                String item = type.substring(5);
                schema.put("items", isStructure(item)
                        ? Map.of("type", "object", "properties", properties(item, false), "additionalProperties", false)
                        : choices.isEmpty() ? Map.of("type", "string", "maxLength", 255)
                        : Map.of("type", "string", "enum", choices));
                schema.remove("enum");
                schema.remove("maxLength");
            }
            return schema;
        }
    }
    private static final Map<String, LinkedHashMap<String, Field>> TYPES = new LinkedHashMap<>();
    static {
        TYPES.put("contact", new LinkedHashMap<>());
        add("contact", "name", "name", "string", false, 255, List.of(), "Name der Kontaktperson oder allgemeine Bezeichnung der Kontaktstelle.");
        add("contact", "organization_unit", "organizationUnit", "string", false, 255, List.of(), "Organisationseinheit der Kontaktstelle, zum Beispiel Abteilung oder Team.");
        add("contact", "email", "email", "uri", true, 0, List.of(), "E-Mail-Adresse der Kontaktstelle, vorzugsweise als mailto-URI.");
        add("contact", "phone", "phone", "string", false, 255, List.of(), "Telefonnummer der Kontaktstelle als Freitext.");
        add("contact", "url", "url", "uri", false, 0, List.of(), "Webseite mit weiteren Informationen zur Kontaktstelle.");
        TYPES.put("temporal", new LinkedHashMap<>());
        add("temporal", "start_date", "startDate", "date", false, 0, List.of(), "Beginn der zeitlichen Abdeckung.");
        add("temporal", "end_date", "endDate", "date", false, 0, List.of(), "Ende der zeitlichen Abdeckung.");
        add("temporal", "reference_date", "referenceDate", "date", false, 0, List.of(), "Stichtag, wenn die Daten keinen Zeitraum, sondern einen einzelnen Zeitpunkt beschreiben.");
        TYPES.put("attribute", new LinkedHashMap<>());
        add("attribute", "name", "name", "string", true, 255, List.of(), "Name des Attributs beziehungsweise der Spalte im Datensatz.");
        add("attribute", "data_type", "dataType", "string", true, 255, List.of(), "Datentyp des Attributs als verständlicher Text.");
        add("attribute", "description", "description", "string", false, 0, List.of(), "Fachliche Beschreibung des Attributs.");
        add("attribute", "unit", "unit", "string", false, 255, List.of(), "Einheit des Attributs, falls anwendbar.");
        add("attribute", "code_list", "codeList", "uri", false, 0, List.of(), "URI einer Codeliste oder eines Wertebereichs, falls vorhanden.");
        add("attribute", "mandatory", "mandatory", "boolean", true, 0, List.of(), "Angabe, ob das Attribut im Datensatz zwingend belegt sein muss.");
        TYPES.put("dataset", new LinkedHashMap<>());
        add("dataset", "identifier", "identifier", "string", true, 255, List.of(), "Stabiler Identifikator des Datensatzes. Der Wert wird später als dct:identifier verwendet und sollte innerhalb des publizierten Katalogs eindeutig sein.");
        add("dataset", "title", "title", "string", true, 255, List.of(), "Titel des Datensatzes.");
        add("dataset", "description", "description", "string", true, 1024, List.of(), "Beschreibung des Datensatzes.");
        add("dataset", "access_level", "accessLevel", "string", true, 0, List.of("open", "public_with_conditions", "restricted", "internal", "confidental"), "Zugänglichkeitsstufe des Datensatzes im Datenportal. Der lokale Wert wird später auf einen dct:accessRights-Wert gemappt.");
        add("dataset", "publication_status", "publicationStatus", "string", true, 0, List.of("draft", "in_review", "published", "archived"), "Interner Publikationsstatus des Datensatzes im Erfassungs- und Publikationsprozess.");
        add("dataset", "creator_ref", "creatorRef", "string", true, 255, List.of(), "Referenz auf den fachlichen Datenherrn beziehungsweise Creator. Der Wert verweist im Erfassungsmodell auf eine Amtsstelle und wird im Publikationsmodell zu einer vollständigen Office-/Agent-Struktur aufgelöst.");
        add("dataset", "contact_point", "contactPoint", "contact", true, 0, List.of(), "Kontaktstelle für fachliche oder organisatorische Rückfragen zum Datensatz.");
        add("dataset", "themes", "themes", "list:string", true, 0, List.of("Arbeit_Erwerb", "Bau_und_Wohnungswesen", "Bevoelkerung", "Bildung_Wissenschaft", "Energie", "Finanzen", "Geografie", "Gesetzgebung", "Gesundheit", "Handel", "Industrie_und_Dienstleistungen", "Kriminalitaet_Strafrecht", "Kultur_Medien_Informationsgesellschaft_Sport", "Landwirtschaft_Forstwirtschaft", "Mobilitaet_und_Verkehr", "Oeffentliche_Ordnung_und_Sicherheit", "Politik", "Preise", "Raum_und_Umwelt", "Soziale_Sicherheit", "Statistische_Grundlagen", "Tourismus", "Verwaltung", "Volkswirtschaft"), "Themen des Datensatzes gemäss lokalem Themenkatalog. Die lokalen Werte werden im Publikationsmodell auf die für DCAT-AP-CH/opendata.swiss benötigten Themen-URIs gemappt.");
        add("dataset", "keywords", "keywords", "list:string", false, 255, List.of(), "Suchbegriffe zum Datensatz.");
        add("dataset", "accrual_periodicity", "accrualPeriodicity", "string", false, 0, List.of("continual", "daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "asNeeded", "irregular", "notPlanned", "unknown"), "Aktualisierungsintervall des Datensatzes. Der lokale Code wird im Publikationsmodell auf die entsprechende Frequency-URI gemappt.");
        add("dataset", "issued", "issued", "date", false, 0, List.of(), "Formales Erstpublikationsdatum der Ressource.");
        add("dataset", "modified", "modified", "date", true, 0, List.of(), "Datum der letzten inhaltlich relevanten Änderung des Datensatzes.");
        add("dataset", "temporal_coverage", "temporalCoverage", "temporal", false, 0, List.of(), "Zeitliche Abdeckung oder Stichtag des Datensatzes.");
        add("dataset", "survey_method", "surveyMethod", "string", false, 0, List.of(), "Beschreibung der Erhebungs-, Mess- oder Erfassungsmethode des Datensatzes.");
        add("dataset", "attributes", "attributes", "list:attribute", false, 0, List.of(), "Beschreibung der fachlichen Attribute beziehungsweise Spalten des Datensatzes.");
        add("dataset", "model", "model", "string", false, 255, List.of(), "Name oder Referenz des Datenmodells, auf dem der Datensatz basiert.");
        add("dataset", "data_available_from", "dataAvailableFrom", "string", false, 255, List.of(), "Freitextangabe, ab wann Daten verfügbar sind.");
        add("dataset", "further_uses", "furtherUses", "string", false, 0, List.of(), "Hinweise auf weitere Verwendungen der Daten.");
        add("dataset", "auxiliary_data", "auxiliaryData", "string", false, 0, List.of(), "Hinweise auf Hilfsdaten oder zusätzliche Datengrundlagen.");
        TYPES.put("issue", new LinkedHashMap<>());
        add("issue", "identifier", "identifier", "string", true, 255, List.of(), "Stabiler Identifikator der Ausgabe. Der Wert sollte innerhalb des späteren Katalogs eindeutig sein und wird im Publikationsmodell als dct:identifier verwendet.");
        add("issue", "title", "title", "string", false, 255, List.of(), "Titel der Ausgabe. Wenn kein eigener Titel gesetzt wird, kann GRETL den Titel aus dem Titel der DatasetSeries und dem issueLabel ableiten.");
        add("issue", "description", "description", "string", false, 1024, List.of(), "Beschreibung der Ausgabe. Wenn keine eigene Beschreibung gesetzt wird, kann GRETL die Beschreibung der DatasetSeries übernehmen.");
        add("issue", "issue_label", "issueLabel", "string", true, 255, List.of(), "Bezeichnung der Ausgabe, z.B. \"2026\", \"2025-05\" oder \"Stand_2026-01-01\".");
        add("issue", "is_current_issue", "isCurrentIssue", "boolean", true, 0, List.of(), "Kennzeichnet die aktuelle Ausgabe innerhalb der DatasetSeries. Dieses Attribut dient der Datenportal-GUI und der späteren Materialisierung, hat aber kein direktes DCAT-AP-CH-Mapping.");
        add("issue", "publication_status", "publicationStatus", "string", true, 0, List.of("draft", "in_review", "published", "archived"), "Interner Publikationsstatus der Ausgabe im Erfassungs- und Publikationsprozess.");
        add("issue", "accrual_periodicity", "accrualPeriodicity", "string", false, 0, List.of("continual", "daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "asNeeded", "irregular", "notPlanned", "unknown"), "Aktualisierungsintervall der Ausgabe, falls es von der DatasetSeries abweicht.");
        add("issue", "issued", "issued", "date", false, 0, List.of(), "Formales Erstpublikationsdatum der Ressource.");
        add("issue", "modified", "modified", "date", false, 0, List.of(), "Datum der letzten inhaltlich relevanten Änderung dieser Ausgabe.");
        add("issue", "temporal_coverage", "temporalCoverage", "temporal", false, 0, List.of(), "Zeitliche Abdeckung oder Stichtag dieser Ausgabe.");
        add("issue", "survey_method", "surveyMethod", "string", false, 0, List.of(), "Beschreibung der Erhebungs-, Mess- oder Erfassungsmethode dieser Ausgabe.");
        add("issue", "attributes", "attributes", "list:attribute", false, 0, List.of(), "Beschreibung der fachlichen Attribute beziehungsweise Spalten dieser Ausgabe.");
        add("issue", "model", "model", "string", false, 255, List.of(), "Name oder Referenz des Datenmodells, auf dem diese Ausgabe basiert.");
        add("issue", "data_available_from", "dataAvailableFrom", "string", false, 255, List.of(), "Freitextangabe, ab wann Daten für diese Ausgabe verfügbar sind.");
        add("issue", "further_uses", "furtherUses", "string", false, 0, List.of(), "Hinweise auf weitere Verwendungen der Daten.");
        add("issue", "auxiliary_data", "auxiliaryData", "string", false, 0, List.of(), "Hinweise auf Hilfsdaten oder zusätzliche Datengrundlagen.");
        TYPES.put("series", new LinkedHashMap<>(TYPES.get("dataset")));
        add("series", "issues", "issues", "list:issue", true, 0, List.of(), "Ausgaben der Datenreihe; mindestens eine Ausgabe erforderlich.");
    }
    private static void add(String kind, String key, String iliName, String type, boolean mandatory,
                            int max, List<String> choices, String description) {
        TYPES.get(kind).put(key, new Field(iliName, type, mandatory, max, choices, description));
    }
    public static boolean isStructure(String type) { return TYPES.containsKey(type); }
    public static Map<String, Field> fields(String kind) {
        var fields = TYPES.get(kind);
        if (fields == null) throw new ToolError("invalid_arguments", "Unbekannter Objekttyp: " + kind);
        return Collections.unmodifiableMap(fields);
    }
    public static Map<String, Object> properties(String kind, boolean metadataOnly) {
        Map<String, Object> result = new LinkedHashMap<>();
        fields(kind).forEach((key, field) -> {
            if (!metadataOnly || !Set.of("attributes", "issues").contains(key)) result.put(key, field.schema());
        });
        return result;
    }
    public static Map<String, Object> describe(String kind) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (String type : kind == null ? TYPES.keySet() : List.of(kind)) {
            Map<String, Object> entries = new LinkedHashMap<>();
            fields(type).forEach((name, field) -> entries.put(name, Map.of(
                    "schema", field.schema(), "mandatory", field.mandatory(), "ili_name", field.iliName())));
            result.put(type, entries);
        }
        result.put("constraints", Map.of(
                "temporal", "Entweder start_date und end_date oder reference_date; keine offenen Intervalle.",
                "series", "Mindestens eine Ausgabe; identifier der Ausgaben müssen innerhalb der Serie eindeutig sein.",
                "dataset", "Mindestens ein Thema.",
                "attribute", "mandatory ist ein Pflicht-Boolean. Namen sind modellseitig nicht eindeutig.",
                "drafts", "Fehlende Pflichtwerte sind während der Bearbeitung zulässig; Export erfordert vollständige Modellgültigkeit."));
        return result;
    }

    /** Patch only explicitly supplied values. Shape checks are strict; model validity is checked on export. */
    public static void patch(Node target, Map<String, Object> patch, boolean metadataOnly) {
        for (var entry : patch.entrySet()) {
            String key = entry.getKey();
            Field field = fields(target.kind).get(key);
            if (field == null || metadataOnly && Set.of("attributes", "issues").contains(key))
                throw new ToolError("invalid_arguments", "Unbekanntes oder separat zu bearbeitendes Feld: " + key);
            Object value = entry.getValue();
            if (value == null) { target.values.remove(key); continue; }
            String type = field.type();
            if (isStructure(type)) {
                if (!(value instanceof Map<?, ?>)) bad(key);
                Node child = key.equals("contact_point") && target.values.get(key) instanceof Node existing
                        ? existing.copy() : new Node(type);
                patch(child, object(value), false);
                target.values.put(key, child);
            } else if (type.startsWith("list:")) {
                if (!(value instanceof List<?>)) bad(key);
                List<Object> values = new ArrayList<>();
                for (Object item : (List<?>) value) {
                    String itemType = type.substring(5);
                    if (isStructure(itemType)) {
                        Node child = new Node(itemType); patch(child, object(item), false); values.add(child);
                    } else {
                        if (!(item instanceof String)) bad(key);
                        values.add(item);
                    }
                }
                target.values.put(key, values);
            } else {
                if (type.equals("boolean") ? !(value instanceof Boolean) : !(value instanceof String)) bad(key);
                target.values.put(key, value);
            }
        }
    }
    public static Map<String, Object> object(Object value) {
        if (!(value instanceof Map<?, ?> map)) throw new ToolError("invalid_arguments", "Objekt erwartet.");
        Map<String, Object> result = new LinkedHashMap<>();
        map.forEach((k, v) -> {
            if (!(k instanceof String)) throw new ToolError("invalid_arguments", "Feldname muss Text sein.");
            result.put((String) k, v);
        });
        return result;
    }
    private static void bad(String key) { throw new ToolError("invalid_arguments", "Falscher Werttyp: " + key); }
}
