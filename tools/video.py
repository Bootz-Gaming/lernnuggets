#!/usr/bin/env python3
"""
Erzeugt pro Lernnugget ein fertiges Erklärvideo als MP4 (1920×1080, H.264 + AAC)
mit zuschaltbarer deutscher Untertitelspur und zusätzlicher .srt-Datei.
Läuft automatisch im GitHub-Workflow nach der Sprachausgabe.

Gleiche Regeln wie im Player (assets/szene.js / assets/app.js):
  - Hintergrund: Szene → Lernnugget → Standard (Farbe oder Bild, Bild füllt die Fläche)
  - Bildinhalt: Video > Grafik (SVG/PNG/JPG) > Platzhalter-Icon
  - Animationen: slide-left, slide-right, slide-up, pop, zoom, fade
  - Szenendauer = max(Sprecher + 0,4 s, Mindestdauer, Videolänge)
Nur geänderte Lernnuggets werden neu gebaut (Abgleich über downloads/_index.json).

Benötigt: ffmpeg, rsvg-convert (librsvg2-bin), Pillow.
"""
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "downloads"
W, H, FPS = 1920, 1080, 30
VERSION = "video-4"           # erhöhen, wenn sich das Rendering ändert → alles neu
INK, WHITE = (31, 36, 48), (255, 255, 255)
BOX = (int(W * 0.58), int(H * 0.70))   # Fläche für die Grafik
BOX_Y = int(H * 0.07)
WORD_Y = int(H * 0.86)

# CSS-Animationen aus style.css: (Dauer, cubic-bezier)
ANIM = {
    "slide-left": (0.9, (.2, .8, .2, 1)), "slide-right": (0.9, (.2, .8, .2, 1)),
    "slide-up": (0.9, (.2, .8, .2, 1)), "pop": (0.7, (.3, 1.6, .5, 1)),
    "zoom": (1.0, (.2, .8, .2, 1)), "fade": (1.0, (.25, .1, .25, 1)),
}
WORD_DELAY, WORD_DUR = 0.35, 0.6
ANIM_FRAMES = int(math.ceil(max(1.0, WORD_DELAY + WORD_DUR) * FPS)) + 1


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode(errors="replace")[-2000:])
        raise SystemExit(f"Fehler bei: {' '.join(map(str, cmd[:6]))} …")
    return r


def probe_dur(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    try:
        return float(r.stdout.decode().strip())
    except ValueError:
        return 0.0


def bezier(p1x, p1y, p2x, p2y):
    def cx(t): return 3 * p1x * t * (1 - t) ** 2 + 3 * p2x * t ** 2 * (1 - t) + t ** 3
    def cy(t): return 3 * p1y * t * (1 - t) ** 2 + 3 * p2y * t ** 2 * (1 - t) + t ** 3
    def f(x):
        if x <= 0: return 0.0
        if x >= 1: return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if cx(mid) < x: lo = mid
            else: hi = mid
        return cy((lo + hi) / 2)
    return f


EASE = {k: bezier(*v[1]) for k, v in ANIM.items()}
EASE_WORD = bezier(.25, .1, .25, 1)


def hexrgb(h, default=(255, 255, 255)):
    h = str(h or "").strip().lstrip("#")
    if len(h) == 3: h = "".join(c * 2 for c in h)
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return default


def luminance(rgb):
    c = [v / 255 for v in rgb]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def valid_bg(bg):
    return isinstance(bg, dict) and (bg.get("bild") or re.match(r"^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$", str(bg.get("farbe", ""))))


def background_of(meta, n, sc):
    for bg in (sc.get("hintergrund"), n.get("hintergrund"), meta.get("hintergrund")):
        if valid_bg(bg): return bg
    return {"farbe": "#ffffff"}


def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    try:
        f = run(["fc-match", "-f", "%{file}", "DejaVu Sans:bold"]).stdout.decode()
        return ImageFont.truetype(f, size)
    except Exception:
        return ImageFont.load_default()


FONT_WORD = None


def make_background(bg, cache):
    key = json.dumps(bg, sort_keys=True)
    if key in cache: return cache[key]
    canvas = Image.new("RGB", (W, H), hexrgb(bg.get("farbe")))
    if bg.get("bild") and (ROOT / bg["bild"]).exists():
        im = load_image(ROOT / bg["bild"], (W, H), cover=True).convert("RGBA")
        canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2), im)
    elif bg.get("bild"):
        print(f"    Hinweis: Hintergrundbild {bg['bild']} fehlt – nutze Farbe")
    cache[key] = canvas
    return canvas


def load_image(path, box, cover=False, accent=None):
    path = Path(path)
    if path.suffix.lower() == ".svg":
        with tempfile.TemporaryDirectory() as td:
            src = path
            if accent:
                txt = path.read_text(encoding="utf-8").replace("#0b6fb8", accent)
                src = Path(td) / "a.svg"; src.write_text(txt, encoding="utf-8")
            png = Path(td) / "a.png"
            # großzügig rastern, danach exakt einpassen
            run(["rsvg-convert", "-w", str(box[0] * 2), "-o", str(png), str(src)])
            im = Image.open(png).convert("RGBA"); im.load()
    else:
        im = Image.open(path).convert("RGBA")
    sx, sy = box[0] / im.width, box[1] / im.height
    s = max(sx, sy) if cover else min(sx, sy)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    if cover:
        l, t = (im.width - box[0]) // 2, (im.height - box[1]) // 2
        im = im.crop((l, t, l + box[0], t + box[1]))
    return im


def word_layer(text, tone, accent):
    """Stichwort mit Akzentlinie als transparente Ebene (volle Bildgröße)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if not text: return layer
    d = ImageDraw.Draw(layer)
    f = FONT_WORD
    tw = d.textlength(text, font=f)
    while tw > W * 0.86 and f.size > 28:
        f = font(f.size - 4); tw = d.textlength(text, font=f)
    asc, desc = f.getmetrics()
    x = (W - tw) / 2
    y = WORD_Y - asc
    bar_w, bar_h, gap = 150, 11, 20
    if tone == "bild":
        pad = 40
        d.rounded_rectangle([x - pad, y - 22, x + tw + pad, y + asc + desc + gap + bar_h + 22], radius=30, fill=(255, 255, 255, 235))
    color = WHITE if tone == "dunkel" else INK
    d.text((x, y), text, font=f, fill=color + (255,))
    by = y + asc + desc + gap - 6
    d.rounded_rectangle([W / 2 - bar_w / 2, by, W / 2 + bar_w / 2, by + bar_h], radius=6, fill=hexrgb(accent) + (255,))
    return layer


def with_alpha(im, a):
    if a >= 0.999: return im
    r, g, b, al = im.split()
    al = al.point(lambda v: int(v * max(0.0, min(1.0, a))))
    return Image.merge("RGBA", (r, g, b, al))


def render_frames(bgimg, graphic, anim, word, frames):
    """Liefert die animierten Frames (RGB-Bytes) für den Szenenanfang."""
    dur, _ = ANIM.get(anim, ANIM["fade"])
    ease = EASE.get(anim, EASE["fade"])
    gx0 = (W - graphic.width) // 2
    gy0 = BOX_Y + (BOX[1] - graphic.height) // 2
    for i in range(frames):
        t = i / FPS
        e = ease(min(1.0, t / dur))
        op = max(0.0, min(1.0, e))
        frame = bgimg.copy().convert("RGBA")
        g, x, y = graphic, gx0, gy0
        if anim == "slide-left": x = gx0 - 0.6 * graphic.width * (1 - e)
        elif anim == "slide-right": x = gx0 + 0.6 * graphic.width * (1 - e)
        elif anim == "slide-up": y = gy0 + 0.4 * graphic.height * (1 - e)
        elif anim in ("pop", "zoom"):
            s = (0.2 + 0.8 * e) if anim == "pop" else (0.85 + 0.15 * e)
            s = max(0.01, s)
            g = graphic.resize((max(1, round(graphic.width * s)), max(1, round(graphic.height * s))), Image.BILINEAR)
            x = gx0 + (graphic.width - g.width) / 2; y = gy0 + (graphic.height - g.height) / 2
        frame.alpha_composite(with_alpha(g, op), (int(round(x)), int(round(y))))
        we = EASE_WORD(min(1.0, max(0.0, (t - WORD_DELAY) / WORD_DUR)))
        if we > 0:
            frame.alpha_composite(with_alpha(word, we).transform(word.size, Image.AFFINE, (1, 0, 0, 0, 1, -28 * (1 - we))))
        yield frame.convert("RGB").tobytes()


def audio_input(audio, dur):
    if audio:
        return ["-i", str(audio)], f"[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:{dur:.3f}[a]"
    return ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"], "[1:a]anull[a]"


ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"]


def build_scene(meta, n, k, sc, audio, tmp, bgcache):
    accent = meta.get("akzentfarbe") or "#0b6fb8"
    bg = background_of(meta, n, sc)
    tone = "bild" if bg.get("bild") else ("dunkel" if luminance(hexrgb(bg.get("farbe"))) < 0.35 else "hell")
    bgimg = make_background(bg, bgcache)
    word = word_layer(sc.get("stichwort", ""), tone, accent)
    a_dur = probe_dur(audio) if audio else 0.0
    base = (a_dur + 0.4) if audio else max(3.5, len(sc.get("text", "")) / 14 + 1.2)
    out = tmp / f"s{k:03d}.mp4"
    video = ROOT / sc["video"] if sc.get("video") else None

    if video and video.exists():
        dur = max(base, float(sc.get("mindestdauer") or 0), probe_dur(video))
        bgp = tmp / f"bg{k}.png"; bgimg.save(bgp)
        wp = tmp / f"w{k}.png"; word.save(wp)
        ain, afil = audio_input(audio, dur)
        vw, vh = int(W * 0.86), int(H * 0.72)      # Video oberhalb des Stichworts einpassen
        fc = (f"[2:v]scale={vw}:{vh}:force_original_aspect_ratio=decrease,fps={FPS},format=rgba[v1];"
              f"[0:v][v1]overlay=(W-w)/2:{BOX_Y}+({vh}-h)/2:eof_action=repeat[v2];[v2][3:v]overlay=0:0,format=yuv420p[v];"
              + afil.replace("[1:a]", "[1:a]"))
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", str(bgp), *ain,
               "-i", str(video), "-loop", "1", "-i", str(wp),
               "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{dur:.3f}", *ENC, str(out)]
        run(cmd)
        return out, dur, a_dur

    if video:
        print(f"    Hinweis: Video {sc['video']} fehlt – nutze Grafik/Platzhalter")
    gpath = ROOT / sc["grafik"] if sc.get("grafik") else None
    if not (gpath and gpath.exists()):
        if gpath: print(f"    Hinweis: Grafik {sc['grafik']} fehlt – nutze Platzhalter")
        gpath = ROOT / "assets" / "platzhalter" / f"{sc.get('icon') or 'report'}.svg"
        if not gpath.exists(): gpath = ROOT / "assets" / "platzhalter" / "report.svg"
        box = (int(W * 0.50), BOX[1])        # Platzhalter etwas kleiner, wie im Player
    else:
        box = BOX
    graphic = load_image(gpath, box, accent=accent)
    dur = max(base, float(sc.get("mindestdauer") or 0), ANIM_FRAMES / FPS + 0.2)
    ain, afil = audio_input(audio, dur)
    hold = max(0.0, dur - ANIM_FRAMES / FPS + 0.1)
    fc = f"[0:v]tpad=stop_mode=clone:stop_duration={hold:.3f},format=yuv420p[v];{afil}"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", *ain, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
           "-t", f"{dur:.3f}", *ENC, str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    for fr in render_frames(bgimg, graphic, sc.get("animation") or "fade", word, ANIM_FRAMES):
        p.stdin.write(fr)
    p.stdin.close()
    err = p.stderr.read(); p.wait()
    if p.returncode != 0:
        sys.stderr.write(err.decode(errors="replace")[-2000:]); raise SystemExit("ffmpeg-Fehler (Szene)")
    return out, dur, a_dur


# ---------- Untertitel ----------
def wrap(text, width=42):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    return lines


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def split_balanced(s):
    """Text rekursiv in Teile mit je max. 2 Zeilen teilen – bevorzugt an Satzenden, dann an Kommas, sonst mittig."""
    if len(wrap(s)) <= 2: return [s]
    words, best = s.split(), None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        score = abs(len(a) - len(s) / 2)
        if a[-1] in ".:!?": score -= 22
        elif a.endswith(","): score -= 12
        if len(b) < 12 or len(a) < 12: score += 50
        if best is None or score < best[0]: best = (score, a, b)
    return split_balanced(best[1]) + split_balanced(best[2])


def cues_for(text, start, length):
    """Text in Untertitel mit max. 2 Zeilen à 42 Zeichen aufteilen, Zeit nach Textanteil verteilen."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?:])\s+", text.strip()) if s.strip()]
    # kurze Sätze zusammenfassen, solange sie in zwei Zeilen passen
    merged = []
    for s in sentences:
        if merged and (len(wrap(merged[-1] + " " + s)) <= 2 or len(merged[-1]) < 25): merged[-1] += " " + s
        else: merged.append(s)
    chunks = []
    for s in merged:
        chunks += ["\n".join(wrap(c)) for c in split_balanced(s)]
    total = sum(len(c) for c in chunks) or 1
    out, t = [], start
    for c in chunks:
        d = length * len(c) / total
        out.append((t, t + d, c)); t += d
    return out


def nugget_hash(meta, n, audio_index):
    h = hashlib.sha1(VERSION.encode())
    h.update(json.dumps({"meta": {k: meta.get(k) for k in ("hintergrund", "akzentfarbe")}, "n": n}, sort_keys=True, ensure_ascii=False).encode())
    for k, sc in enumerate(n["szenen"], 1):
        h.update(str(audio_index.get(f"{n['id']}-{k}.mp3")).encode())
        files = [sc.get("video"), sc.get("grafik"), (sc.get("hintergrund") or {}).get("bild")]
        if not sc.get("video") and not sc.get("grafik"):
            files.append(f"assets/platzhalter/{sc.get('icon') or 'report'}.svg")
        for f in files:
            p = ROOT / f if f else None
            if p and p.exists(): h.update(hashlib.sha1(p.read_bytes()).digest())
    for bg in (n.get("hintergrund"), meta.get("hintergrund")):
        p = ROOT / bg["bild"] if isinstance(bg, dict) and bg.get("bild") else None
        if p and p.exists(): h.update(hashlib.sha1(p.read_bytes()).digest())
    return h.hexdigest()[:16]


def build_nugget(meta, n, tmp):
    bgcache, parts, cues, t = {}, [], [], 0.0
    for k, sc in enumerate(n["szenen"], 1):
        audio = ROOT / "audio" / f"{n['id']}-{k}.mp3"
        clip, dur, a_dur = build_scene(meta, n, k, sc, audio if audio.exists() else None, tmp, bgcache)
        parts.append(clip)
        cues += cues_for(sc.get("text", ""), t + 0.1, (a_dur if a_dur else dur - 0.4) - 0.1)
        t += dur
    lst = tmp / "liste.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    joined = tmp / "gesamt.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)], cwd=tmp)
    srt = OUT / f"{n['id']}.srt"
    srt.write_text("".join(f"{i}\n{ts(a)} --> {ts(b)}\n{c}\n\n" for i, (a, b, c) in enumerate(cues, 1)), encoding="utf-8")
    mp4 = OUT / f"{n['id']}.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(joined), "-i", str(srt), "-map", "0:v", "-map", "0:a", "-map", "1",
         "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
         "-metadata", f"title={n.get('titel', n['id'])}",
         "-metadata:s:a:0", "language=ger", "-metadata:s:s:0", "language=ger", "-metadata:s:s:0", "title=Deutsch",
         "-disposition:s:0", "-default", "-movflags", "+faststart", str(mp4)])
    return mp4, srt, t


def main():
    global FONT_WORD
    for tool in ("ffmpeg", "ffprobe", "rsvg-convert"):
        if not shutil.which(tool): sys.exit(f"{tool} fehlt.")
    FONT_WORD = font(64)
    raw = (ROOT / "data" / "inhalte.js").read_text(encoding="utf-8")
    data = json.loads(raw.split("=", 1)[1].strip().rstrip(";"))
    meta = data.get("meta", {})
    OUT.mkdir(exist_ok=True)
    idx_path = OUT / "_index.json"
    index = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    a_idx_path = ROOT / "audio" / "_index.json"
    audio_index = json.loads(a_idx_path.read_text()) if a_idx_path.exists() else {}
    only = sys.argv[1:]

    result, built = {}, 0
    for n in data["nuggets"]:
        if only and n["id"] not in only: continue
        h = nugget_hash(meta, n, audio_index)
        mp4, srt = OUT / f"{n['id']}.mp4", OUT / f"{n['id']}.srt"
        if index.get(n["id"], {}).get("hash") != h or not mp4.exists():
            print(f"  Video: {n['id']} …")
            with tempfile.TemporaryDirectory() as td:
                mp4, srt, dur = build_nugget(meta, n, Path(td))
            index[n["id"]] = {"hash": h, "dauer": round(dur, 1)}
            built += 1
        result[n["id"]] = {"mp4": f"downloads/{n['id']}.mp4", "srt": f"downloads/{n['id']}.srt",
                           "groesse": mp4.stat().st_size, "dauer": index[n["id"]].get("dauer")}

    if not only:
        ids = {n["id"] for n in data["nuggets"]}
        for f in OUT.glob("*.mp4"):
            if f.stem not in ids: f.unlink(); (OUT / f"{f.stem}.srt").unlink(missing_ok=True); index.pop(f.stem, None)
    idx_path.write_text(json.dumps(index, indent=1) + "\n")
    (OUT / "index.js").write_text("window.LERN_DOWNLOADS = " + json.dumps(result, indent=1) + ";\n", encoding="utf-8")
    print(f"Fertig: {built} Video(s) neu gebaut, {len(result)} verfügbar.")


if __name__ == "__main__":
    main()
