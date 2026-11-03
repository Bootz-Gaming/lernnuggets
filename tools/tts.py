#!/usr/bin/env python3
"""
Sprecherdateien für alle Szenen erzeugen. Läuft automatisch als GitHub Action
(.github/workflows/sprecher.yml) – lokal muss nichts installiert werden.

Zwei Engines, gleiche Ausgabe (audio/<nugget-id>-<szene>.mp3):
  piper  – Test: offline-Sprachmodell, läuft im GitHub-Runner, kostenlos
  azure  – Ziel: Azure AI Speech (Region z. B. germanywestcentral), Schlüssel als GitHub-Secret

Es werden nur Szenen neu vertont, deren Text, Engine oder Stimme sich geändert hat
(Abgleich über audio/_index.json). Nicht mehr verwendete Dateien werden entfernt.
Nur Python-Standardbibliothek + ffmpeg (im Runner vorinstalliert).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
INDEX = AUDIO / "_index.json"


def load_data():
    raw = (ROOT / "data" / "inhalte.js").read_text(encoding="utf-8")
    return json.loads(raw.split("=", 1)[1].strip().rstrip(";"))


def to_mp3(wav, mp3):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                    "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", str(mp3)], check=True)


def synth_piper(text, mp3, args):
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        subprocess.run([args.piper, "--model", args.stimme, "--output_file", str(wav),
                        "--length_scale", str(args.tempo), "--sentence_silence", "0.25"],
                       input=text.encode("utf-8"), check=True, capture_output=True)
        to_mp3(wav, mp3)


def synth_azure(text, mp3, args):
    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION", "germanywestcentral")
    if not key:
        sys.exit("AZURE_SPEECH_KEY fehlt (GitHub: Settings > Secrets and variables > Actions).")
    rate = f"{round((1 / args.tempo - 1) * 100):+d}%"
    ssml = (f'<speak version="1.0" xml:lang="de-DE"><voice name="{escape(args.stimme)}">'
            f'<prosody rate="{rate}">{escape(text)}</prosody></voice></speak>')
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"), method="POST",
        headers={"Ocp-Apim-Subscription-Key": key,
                 "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
                 "User-Agent": "lernnuggets-prototyp"})
    with urllib.request.urlopen(req, timeout=60) as r:
        mp3.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["piper", "azure"], default="piper")
    ap.add_argument("--stimme", required=True, help="piper: Pfad zur .onnx | azure: z. B. de-DE-KatjaNeural")
    ap.add_argument("--piper", default="piper", help="Pfad zum Piper-Programm")
    ap.add_argument("--tempo", type=float, default=1.05, help=">1 = langsamer")
    ap.add_argument("--alles", action="store_true", help="alles neu vertonen")
    args = ap.parse_args()

    AUDIO.mkdir(exist_ok=True)
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    voice_id = f"{args.engine}:{Path(args.stimme).stem}:{args.tempo}"
    synth = synth_piper if args.engine == "piper" else synth_azure
    wanted, made = set(), 0

    for n in load_data()["nuggets"]:
        for i, sc in enumerate(n["szenen"], start=1):
            name = f"{n['id']}-{i}.mp3"
            wanted.add(name)
            text = (sc.get("sprechtext") or sc["text"]).strip()
            h = hashlib.sha1(f"{voice_id}|{text}".encode("utf-8")).hexdigest()[:12]
            out = AUDIO / name
            if not args.alles and out.exists() and index.get(name) == h:
                continue
            print(f"  {name}: {text[:70]}")
            synth(text, out, args)
            index[name] = h
            made += 1

    removed = 0
    for f in AUDIO.glob("*.mp3"):
        if f.name not in wanted:
            f.unlink(); index.pop(f.name, None); removed += 1
    index = {k: v for k, v in sorted(index.items()) if k in wanted}
    INDEX.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    print(f"Fertig: {made} neu vertont, {removed} entfernt ({voice_id}).")


if __name__ == "__main__":
    main()
