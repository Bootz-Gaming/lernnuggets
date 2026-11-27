# Lernnuggets – Prototyp 0.8

Lernplattform im Stil von Erklärvideos: Grafiken mit Animation oder eigene Videos, Sprecher, Untertitel, Quiz und
MP4-Download. Läuft ausschließlich auf dem eigenen Server unter **https://lernnuggets.bootz.digital**.
Einrichtung, Updates und Pflege: [`server/LIESMICH-SERVER.md`](server/LIESMICH-SERVER.md).

- **Lernplattform** – Suche, Kategorien, Erklär-Player, Quiz, MP4-Download (alle angemeldeten Konten)
- **Studio** – Lernnuggets erstellen und bearbeiten, Medien hochladen, Vorschau, Freigabe und Veröffentlichen
- **Konten** – Admin, Support, Anwender; einzelne Lernnuggets öffentlich per Link teilbar

## Rollen und Ablauf

1. **Anwender** erstellen im Studio eigene Lernnuggets. Sie sehen dort nur ihre eigenen; alles wird automatisch gespeichert.
2. Ist ein Lernnugget fertig: oben **„Zur Freigabe einreichen“**.
3. Ein **Admin** sieht im Studio „von …, zur Freigabe eingereicht“ bzw. „in Arbeit“ und klickt **„Veröffentlichen …“**.
   Live gehen alle Änderungen von Admin und Support sowie eingereichte Lernnuggets. Was noch in Arbeit ist, bleibt im Entwurf;
   bei bereits veröffentlichten Lernnuggets bleibt bis zur nächsten Freigabe die bisherige Fassung online.
4. Der Server vertont geänderte Szenen und baut die MP4-Downloads neu.

**Support** betreut die Anwender-Konten und kann alle Inhalte bearbeiten, aber nicht veröffentlichen.
Arbeiten mehrere Personen gleichzeitig im Studio, führt der Server die Änderungen pro Lernnugget zusammen; nur wenn zwei
dasselbe Lernnugget gleichzeitig ändern, kommt ein Hinweis zum Neuladen.

## Grafiken, Animationen und Hintergründe

Pro Szene eine Grafik wählen und die Animation einstellen: Slide von links, von rechts, von unten, Pop-up, Zoom, Fade-in.
Optional eine **Mindestdauer** (3, 5, 10 s oder eigene Angabe), sonst richtet sich die Szene nach dem Sprecher.

| Format | Hinweis |
|---|---|
| **SVG** (empfohlen) | winzig und in jeder Größe scharf |
| **PNG mit Transparenz** | ca. 1600 px breit, aus Illustrator oder After Effects |
| **Vollbild-Grafik** | fertige Erklärgrafik 1920×1080 mit eigenem Titel (Darstellung „Vollbild“) |
| **Fertiges Video** | H.264 als .mov/.mp4 (ProRes läuft im Browser nicht) |

**Mehrere Grafiken pro Szene:** Unter „Weitere Grafiken“ bis zu drei zusätzliche Grafiken oder Icons mit eigener Animation
hinzufügen. Jede erscheint neben der ersten, sobald der Sprecher das eingetragene Wort sagt (z. B. „Passwort“); ohne Wort
werden sie gleichmäßig über die Szene verteilt. Gilt im Player, in der Studio-Vorschau und im MP4-Export. Nicht bei
Videos und Vollbild-Grafiken.

**Hintergrund** auf drei Ebenen: Standard der Plattform (Einstellungen) → Lernnugget → Szene, jeweils als Farbe oder Bild
(JPG/PNG, ideal 1920×1080). Stichwörter werden automatisch lesbar dargestellt.

## Sprecher

Der Server vertont nach jedem Veröffentlichen alle Szenen mit neuem oder geändertem Text (`audio/<id>-<szene>.mp3`).
Sprachausgabe: **Azure AI Speech** (Schlüssel in `/etc/lernnuggets.env`), alternativ Piper.

| Stimme | Charakter |
|---|---|
| Florian, Seraphina | männlich bzw. weiblich, sehr natürlich (Azure „Multilingual“), nur mit Azure |
| Thorsten (Standard) → Azure: Conrad | männlich, klar |
| Thorsten – ruhig / freundlich / überrascht | Piper mit Emotion; unter Azure ebenfalls Conrad |
| Cori (Standard Englisch) → Azure: Sonia | weiblich, britisches Englisch |
| Ryan → Azure: Guy | männlich, US-Englisch |
| Alan → Azure: Ryan (GB) | männlich, britisches Englisch |

**Denglisch:** Englische Begriffe in deutschen Texten (Phishing, Meeting, Update …) stehen in einer Aussprache-Liste
(Standard: `assets/aussprache.js`, eigene Einträge im Studio unter Einstellungen → „Aussprache englischer Begriffe“).
Florian und Seraphina sprechen diese Wörter englisch aus (Sprachwechsel im Satz), alle anderen Stimmen lesen eine
Umschreibung in deutscher Schreibweise (z. B. „Fisching“). Mit „Anhören“ lässt sich jeder Satz sofort auf dem Server testen,
auch einzelne Szenen.

Stimme und Sprache (Deutsch/Englisch) werden pro Lernnugget gewählt, die Stimme zusätzlich pro Szene. Im Studio gibt es zu
jeder Stimme eine Hörprobe. Für die Aussprache kann pro Szene ein abweichender Sprechtext gesetzt werden
(z. B. „eins, eins, zwei“ statt „112“).

## MP4-Downloads
Pro Lernnugget ein Video (1920×1080, H.264/AAC) mit denselben Grafiken, Animationen, Hintergründen und Sprechern wie im Player.
Untertitel als zuschaltbare Spur und zusätzlich als `.srt`.

## Datenschutz
- Keine externen Schriften, CDNs oder Tracking (Content-Security-Policy); einziges Cookie ist die Anmeldung.
- Azure verarbeitet nur die Sprechertexte in der gewählten EU-Region; Sprechertexte enthalten keine personenbezogenen Daten.
- Echte NETINERA-Inhalte oder Konten von Kolleginnen und Kollegen nur nach Freigabe durch IT und Datenschutz.

## Ordner
| Pfad | Inhalt |
|---|---|
| `server/` | Server (`server.js`), Installation (`install.sh`), systemd-Dienst, Caddy-Block, Anleitung |
| `index.html`, `studio.html` | Lernplattform, Studio |
| `anmelden.html`, `konto.html`, `verwaltung.html` | Anmeldung, eigenes Konto, Kontoverwaltung |
| `assets/` | Gestaltung und Logik; CI-Farben oben in `style.css`; Stimmenkatalog `stimmen.js` |
| `tools/tts.py`, `tools/video.py` | Vertonung und MP4-Bau (ruft der Server auf) |
| `data/`, `media/`, `audio/` | Startinhalte; auf dem Server liegen die aktuellen Daten in `/var/lib/lernnuggets` |
