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

Das Git-Repository enthält:

- den Applikationscode
- die gemockte Quellen-Datei unter `public/mock-sources/`
- Tests

### Build-Ausgabe

Nach `npm run build` liegt die produktive Auslieferung in:

```text
dist/
```

Dieses Verzeichnis ist das einzige Artefakt, das für die Auslieferung benötigt wird.

### Container-Auslieferung

Das Repository enthält ein Multi-Stage-Dockerfile. Die Build-Stage verwendet
Node.js 22; die Runtime-Stage verwendet
`nginxinc/nginx-unprivileged:1.30.4-alpine-slim` und lauscht auf Port `8080`.
Im Container wird nur der Inhalt von `dist/` ausgeliefert.

Der Container:

- benötigt kein Backend und keine Datenbank
- verwendet kein TLS
- läuft ohne Root-Rechte
- schreibt Logs nach stdout/stderr
- unterstützt SPA-Fallbacks für direkte Routen

Die vollständige Anleitung mit Docker-, OpenShift- und Object-Storage-Beispielen
steht in [Container-Deployment](container-deployment.md).

### GitHub Action und Registries

Der Workflow `.github/workflows/publish-container.yml` läuft bei jedem Push
und kann zusätzlich über `workflow_dispatch` manuell gestartet werden. Das ist
für den Codeberg-Spiegel wichtig: Nicht der Push nach Codeberg, sondern der
anschliessende Push in das GitHub-Spiegelrepository löst die Action aus.

Veröffentlichte Images:

- Docker Hub: `sogis/datenportal-metadaten-editor`
- GitHub Container Registry:
  `ghcr.io/<github-owner>/<github-repository>`

Benötigte Repository-Secrets:

- `DOCKERHUB_USERNAME`: Docker-Hub-Benutzer oder Servicekonto mit Schreibzugriff
- `DOCKERHUB_TOKEN`: Docker-Hub-Access-Token mit Schreibzugriff auf das Image

Für GHCR wird `GITHUB_TOKEN` verwendet. Der Workflow benötigt deshalb die
Berechtigungen `contents: read` und `packages: write`.

Die Action verwendet folgende Tags:

- `sha-<kurzer-commit-sha>` für jeden erfolgreichen Push
- `0.1.<github.run_number>` für jeden erfolgreichen Workflow-Lauf
- `latest` nur auf dem Default-Branch

Die `0.1`-Major-/Minor-Version ist im Workflow festgelegt. Die Patch-Version
stammt aus `github.run_number`; `package.json` und Git-Tags haben keinen
Einfluss auf die Container-Version. Fehlgeschlagene oder manuelle Läufe können
deshalb Lücken in der Run-Nummer verursachen.

### Prefix-neutraler Build und Gateway-Prefix

Das produktive Image wird mit relativen URLs gebaut. Der öffentliche Pfad wird
nicht fest in `dist/` oder in das Containerimage eingebaut:

```bash
docker build --build-arg VITE_BASE_PATH=./ \
  -t datenblatt-editor:local .
```

`VITE_BASE_PATH=./` erzeugt relative URLs für Vite-Assets, Manifest, Icons,
Service Worker und lokale XTF-Snapshots. NGINX setzt bei jeder Auslieferung von
`index.html` anhand von `X-FORWARDED-PREFIX` ein passendes `<base>`-Element.
Ohne Header ist der Base-Pfad `/`; mit
`X-FORWARDED-PREFIX: /metadaten-editor` ist er
`/metadaten-editor/`. Das Image selbst erwartet Anfragen nach dem Prefix-Strip
unter `/`.

## Anwendung lokal starten

### Entwicklungsmodus

```bash
npm install
npm run dev
```

Geeignet für:

- lokale Entwicklung
- schnelle Sichtprüfungen

Weniger geeignet für:

- PWA-/Offline-Abnahme
- Cache-/Update-Tests

### Produktionsnahe Vorschau

```bash
npm install
npm run build
npm run preview
```

Geeignet für:

- Review
- Offline-Prüfung
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
- korrekter MIME-Type für JS/CSS/JSON/SVG
- SPA-Fallback auf `index.html`
- Zugriff über `http://` oder besser `https://`

Wichtig:

- `file://` ist für sauberen PWA-Betrieb nicht geeignet.
- Für installierbare PWAs ist HTTPS im Normalfall die richtige Zielumgebung.

## Empfohlene HTTP-Strategie

### `index.html`

- möglichst nicht lange cachen

### gehashte Assets in `dist/assets/`

- dürfen lang gecacht werden

### XTF-Snapshots

- werden mit dem Build ausgeliefert
- können ebenfalls normal statisch gecacht werden

Da die App via Service Worker precached wird, kommen Updates ohnehin über neue Builds in die Clients.

## Offline- und PWA-Verhalten

### Was offline funktioniert

- Start der Anwendung
- Navigation zwischen den Routen
- Öffnen lokaler Entwürfe
- Bearbeiten und Speichern in IndexedDB
- Laden von `dataset.index.xtf`
- Laden von `offices.xtf`
- Export von XTF

### Was für Offline vorher passiert sein muss

Die Anwendung muss mindestens einmal erfolgreich geladen worden sein, damit:

- App-Shell
- Assets
- `dataset.index.xtf`
- `offices.xtf`
- Service Worker

im Browser verfügbar sind.

## Update-Modell

Die Anwendung verwendet `vite-plugin-pwa` mit `registerType: "autoUpdate"`.

Praktisch bedeutet das:

- neue Version deployen
- Benutzer laden die Seite neu
- der Service Worker aktualisiert die App-Dateien

Wichtig:

- Index-Inhalte werden nicht separat synchronisiert
- geänderte Mock-Daten kommen nur mit einem neuen Build auf die Clients

## Snapshot-Daten aktualisieren

Wenn sich die "externen" Quelldaten ändern sollen:

1. `public/mock-sources/dataset.index.xtf` aktualisieren
2. bei Bedarf `public/mock-sources/offices.xtf` aktualisieren
3. `npm run build`
4. `dist/` neu deployen

Es reicht nicht, nur einen laufenden Browser-Cache zu erwarten. Die XTF-Dateien sind Teil der ausgelieferten App-Version.

### XTF fachlich validieren

Vor Release oder bei geänderten Mock-Daten:

```bash
java -jar /Users/stefan/apps/ilivalidator-1.15.0/ilivalidator-1.15.0.jar \
  --modeldir /Users/stefan/sources/sogis-interlis-repository/models/AGI \
  public/mock-sources/dataset.index.xtf
```

JSON-Snapshots unter `public/mock-sources/` sind kein unterstütztes Format.

## Datenschutz und Sicherheit

### Positiv

- keine automatische Übertragung an ein Backend
- keine LLM-Integration
- lokale Persistenz nur im Browser
- kein Serverzustand

### Zu beachten

- Entwürfe liegen lokal im Browserprofil
- bei gemeinsam genutzten Arbeitsstationen ist das ein reales Betriebsrisiko
- Browserdaten löschen entfernt auch die Entwürfe
- es gibt kein externes Backup

Empfehlung:

- Nutzer sollten regelmässig als XTF exportieren, wenn ein Arbeitsstand archiviert werden soll
- sensible Inhalte nicht in gemeinsam genutzten Browserprofilen pflegen

## Browserdaten und Support

Die wichtigsten lokalen Daten liegen in:

- IndexedDB-Datenbank `datenblatt-editor`
- Service-Worker-Cache des Hosts

Bei Supportfällen kann es hilfreich sein, Browserdaten für die Site gezielt zu löschen.

Folge:

- lokale Entwürfe gehen verloren
- die App muss erneut geladen werden

Das sollte nur bewusst geschehen.

## Monitoring

Da es kein Backend gibt, ist klassisches Applikationsmonitoring stark reduziert.

### Container-Probes

Der Container hat keinen separaten Health-Endpunkt. Für Readiness und Liveness
kann `GET /` auf Port `8080` verwendet werden. OpenShift-Probes laufen direkt
gegen den Service und benötigen keinen öffentlichen Prefix. Eine externe Probe
über den Gateway muss den Prefix wie jede andere Anfrage weiterleiten.

Sinnvolle Betriebschecks sind:

- lässt sich `index.html` ausliefern?
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
5. `dataset.index.xtf` fachlich prüfen
 6. bei Änderungen `offices.xtf` fachlich prüfen
 7. `dist/` deployen
 8. installierte App / Offline-Verhalten einmal prüfen

Bei einem Container-Release zusätzlich:

1. Image mit `VITE_BASE_PATH=./` bauen
2. `npm test` und `npm run build` erfolgreich ausführen
3. Container unter einer beliebigen nicht-root UID starten
4. Port `8080`, SPA-Fallback, Forwarded-Prefix und Snapshot-Dateien prüfen
5. Image in die Zielregistry pushen
6. OpenShift-Deployment und Gateway-Location prüfen

Für das Container-Release übernimmt die GitHub Action den Build und das
Publishing. Nach einem erfolgreichen Lauf:

1. SHA-Tag in Docker Hub und GHCR prüfen.
2. Bei Default-Branch-Push `latest` prüfen.
3. Den Versionstag `0.1.<github.run_number>` prüfen.
4. Das veröffentlichte Image in OpenShift deployen.

## Typische Betriebsfragen

### "Wie starte ich die Anwendung lokal für eine Fachabnahme?"

Empfohlen:

```bash
npm install
npm run build
npm run preview
```

Dann die ausgegebene URL im Browser öffnen.

### "Brauchen wir einen Server mit Datenbank?"

Nein. Es reicht ein statischer Webserver.

### "Kann die Anwendung ohne Internet verwendet werden?"

Ja, nach einmaligem Laden der App-Version.

### "Wo liegen die bearbeiteten Daten?"

Lokal im Browser in IndexedDB.

### "Wie wird die Mock-Quelle aktualisiert?"

Nur über geänderte XTF-Dateien plus neuen Build und neues Deployment.

### "Was passiert beim Browserwechsel oder auf einem zweiten Gerät?"

Lokale Entwürfe sind nicht zwischen Browsern oder Geräten synchronisiert.

## Troubleshooting

### Seite lädt, aber Routen direkt aufgerufen liefern 404

Ursache:

- SPA-Fallback fehlt im Webserver

Massnahme:

- alle nicht-Asset-Routen auf `index.html` zurückführen

### App ist online aktuell, aber offline noch alt

Ursache:

- alter Service Worker / alter Cache

Massnahmen:

- Seite neu laden
- Site Data löschen
- ggf. App neu installieren

### Quellen-Dialog zeigt keine Treffer

Prüfen:

- liegt die erwartete `dataset.index.xtf` im Build?
- liegt die erwartete `offices.xtf` im Build?
- wurden die korrekten XTF-Dateien deployed?
- ist das XTF/XML syntaktisch gültig?

### Lokale Entwürfe "verschwinden"

Mögliche Ursachen:

- Browserdaten wurden gelöscht
- anderes Browserprofil
- anderer Browser

## Was Betreiber nicht tun müssen

- keine Datenbank pflegen
- keinen Migrationsjob ausführen
- keine Geheimnisse konfigurieren
- keine API-Tokens hinterlegen
- keine Benutzer anlegen
