# Container-Deployment

Diese Anleitung beschreibt den produktiven Containerbetrieb des
Datenblatt-Editors in OpenShift und den späteren Wechsel zu einem Object
Storage.

## Betriebsmodell

Der Datenblatt-Editor ist eine rein clientseitige SPA:

- kein API-Server
- keine serverseitige Session
- keine serverseitige Persistenz
- keine Anmeldung
- lokale Entwürfe in IndexedDB

Das Dockerimage baut die Anwendung und liefert anschliessend nur statische
Dateien aus. Als Runtime wird
`nginxinc/nginx-unprivileged:1.30.4-alpine-slim` verwendet.

Der Container lauscht auf Port `8080`. TLS wird nicht im Container beendet,
sondern durch OpenShift oder den vorgelagerten Router.

## Voraussetzungen

- Docker oder eine kompatible Build-Umgebung
- Zugriff auf die Zielregistry
- Node.js 22 nur für Builds ausserhalb des Containers
- ein vorgelagerter API-Gateway, der den externen Prefix entfernt und
  `X-FORWARDED-PREFIX` setzt

## Image bauen

Das Image wird immer prefix-neutral gebaut. `VITE_BASE_PATH=./` sorgt für
relative Asset-, Manifest-, Service-Worker- und Snapshot-URLs:

```bash
docker build \
  --build-arg VITE_BASE_PATH=./ \
  -t registry.example.org/datenportal/datenblatt-editor:latest \
  .
```

Der öffentliche Prefix wird nicht in das Image eingebaut. NGINX liest ihn bei
jedem Request aus `X-FORWARDED-PREFIX` und fügt ihn in die ausgelieferte
`index.html` als `<base href="...">` ein. Ein fehlender oder ungültiger Header
ergibt den Base-Pfad `/`.

### Quellenadresse beim Build

```bash
docker build \
  --build-arg VITE_BASE_PATH=./ \
  --build-arg VITE_METADATA_SOURCE_URL=/ch.so.daten/current.json \
  -t datenblatt-editor:local .
```

| Buildargument | Default | Wirkung |
|---|---|---|
| `VITE_BASE_PATH` | `./` im Dockerfile | Relative Assets; öffentlicher Prefix wird über den Gateway-Header ergänzt. |
| `VITE_METADATA_SOURCE_URL` | leer | Ohne Wert gebündelte `mock-sources/dataset.index.xtf`; andernfalls direkte XTF- oder Manifestadresse als Standardquelle. |

Diese Werte sind öffentlich sichtbare Buildkonfiguration, keine Secrets.
Container-Runtime-ENV verändert das fertig gebaute JavaScript nicht. Eine im
Browser gespeicherte Quelladresse hat Vorrang; im Quellen-Dialog umstellen,
ohne lokale Entwürfe zu löschen. Ein root-relativer Manifestpfad bezieht sich
auf die öffentliche Origin, nicht auf den Editor-Prefix. Bei fremder Origin
müssen JSON und XTF CORS erlauben. Der Client ruft Remote-Quellen ohne dauerhaften
Cache ab; Offline-Entwürfe und gebündelte Quellen bleiben separat verfügbar.
Details: [Quellen konfigurieren](operations.md#quellen-konfigurieren).

Die aktuelle GitHub Action übergibt nur `VITE_BASE_PATH`. Ein unverändert dort
gebautes Image enthält daher keinen spezifischen Manifestdefault. Der lokale
Dev-Stack setzt ihn mit `compose.editor-local.yaml`; alternativ können Benutzer
eine unterstützte Remote-Adresse im Quellen-Dialog auswählen.

### Image pushen

```bash
docker push registry.example.org/datenportal/datenblatt-editor:latest
```

Für produktive Deployments sollte statt `latest` ein unveränderlicher
Release-Tag oder Digest verwendet werden.

## GitHub Action

Der Workflow
`.github/workflows/publish-container.yml` übernimmt den Build und das
Publishing. Er läuft:

- bei jedem Push in das GitHub-Repository
- manuell über `workflow_dispatch`

Das GitHub-Repository ist der Zielort des Codeberg-Spiegels. Ein Push nach
Codeberg löst die Action daher erst aus, wenn der Spiegel den Commit nach
GitHub übertragen hat.
Git-Tags werden dabei nicht speziell ausgewertet.

### Registry-Ziele

Die Action veröffentlicht dasselbe Image mit denselben Tags an beide Ziele:

```text
sogis/datenportal-datenblatt-editor
ghcr.io/<github-owner>/<github-repository>
```

Das Image wird als Multiarch-Manifest für `linux/amd64` und `linux/arm64`
veröffentlicht. Docker wählt beim Pull automatisch die passende Architektur;
der Container und seine Betriebsparameter bleiben auf beiden Architekturen
gleich.

Die veröffentlichten Plattformen können geprüft werden mit:

```bash
docker buildx imagetools inspect sogis/datenportal-datenblatt-editor:latest
```

### GitHub-Secrets

Im GitHub-Repository unter **Settings → Secrets and variables → Actions** müssen
folgende Secrets eingerichtet werden:

- `DOCKERHUB_USERNAME`: Benutzername oder Servicekonto für Docker Hub
- `DOCKERHUB_TOKEN`: Docker-Hub-Access-Token mit Schreibzugriff
  auf `sogis/datenportal-datenblatt-editor`

Der Token sollte ein Access-Token und kein persönliches Passwort sein. Für GHCR
verwendet die Action den automatisch bereitgestellten `GITHUB_TOKEN`; ein
zusätzliches GHCR-Secret ist nicht erforderlich.

Die Workflow-Berechtigungen sind:

```yaml
permissions:
  contents: read
  packages: write
```

Falls die Organisationsrichtlinien das Schreiben von Packages verbieten, muss
die Berechtigung auf Organisations- oder Repository-Ebene freigegeben werden.

### Tags

Für jeden erfolgreichen Workflow-Lauf wird ein Versionstag erzeugt:

```text
0.1.42
```

Die `0.1`-Major-/Minor-Version ist im Workflow festgelegt; die Patch-Version
stammt aus `github.run_number`. `package.json` und Git-Tags haben keinen
Einfluss auf die Container-Version.


Zusätzlich gibt es:

- `sha-abc1234` für den Commit
- `latest` nur auf dem Default-Branch

`latest` ist ein beweglicher Zeiger und deshalb nicht für reproduzierbare
Deployments vorgesehen. Für reproduzierbare Deployments sollte ein Versions-
oder SHA-Tag verwendet werden.

Die GitHub-Run-Nummer zählt pro Workflow. Fehlgeschlagene oder manuelle Läufe
können deshalb Lücken in der Patch-Nummer verursachen.

### Erstprüfung

Nach dem ersten erfolgreichen Workflow-Lauf:

1. Image und Tags in Docker Hub prüfen.
2. Package und Tags unter **Packages** im GitHub-Repository prüfen.
3. Das Image aus beiden Registries mit einem SHA-Tag pullen.
4. Mit `docker buildx imagetools inspect` die Plattformen `linux/amd64` und
   `linux/arm64` prüfen.
5. Einen Container als nicht-root User auf Port `8080` starten.
6. Startseite, Snapshot-Datei und einen Deep Link prüfen.

## Lokaler Container-Test

Das publizierte Image kann direkt unter `/` getestet werden. Ohne
`X-FORWARDED-PREFIX` setzt NGINX den Base-Pfad auf `/`:

```bash
docker pull sogis/datenportal-datenblatt-editor:0.1.42
docker run --rm \
  --user 12345:0 \
  -p 8080:8080 \
  sogis/datenportal-datenblatt-editor:0.1.42
```

Prüfungen:

```bash
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/mock-sources/dataset.index.xtf
curl -I http://127.0.0.1:8080/draft/example
```

Erwartet wird:

- `200` für die Startseite
- `200` für die XTF-Datei
- `200` für den Deep Link, weil NGINX auf `index.html` zurückfällt

Der Gateway-Vertrag kann zusätzlich direkt am Container geprüft werden:

```bash
curl -H 'X-Forwarded-Prefix: /metadaten-editor' \
  http://127.0.0.1:8080/
curl -H 'X-Forwarded-Prefix: /metadaten-editor' \
  http://127.0.0.1:8080/draft/123
```

Die Antworten müssen `<base href="/metadaten-editor/">` enthalten. Ein
vollständiger Browser-Test unter
`http://127.0.0.1:8080/metadaten-editor/` benötigt zusätzlich einen lokalen
Reverse-Proxy, der `/metadaten-editor/` entfernt und den Header setzt. Der
Container selbst liefert weiterhin Root-Pfade aus.

## OpenShift-Vertrag

### Netzwerk

Der OpenShift-Service zeigt auf Container-Port `8080`.

Der bestehende API-Gateway stellt beispielsweise bereit:

```nginx
location /metadaten-editor/ {
    proxy_set_header X-FORWARDED-PREFIX '/metadaten-editor';
    proxy_pass http://metadaten-editor.${NAMESPACE}.svc/;
}
```

Der abschliessende `/` bei `proxy_pass` entfernt den öffentlichen Prefix vor
der Weiterleitung. Der Container erhält deshalb Root-Pfade und benötigt weder
eine `/metadaten-editor`-Dateistruktur noch ein OpenShift-Route-Rewrite.
`X-FORWARDED-PREFIX` teilt NGINX mit, unter welchem öffentlichen Pfad die
Antwort im Browser sichtbar ist.

Direkte Browser-Navigationen müssen ebenfalls korrekt weitergeleitet werden:

```text
/metadaten-editor/                 -> /
/metadaten-editor/draft/123        -> /draft/123
/metadaten-editor/assets/app.js    -> /assets/app.js
```

Der Gateway muss den Header nur für die vertrauenswürdige interne Verbindung
setzen. NGINX akzeptiert nur Pfade aus sicheren URL-Segmenten; fehlende,
absolute, mit Leerzeichen versehene oder sonst ungültige Werte fallen auf `/`
zurück. Ein öffentlicher Client darf diesen Header nicht selbst kontrollieren.

Die OpenShift-Route bleibt für Hostname und TLS zuständig. Der zentrale
API-Gateway bleibt für Prefix-Strip und `X-FORWARDED-PREFIX` zuständig; beide
Aufgaben werden nicht in das statische Image verlagert.

### Sicherheitsprofil

Das Image ist für beliebige nicht-root UIDs vorbereitet. Ein beispielhafter
Deployment-Ausschnitt sieht so aus:

```yaml
containers:
  - name: datenblatt-editor
    image: registry.example.org/datenportal/datenblatt-editor:RELEASE
    ports:
      - name: http
        containerPort: 8080
    securityContext:
      runAsNonRoot: true
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
      seccompProfile:
        type: RuntimeDefault
    volumeMounts:
      - name: tmp
        mountPath: /tmp
    readinessProbe:
      httpGet:
        path: /
        port: http
      initialDelaySeconds: 2
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /
        port: http
      initialDelaySeconds: 5
      periodSeconds: 20
volumes:
  - name: tmp
    emptyDir: {}
```

Das Beispiel ist in das bestehende Deployment-Template zu übernehmen; es
setzt keine konkrete Namespace-, Registry- oder Route-Konfiguration voraus.

### Dateien und Schreibrechte

Die ausgelieferten Dateien sind statisch und müssen nicht verändert werden.
NGINX benötigt nur temporären Schreibzugriff. Deshalb kann das Root-
Filesystem read-only sein, sofern `/tmp` als beschreibbares Volume gemountet
wird.

## NGINX-Verhalten

Die Runtime-Konfiguration:

- lauscht auf `8080`
- liefert vorhandene Dateien direkt aus
- liefert für unbekannte Client-Routen `index.html`
- liefert fehlerhafte Asset-Pfade nicht als `index.html`, sondern mit `404`
- liest einen sicheren `X-FORWARDED-PREFIX` aus
- fügt den öffentlichen Prefix in `index.html` als `<base>` ein
- schreibt Access-Logs nach stdout
- schreibt Error-Logs nach stderr
- setzt `index.html` wegen des requestabhängigen `<base>` auf `no-store`
- setzt Manifest und Service Worker auf Revalidierung
- setzt gehashte Dateien unter `/assets/` auf Langzeit-Cache

Damit bleiben neue App-Versionen auffindbar, und eine zwischengespeicherte
`index.html` kann nicht versehentlich für einen anderen Gateway-Prefix
verwendet werden. Unveränderliche Assets werden trotzdem effizient gecacht.

## Object-Storage-Migration

Der Builder erzeugt `dist/`. Dieses Verzeichnis ist das Deployment-Artefakt
und kann später ohne Anwendungsänderung in einen Object Storage kopiert
werden.

Bei einem Prefix als Verzeichnis werden die Dateien beispielsweise so
abgelegt:

```text
/metadaten-editor/assets/...     -> dist/assets/...
/metadaten-editor/index.html     -> dist/index.html
/metadaten-editor/draft/123      -> dist/index.html
```

Die relativen URLs funktionieren am Prefix-Root ohne Anpassung des Artefakts.
Für direkte Deep Links muss der Object-Storage-Endpunkt zusätzlich eine
prefixbewusste SPA-Auslieferung anbieten: entweder durch dieselbe
`<base>`-Injektion am Gateway/Edge wie NGINX oder durch eine Hosting-Funktion,
die die Anfrage unter dem öffentlichen Prefix als App-Root behandelt. Ein
reines Fallback auf `index.html` ohne diese Prefix-Behandlung kann bei
`/metadaten-editor/draft/123` versuchen, Assets unter
`/metadaten-editor/draft/assets/` zu laden.

### Erforderliche Object-Storage-Einstellungen

- SPA-Fallback für unbekannte Routen auf `index.html`
- korrekter MIME-Type für JavaScript, CSS, SVG, Webmanifest, XTF und WOFF2
- `index.html` nicht langfristig cachen
- gehashte Dateien unter `assets/` langfristig und immutable cachen
- externe TLS-Auslieferung für den Browser beziehungsweise PWA-Betrieb
- bei requestabhängiger `<base>`-Injektion `index.html` nicht zwischen
  verschiedenen Prefixes teilen

## Manueller Release-Ablauf

Der normale Release-Ablauf erfolgt über die GitHub Action. Die folgenden
Befehle dienen als lokaler oder manueller Fallback:

```bash
npm test
npm run build

docker build \
  --build-arg VITE_BASE_PATH=./ \
  -t registry.example.org/datenportal/datenblatt-editor:RELEASE \
  .

docker push registry.example.org/datenportal/datenblatt-editor:RELEASE
```

Danach:

1. Image in OpenShift deployen.
2. Service-Port `8080`, Prefix-Strip und `X-FORWARDED-PREFIX` prüfen.
3. Startseite und einen Deep Link direkt aufrufen.
4. Quellen-Dialog und XTF-Snapshot prüfen.
5. Browser-Reload und PWA-Update prüfen.
6. Offline-Verhalten nach einmaligem Laden prüfen.

## Troubleshooting

### Startseite funktioniert, Deep Link liefert 404

Der SPA-Fallback fehlt oder der Router leitet den externen Prefix nicht
korrekt weiter. NGINX muss unbekannte Routen auf `/index.html` zurückführen.

### JavaScript- oder CSS-Dateien liefern 404 unter dem Subpath

Prüfen, ob der Gateway den öffentlichen Prefix entfernt und
`X-FORWARDED-PREFIX` setzt. Der Container muss intern beispielsweise
`/assets/index-<hash>.js` erhalten; der Browser darf es öffentlich unter
`/metadaten-editor/assets/...` anfordern. Der produktive Build verwendet
`VITE_BASE_PATH=./`; ein fest eingebauter `/metadaten-editor/`-Prefix ist nicht
erforderlich.

Bei einer direkten Containeranfrage kann der Header für den Test gesetzt
werden:

```bash
curl -sS -H 'X-Forwarded-Prefix: /metadaten-editor' \
  http://127.0.0.1:8080/ | grep '<base'
```

Erwartet wird `<base href="/metadaten-editor/">`.

### Container startet als nicht-root UID nicht

Prüfen:

- wird das NGINX-Unprivileged-Image verwendet?
- ist der Container-Port grösser als `1024`?
- ist `/tmp` beschreibbar?
- wurde eine eigene NGINX-Konfiguration mit root-only Schreibpfaden eingebunden?

### Neue Version erscheint trotz Deployment nicht

Die Ursache ist meist ein alter Service Worker oder Browser-Cache:

1. Seite neu laden.
2. Service-Worker-Update abwarten.
3. Site Data nur bei Bedarf löschen.
4. prüfen, ob `index.html` wirklich revalidiert wird.

### Object Storage liefert bei Deep Links 404

Der Object Storage benötigt ein SPA-Fallback oder ein Gateway-Rewrite. Ein
reiner Dateiserver ohne Fallback kann Vue-Router-History-Routen nicht bedienen.
Zusätzlich muss die Auslieferung unter einem Prefix die relativen Assets auch
für Deep Links korrekt auflösen; siehe die Object-Storage-Anforderungen oben.
