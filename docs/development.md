# Entwicklung

Diese Datei ist fuer Entwickler gedacht, die lokal am Projekt arbeiten oder die App erweitern wollen.

## Voraussetzungen

- Node.js 22 empfohlen
- npm 10 empfohlen

Lokaler Referenzstand:

- Node `22.13.0`
- npm `10.9.2`

## Lokale Einrichtung

```bash
npm install
```

## Entwicklungsmodus

```bash
npm run dev
```

Standardmaessig startet Vite unter:

```text
http://localhost:5173
```

## Build und Vorschau

### Produktionsbuild

```bash
npm run build
```

### Vorschau des Produktionsbuilds

```bash
npm run preview
```

Wichtig:

- Offline-/PWA-Verhalten ist im Build relevanter als im reinen Dev-Modus.
- Wenn Offline-Verhalten getestet werden soll, ist `build + preview` aussagekraeftiger als der HMR-Server.

## Tests

### Unit- und Komponenten-Tests

```bash
npm test
```

### Watch-Modus

```bash
npm run test:watch
```

### E2E

```bash
npm run test:e2e
```

Der Playwright-Stand verwendet `http://127.0.0.1:4173` und startet den Dev-Server automatisch.

Wenn lokal noch keine Playwright-Browser vorhanden sind:

```bash
npx playwright install
```

## Typischer Entwickler-Workflow

1. `npm install`
2. `npm run dev`
3. Aenderungen im Browser pruefen
4. `npm test`
5. `npm run build`
6. Bei Flows oder Dialogen zusaetzlich `npm run test:e2e`

## Code-Orientierung

### App-Einstieg

- `src/main.ts`
- `src/app/App.vue`
- `src/app/router.ts`

### Daten und Regeln

- `src/domain/datasetTypes.ts`
- `src/domain/normalize.ts`
- `src/domain/validation.ts`

### Persistenz und IO

- `src/services/datasetRepository.ts`
- `src/services/fileImporter.ts`
- `src/services/endpointLoader.ts`
- `src/services/exportService.ts`

### State

- `src/stores/datasetStore.ts`

### UI

- `src/components/*`
- `src/styles/*`

## Aenderungsszenarien

### Neues Dataset-Feld einfuehren

Minimaler Pfad:

1. Typ in `src/domain/datasetTypes.ts` erweitern
2. Default-Wert in `createEmptyDatasetRoot()` setzen
3. ggf. Hydration in `normalize.ts` ergaenzen
4. Validierung in `validation.ts` erweitern
5. UI in `DatasetForm.vue` einbauen
6. Tests ergaenzen

### Neue Quelle oder Snapshot aufnehmen

1. Default-URL in `src/config/metadataSources.ts` anpassen
2. `dataset.index.xtf` unter `public/mock-sources/` aktualisieren oder ersetzen
3. Vollstaendige Dataset-/DatasetSeries-XTFs im Index konsistent halten
4. Such- und Ladefluss im Browser pruefen

### Neue Validierungsregel einfuehren

1. Regel in `validateDataset(...)` ergaenzen
2. `ValidationIssue` mit passendem `code` und `path` erzeugen
3. Test in `src/domain/validation.test.ts` schreiben
4. UI im `ValidationPanel` pruefen

### Neue Store-Logik einfuehren

Fragen vorab:

- Gehoert die Logik wirklich in den globalen Store?
- Oder reicht eine lokale Komponente?
- Ist es Domainlogik oder nur UI-State?

Regel:

- Domainregeln nicht in Komponenten vergraben.
- Persistenzzugriffe nicht direkt in mehreren Komponenten verteilen.

## Snapshot-Daten pflegen

Die Mock-Quellen des MVP sind lokale XTF-Dateien. Das ist bewusst so, damit die App komplett offline laeuft.

Unterstuetzte Dateien:

```text
public/mock-sources/dataset.index.xtf
public/mock-sources/offices.xtf
```

`dataset.index.xtf` enthaelt einen XTF-Transfer mit allen `Dataset`- und `DatasetSeries`-Objekten im Basket `Metadata`.
`offices.xtf` enthaelt den Datenherr-Katalog fuer die Auswahl im Editor.

JSON-Snapshots unter `public/mock-sources/` sind kein unterstuetztes Format mehr.

Empfehlung bei Aenderungen:

- Identifier und enthaltene Dataset-Dokumente sowie Office-Identifier konsistent halten
- nach Aenderungen immer `npm run build` ausfuehren
- Ladefluss ueber den Dialog einmal komplett pruefen

## UI-Entwicklung

Die Styles folgen keinem UI-Framework, sondern einem lokalen CSS-Layer.

### Tokens

`src/styles/tokens.css` definiert:

- Farben
- Border-Farben
- Schatten
- Radien
- Schriftfamilie

### Komponentenstyles

`src/styles/components.css` enthaelt:

- Topbar
- Tabs
- Cards
- Form-Styles
- Tabellen
- Dialoge
- Notices
- Sidebar

### Regel fuer neue UI

- zuerst bestehende Klassen wiederverwenden
- neue Tokens nur einfuehren, wenn wirklich semantisch noetig
- Jenkins-inspirierte Einfachheit beibehalten
- keine grossen Gradients, keine grossen Rundungen, keine decorative animation

## PWA-Entwicklung

Die PWA wird ueber `vite-plugin-pwa` konfiguriert.

Wichtige Datei:

- `vite.config.ts`

Enthalten sind:

- Manifest
- Icons
- Workbox-Glob fuer Precaching

Bei Aenderungen an PWA-Assets oder Snapshot-Dateien:

- `npm run build`
- App im Browser hart neu laden
- falls noetig Service Worker / Site Data loeschen und erneut laden

## IndexedDB-Entwicklung

Wichtige Punkte:

- Datenbankname: `datenblatt-editor`
- Dexie-Version derzeit: `1`
- Stores: `datasets`, `settings`

Wenn sich die Store-Struktur aendert:

- Dexie-Version erhoehen
- Upgrade-Strategie festlegen
- bestehende Drafts bedenken

Der MVP hat aktuell keine formale Migrationslogik fuer alte Daten.

## Debugging-Hinweise

### Entwurf wird nicht angezeigt

Pruefen:

- gibt es einen Eintrag in IndexedDB?
- stimmt die Route `/draft/:id`?
- wurde `store.initialize()` ausgefuehrt?

### Import funktioniert nicht

Pruefen:

- ist das XTF/XML wirklich gueltig?
- enthaelt der Transfer genau ein `Dataset` oder genau eine `DatasetSeries`?
- ist versehentlich mehr als ein Objekt im Transfer enthalten?

### Export-Button bleibt deaktiviert

Pruefen:

- `validateDataset(...)`
- `ValidationPanel`
- Pflichtfelder
- Datumslogik

### Offline-Verhalten ist unerwartet

Pruefen:

- wurde ein Produktionsbuild verwendet?
- ist der Service Worker aktiv?
- wurde eine alte App-Version aus dem Cache geladen?

## Dokumentation pflegen

Bei relevanten Architektur- oder Betriebsaenderungen immer auch diese Dateien aktualisieren:

- `README.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/operations.md`

Das Projekt ist klein genug, dass veraltete Doku schnell verwirrend wird.
