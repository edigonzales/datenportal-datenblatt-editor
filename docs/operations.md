# Betrieb und Deployment

Diese Datei richtet sich an Betreiber, Reviewer und Personen, die die Anwendung lokal oder statisch bereitstellen wollen.

## Betriebsmodell

Die Anwendung ist eine rein clientseitige Webanwendung.

Das bedeutet:

- kein API-Server
- keine Datenbank auf dem Server
- keine Benutzerverwaltung
- keine serverseitige Verarbeitung

Der Server muss nur statische Dateien ausliefern.

## Artefakte

### Quellcode

Das Git-Repository enthaelt:

- den Applikationscode
- die gemockte Quellen-Datei unter `public/mock-sources/`
- Tests

### Build-Ausgabe

Nach `npm run build` liegt die produktive Auslieferung in:

```text
dist/
```

Dieses Verzeichnis ist das einzige Artefakt, das fuer die Auslieferung benoetigt wird.

## Anwendung lokal starten

### Entwicklungsmodus

```bash
npm install
npm run dev
```

Geeignet fuer:

- lokale Entwicklung
- schnelle Sichtpruefungen

Weniger geeignet fuer:

- PWA-/Offline-Abnahme
- Cache-/Update-Tests

### Produktionsnahe Vorschau

```bash
npm install
npm run build
npm run preview
```

Geeignet fuer:

- Review
- Offline-Pruefung
- PWA-Verifikation

## Zielumgebung

Geeignet ist jeder statische Webserver oder Objekt-Storage mit Web-Auslieferung, zum Beispiel:

- Nginx
- Apache
- Caddy
- ein statisches Hosting
- ein internes Artefakt- oder Portal-Hosting mit SPA-Support

## Minimale Anforderungen

- Auslieferung von `dist/`
- korrekter MIME-Type fuer JS/CSS/JSON/SVG
- SPA-Fallback auf `index.html`
- Zugriff ueber `http://` oder besser `https://`

Wichtig:

- `file://` ist fuer sauberen PWA-Betrieb nicht geeignet.
- Fuer installierbare PWAs ist HTTPS im Normalfall die richtige Zielumgebung.

## Empfohlene HTTP-Strategie

### `index.html`

- moeglichst nicht lange cachen

### gehashte Assets in `dist/assets/`

- duerfen lang gecacht werden

### JSON-Snapshots

- werden mit dem Build ausgeliefert
- koennen ebenfalls normal statisch gecacht werden

Da die App via Service Worker precached wird, kommen Updates ohnehin ueber neue Builds in die Clients.

## Offline- und PWA-Verhalten

### Was offline funktioniert

- Start der Anwendung
- Navigation zwischen den Routen
- Oeffnen lokaler Entwuerfe
- Bearbeiten und Speichern in IndexedDB
- Laden der `dataset.index.json`
- Export von JSON

### Was fuer Offline vorher passiert sein muss

Die Anwendung muss mindestens einmal erfolgreich geladen worden sein, damit:

- App-Shell
- Assets
- `dataset.index.json`
- Service Worker

im Browser verfuegbar sind.

## Update-Modell

Die Anwendung verwendet `vite-plugin-pwa` mit `registerType: "autoUpdate"`.

Praktisch bedeutet das:

- neue Version deployen
- Benutzer laden die Seite neu
- der Service Worker aktualisiert die App-Dateien

Wichtig:

- Index-Inhalte werden nicht separat synchronisiert
- geaenderte Mock-Daten kommen nur mit einem neuen Build auf die Clients

## Snapshot-Daten aktualisieren

Wenn sich die "externen" Quelldaten aendern sollen:

1. `public/mock-sources/dataset.index.json` aktualisieren
2. `npm run build`
3. `dist/` neu deployen

Es reicht nicht, nur einen laufenden Browser-Cache zu erwarten. Die Daten sind Teil der ausgelieferten App-Version.

## Datenschutz und Sicherheit

### Positiv

- keine automatische Uebertragung an ein Backend
- keine LLM-Integration
- lokale Persistenz nur im Browser
- kein Serverzustand

### Zu beachten

- Entwuerfe liegen lokal im Browserprofil
- bei gemeinsam genutzten Arbeitsstationen ist das ein reales Betriebsrisiko
- Browserdaten loeschen entfernt auch die Entwuerfe
- es gibt kein externes Backup

Empfehlung:

- Nutzer sollten regelmaessig als JSON exportieren, wenn ein Arbeitsstand archiviert werden soll
- sensible Inhalte nicht in gemeinsam genutzten Browserprofilen pflegen

## Browserdaten und Support

Die wichtigsten lokalen Daten liegen in:

- IndexedDB-Datenbank `datenblatt-editor`
- Service-Worker-Cache des Hosts

Bei Supportfaellen kann es hilfreich sein, Browserdaten fuer die Site gezielt zu loeschen.

Folge:

- lokale Entwuerfe gehen verloren
- die App muss erneut geladen werden

Das sollte nur bewusst geschehen.

## Monitoring

Da es kein Backend gibt, ist klassisches Applikationsmonitoring stark reduziert.

Sinnvolle Betriebschecks sind:

- laesst sich `index.html` ausliefern?
- werden Assets korrekt geladen?
- funktioniert SPA-Fallback?
- ist die PWA installierbar?
- funktionieren Snapshot-Dateien unter `public/mock-sources/`?

## Release-Checkliste

Vor einem Release:

1. `npm install`
2. `npm test`
3. `npm run build`
4. `npm run test:e2e`
5. `dataset.index.json` fachlich pruefen
6. `dist/` deployen
7. installierte App / Offline-Verhalten einmal pruefen

## Typische Betriebsfragen

### "Wie starte ich die Anwendung lokal fuer eine Fachabnahme?"

Empfohlen:

```bash
npm install
npm run build
npm run preview
```

Dann die ausgegebene URL im Browser oeffnen.

### "Brauchen wir einen Server mit Datenbank?"

Nein. Es reicht ein statischer Webserver.

### "Kann die Anwendung ohne Internet verwendet werden?"

Ja, nach einmaligem Laden der App-Version.

### "Wo liegen die bearbeiteten Daten?"

Lokal im Browser in IndexedDB.

### "Wie wird die Mock-Quelle aktualisiert?"

Nur ueber geaenderte JSON-Dateien plus neuen Build und neues Deployment.

### "Was passiert beim Browserwechsel oder auf einem zweiten Geraet?"

Lokale Entwuerfe sind nicht zwischen Browsern oder Geraeten synchronisiert.

## Troubleshooting

### Seite laedt, aber Routen direkt aufgerufen liefern 404

Ursache:

- SPA-Fallback fehlt im Webserver

Massnahme:

- alle nicht-Asset-Routen auf `index.html` zurueckfuehren

### App ist online aktuell, aber offline noch alt

Ursache:

- alter Service Worker / alter Cache

Massnahmen:

- Seite neu laden
- Site Data loeschen
- ggf. App neu installieren

### Quellen-Dialog zeigt keine Treffer

Pruefen:

- liegt die erwartete `dataset.index.json` im Build?
- wurde die korrekte Mock-Datei deployed?
- ist das JSON syntaktisch gueltig?

### Lokale Entwuerfe "verschwinden"

Moegliche Ursachen:

- Browserdaten wurden geloescht
- anderes Browserprofil
- anderer Browser

## Was Betreiber nicht tun muessen

- keine Datenbank pflegen
- keinen Migrationsjob ausfuehren
- keine Geheimnisse konfigurieren
- keine API-Tokens hinterlegen
- keine Benutzer anlegen
