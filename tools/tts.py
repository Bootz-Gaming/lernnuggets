#!/usr/bin/env python3
"""
Sprecherdateien für alle Szenen erzeugen. Startet der Server nach jedem Veröffentlichen.
Probe einzelner Sätze fürs Studio: tts.py --probe anfrage.json --ausgabe probe.mp3

Ausgabe: audio/<nugget-id>-<szene>.mp3, dazu Hörproben audio/stimmen/<stimme>.mp3
und audio/stimmen/index.js (Lizenz und Qualität je Stimme fürs Studio).

Stimme je Szene: Szene → Lernnugget → Plattform-Standard der Sprache (meta.stimme / meta.stimme_en)
→ Katalog-Standard. Sprache je Lernnugget: Feld "sprache" ("de" Standard oder "en"); Stimmen
einer anderen Sprache werden übersprungen.
Der Stimmenkatalog steht in assets/stimmen.js. Stimmen ohne Piper-Modell (z. B. Florian, Seraphina)
gibt es nur mit Azure; mit Piper spricht dafür die Standardstimme der Sprache.

Engines:
  piper  – kostenlos, läuft im GitHub-Runner; benötigte Stimmen werden automatisch geladen
  azure  – Azure AI Speech; pro Katalog-Stimme ist eine passende Azure-Stimme hinterlegt
           (Feld "azure"), Schlüssel als GitHub-Secret AZURE_SPEECH_KEY

Aussprache englischer Begriffe (Denglisch): Standardliste assets/aussprache.js + eigene Einträge
meta.aussprache [{wort, art: en|ersatz|aus, ersatz}]. Multilingual-Stimmen wechseln für diese Wörter
ins Englische (meta.aussprache_modus "englisch", Standard) oder lesen die Umschreibung ("umschreibung");
alle anderen Stimmen lesen die Umschreibung (SSML <sub alias>).

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
# Datenordner (Inhalte + audio/): auf dem Server getrennt vom Programm (Umgebungsvariable LERN_DATEN)
DATEN = Path(os.environ.get("LERN_DATEN") or ROOT)
AUDIO = DATEN / "audio"
PROBEN = AUDIO / "stimmen"
INDEX = AUDIO / "_index.json"
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


def load_js(path):
    raw = path.read_text(encoding="utf-8")
    m = re.search(r"window\.\w+\s*=", raw)   # Kommentare davor überspringen
    return json.loads(raw[m.end():].strip().rstrip(";"))


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


# ---------- Aussprache (Denglisch) ----------
W = "A-Za-zÄÖÜäöüß0-9"


def lade_lexikon(meta):
    eintraege = {}
    try:
        std = load_js(ROOT / "assets" / "aussprache.js").get("begriffe", [])
    except Exception:
        std = []
    for e in std:
        eintraege[e["wort"].lower()] = {"wort": e["wort"], "art": "en", "ersatz": e.get("ersatz", "")}
    for e in meta.get("aussprache") or []:
        w = re.sub(r"\s+", " ", str(e.get("wort", "")).strip())
        if not w:
            continue
        art = e.get("art") or "en"
        if art == "aus":
            eintraege.pop(w.lower(), None)
            continue
        eintraege[w.lower()] = {"wort": w, "art": art, "ersatz": str(e.get("ersatz", "")).strip()}
    lex = sorted(eintraege.values(), key=lambda e: -len(e["wort"]))
    rx = None
    if lex:
        alt = "|".join(re.escape(e["wort"]).replace(r"\ ", r"\s+") for e in lex)
        rx = re.compile(rf"(?<![{W}])({alt})(e?s)?([{W}]*)", re.I)
    return {"liste": {e["wort"].lower(): e for e in lex}, "rx": rx, "modus": meta.get("aussprache_modus") or "englisch"}


def mehrsprachig(stimme, args):
    return args.engine == "azure" and "Multilingual" in (stimme.get("azure") or "")


def aufbereiten(text, lexikon, stimme, args, sprache):
    """Text → Abschnitte: ("text", t) | ("en", t) | ("sub", angezeigt, gesprochen)."""
    if not lexikon or not lexikon["rx"] or sprache == "en":
        return [("text", text)]
    ml = mehrsprachig(stimme, args) and lexikon["modus"] == "englisch"
    segs, pos = [], 0
    for m in lexikon["rx"].finditer(text):
        wort, suffix, rest = m.group(1), m.group(2) or "", m.group(3) or ""
        e = lexikon["liste"].get(re.sub(r"\s+", " ", wort).lower())
        if not e or (rest and len(e["wort"]) < 5):
            continue                                  # z. B. "App" in "Apparat"
        if m.start() > pos:
            segs.append(("text", text[pos:m.start()]))
        ganz = m.group(0)
        if e["art"] == "en" and ml and not rest:
            segs.append(("en", ganz))
        elif e["ersatz"]:
            segs.append(("sub", ganz, e["ersatz"] + suffix + rest))
        else:
            segs.append(("text", ganz))
        pos = m.end()
    segs.append(("text", text[pos:]))
    return [x for x in segs if x[1]]


def klartext(segs):
    return "".join(x[2] if x[0] == "sub" else x[1] for x in segs)


def segs_key(segs):
    """Abgleich-Kennung: unverändert der Text, wenn keine Regel greift (keine unnötige Neu-Vertonung)."""
    if all(x[0] == "text" for x in segs):
        return "".join(x[1] for x in segs)
    return json.dumps(segs, ensure_ascii=False)


def synth_piper(segs, mp3, stimme, args):
    text = klartext(segs)
    onnx = model_path(stimme["modell"], args.cache)
    spk = speaker_id(stimme["modell"], stimme.get("sprecher"), args.cache)
    cmd = [args.piper, "--model", str(onnx), "--length_scale", str(args.tempo), "--sentence_silence", "0.25"]
    if spk is not None:
        cmd += ["--speaker", str(spk)]
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        subprocess.run(cmd + ["--output_file", str(wav)], input=text.encode("utf-8"), check=True, capture_output=True)
        to_mp3(wav, mp3)


def synth_azure(segs, mp3, stimme, args):
    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION", "germanywestcentral")
    if not key:
        sys.exit("AZURE_SPEECH_KEY fehlt (GitHub: Settings > Secrets and variables > Actions; eigener Server: /etc/lernnuggets.env).")
    voice = stimme.get("azure") or args.azure_stimme
    rate = f"{round((1 / args.tempo - 1) * 100):+d}%"
    lang = voice[:5] if re.match(r"^[a-z]{2}-[A-Z]{2}", voice) else "de-DE"
    def inhalt(teile):
        return "".join(f'<sub alias="{escape(x[2], {chr(34): "&quot;"})}">{escape(x[1])}</sub>' if x[0] == "sub" else escape(x[1]) for x in teile)
    if "Multilingual" in voice:
        # Multilingual-Stimmen: Sprache je Abschnitt festlegen, sonst raten sie die Sprache selbst
        gruppen = []
        for x in segs:
            sp = "en-US" if x[0] == "en" else lang
            if gruppen and gruppen[-1][0] == sp:
                gruppen[-1][1].append(x)
            else:
                gruppen.append((sp, [x]))
        body = "".join(f'<lang xml:lang="{sp}"><prosody rate="{rate}">{inhalt(t)}</prosody></lang>' for sp, t in gruppen)
    else:
        body = f'<prosody rate="{rate}">{inhalt(segs)}</prosody>'
    ssml = f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}"><voice name="{escape(voice)}">{body}</voice></speak>'
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
        v = stimme.get('azure') or args.azure_stimme
        return f"azure:{v}:{args.tempo}" + (":ml2" if "Multilingual" in v else "")
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
    ap.add_argument("--probe", type=Path, help="JSON {text, stimme, sprache, aussprache, aussprache_modus}: nur diesen Satz vertonen")
    ap.add_argument("--ausgabe", type=Path, help="MP3-Datei für --probe")
    args = ap.parse_args()

    katalog = load_js(ROOT / "assets" / "stimmen.js")
    stimmen = {s["id"]: s for s in katalog["stimmen"]}
    data = load_js(DATEN / "data" / "inhalte.js")
    meta = data.get("meta") or {}
    defaults = {"de": [meta.get("stimme"), katalog.get("standard", "thorsten")],
                "en": [meta.get("stimme_en"), katalog.get("standard_en")]}

    def piper_ersatz(v):
        """Reine Azure-Stimme unter Piper: Standardstimme derselben Sprache mit Piper-Modell."""
        if args.engine != "piper" or v.get("modell"):
            return v
        lang = v.get("sprache") or "de"
        std = stimmen.get(katalog.get("standard_en" if lang == "en" else "standard"))
        ersatz = std if std and std.get("modell") else next(x for x in stimmen.values()
                                                             if x.get("modell") and (x.get("sprache") or "de") == lang)
        print(f"  Hinweis: {v['name']} gibt es nur mit Azure – mit Piper spricht {ersatz['name']}")
        return ersatz

    def resolve(n, sc):
        lang = n.get("sprache") or "de"
        for sid in (sc.get("stimme"), n.get("stimme"), *defaults.get(lang, [])):
            if not sid: continue
            v = stimmen.get(sid)
            if v and (v.get("sprache") or "de") == lang:
                return piper_ersatz(v)
            print(f"  Hinweis: Stimme „{sid}“ {'unbekannt' if not v else 'passt nicht zur Sprache ' + lang} – nutze nächste Ebene")
        return piper_ersatz(next(v for v in stimmen.values() if (v.get("sprache") or "de") == lang))

    synth = synth_piper if args.engine == "piper" else synth_azure

    if args.probe:
        q = json.loads(args.probe.read_text(encoding="utf-8"))
        if "aussprache" in q:
            meta["aussprache"] = q.get("aussprache") or []
        if q.get("aussprache_modus"):
            meta["aussprache_modus"] = q["aussprache_modus"]
        lex = lade_lexikon(meta)
        lang = q.get("sprache") or "de"
        stimme = resolve({"sprache": lang, "stimme": q.get("stimme")}, {})
        segs = aufbereiten(str(q.get("text", ""))[:600], lex, stimme, args, lang)
        synth(segs, args.ausgabe, stimme, args)
        print(json.dumps({"stimme": stimme["id"], "abschnitte": segs}, ensure_ascii=False))
        return

    lexikon = lade_lexikon(meta)

    AUDIO.mkdir(exist_ok=True)
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    wanted, made = set(), 0

    for n in data["nuggets"]:
        for i, sc in enumerate(n["szenen"], start=1):
            name = f"{n['id']}-{i}.mp3"
            wanted.add(name)
            text = (sc.get("sprechtext") or sc["text"]).strip()
            stimme = resolve(n, sc)
            segs = aufbereiten(text, lexikon, stimme, args, n.get("sprache") or "de")
            h = hashlib.sha1(f"{voice_key(stimme, args)}|{segs_key(segs)}".encode("utf-8")).hexdigest()[:12]
            out = AUDIO / name
            if not args.alles and out.exists() and index.get(name) == h:
                continue
            print(f"  {name} [{stimme['id']}]: {text[:60]}")
            synth(segs, out, stimme, args)
            index[name] = h
            made += 1

    # Hörproben für das Studio (eine pro Katalog-Stimme)
    infos = {}
    if not args.ohne_proben:
        PROBEN.mkdir(exist_ok=True)
        for s in katalog["stimmen"]:
            if args.engine == "piper" and not s.get("modell"):
                infos[s["id"]] = {"lizenz": "nur mit Azure verfügbar", "qualitaet": "", "nur_azure": True}
                continue
            key = f"stimmen/{s['id']}.mp3"
            wanted.add(key)
            satz = katalog.get("probesatz_en") if s.get("sprache") == "en" else katalog["probesatz"]
            h = hashlib.sha1(f"{voice_key(s, args)}|{satz}".encode("utf-8")).hexdigest()[:12]
            out = PROBEN / f"{s['id']}.mp3"
            if args.alles or not out.exists() or index.get(key) != h:
                print(f"  Hörprobe {s['id']}")
                synth([("text", satz)], out, s, args)
                index[key] = h
                made += 1
            if args.engine == "piper":
                model_path(s["modell"], args.cache)
                infos[s["id"]] = model_info(s["modell"], args.cache)
            else:
                infos[s["id"]] = {"lizenz": "Azure AI Speech (Vertrag)", "qualitaet": s.get("azure") or args.azure_stimme,
                                  "name": s.get("azure_name") or s["name"]}
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
