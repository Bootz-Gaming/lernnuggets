#!/usr/bin/env python3
"""
Sprecherdateien für alle Szenen erzeugen. Läuft automatisch im GitHub-Workflow
(.github/workflows/veroeffentlichen.yml) – lokal muss nichts installiert werden.

Ausgabe: audio/<nugget-id>-<szene>.mp3, dazu Hörproben audio/stimmen/<stimme>.mp3
und audio/stimmen/index.js (Lizenz und Qualität je Stimme fürs Studio).

Stimme je Szene: Szene → Lernnugget → Plattform-Standard (meta.stimme) → Katalog-Standard.
Der Stimmenkatalog steht in assets/stimmen.js.

Engines:
  piper  – kostenlos, läuft im GitHub-Runner; benötigte Stimmen werden automatisch geladen
  azure  – Azure AI Speech; pro Katalog-Stimme ist eine passende Azure-Stimme hinterlegt
           (Feld "azure"), Schlüssel als GitHub-Secret AZURE_SPEECH_KEY

Es werden nur Szenen neu vertont, deren Text, Engine, Stimme oder Tempo sich geändert hat
(Abgleich über audio/_index.json). Nicht mehr verwendete Dateien werden entfernt.
Nur Python-Standardbibliothek + ffmpeg.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
PROBEN = AUDIO / "stimmen"
INDEX = AUDIO / "_index.json"
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


def load_js(path):
    raw = path.read_text(encoding="utf-8")
    return json.loads(raw.split("=", 1)[1].strip().rstrip(";"))


def to_mp3(wav, mp3):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                    "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", str(mp3)], check=True)


# ---------- Piper: Stimmen nach Bedarf laden ----------
def model_path(modell, cache):
    """de_DE-thorsten_emotional-medium → lädt .onnx + .onnx.json (+ MODEL_CARD) einmalig."""
    lang, name, quality = modell.split("-", 2)
    base = f"{HF}/{lang.split('_')[0]}/{lang}/{name}/{quality}"
    cache.mkdir(parents=True, exist_ok=True)
    onnx = cache / f"{modell}.onnx"
    for fname, target in ((f"{modell}.onnx", onnx), (f"{modell}.onnx.json", cache / f"{modell}.onnx.json"),
                          ("MODEL_CARD", cache / f"{modell}.MODEL_CARD")):
        if target.exists():
            continue
        try:
            print(f"  lade {fname} …")
            urllib.request.urlretrieve(f"{base}/{fname}", target)
        except Exception as e:
            if fname == "MODEL_CARD":
                target.write_text("")
            else:
                sys.exit(f"Stimme {modell} konnte nicht geladen werden: {e}")
    return onnx


def model_info(modell, cache):
    card = (cache / f"{modell}.MODEL_CARD")
    text = card.read_text(encoding="utf-8", errors="replace") if card.exists() else ""
    m = re.search(r"[Ll]icen[sc]e[^:\n]*:\s*(.+)", text)
    lizenz = m.group(1).strip().strip("*`[] ") if m else "unbekannt – Model Card prüfen"
    if lizenz.lower().startswith("see"):
        u = re.search(r"https?://\S+", text)
        lizenz = f"siehe {u.group(0).rstrip(')')}" if u else "siehe Model Card"
    if "by-nc" in lizenz.lower():
        lizenz = "CC BY-NC-SA 4.0 (nicht kommerziell)"
    return {"lizenz": lizenz[:120], "qualitaet": modell.rsplit("-", 1)[-1]}


def speaker_id(modell, sprecher, cache):
    if not sprecher:
        return None
    cfg = json.loads((cache / f"{modell}.onnx.json").read_text(encoding="utf-8"))
    ids = cfg.get("speaker_id_map") or {}
    if sprecher not in ids:
        sys.exit(f"Sprecher „{sprecher}“ gibt es in {modell} nicht (vorhanden: {', '.join(ids) or 'keine'}).")
    return ids[sprecher]


def synth_piper(text, mp3, stimme, args):
    onnx = model_path(stimme["modell"], args.cache)
    spk = speaker_id(stimme["modell"], stimme.get("sprecher"), args.cache)
    cmd = [args.piper, "--model", str(onnx), "--length_scale", str(args.tempo), "--sentence_silence", "0.25"]
    if spk is not None:
        cmd += ["--speaker", str(spk)]
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        subprocess.run(cmd + ["--output_file", str(wav)], input=text.encode("utf-8"), check=True, capture_output=True)
        to_mp3(wav, mp3)


def synth_azure(text, mp3, stimme, args):
    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION", "germanywestcentral")
    if not key:
        sys.exit("AZURE_SPEECH_KEY fehlt (GitHub: Settings > Secrets and variables > Actions).")
    voice = stimme.get("azure") or args.azure_stimme
    rate = f"{round((1 / args.tempo - 1) * 100):+d}%"
    ssml = (f'<speak version="1.0" xml:lang="de-DE"><voice name="{escape(voice)}">'
            f'<prosody rate="{rate}">{escape(text)}</prosody></voice></speak>')
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"), method="POST",
        headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "lernnuggets-prototyp"})
    with urllib.request.urlopen(req, timeout=60) as r:
        mp3.write_bytes(r.read())


def voice_key(stimme, args):
    """Kennung für den Abgleich. Für Thorsten (bisheriger Standard) identisch zur Vorversion → kein Neu-Vertonen."""
    if args.engine == "azure":
        return f"azure:{stimme.get('azure') or args.azure_stimme}:{args.tempo}"
    return f"piper:{stimme['modell']}{'#' + stimme['sprecher'] if stimme.get('sprecher') else ''}:{args.tempo}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["piper", "azure"], default="piper")
    ap.add_argument("--piper", default="piper", help="Pfad zum Piper-Programm")
    ap.add_argument("--cache", type=Path, default=Path("/tmp/piper/stimmen"), help="Ablage für geladene Stimmen")
    ap.add_argument("--azure-stimme", default="de-DE-KatjaNeural", help="Rückfall, wenn eine Stimme kein Azure-Feld hat")
    ap.add_argument("--tempo", type=float, default=1.05, help=">1 = langsamer")
    ap.add_argument("--alles", action="store_true", help="alles neu vertonen")
    ap.add_argument("--ohne-proben", action="store_true", help="keine Hörproben erzeugen")
    args = ap.parse_args()

    katalog = load_js(ROOT / "assets" / "stimmen.js")
    stimmen = {s["id"]: s for s in katalog["stimmen"]}
    default_id = katalog.get("standard", "thorsten")
    data = load_js(ROOT / "data" / "inhalte.js")
    meta_id = (data.get("meta") or {}).get("stimme")

    def resolve(n, sc):
        for sid in (sc.get("stimme"), n.get("stimme"), meta_id, default_id):
            if sid and sid in stimmen:
                return stimmen[sid]
            if sid:
                print(f"  Hinweis: Stimme „{sid}“ unbekannt – nutze nächste Ebene")
        return next(iter(stimmen.values()))

    AUDIO.mkdir(exist_ok=True)
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    synth = synth_piper if args.engine == "piper" else synth_azure
    wanted, made = set(), 0

    for n in data["nuggets"]:
        for i, sc in enumerate(n["szenen"], start=1):
            name = f"{n['id']}-{i}.mp3"
            wanted.add(name)
            text = (sc.get("sprechtext") or sc["text"]).strip()
            stimme = resolve(n, sc)
            h = hashlib.sha1(f"{voice_key(stimme, args)}|{text}".encode("utf-8")).hexdigest()[:12]
            out = AUDIO / name
            if not args.alles and out.exists() and index.get(name) == h:
                continue
            print(f"  {name} [{stimme['id']}]: {text[:60]}")
            synth(text, out, stimme, args)
            index[name] = h
            made += 1

    # Hörproben für das Studio (eine pro Katalog-Stimme)
    infos = {}
    if not args.ohne_proben:
        PROBEN.mkdir(exist_ok=True)
        for s in katalog["stimmen"]:
            key = f"stimmen/{s['id']}.mp3"
            wanted.add(key)
            h = hashlib.sha1(f"{voice_key(s, args)}|{katalog['probesatz']}".encode("utf-8")).hexdigest()[:12]
            out = PROBEN / f"{s['id']}.mp3"
            if args.alles or not out.exists() or index.get(key) != h:
                print(f"  Hörprobe {s['id']}")
                synth(katalog["probesatz"], out, s, args)
                index[key] = h
                made += 1
            if args.engine == "piper":
                model_path(s["modell"], args.cache)
                infos[s["id"]] = model_info(s["modell"], args.cache)
            else:
                infos[s["id"]] = {"lizenz": "Azure AI Speech (Vertrag)", "qualitaet": s.get("azure") or args.azure_stimme}
        (PROBEN / "index.js").write_text("window.LERN_STIMMEN_INFO = " + json.dumps(
            {"engine": args.engine, "stimmen": infos}, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

    removed = 0
    for f in list(AUDIO.glob("*.mp3")) + ([] if args.ohne_proben else list(PROBEN.glob("*.mp3"))):
        rel = f.relative_to(AUDIO).as_posix()
        if rel not in wanted:
            f.unlink(); index.pop(rel, None); removed += 1
    index = {k: v for k, v in sorted(index.items()) if k in wanted or (args.ohne_proben and k.startswith("stimmen/"))}
    INDEX.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    print(f"Fertig: {made} Datei(en) neu vertont, {removed} entfernt ({args.engine}).")


if __name__ == "__main__":
    main()
