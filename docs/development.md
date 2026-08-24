# Entwicklung

Diese Datei ist für Entwickler gedacht, die lokal am Projekt arbeiten oder die App erweitern wollen.

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

Standardmässig startet Vite unter:

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
- Wenn Offline-Verhalten getestet werden soll, ist `build + preview` aussagekräftiger als der HMR-Server.

## Docker-Smoke-Test

Das produktive Laufzeitverhalten kann mit dem Dockerimage geprüft werden.
`npm run preview` bleibt für lokale Vorschauen nützlich, ist aber nicht der
produktive Webserver im Container.

### Root-Build

```bash
docker build --build-arg VITE_BASE_PATH=/ \
  -t datenblatt-editor:local .

docker run --rm --user 12345:0 -p 8080:8080 \
  datenblatt-editor:local
```

Danach prüfen:

```bash
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/mock-sources/dataset.index.xtf
curl -I http://127.0.0.1:8080/draft/example
```

Die Startseite und der Deep Link müssen `200` liefern. Die XTF-Datei muss als
statische Datei erreichbar sein.

### Subpath-Build

```bash
docker build --build-arg VITE_BASE_PATH=/metadaten-editor/ \
  -t datenblatt-editor:metadaten-editor .
```

Bei einem Subpath-Build prüfen, dass `dist/index.html` auf URLs unter
`/metadaten-editor/` verweist. Im produktiven OpenShift-Aufbau entfernt der
vorgelagerte Router diesen Prefix vor der Weiterleitung an NGINX. Ein direkter
Aufruf des Containers ohne diesen Prefix-Rewrite ist deshalb nur für den
Root-Build geeignet.

### OpenShift-Sicherheitsprofil lokal simulieren

Das NGINX-Unprivileged-Image muss auch mit einer beliebigen nicht-root UID
starten:

```bash
docker run --rm --user 12345:0 -p 8080:8080 datenblatt-editor:local
```

Falls das Root-Filesystem read-only betrieben werden soll, muss `/tmp` als
beschreibbares temporäres Verzeichnis gemountet werden.

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
3. Änderungen im Browser prüfen
4. `npm test`
5. `npm run build`
6. Bei Flows oder Dialogen zusätzlich `npm run test:e2e`

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

## Änderungsszenarien

### Neues Dataset-Feld einführen

Minimaler Pfad:

1. Typ in `src/domain/datasetTypes.ts` erweitern
2. Default-Wert in `createEmptyDatasetRoot()` setzen
3. ggf. Hydration in `normalize.ts` ergänzen
4. Validierung in `validation.ts` erweitern
5. UI in `DatasetForm.vue` einbauen
6. Tests ergänzen

### Neue Quelle oder Snapshot aufnehmen

1. Default-URL in `src/config/metadataSources.ts` anpassen
2. `dataset.index.xtf` unter `public/mock-sources/` aktualisieren oder ersetzen
3. Vollständige Dataset-/DatasetSeries-XTFs im Index konsistent halten
4. Such- und Ladefluss im Browser prüfen

### Neue Validierungsregel einführen

1. Regel in `validateDataset(...)` ergänzen
2. `ValidationIssue` mit passendem `code` und `path` erzeugen
3. Test in `src/domain/validation.test.ts` schreiben
4. UI im `ValidationPanel` prüfen

### Neue Store-Logik einführen

Fragen vorab:

- Gehört die Logik wirklich in den globalen Store?
- Oder reicht eine lokale Komponente?
- Ist es Domainlogik oder nur UI-State?

Regel:

- Domainregeln nicht in Komponenten vergraben.
- Persistenzzugriffe nicht direkt in mehreren Komponenten verteilen.

## Snapshot-Daten pflegen

Die Mock-Quellen des MVP sind lokale XTF-Dateien. Das ist bewusst so, damit die App komplett offline läuft.

Unterstützte Dateien:

```text
public/mock-sources/dataset.index.xtf
public/mock-sources/offices.xtf
```

`dataset.index.xtf` enthält einen XTF-Transfer mit allen `Dataset`- und `DatasetSeries`-Objekten im Basket `Metadata`.
`offices.xtf` enthält den Datenherr-Katalog für die Auswahl im Editor.

JSON-Snapshots unter `public/mock-sources/` sind kein unterstütztes Format mehr.

Empfehlung bei Änderungen:

- Identifier und enthaltene Dataset-Dokumente sowie Office-Identifier konsistent halten
- nach Änderungen immer `npm run build` ausführen
- Ladefluss über den Dialog einmal komplett prüfen

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

`src/styles/components.css` enthält:

- Topbar
- Tabs
- Cards
- Form-Styles
- Tabellen
- Dialoge
- Notices
- Sidebar

### Regel für neue UI

- zuerst bestehende Klassen wiederverwenden
- neue Tokens nur einführen, wenn wirklich semantisch nötig
- Jenkins-inspirierte Einfachheit beibehalten
- keine grossen Gradients, keine grossen Rundungen, keine decorative animation

## PWA-Entwicklung

Die PWA wird über `vite-plugin-pwa` konfiguriert.

Wichtige Datei:

- `vite.config.ts`

Enthalten sind:

- Manifest
- Icons
- Workbox-Glob für Precaching

Bei Änderungen an PWA-Assets oder Snapshot-Dateien:

- `npm run build`
- App im Browser hart neu laden
- falls nötig Service Worker / Site Data löschen und erneut laden

## IndexedDB-Entwicklung

Wichtige Punkte:

- Datenbankname: `datenblatt-editor`
- Dexie-Version derzeit: `1`
- Stores: `datasets`, `settings`

Wenn sich die Store-Struktur ändert:

- Dexie-Version erhöhen
- Upgrade-Strategie festlegen
- bestehende Drafts bedenken

Der MVP hat aktuell keine formale Migrationslogik für alte Daten.

## Debugging-Hinweise

### Entwurf wird nicht angezeigt

Prüfen:

- gibt es einen Eintrag in IndexedDB?
- stimmt die Route `/draft/:id`?
- wurde `store.initialize()` ausgeführt?

### Import funktioniert nicht

Prüfen:

- ist das XTF/XML wirklich gültig?
- enthält der Transfer genau ein `Dataset` oder genau eine `DatasetSeries`?
- ist versehentlich mehr als ein Objekt im Transfer enthalten?

### Export-Button bleibt deaktiviert

Prüfen:

- `validateDataset(...)`
- `ValidationPanel`
- Pflichtfelder
- Datumslogik

### Offline-Verhalten ist unerwartet

Prüfen:

- wurde ein Produktionsbuild verwendet?
- ist der Service Worker aktiv?
- wurde eine alte App-Version aus dem Cache geladen?

## Dokumentation pflegen

Bei relevanten Architektur- oder Betriebsänderungen immer auch diese Dateien aktualisieren:

- `README.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/operations.md`

Das Projekt ist klein genug, dass veraltete Doku schnell verwirrend wird.
