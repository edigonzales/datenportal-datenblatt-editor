# Architektur

Diese Datei beschreibt die technische Architektur der Anwendung aus Sicht von Entwicklern.

## Zielbild

Die Anwendung ist eine lokale SPA fuer die Bearbeitung von Metadaten einzelner `Dataset` und hierarchischer `DatasetSeries`. Der Fokus liegt auf:

- klaren Ladepfaden
- vollstaendigem Offline-Betrieb
- robuster lokaler Persistenz
- einfacher Erweiterbarkeit
- klarer Trennung zwischen Domain, Persistenz und UI

## Architekturprinzipien

- Kein Backend im MVP
- Internes Objektmodell als kanonisches Speicherformat, XTF als externes Austauschformat
- Toleranter Import, strenger Export
- Lokale Persistenz als Default, nicht als Sonderfall
- UI-Zustaende werden zentral ueber den Store koordiniert
- Validierung ist von Komponenten getrennt
- Quellen sind konfigurierbar und im MVP als Offline-Snapshots umgesetzt

## Schichtenmodell

```mermaid
flowchart TD
  UI[Vue Components] --> Store[Pinia Store]
  Store --> Domain[Domain Logic]
  Store --> Services[Services]
  Services --> IndexedDB[Dexie / IndexedDB]
  Services --> Snapshots[Offline Snapshot XTF]
  Domain --> Validation[AJV + fachliche Regeln]
```

## Zentrale Module

### `src/app`

- `App.vue`
  - App-Shell
  - Header
  - Hauptnavigation
  - Kontextzeile
  - globaler Export-Button
- `router.ts`
  - definiert die vier Routen des MVP

### `src/domain`

- `datasetTypes.ts`
  - zentrale Typen fuer Drafts, Quellen und Validierung
- `normalize.ts`
  - erzeugt das leere Default-Root
  - erkennt `Dataset`- und `DatasetSeries`-Importe
  - normalisiert Root-Import und Naked-Import
  - fuellt fehlende Strukturen mit Default-Werten auf
- `validation.ts`
  - Strukturvalidierung mit AJV
  - fachliche Validierung auf Feldebene
  - gruppierte Serien-/Issue-Validierung

### `src/services`

- `datasetRepository.ts`
  - kapselt Dexie
  - listet, speichert, loescht und dupliziert Drafts
  - verwaltet Settings
- `endpointLoader.ts`
  - laedt eine `dataset.index.xtf` aus einer konfigurierten URL
  - leitet daraus Suchtreffer ab und importiert den gewaehlten Datensatz
- `fileImporter.ts`
  - liest lokale Dateien
  - XTF/XML-Parse + Strukturpruefung + Normalisierung
- `exportService.ts`
  - XTF serialisieren
  - Download ausloesen

### `src/stores`

- `datasetStore.ts`
  - zentrale App-State-Maschine des MVP
  - verwaltet Draft-Liste, aktuellen Entwurf, Save-State und Konfliktfall
  - unterscheidet zwischen Dataset- und Series-Drafts

### `src/components`

- `StartPage.vue`
  - Einstieg in Quellen, Dateiimport, neue Datasets, neue Serien und lokale Entwuerfe
- `SourceLoadDialog.vue`
  - Quellen-URL laden, suchen, Auswahl markieren, uebernehmen
- `FileImportDialog.vue`
  - Dateiimport mit Fehlerbehandlung und Vorschau
- `DatasetEditor.vue`
  - Editor-Wrapper fuer Dataset- und Series-Workspaces
- `DatasetForm.vue`
  - Hauptformular fuer Dataset und Serienkopf
- `DatasetIssueForm.vue`
  - Formular fuer issue-spezifische Felder
- `SeriesIssueWorkspace.vue`
  - Master-Detail-Ansicht fuer Ausgaben
- `AttributeTable.vue`
  - tabellarische Bearbeitung der Attribute
- `ValidationPanel.vue`
  - rechte Pruefspalte mit Gruppen fuer Serie und Ausgaben

## Routing

Die Anwendung verwendet vier Editor-Routen plus Startseite:

```text
/                      Startseite
/draft/:id             Datensatz oder Serienkopf
/draft/:id/attributes  Attribute
/draft/:id/issues/:issueId?  Ausgaben einer Datensatzserie
/draft/:id/xtf         XTF-Vorschau
```

Die Routen sind bewusst flach gehalten. Der aktuelle Draft wird ueber die `id` im URL-Pfad geladen; bei `DatasetSeries` wird die aktive Ausgabe ueber `issueId` adressiert.

## Datenfluss

### 1. App-Start

1. `App.vue` mounted.
2. `datasetStore.initialize()` wird ausgefuehrt.
3. Draft-Liste wird aus IndexedDB gelesen.
4. letzte Quellenfilter werden aus `settings` geladen.

### 2. Dateiimport

1. Benutzer waehlt eine lokale Datei.
2. `fileImporter.ts` liest den Inhalt.
3. `validation.ts` validiert die Struktur.
4. `normalize.ts` ueberfuehrt das Ergebnis in `DatasetRootJson` oder `DatasetSeriesRootJson`.
5. `datasetStore.stageImport()` prueft Identifier-Konflikte.
6. Der Draft wird in IndexedDB gespeichert und geoeffnet.

### 3. Quellen-Import

1. Benutzer oeffnet den Dialog mit einer vorbelegten Quellen-URL.
2. `endpointLoader.ts` laedt `dataset.index.xtf`.
3. Suche/Filter laufen im Browser.
4. Bei Identifier-Auswahl oder Trefferwahl wird ein Eintrag aus dem geladenen Index selektiert.
5. Strukturvalidierung und Normalisierung laufen erst bei der Uebernahme in den Editor.
6. Der Draft wird gespeichert und geoeffnet.

### 4. Bearbeitung und Autosave

1. Formularfelder mutieren direkt `currentDraft.data`.
2. `DatasetEditor.vue` beobachtet `store.currentDraft.data`.
3. `store.markDirty()` setzt den Status auf `dirty`.
4. Nach `750 ms` ohne weitere Aenderung wird `persistCurrentDraft()` ausgefuehrt.
5. Der Draft wird mit neuem `updatedAt` in IndexedDB geschrieben.

### 5. Export

1. `App.vue` berechnet laufend `validateEditableRoot(...)`.
2. Bei Fehlern bleibt der Export deaktiviert.
3. Bei Erfolg wird XTF serialisiert und heruntergeladen.

## Root-Format und Importtoleranz

Interne und exportierte Zielzustaende:

```json
{
  "type": "Dataset",
  "schemaVersion": "2026-05-23",
  "dataset": {}
}
```

```json
{
  "type": "DatasetSeries",
  "schemaVersion": "2026-05-23",
  "series": {}
}
```

Beim Import sind fuer beide Typen zwei Formen erlaubt:

- Root-Wrapper
- nacktes Objekt

Wichtig:

- Unbekannte Felder werden beibehalten.
- Beim Export wird immer der Root-Wrapper verwendet.
- Lokale `issueId`-Hilfsfelder werden vor dem Export entfernt.

## DatasetSeries-Erkennung und Routing

Serien werden in `normalize.ts` und `validation.ts` frueh erkannt. Typische Marker:

- `type === "DatasetSeries"`
- `series`
- `issues`
- `issueLabel`
- `isCurrentIssue`

Die App leitet solche Dateien in den Series-Workspace. Eine nackte `DatasetIssue`-Struktur ohne Serienkopf bleibt hingegen ein blockierter Importfall.

## Validierungsarchitektur

### Strukturvalidierung

AJV prueft:

- Root muss Objekt sein
- bei Dataset-Wrapper: `type === "Dataset"` und `dataset` vorhanden
- bei Series-Wrapper: `type === "DatasetSeries"` und `series` vorhanden
- `additionalProperties: true`

### Fachliche Validierung

Die fachliche Validierung prueft:

- Pflichtfelder im Dataset oder Serienkopf
- Pflichtfelder pro Ausgabe
- Beschreibung max. 1024 Zeichen
- keine fuehrenden/nachgestellten Leerzeichen im Identifier
- E-Mail-Format
- URL-Format
- ISO-Daten `YYYY-MM-DD`
- `modified >= issued`
- `temporalCoverage` als XOR-Regel
- mindestens eine Ausgabe pro Serie
- genau eine aktuelle Ausgabe pro Serie
- keine doppelten Attributnamen
- Warnung bei Attributen ohne Beschreibung

Das Ergebnis ist eine Liste von `ValidationIssue` mit:

- `severity`
- `code`
- `path`
- `message`

## Persistenzmodell

### IndexedDB

Verwendete Datenbank:

```text
datenblatt-editor
```

Stores:

```text
datasets
settings
```

### Store `datasets`

Wichtige Felder:

- `id`
- `identifier`
- `draftKind`
- `title`
- `updatedAt`
- `sourceType`
- `sourceLabel`
- `sourceUrl`
- `originalFileName`
- `schemaVersion`
- `data`
- `dirty`

### Store `settings`

Wichtige Eintraege:

- `lastSourceUrl`
- `lastOrganizationUnit`

## Konfliktbehandlung

Beim Import oder Quellenladen wird vor der Speicherung nach einem existierenden Draft mit demselben fachlichen `identifier` und demselben `draftKind` gesucht.

Moegliche Benutzerentscheidungen:

- lokalen Entwurf oeffnen
- Import als neue Kopie speichern
- lokalen Entwurf ueberschreiben

Der interne Primarschluessel bleibt immer eine UUID und ist bewusst vom fachlichen `identifier` getrennt.

## PWA und Offline

### Build-Konfiguration

`vite.config.ts` bindet `vite-plugin-pwa` ein. Die Workbox-Konfiguration cached:

- HTML
- JS
- CSS
- SVG
- JSON
- XML
- XTF
- PNG
- WOFF2

Damit sind auch die Snapshot-Dateien in `public/mock-sources/**` Teil des Precaches.

### Konsequenz

Die Anwendung ist nach erfolgreichem Laden installierbar und auch offline lauffaehig.

Grenzen:

- Snapshot-Inhalte werden nicht online synchronisiert.
- Ein Browser kann lokale Entwuerfe eines anderen Browsers nicht sehen.

## UI-System

Die Styles sind in vier Ebenen getrennt:

- `tokens.css`
- `base.css`
- `components.css`
- `utilities.css`

Die Grundidee:

- semantische Tokens fuer Farben und Borders
- neutrale, helle Flaechen
- kleine Radien
- rote Primaeraktionen
- klare Werkzeugs- und Formdensitaet

## Testarchitektur

### Unit-Tests

- Normalisierung
- Struktur-/Fachvalidierung
- Export
- Dateiimport
- Suchlogik

### Komponenten-Test

- `ValidationPanel`
- `DatasetForm`
- `LocalDraftList`

### E2E

- Offline-Quellenfluss vom Suchdialog bis zur Editor-Uebernahme
- Serien-Workspace mit Serienkopf, Ausgaben und XTF-Vorschau

## Erweiterungspunkte

### Echte Remote-Endpunkte

Heute:

- `indexUrl`

Spaeter moeglich:

- HTTP-Suche
- Authentifizierung
- Timeout-/Retry-Strategien

### Weitere Felder

Neue Felder muessen in mehreren Schichten nachgezogen werden:

1. Typ in `datasetTypes.ts`
2. Default in `createEmptyDatasetRoot()`
3. ggf. Hydration in `normalize.ts`
4. fachliche Regel in `validation.ts`
5. UI in `DatasetForm.vue`, `DatasetIssueForm.vue` oder `AttributeTable.vue`

### Staerkere Routing-Segmentierung

Der Editor koennte spaeter weiter aufgeteilt werden, etwa:

- eigener Route-Abschnitt pro Formsegment
- Deep-Linking zu Validierungsfehlern
- Wizard fuer Nicht-MVP-Faelle

## Bekannte Architekturgrenzen

- Kein globaler Undo/Redo-Mechanismus
- Kein Versionsvergleich zwischen Drafts
- Keine migrationsgestuetzte Schema-Transformation fuer alte Drafts
- Keine serverseitige Validierungsquelle
- Keine testweise simulierbare Live-Quelle neben dem Snapshot-Modell
