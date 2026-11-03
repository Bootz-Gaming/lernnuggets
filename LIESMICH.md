# Lernnuggets – Prototyp 0.3

Webbasierter Lern-Prototyp (Handlungsplan Nr. 13–16) im Stil von Erklärvideos:
eigene After-Effects-Animationen, Sprecher, Untertitel, Quiz. Läuft komplett im Browser über
**GitHub Pages**. Auf dem Firmenlaptop muss nichts installiert und kein Befehl ausgeführt werden.

- **Lernplattform:** `index.html` – Suche, Kategorien, Erklär-Player, Quiz
- **Studio:** `studio.html` – Inhalte bearbeiten, Grafiken und Hintergründe zuordnen, Vorschau, Veröffentlichen
- **Sprecher:** werden automatisch von GitHub erzeugt (Test: Piper, kostenlos · später: Azure AI Speech)
- **MP4-Downloads:** GitHub baut pro Lernnugget ein fertiges Video mit Sprecher und zuschaltbaren Untertiteln

---

## 1. Einmalig einrichten (nur Browser, ca. 10 Minuten)

1. Auf github.com anmelden → oben rechts **＋** → **New repository**
   Name z. B. `lernnuggets`, **Public** (GitHub Pages ist im Gratis-Tarif nur für öffentliche Repositories verfügbar), **Create repository**.
2. Auf der leeren Repository-Seite **„uploading an existing file“** anklicken.
3. Den **Inhalt** des entpackten Ordners `lernnuggets-prototyp` (nicht den Ordner selbst) in das Browserfenster ziehen
   – inklusive des Ordners `.github`. → **Commit changes**.
   *Falls `.github` nicht mit hochgeladen wird (versteckter Ordner):* **Add file → Create new file**, als Namen
   `.github/workflows/veroeffentlichen.yml` eintippen, Inhalt der gleichnamigen Datei hineinkopieren, **Commit changes**.
4. **Settings → Pages → Build and deployment → Source: „GitHub Actions“** auswählen.
5. **Actions**-Reiter öffnen → Workflow „Veröffentlichen“ → **Run workflow**.
   Nach 3–5 Minuten ist die Seite online unter `https://<dein-github-name>.github.io/lernnuggets/`
   (Studio: `…/lernnuggets/studio.html`).

> **Wichtig:** Die Seite ist öffentlich erreichbar. Laut Handlungsplan (Nr. 5) nur **neutrale Demo-Inhalte** verwenden –
> keine internen Inhalte, kein Firmenlogo – bis Hosting und Markenauftritt intern freigegeben sind.

## 2. Grafiken, Animationen und Hintergründe

**Empfohlen: Grafik + Animation aus dem Studio.** Pro Szene eine Grafik hochladen und im Studio die Animation wählen:
Slide von links, Slide von rechts, Slide von unten, Pop-up, Zoom, Fade-in. Dazu optional eine **Mindestdauer**
(3, 5, 10 s oder eigene Angabe) – sonst richtet sich die Szene nach dem Sprecher.

| Grafikformat | Hinweis |
|---|---|
| **SVG** (empfohlen) | z. B. direkt von unDraw; winzig und in jeder Größe scharf |
| **PNG mit Transparenz** | ca. 1600 px breit, aus Illustrator oder After Effects |

**Hintergrund** – drei Ebenen, die jeweils die darüberliegende ersetzen:
1. **Standard** für die ganze Plattform (Studio → „⚙ Einstellungen“)
2. **pro Lernnugget** (Bereich „Allgemein“)
3. **pro Szene** (in jeder Szene)

Jeweils als **Farbe** (Farbwähler oder Hex-Wert, z. B. `#eef4fa`) oder als **Bild** (JPG/PNG, idealerweise 1920×1080,
wird flächig eingepasst). Stichwörter werden automatisch lesbar dargestellt: weiß auf dunklen Farben, auf Bildern mit heller Plakette.

**Ablauf im Studio:**
1. Rechts unter „Medien“ Dateien wählen oder hineinziehen – sie werden nur im Browser geladen und geprüft.
2. Pro Szene unter **„Bildinhalt“** die Grafik wählen, Animation und ggf. Mindestdauer einstellen. Vorschau anklicken = Animation abspielen.
3. Hintergründe setzen (Standard / Lernnugget / Szene).
4. **„Vorschau öffnen“** zeigt die komplette Plattform mit deinen Änderungen – nur in deinem Browser.
5. **„Veröffentlichen …“** führt durch die Schritte: `inhalte.js` herunterladen und in den Ordner `data` hochladen,
   neue Dateien in den Ordner `media` hochladen. Die Links dorthin stehen im Dialog.

**Fertige Videos** (aus AE) gehen weiterhin als Sonderfall: im Bildinhalt unter „Fertige Videos“ wählen.
Format H.264 als .mov/.mp4 (ProRes läuft in keinem Browser außer Safari), max. 25 MB. Der gewählte Hintergrund ist
dann nur rund um das Video sichtbar.

## MP4-Downloads
Bei jeder Veröffentlichung baut GitHub für jedes **geänderte** Lernnugget ein Video (1920×1080, H.264/AAC):
gleiche Grafiken, Animationen, Hintergründe und Sprecher wie auf der Website. Die **Untertitel** sind als eigene Spur
eingebettet (im Player zuschaltbar) und zusätzlich als `.srt` herunterladbar. Auf der Detailseite erscheint dafür der
Button **„Video herunterladen (MP4)“**. Die Videos liegen nur in der veröffentlichten Seite, nicht im Repository.

## 3. Sprecher (Text-to-Speech)

Bei jeder Änderung an `data/inhalte.js` vertont der Workflow automatisch alle Szenen mit neuem oder geändertem Text
und legt sie als `audio/<id>-<szene>.mp3` ab. Unveränderte Szenen werden nicht neu erzeugt.

**Test (aktiv): Piper** – Stimme „Thorsten“ (Deutsch), läuft im GitHub-Runner, kostenlos, keine Anmeldung bei
einem Sprachdienst. Die mitgelieferten Testdateien sind in einfacher Qualität vorab erzeugt; der erste Lauf auf
GitHub ersetzt sie automatisch durch die höhere Qualitätsstufe.

**Ziel: Azure AI Speech** (nach Freigabe durch IT/Datenschutz):
1. Im Azure-Portal eine Speech-Ressource in der Region **Germany West Central** anlegen, Schlüssel kopieren.
2. Im Repository: **Settings → Secrets and variables → Actions**
   - Reiter *Secrets*: `AZURE_SPEECH_KEY` = Schlüssel
   - Reiter *Variables*: `TTS_ENGINE` = `azure` (optional `AZURE_SPEECH_REGION`, `AZURE_VOICE`, Standard `de-DE-KatjaNeural`)
3. **Actions → Veröffentlichen → Run workflow**, Engine „azure“, Haken bei „Alle Szenen neu vertonen“.

Für die Aussprache kann im Studio pro Szene ein abweichender Sprechtext gesetzt werden (z. B. „eins, eins, zwei“).
Ohne Audiodatei nutzt der Player eine lokal installierte Windows-Stimme als Vorschau oder zeigt nur Untertitel.

## Datenschutz im Überblick
- Lernplattform: keine Anmeldung, kein Tracking, keine Cookies, keine externen Schriften/CDNs (Content-Security-Policy).
- Studio: Videos werden nur lokal im Browser geladen; einzige externe Abfrage ist die öffentliche GitHub-API,
  um die Dateinamen im Ordner `media/` aufzulisten. Entwürfe liegen nur im Browser (localStorage).
- Sprecher-Erzeugung: Piper läuft auf GitHub-Servern; Azure verarbeitet die Sprechertexte in der gewählten EU-Region.
  Sprechertexte enthalten keine personenbezogenen Daten.

## Ordner
| Pfad | Inhalt |
|---|---|
| `data/inhalte.js` | alle Inhalte (wird vom Studio erzeugt) |
| `media/` | Grafiken, Hintergrundbilder, ggf. Videos |
| `downloads/` | MP4- und SRT-Dateien (werden automatisch erzeugt, nicht im Repository) |
| `audio/` | Sprecherdateien (automatisch) |
| `assets/` | Gestaltung und Logik; CI-Farben oben in `style.css` |
| `tools/tts.py` | Sprecher-Skript (wird vom Workflow aufgerufen) |
| `tools/video.py` | baut die MP4-Downloads (wird vom Workflow aufgerufen) |
| `assets/platzhalter/` | Platzhalter-Icons als SVG (für den Videobau) |
| `.github/workflows/veroeffentlichen.yml` | Sprecher erzeugen + Seite veröffentlichen |
