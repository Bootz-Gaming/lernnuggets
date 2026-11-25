# Lernnuggets auf dem eigenen Server

Adresse: **https://lernnuggets.bootz.digital** · Dienst `lernnuggets` · Port 8780 (nur intern, Caddy davor)

| Was | Wo |
|---|---|
| Programm (aus GitHub, nur lesbar) | `/opt/lernnuggets/app` |
| Daten: Inhalte, Medien, Audio, Videos, Konten, Protokoll | `/var/lib/lernnuggets` |
| Einstellungen inkl. Azure-Schlüssel | `/etc/lernnuggets.env` (nur root) |

## Einrichten (einmalig)

1. **DNS** (STRATO-Paket „Bootz Gaming“ → Domains → bootz.digital → Subdomain anlegen): `lernnuggets` mit A- und AAAA-Eintrag auf die IP des VPS, genau wie bei `studio.bootz.digital`.
2. **Per SSH als root** auf dem VPS:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/Bootz-Gaming/lernnuggets/main/server/install.sh | bash
   ```
   Das Skript installiert ffmpeg, rsvg-convert und Pillow, legt Nutzer, Ordner, Dienst und den Caddy-Eintrag an
   und zeigt am Ende das **Einmal-Passwort** für das Admin-Konto `vincent`.
3. **Azure-Schlüssel eintragen:** `nano /etc/lernnuggets.env` → `AZURE_SPEECH_KEY=…` → `systemctl restart lernnuggets`
4. https://lernnuggets.bootz.digital öffnen, mit `vincent` und dem Einmal-Passwort anmelden, eigenes Passwort festlegen.

Beim ersten Start übernimmt der Server Inhalte, Grafiken und Sprecherdateien aus dem Repository und baut danach die MP4-Downloads
(Fortschritt: Studio → „Veröffentlichen …“ oder `journalctl -u lernnuggets -f`).

## Rollen

| | Anwender | Support | Admin |
|---|:-:|:-:|:-:|
| Lernnuggets ansehen | ✓ | ✓ | ✓ |
| Anwender-Konten anlegen, sperren, Passwort zurücksetzen | | ✓ | ✓ |
| Inhalte im Studio bearbeiten, Medien hochladen | | ✓ | ✓ |
| Veröffentlichen, neu vertonen | | | ✓ |
| Support- und Admin-Konten, Rollen ändern, Konten löschen, Protokoll | | | ✓ |

- Neue Konten bekommen ein **Einmal-Passwort**; beim ersten Anmelden wird ein eigenes gewählt (mind. 10 Zeichen).
- Nach 8 Fehlversuchen in 15 Minuten wird die Anmeldung für diesen Namen bzw. diese IP kurz gesperrt.
- **Öffentlich teilen:** Im Studio beim Lernnugget „Öffentlich teilbar“ anhaken und veröffentlichen.
  Dann ist es unter `https://lernnuggets.bootz.digital/teilen/<id>` ohne Anmeldung sichtbar – nur dieses eine Lernnugget mit seinen Dateien.

## Studio auf dem Server

- Alle mit Studio-Zugang arbeiten an **einem gemeinsamen Entwurf**, der automatisch gespeichert wird.
  Ändern zwei Personen gleichzeitig, bekommt die zweite einen Hinweis und lädt neu, statt etwas zu überschreiben.
- Medien werden direkt hochgeladen (bis 300 MB pro Datei).
- **Veröffentlichen** (nur Admin): Inhalte gehen live, die vorherige Fassung wird in `archiv/` aufgehoben (die letzten 30),
  dann vertont der Server geänderte Szenen und baut die Videos neu.

## Pflege

| Aufgabe | Befehl |
|---|---|
| Update aus GitHub | `bash /opt/lernnuggets/app/server/install.sh` |
| Status / Protokoll | `systemctl status lernnuggets` · `journalctl -u lernnuggets -f` |
| Passwort vergessen (auch Admin) | `sudo -u lernnuggets env LERN_DATEN=/var/lib/lernnuggets node /opt/lernnuggets/app/server/server.js passwort-neu vincent` |
| Weiteren Admin anlegen | wie oben, mit `admin-anlegen <name> "<Anzeigename>"` (oder in der Kontoverwaltung) |
| Sicherung | Ordner `/var/lib/lernnuggets` sichern (z. B. in die Nextcloud) |
| Frühere Inhalte zurückholen | Datei aus `/var/lib/lernnuggets/archiv/` nach `data/inhalte.js` kopieren, `systemctl restart lernnuggets` |

## Sicherheit

- Passwörter nur als scrypt-Hash, Sitzungen als HttpOnly-/Secure-Cookie (SameSite=Lax), ändernde Anfragen nur von der eigenen Adresse.
- Kein npm-Paket, keine externen Verbindungen der Seite; der Server ruft nur Azure für die Sprachausgabe auf.
- Hochgeladene SVGs werden mit Sandbox-Header ausgeliefert, damit darin versteckte Skripte nie ausgeführt werden.
- Dienst läuft als eigener Nutzer, darf nur in `/var/lib/lernnuggets` schreiben.
- **Hinweis NETINERA:** Echte Firmeninhalte oder Konten von Kolleginnen und Kollegen auf einem privaten Server nur nach Freigabe durch IT und Datenschutz.
  Für Demo-Inhalte und private Nutzung ist der Server unbedenklich.
