# datenblatt-editor

Lokaler, vollstaendig offline-faehiger Metadateneditor fuer genau ein `Dataset` oder eine `DatasetSeries` pro XTF/XML-Datei.

Die Anwendung ist als clientseitige SPA umgesetzt. Es gibt kein Backend, keine Anmeldung und keine Server-Persistenz. Alle Arbeitsstaende bleiben lokal im Browser und werden in IndexedDB gespeichert.

## Funktionsumfang des MVP

- Bearbeitung einzelner `Dataset`
- Bearbeitung hierarchischer `DatasetSeries` mit Serienkopf und Ausgaben
- Import von XTF/XML-Dateien fuer `Dataset` und `DatasetSeries`
- Offline-"Endpunkte" ueber gebuendelte Snapshot-Dateien
- Lokale Entwuerfe in IndexedDB
- Debounced Autosave
- Fachliche und strukturelle Validierung
- Export als XTF 2.4
- Installierbare PWA

Nicht Teil der aktuellen Ausbaustufe:

- Materialisierung einzelner `DatasetIssue` als getrennte `Dataset`
- Serien-Wizard fuer Bulk-Operationen
- Backend-Einreichung
- Login
- CSV-Analyse
- LLM-Integration

## Technologie-Stack

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Dexie
- AJV
- vite-plugin-pwa
- Vitest
- Playwright

Die aktuelle UI ist an der reduzierten, hellen Jenkins-Anmutung orientiert: feine Borders, kleine Radien, rote Primaeraktionen, kompakte Werkzeugleisten.

## Schnellstart

### Voraussetzungen

- Node.js 22 empfohlen
- npm 10 empfohlen

Die Implementierung wurde lokal mit Node `22.13.0` und npm `10.9.2` verifiziert.

### Installation

```bash
npm install
```

### Entwicklungsserver

```bash
npm run dev
```

Danach ist die App standardmaessig unter `http://localhost:5173` verfuegbar.

### Produktionsbuild

```bash
npm run build
```

Der gebaute Stand liegt danach unter `dist/`.

### Lokale Vorschau des Produktionsbuilds

```bash
npm run preview
```

### Tests

```bash
npm test
npm run test:e2e
```

Hinweis zu Playwright:

- Wenn lokal noch kein Browser installiert ist, kann ein zusaetzlicher Schritt noetig sein:

```bash
npx playwright install
```

## Skripte

| Skript | Zweck |
| --- | --- |
| `npm run dev` | Lokaler Entwicklungsserver |
| `npm run build` | Typecheck + Produktionsbuild |
| `npm run preview` | Vorschau des Produktionsbuilds |
| `npm test` | Unit- und Komponenten-Tests mit Vitest |
| `npm run test:e2e` | Playwright-Smoke-Test gegen lokale App |

## Projektstruktur

```text
src/
  app/          App-Shell und Routing
  components/   UI-Komponenten und Dialoge
  config/       Quellen- und Vokabular-Konfiguration
  domain/       Typen, Normalisierung, Validierung
  services/     Import, Export, Offline-Quellen, IndexedDB
  stores/       Pinia-Store fuer App- und Draft-State
  styles/       Tokens und Jenkins-inspirierte Styling-Layer

public/
  icons/        PWA-Icons
  mock-sources/ Offline-Snapshot-Daten fuer Quellen

e2e/            Playwright-Smoke-Test
docs/           Entwickler- und Betreiberdokumentation
spec/           Eingangsspezifikation und Mockups
```

## Dokumentation

- [Architektur](docs/architecture.md)
- [Entwicklung](docs/development.md)
- [Betrieb und Deployment](docs/operations.md)

## Architektur in Kurzform

- Die Startseite bietet Ladewege fuer Quellen, Dateiimport, neue Einzel-Datasets, neue Serien und lokale Entwuerfe.
- Jeder erfolgreich uebernommene Eintrag wird in ein kanonisches Root-Format fuer `Dataset` oder `DatasetSeries` normalisiert.
- Entwuerfe werden unter der Dexie-Datenbank `datenblatt-editor` gespeichert.
- Formularaenderungen werden mit `750 ms` Debounce nach IndexedDB geschrieben.
- Der Export ist bei Validierungsfehlern blockiert.
- Die PWA cached App-Shell, Assets und die gemockte `dataset.index.xtf` fuer kompletten Offline-Betrieb.

## Quellenmodell im MVP

Die "externe Quelle" des MVP bleibt eine mit der App ausgelieferte Snapshot-Datei:

```text
public/mock-sources/dataset.index.xtf
```

Das hat zwei Konsequenzen:

1. Die App funktioniert vollstaendig offline.
2. Aenderungen an Quelleninhalten erfordern einen neuen Build und ein neues Deployment.

## Datenhaltung

Lokale Entwuerfe werden in IndexedDB gehalten. Es gibt zwei Stores:

- `datasets`
- `settings`

`datasets` speichert den kompletten Draft inklusive Herkunftsinformationen und dem internen Objektmodell. `settings` speichert zuletzt verwendete URL und Filter fuer den Quellen-Dialog.

## Validierung

Die App verwendet zwei Ebenen:

1. Strukturvalidierung
2. Fachliche Validierung

Geprueft werden unter anderem:

- Root `type === "Dataset"` oder `type === "DatasetSeries"`
- Pflichtfelder
- Datumsformat
- bei Issues `modified >= issued`
- gueltiger `temporalCoverage`
- doppelte Attributnamen
- Warnung bei Attributen ohne Beschreibung

## Wichtige Betriebsgrenzen

- Kein Mehrbenutzerbetrieb
- Keine Synchronisation zwischen Browsern
- Kein automatisches Backup ausserhalb des Browsers
- Kein Live-Abruf externer APIs im MVP

## Weiterentwicklung

Die wichtigsten Erweiterungspunkte sind:

- echte Remote-Endpunkte statt Snapshot-Dateien
- kontrollierte Vokabulare aus externer Konfiguration
- staerkere Formularsegmentierung
- weitere E2E-Szenarien
- konfigurierbare Feldverteilung zwischen Serienkopf und Ausgaben
