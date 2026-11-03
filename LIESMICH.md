# Lernnuggets – Prototyp 0.2

Webbasierter Lern-Prototyp (Handlungsplan Nr. 13–16) im Stil von Erklärvideos:
eigene After-Effects-Animationen, Sprecher, Untertitel, Quiz. Läuft komplett im Browser über
**GitHub Pages**. Auf dem Firmenlaptop muss nichts installiert und kein Befehl ausgeführt werden.

- **Lernplattform:** `index.html` – Suche, Kategorien, Erklär-Player, Quiz
- **Studio:** `studio.html` – Inhalte bearbeiten, eigene Animationen zuordnen, Vorschau, Veröffentlichen
- **Sprecher:** werden automatisch von GitHub erzeugt (Test: Piper, kostenlos · später: Azure AI Speech)

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
   Nach 2–3 Minuten ist die Seite online unter `https://<dein-github-name>.github.io/lernnuggets/`
   (Studio: `…/lernnuggets/studio.html`).

> **Wichtig:** Die Seite ist öffentlich erreichbar. Laut Handlungsplan (Nr. 5) nur **neutrale Demo-Inhalte** verwenden –
> keine internen Inhalte, kein Firmenlogo – bis Hosting und Markenauftritt intern freigegeben sind.

## 2. Eigene Animationen einbinden

**Format:** In Adobe Media Encoder als **H.264** ausgeben, Container **.mov oder .mp4** – beides läuft in Edge und Chrome.
ProRes- oder Animation-Codec-MOVs (typische AE-Master mit Transparenz) kann **kein** Browser außer Safari abspielen –
das Studio erkennt solche Dateien und markiert sie rot.

| Einstellung | Empfehlung |
|---|---|
| Hintergrund | Weiß (die Bühne ist weiß, Transparenz nicht nötig) |
| Auflösung | 1280×720 oder 1920×1080 (jedes Seitenverhältnis wird eingepasst) |
| Bildrate | 30 fps fürs Web (60-fps-Master im Archiv lassen) |
| Bitrate | ca. 2–4 Mbit/s, **ohne Tonspur** |
| Länge | 3, 5 oder 10 s – egal, der Player richtet sich nach der Datei |
| Dateiname | `motiv_variante_laenge.mov`, z. B. `mail_slide-links_5s.mov` |
| Größe | max. **25 MB** pro Datei (Grenze für Uploads über die GitHub-Weboberfläche) |

Tipp: Mit einem **überwachten Ordner** in Media Encoder laufen die Exporte über Nacht automatisch.

**Ablauf im Studio:**
1. `studio.html` öffnen → rechts **„Dateien wählen …“** oder Dateien in das Feld ziehen.
   Die Videos werden nur im Browser geladen und sofort geprüft (Länge, Auflösung, abspielbar ja/nein).
2. Pro Szene unter **„Animation“** die Datei auswählen. Szene anklicken = Video abspielen.
3. **„Vorschau öffnen“** zeigt die komplette Lernplattform mit deinen Änderungen – nur in deinem Browser.
4. **„Veröffentlichen …“** führt durch die Schritte: `inhalte.js` herunterladen, im Repository in den Ordner `data`
   hochladen, neue Videos in den Ordner `media` hochladen. Die Links dorthin stehen im Dialog.

**Timing:** Eine Szene läuft so lange, bis **Sprecher und Animation** fertig sind. Ein 10-s-Video mit 6 s Sprechertext
läuft also 10 s; ein 3-s-Video mit 7 s Text bleibt nach der Animation auf dem letzten Frame stehen.

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
| `media/` | eigene Animationen |
| `audio/` | Sprecherdateien (automatisch) |
| `assets/` | Gestaltung und Logik; CI-Farben oben in `style.css` |
| `tools/tts.py` | Sprecher-Skript (wird vom Workflow aufgerufen) |
| `.github/workflows/veroeffentlichen.yml` | Sprecher erzeugen + Seite veröffentlichen |
