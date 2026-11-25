#!/usr/bin/env bash
# Lernnuggets auf dem eigenen Server einrichten oder aktualisieren (Ubuntu 24.04, als root ausführen).
#
#   1. lernnuggets.zip per WinSCP nach /root hochladen
#   2. cd /root && rm -rf lernnuggets-paket && python3 -m zipfile -e lernnuggets.zip lernnuggets-paket && bash lernnuggets-paket/server/install.sh
#
# Erstes Mal und Update funktionieren gleich. Daten in /var/lib/lernnuggets bleiben bei Updates unberührt.
#
# Legt an: Systemnutzer "lernnuggets", Programm in /opt/lernnuggets/app, Daten in /var/lib/lernnuggets,
# Einstellungen in /etc/lernnuggets.env, systemd-Dienst "lernnuggets", Caddy-Eintrag für die Domain.
set -euo pipefail

DOMAIN="${DOMAIN:-lernnuggets.bootz.digital}"
PORT="${PORT:-8780}"
QUELLE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP=/opt/lernnuggets/app
DATEN=/var/lib/lernnuggets
ENVDATEI=/etc/lernnuggets.env
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
ADMIN="${ADMIN:-vincent}"
ADMIN_NAME="${ADMIN_NAME:-Vincent Stöckl}"

[ "$(id -u)" = 0 ] || { echo "Bitte als root ausführen."; exit 1; }
schritt() { printf '\n== %s\n' "$*"; }

[ -f "$QUELLE/server/server.js" ] || { echo "server.js nicht gefunden – bitte das Skript aus dem entpackten Paket starten."; exit 1; }

schritt "Pakete (ffmpeg, rsvg-convert, Schrift, Pillow)"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg librsvg2-bin fonts-dejavu-core python3-pil >/dev/null
command -v node >/dev/null || { echo "Node.js fehlt (ab Version 20 nötig)."; exit 1; }
NODEV=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODEV" -ge 20 ] || { echo "Node.js $NODEV ist zu alt, ab 20 nötig."; exit 1; }
NODE=$(command -v node)

schritt "Systemnutzer und Ordner"
id lernnuggets >/dev/null 2>&1 || useradd --system --home-dir /opt/lernnuggets --shell /usr/sbin/nologin lernnuggets
mkdir -p /opt/lernnuggets "$DATEN"
chown lernnuggets:lernnuggets "$DATEN"; chmod 750 "$DATEN"

schritt "Programm nach $APP kopieren"
if [ "$QUELLE" != "$APP" ]; then
  rm -rf "$APP.neu"
  cp -a "$QUELLE" "$APP.neu"
  rm -rf "$APP.alt"
  [ -d "$APP" ] && mv "$APP" "$APP.alt"
  mv "$APP.neu" "$APP"
fi
chown -R root:root "$APP"; chmod -R a+rX "$APP"
echo "Stand: $(cat "$APP/VERSION" 2>/dev/null || echo unbekannt)  (vorherige Fassung: $APP.alt)"

schritt "Einstellungen ($ENVDATEI)"
if [ ! -f "$ENVDATEI" ]; then
  cat > "$ENVDATEI" <<EOT
# Lernnuggets – Einstellungen. Nach Änderungen: systemctl restart lernnuggets
PORT=$PORT
HOST=127.0.0.1
LERN_DATEN=$DATEN
# Sprachausgabe: azure (empfohlen) oder piper
TTS_ENGINE=azure
# Azure AI Speech: Schlüssel 1 aus dem Azure-Portal (Speech-Ressource > Schlüssel und Endpunkt)
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=swedencentral
# Abmeldung nach so vielen Stunden ohne Aktivität
SITZUNG_STUNDEN=10
MAX_UPLOAD_MB=300
EOT
  echo "Neu angelegt. Azure-Schlüssel eintragen:  nano $ENVDATEI"
fi
chown root:root "$ENVDATEI"; chmod 600 "$ENVDATEI"

schritt "systemd-Dienst"
sed "s#__NODE__#$NODE#g" "$APP/server/lernnuggets.service" > /etc/systemd/system/lernnuggets.service
systemctl daemon-reload
systemctl enable -q lernnuggets

schritt "Admin-Konto"
if ! grep -q '"rolle": "admin"' "$DATEN/konten.json" 2>/dev/null; then
  sudo -u lernnuggets env LERN_DATEN="$DATEN" "$NODE" "$APP/server/server.js" admin-anlegen "$ADMIN" "$ADMIN_NAME"
  echo ">> Einmal-Passwort jetzt notieren. Beim ersten Anmelden wird ein eigenes Passwort festgelegt."
else
  echo "Admin vorhanden."
fi

schritt "Dienst starten"
systemctl restart lernnuggets
sleep 2
systemctl is-active --quiet lernnuggets && echo "lernnuggets läuft (Port $PORT)." || { journalctl -u lernnuggets -n 30 --no-pager; exit 1; }

schritt "Caddy ($DOMAIN)"
if [ -f "$CADDYFILE" ]; then
  if grep -q "^$DOMAIN" "$CADDYFILE"; then
    echo "Eintrag für $DOMAIN ist schon vorhanden."
  else
    cp "$CADDYFILE" "$CADDYFILE.vor-lernnuggets.$(date +%Y%m%d%H%M)"
    printf '\n' >> "$CADDYFILE"
    sed "s#__DOMAIN__#$DOMAIN#; s#__PORT__#$PORT#" "$APP/server/Caddyfile.beispiel" >> "$CADDYFILE"
    caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null && systemctl reload caddy && echo "Caddy neu geladen." \
      || { echo "Caddy-Konfiguration fehlerhaft – Sicherung liegt neben $CADDYFILE"; exit 1; }
  fi
else
  echo "Kein $CADDYFILE gefunden – Block aus $APP/server/Caddyfile.beispiel von Hand eintragen."
fi

echo
echo "Fertig: https://$DOMAIN"
echo "Protokoll:  journalctl -u lernnuggets -f"
