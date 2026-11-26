# briv—io

Die Website von briv—io, dem Product Studio von Nicolas Brivio: Ideen, Experimente und Produkte, ein Projekt je Bildschirm. Statisch gebaut mit Astro, ausgeliefert über GitHub Pages unter `www.nicolasbrivio.ch`. Kein Formular, keine Messung, keine fremden Dienste.

## Arbeiten

Voraussetzung ist Node in der Version aus `.nvmrc`.

```sh
npm ci            # Abhängigkeiten nach Sperrdatei
npm run dev       # Vorschau unter http://localhost:4321
npm run pruefen   # bauen und alle Prüfungen laufen lassen
```

`npm run pruefen` braucht ein installiertes Google Chrome.

## Inhalte ändern

Alles, was sich ändert, liegt unter `inhalt/`, getrennt vom Code. Eine Änderung ist eine geänderte Datei und ein Push auf `main`.

| Datei | Inhalt |
| --- | --- |
| `inhalt/projekte.json` | Die Projekte in ihrer Reihenfolge. Mit `bereit: true` hat ein Kapitel Titel, Zweck, Frage, Beschrieb und eine eigene Seite. Mit `bereit: false` ist es angekündigt und steht nur mit Namen da |
| `inhalt/texte.json` | Kopfangaben der Startseite, Impressum und Datenschutz |
| `inhalt/studio.json` | Name, Person, Adresse und Mail. Kopf, Fuss, Impressum und strukturierte Daten lesen hier |

**Titelblatt oder ganze Seite:** Solange in `inhalt/projekte.json` `"oeffentlich": false` steht, zeigt die Seite nur das Titelblatt mit Zeichen und Claim. Mit `true` erscheinen die Projekte auf der Startseite und ihre eigenen Seiten.

**Ein Kapitelbild einhängen:** Datei nach `src/assets/bilder/kapitel/` legen (Querformat, so gross wie vorhanden), im Kapitel `"bild": "<Dateiname ohne Endung>"` und `"bildAlt": "<die Szene in einem Satz>"` eintragen. Ohne Bild trägt das Kapitel seine Farbe (`feld`) und seine Nummer.

**Felder:** `tinte`, `nacht`, `rot`, `burgund`, `blau`, `oliv`, `ocker`. **Stand:** `Konzept`, `Experiment`, `In Arbeit`, `Live`. Kein Kapitel behauptet mehr, als es ist.

Der Bau prüft die Angaben. Er bricht ab, wenn ein Pflichtfeld fehlt, ein Bild keinen Alt-Text hat oder ein Titel mit Punkt endet.

`projekte.json` und `texte.json` tragen `freigegeben`. Solange dort `false` steht, sind die Texte Entwürfe. Auf der Testadresse werden sie geduldet. Mit `SITE_STUFE=live` bricht der Bau ab, bis alles freigegeben ist und Adresse und Mail in `studio.json` stehen.

## Aufbau

```
inhalt/         Inhalte (siehe oben)
src/assets/     Bilder, Schriften, Zeichen
src/stile/      Token, Grundstile, Startseite (ausstellung.css), Unterseiten (blatt.css)
src/skripte/    Kapitel im Bild, Faden, Pfeiltasten
src/layouts/    Seitengerüst mit Kopfangaben und strukturierten Daten
src/components/ Kopf, Fuss, Wortmarke
src/pages/      Startseite, Projektseiten, Recht, robots.txt, llms.txt
src/inhalt/     Einlesen und Prüfen der Inhalte
pruefungen/     Prüfungen vor jeder Veröffentlichung
werkzeuge/      Hilfen, die nur bei Bedarf laufen (Vorschaubild und Favicon: npm run markenbilder)
docs/           Entscheide und offene Punkte
```

## Prüfungen

| Befehl | Prüft |
| --- | --- |
| `pruefen:html` | Gültiges HTML |
| `pruefen:gate` | Kopfangaben, eine `h1`, Überschriftenfolge, Alt-Texte, Bildmasse, tote Verweise, Schreibweise, strukturierte Daten, Sitemap |
| `pruefen:kontrast` | Farbpaare aus `pruefungen/kontrast.json` gegen ihre Schwelle |
| `pruefen:vermerke` | Dateien, gebaute Seite und Commit-Texte auf Werkzeug-Vermerke |
| `pruefen:abhaengigkeiten` | Bekannte Sicherheitslücken, mit begründeten und befristeten Ausnahmen |
| `pruefen:browser` | Fünf Bildschirmbreiten in Chrome: kein Überlauf, keine Fehler, keine Abrufe nach aussen, WCAG 2.2 AA, Tastatur und Fokus. Dazu die Startseite (jedes Kapitel passt in den Schirm, die Pfeiltaste führt ein Kapitel weiter) und jede Seite ohne JavaScript |
| `pruefen:ladezeit` | Startseite wie auf einem mittleren Handy: grösstes Element unter 2,5 s, Layoutsprung unter 0,1, Gewicht unter 1 MB |

Hausregeln im Gate: kein ß, keine Gedankenstriche ausser in den Namen «briv—io» und «a—real», Guillemets statt gerader Anführungszeichen, keine Platzhalter, Titel ohne Punkt am Schluss.

## Veröffentlichung

Jeder Push auf `main` baut, prüft und veröffentlicht (`.github/workflows/seite.yml`). Schlägt eine Prüfung fehl, bleibt die bisherige Fassung online.

Einmalig in den Einstellungen des Repositorys:

1. **Pages**: unter «Build and deployment» als Quelle «GitHub Actions» wählen.
2. **Branches**: `main` schützen, Änderungen nur über Pull Request mit bestandener Prüfung «Bauen und prüfen».
3. **Security**: Dependabot-Meldungen und Sicherheitsupdates einschalten.

Drei Variablen (Settings, Variables, Actions) steuern die Adresse. Ohne sie läuft die Testadresse.

| Variable | Testadresse (Voreinstellung) | Auf der richtigen Adresse |
| --- | --- | --- |
| `SITE_ADRESSE` | `https://<konto>.github.io` | `https://www.nicolasbrivio.ch` |
| `SITE_PFAD` | `/briv-io` | `/` |
| `SITE_STUFE` | `test` | `live` |

In der Stufe `test` sperren `robots.txt` und die Seiten selbst alle Suchmaschinen.

**Domain aufschalten:** in den Pages-Einstellungen `www.nicolasbrivio.ch` als eigene Domain eintragen, beim Anbieter der Domain `www` als CNAME auf `<konto>.github.io` legen und die Hauptdomain mit den vier A-Einträgen von GitHub Pages versehen, damit sie auf `www` weiterleitet. Danach «Enforce HTTPS» einschalten und die drei Variablen umstellen.

## Sicherheit

- Keine Tracker, keine fremden Skripte, keine fremden Schriften, keine Cookies, kein Formular. Die Seite überträgt nichts.
- Content Security Policy als Meta-Angabe mit Prüfsummen, Grundregel `default-src 'none'`. GitHub Pages erlaubt keine eigenen Server-Kopfzeilen.
- Das Repository ist öffentlich. Arbeitsunterlagen bleiben lokal, siehe `.gitignore`.
- Bewegung läuft nur mit Skript und nur, wenn keine reduzierte Bewegung gewünscht ist. Ohne beides steht jedes Kapitel ruhig da.
- Abhängigkeiten mit festen Versionen und Sperrdatei, Einrichtung ohne Installationsskripte, wöchentliche Aktualisierungsvorschläge.
- Workflow-Schritte sind auf Commit-Kennungen festgelegt, Rechte je Job auf das Nötige beschränkt.
