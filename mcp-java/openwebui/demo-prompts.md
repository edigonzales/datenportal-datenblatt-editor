# Demo-Prompts für Open WebUI

Die Fragen sind so formuliert, dass sie sich direkt in den Chat der
Datenblatt-Demo einfügen lassen. Für den Import wird
`src/test/resources/dataset.xtf` als Anhang benötigt.

## 1. XTF importieren

> Importiere die angehängte XTF-Datei und fasse zusammen, welche Angaben im
> Entwurf bereits vorhanden sind.

Erwartetes Verhalten: `import_xtf_attachment` wählt den XTF-Anhang, legt
genau einen Entwurf an und meldet Dateiname, `draft_id`, `revision`, `kind`
und `title`. Es wird kein XML aus dem Chat übernommen; der Entwurf wird nicht
validiert oder exportiert.

## 2. Attribut ergänzen

> Ergänze im aktuellen Entwurf das Attribut FOO als Text mit der Beschreibung
> «Flächenmass in Quadratmeter» und der Einheit m². FOO ist kein
> Pflichtattribut.

Erwartetes Verhalten: `upsert_attribute` mit `draft_id` und der aktuellen
`revision`, `mandatory: false` ausdrücklich als Wert. Die Antwort nennt Pfad
und Nachherwert aus `changes`; ohne Treffer wird ein neuer Eintrag angelegt.

## 3. Mehrdeutigen Namen auflösen

> Ändere die Beschreibung von FOO auf «Fläche in Quadratmeter».

Erwartetes Verhalten: Ohne `attribute_id` liefert ein mehrdeutiger Name
`ambiguous_match` mit Kandidaten. Der Assistent listet die Kandidaten auf und
fragt nach, statt einen Eintrag zu raten. Nach der Auswahl wird
`upsert_attribute` mit `attribute_id` ausgeführt.

## 4. Pflichtwerte und Validierung

> Prüfe den Entwurf und liste alle Validierungsmeldungen mit Schweregrad auf.
> Ändere nichts automatisch.

Erwartetes Verhalten: `validate_datasheet` mit der aktuellen Revision. Ein
ungültiger Entwurf ist ein erfolgreicher Aufruf mit `valid: false`; die
Meldungen werden vollständig mit `severity`, `object_id` und `model_element`
wiedergegeben. Fehlende Pflichtwerte werden nicht erfunden.

## 5. Revisionskonflikt

> Ändere den Titel des Entwurfs auf «Datenblatt Demo». Ich habe parallel
> gearbeitet; falls die Revision nicht mehr stimmt, lies den Entwurf neu und
> führe die Änderung nicht blind erneut aus.

Erwartetes Verhalten: `update_metadata` mit `expected_revision`. Bei einem
Revisionskonflikt bleibt der Entwurf unverändert. Der Assistent liest mit
`read_datasheet` neu, nennt die aktuelle Revision und fragt vor der
Wiederholung nach.

## 6. Ausgabe erfassen

> Erfasse im Entwurf eine Ausgabe «Beispielausgabe» und nenne die erzeugte
> Ausgaben-ID.

Erwartetes Verhalten: `upsert_issue` ohne `issue_id` legt an oder
aktualisiert bei genau einem Treffer. Die Antwort übernimmt `changes` und die
aktuelle Revision unverändert.

## 7. Schema erklären

> Welche Felder kennt das Schema für Attribute? Erkläre Pflichtfelder,
> erlaubte Codes und Textlängen.

Erwartetes Verhalten: `describe_schema` mit `kind: attribute`, ohne Daten zu
ändern. Die Erklärung stützt sich ausschliesslich auf das Werkzeugergebnis.

## 8. Exportieren und herunterladen

> Exportiere das Datenblatt und gib mir den Download-Link.

Erwartetes Verhalten: `export_xtf` validiert intern mit ilivalidator. Nur bei
Erfolg entsteht `download_url`; der Assistent zeigt den Link unverändert und
genau einmal als Markdown-Link an und weist auf die einstündige Gültigkeit
hin. `include_xml` bleibt weg, solange kein XML-Text verlangt wird.

## 9. Entwurf verwerfen

> Verwirf den aktuellen Entwurf und bestätige, dass er nicht mehr verfügbar
> ist.

Erwartetes Verhalten: `discard_datasheet` mit der aktuellen Revision. Ein
anschliessender `read_datasheet`-Aufruf wird nicht mehr versucht; der
Assistent bestätigt das Verwerfen.
