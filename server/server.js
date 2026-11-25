#!/usr/bin/env node
/*
 * Lernnuggets – Server für den eigenen VPS (lernnuggets.bootz.digital)
 *
 * - Nur Node.js (ab 20), keine npm-Pakete: http, crypto (scrypt), fs, child_process
 * - Konten mit drei Rollen:
 *     admin    – alles: Konten aller Rollen, alle Inhalte bearbeiten, veröffentlichen (freigeben), Protokoll
 *     support  – Anwender-Konten betreuen (anlegen, sperren, Passwort zurücksetzen), alle Inhalte bearbeiten
 *     anwender – erstellt eigene Lernnuggets im Studio und reicht sie zur Freigabe ein; sieht alle veröffentlichten
 * - Anmeldung für alles; einzelne Lernnuggets können "öffentlich teilbar" sein (/teilen/<id>)
 * - Studio speichert einen gemeinsamen Entwurf auf dem Server (Zusammenführung pro Lernnugget); nur Admins
 *   veröffentlichen. Lernnuggets von Anwendern gehen erst live, wenn sie eingereicht sind.
 *   Danach laufen Vertonung (tools/tts.py) und MP4-Bau (tools/video.py) direkt auf dem Server.
 *
 * Programm: Repository-Ordner (z. B. /opt/lernnuggets/app)
 * Daten:    LERN_DATEN (Standard /var/lib/lernnuggets) – Inhalte, Medien, Audio, Videos, Konten, Protokoll
 *
 * Befehle:
 *   node server/server.js                         Server starten
 *   node server/server.js admin-anlegen <name>    Admin-Konto mit Einmal-Passwort anlegen
 *   node server/server.js passwort-neu <name>     Einmal-Passwort für ein Konto setzen
 */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const APP = path.resolve(__dirname, '..');
const env = process.env;
const CFG = {
  port: +(env.PORT || 8780),
  host: env.HOST || '127.0.0.1',
  daten: path.resolve(env.LERN_DATEN || '/var/lib/lernnuggets'),
  cookieSecure: env.COOKIE_SECURE !== '0',
  engine: env.TTS_ENGINE || 'azure',
  piper: env.PIPER_BIN || '',
  python: env.PYTHON || 'python3',
  maxUploadMB: +(env.MAX_UPLOAD_MB || 300),
  sitzungStunden: +(env.SITZUNG_STUNDEN || 10)        // Abmeldung nach so vielen Stunden ohne Aktivität
};
const D = p => path.join(CFG.daten, p);
const ROLLEN = ['admin', 'support', 'anwender'];
const ROLLENNAME = { admin: 'Admin', support: 'Support', anwender: 'Anwender' };
const MEDIEN_RE = /\.(svg|png|jpe?g|webp|mov|mp4|m4v|webm)$/i;
const COOKIE = CFG.cookieSecure ? '__Host-lernnuggets' : 'lernnuggets';
const START = Date.now().toString(36);

// ---------- Hilfen ----------
const jetzt = () => new Date().toISOString();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const zufall = (n = 32) => crypto.randomBytes(n).toString('base64url');
function schreibeAtomar(datei, inhalt) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const tmp = `${datei}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, inhalt, { mode: 0o640 });
  fs.renameSync(tmp, datei);
}
const leseJSON = (datei, std) => { try { return JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { return std; } };
const leseJS = datei => { const raw = fs.readFileSync(datei, 'utf8'); return JSON.parse(raw.slice(raw.indexOf('=') + 1).trim().replace(/;\s*$/, '')); };
const alsJS = (name, obj) => `window.${name} = ${JSON.stringify(obj, null, 2)};\n`;
// Einmal-Passwort: gut lesbar, ohne verwechselbare Zeichen
function einmalPasswort() {
  const z = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(15);
  let s = '';
  for (let i = 0; i < 15; i++) s += z[b[i] % z.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10)}`;
}

// ---------- Passwörter (scrypt) ----------
const SCRYPT = { N: 16384, r: 8, p: 1, len: 64 };
function hashPasswort(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw.normalize('NFC'), salt, SCRYPT.len, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${h.toString('base64')}`;
}
function pruefePasswort(pw, gespeichert) {
  try {
    const [art, N, r, p, salt, h] = String(gespeichert).split('$');
    if (art !== 'scrypt') return false;
    const soll = Buffer.from(h, 'base64');
    const ist = crypto.scryptSync(String(pw).normalize('NFC'), Buffer.from(salt, 'base64'), soll.length, { N: +N, r: +r, p: +p });
    return crypto.timingSafeEqual(soll, ist);
  } catch (e) { return false; }
}
// Damit Anmeldeversuche mit unbekanntem Namen gleich lange dauern
const DUMMY_HASH = hashPasswort(zufall());
function passwortRegel(pw) {
  pw = String(pw || '');
  if (pw.length < 10) return 'Das Passwort braucht mindestens 10 Zeichen.';
  if (pw.length > 200) return 'Das Passwort ist zu lang.';
  if (/^(.)\1+$/.test(pw)) return 'Das Passwort ist zu einfach.';
  return null;
}

// ---------- Konten ----------
const KONTEN = D('konten.json');
let konten = leseJSON(KONTEN, []);
let kontenStand = 0;
const speichereKonten = () => { schreibeAtomar(KONTEN, JSON.stringify(konten, null, 1) + '\n'); kontenStand = fs.statSync(KONTEN).mtimeMs; };
// Änderungen über die Kommandozeile (admin-anlegen, passwort-neu) ohne Neustart übernehmen
function kontenAktuell() {
  try { const t = fs.statSync(KONTEN).mtimeMs; if (t !== kontenStand) { konten = leseJSON(KONTEN, konten); kontenStand = t; } } catch (e) { /* noch keine Datei */ }
}
const kontoVon = benutzer => konten.find(k => k.benutzer === String(benutzer || '').trim().toLowerCase());
const kontoId = id => konten.find(k => k.id === id);
const oeffentlichesKonto = k => ({ id: k.id, benutzer: k.benutzer, name: k.name, rolle: k.rolle, gesperrt: !!k.gesperrt,
  muss_aendern: !!k.muss_aendern, erstellt: k.erstellt, letzte_anmeldung: k.letzte_anmeldung || null });
const BENUTZER_RE = /^[a-z0-9][a-z0-9._-]{1,39}$/;
function neuesKonto({ benutzer, name, rolle }) {
  benutzer = String(benutzer || '').trim().toLowerCase();
  if (!BENUTZER_RE.test(benutzer)) throw fehler(400, 'Benutzername: 2–40 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.');
  if (kontoVon(benutzer)) throw fehler(409, `Den Benutzernamen „${benutzer}“ gibt es schon.`);
  if (!ROLLEN.includes(rolle)) throw fehler(400, 'Unbekannte Rolle.');
  const pw = einmalPasswort();
  const k = { id: zufall(9), benutzer, name: String(name || benutzer).trim().slice(0, 80) || benutzer, rolle,
    hash: hashPasswort(pw), muss_aendern: true, gesperrt: false, erstellt: jetzt() };
  konten.push(k); speichereKonten();
  return { konto: k, passwort: pw };
}
const adminAnzahl = () => konten.filter(k => k.rolle === 'admin' && !k.gesperrt).length;

// ---------- Sitzungen ----------
const SITZUNGEN = D('sitzungen.json');
let sitzungen = leseJSON(SITZUNGEN, {});           // sha256(token) → { konto, erstellt, zuletzt }
let sitzungT = 0;
const speichereSitzungen = () => { clearTimeout(sitzungT); sitzungT = setTimeout(() => schreibeAtomar(SITZUNGEN, JSON.stringify(sitzungen)), 500); };
const IDLE = CFG.sitzungStunden * 3600e3, MAXALT = 14 * 24 * 3600e3;
function sitzungAus(req) {
  const c = parseCookies(req.headers.cookie)[COOKIE];
  if (!c) return null;
  const key = sha(c), s = sitzungen[key];
  if (!s) return null;
  const t = Date.now();
  const k = kontoId(s.konto);
  if (!k || k.gesperrt || (s.gen || 0) !== (k.gen || 0) || t - s.zuletzt > IDLE || t - s.erstellt > MAXALT) { delete sitzungen[key]; speichereSitzungen(); return null; }
  if (t - s.zuletzt > 60e3) { s.zuletzt = t; speichereSitzungen(); }
  return { key, konto: k };
}
function neueSitzung(res, k) {
  const token = zufall(32);
  sitzungen[sha(token)] = { konto: k.id, gen: k.gen || 0, erstellt: Date.now(), zuletzt: Date.now() };
  speichereSitzungen();
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${CFG.cookieSecure ? '; Secure' : ''}; Max-Age=${14 * 24 * 3600}`);
}
// Alle Sitzungen eines Kontos beenden (über eine Generationsnummer, wirkt auch bei Änderungen über die Kommandozeile)
function beendeSitzungenVon(kontoId, ausser) {
  const k = kontoId && konten.find(x => x.id === kontoId);
  if (k) { k.gen = (k.gen || 0) + 1; speichereKonten(); }
  for (const [key, s] of Object.entries(sitzungen)) {
    if (s.konto !== kontoId) continue;
    if (key === ausser && k) s.gen = k.gen; else delete sitzungen[key];
  }
  speichereSitzungen();
}
setInterval(() => {   // Aufräumen
  const t = Date.now(); let n = 0;
  for (const [key, s] of Object.entries(sitzungen)) if (t - s.zuletzt > IDLE || t - s.erstellt > MAXALT) { delete sitzungen[key]; n++; }
  if (n) speichereSitzungen();
}, 3600e3).unref();
function parseCookies(h) {
  const out = {};
  String(h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}

// ---------- Begrenzung von Anmeldeversuchen ----------
const versuche = new Map();   // key → [zeitpunkte]
const FENSTER = 15 * 60e3, MAX_VERSUCHE = 8;
function gesperrtFuer(key) {
  const t = Date.now(), l = (versuche.get(key) || []).filter(x => t - x < FENSTER);
  versuche.set(key, l);
  return l.length >= MAX_VERSUCHE ? Math.ceil((FENSTER - (t - l[0])) / 60e3) : 0;
}
const fehlversuch = key => versuche.set(key, [...(versuche.get(key) || []), Date.now()]);
setInterval(() => { const t = Date.now(); for (const [k, l] of versuche) if (!l.some(x => t - x < FENSTER)) versuche.delete(k); }, 600e3).unref();

// ---------- Protokoll ----------
function protokoll(req, wer, aktion, details) {
  const zeile = JSON.stringify({ zeit: jetzt(), wer: wer ? wer.benutzer : null, aktion, details: details || undefined, ip: req ? clientIp(req) : 'konsole' });
  fs.appendFile(D('protokoll.log'), zeile + '\n', () => {});
}
function clientIp(req) {
  const r = req.socket.remoteAddress || '';
  if ((r === '127.0.0.1' || r === '::1' || r === '::ffff:127.0.0.1') && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return r;
}

// ---------- Inhalte ----------
const LIVE = D('data/inhalte.js');
const ENTWURF = D('entwurf.json');
let live = null, liveRev = 0;
function ladeLive() { live = leseJS(LIVE); liveRev++; }
const oeffentlich = () => live.nuggets.filter(n => n.oeffentlich === true);
// Dateien, die zu öffentlichen Lernnuggets gehören (für Besucher ohne Anmeldung)
function freieDateien() {
  const set = new Set();
  const bg = b => { if (b && b.bild) set.add(String(b.bild)); };
  const pub = oeffentlich();
  if (pub.length) bg(live.meta && live.meta.hintergrund);
  pub.forEach(n => {
    bg(n.hintergrund);
    n.szenen.forEach((sc, i) => {
      if (sc.grafik) set.add(String(sc.grafik));
      if (sc.video) set.add(String(sc.video));
      bg(sc.hintergrund);
      set.add(`audio/${n.id}-${i + 1}.mp3`);
    });
    set.add(`downloads/${n.id}.mp4`); set.add(`downloads/${n.id}.srt`);
  });
  return set;
}
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,59}$/i;
function pruefeInhalte(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw fehler(400, 'Inhalte fehlen.');
  if (!d.meta || typeof d.meta !== 'object') throw fehler(400, 'meta fehlt.');
  if (!Array.isArray(d.kategorien) || !Array.isArray(d.nuggets)) throw fehler(400, 'kategorien oder nuggets fehlen.');
  const ids = new Set();
  d.nuggets.forEach(n => {
    if (!n || !ID_RE.test(String(n.id))) throw fehler(400, `Ungültige ID eines Lernnuggets: „${n && n.id}“`);
    if (ids.has(n.id)) throw fehler(400, `ID doppelt: ${n.id}`);
    ids.add(n.id);
    if (!Array.isArray(n.szenen) || !n.szenen.length) throw fehler(400, `„${n.titel || n.id}“ hat keine Szenen.`);
    n.szenen.forEach(sc => {
      for (const f of ['grafik', 'video']) if (sc[f] != null && !/^(media|assets)\/[\w.\-/]+$/.test(String(sc[f])) ) throw fehler(400, `Ungültiger Dateipfad: ${sc[f]}`);
    });
  });
  return d;
}
function leseEntwurf() {
  const e = leseJSON(ENTWURF, null);
  return e && e.data ? e : null;
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const kopie = o => JSON.parse(JSON.stringify(o));

// Braucht dieses Lernnugget eine Freigabe? Ja, wenn es von einem Anwender stammt (oder das Konto nicht mehr existiert).
function brauchtFreigabe(n) {
  if (!n.besitzer) return false;
  const k = kontoVon(n.besitzer);
  return !k || k.rolle === 'anwender';
}
// Live-Fassung aus dem Entwurf: Anwender-Lernnuggets nur, wenn eingereicht – sonst bleibt die bisherige Live-Fassung
function liveAusEntwurf(d) {
  const alt = new Map(live.nuggets.map(n => [n.id, n]));
  const nuggets = [];
  d.nuggets.forEach(n => {
    if (!brauchtFreigabe(n) || n.eingereicht) { const x = kopie(n); delete x.eingereicht; nuggets.push(x); }
    else if (alt.has(n.id)) nuggets.push(kopie(alt.get(n.id)));
  });
  return Object.assign(kopie(d), { nuggets });
}

// Versionen des Entwurfs der letzten Zeit, damit gleichzeitige Änderungen zusammengeführt werden können
const verlauf = new Map();
function merkeVersion(v, d) {
  verlauf.set(v, JSON.stringify(d));
  if (verlauf.size > 80) verlauf.delete(verlauf.keys().next().value);
}
// Drei-Wege-Zusammenführung pro Lernnugget (sowie Einstellungen und Kategorien als Ganzes)
function zusammenfuehren(basis, aktuell, meins) {
  const konflikte = [];
  const wahl = (b, a, m, name) => {
    if (gleich(m, b)) return a;
    if (gleich(a, b) || gleich(a, m)) return m;
    konflikte.push(name); return m;
  };
  const meta = wahl(basis.meta, aktuell.meta, meins.meta, 'Einstellungen der Plattform');
  let kategorien = wahl(basis.kategorien, aktuell.kategorien, meins.kategorien, null);
  if (konflikte.includes(null)) {   // Kategorien: einfach vereinigen
    konflikte.splice(konflikte.indexOf(null), 1);
    kategorien = meins.kategorien.concat(aktuell.kategorien.filter(k => !meins.kategorien.some(x => x.id === k.id)));
  }
  const map = arr => new Map(arr.map(n => [n.id, n]));
  const B = map(basis.nuggets), A = map(aktuell.nuggets), M = map(meins.nuggets);
  const reihenfolge = [...M.keys()];
  aktuell.nuggets.forEach((n, i) => { if (!M.has(n.id) && !B.has(n.id)) reihenfolge.splice(Math.min(i, reihenfolge.length), 0, n.id); });
  B.forEach((n, id) => { if (!reihenfolge.includes(id)) reihenfolge.push(id); });
  const nuggets = [];
  reihenfolge.forEach(id => {
    const r = wahl(B.get(id), A.get(id), M.get(id), (M.get(id) || A.get(id) || B.get(id)).titel || id);
    if (r) nuggets.push(r);
  });
  return { data: Object.assign({}, meins, { meta, kategorien, nuggets }), konflikte };
}
// Anwender schicken nur ihre eigenen Lernnuggets; der Rest des Entwurfs bleibt unberührt
function anwenderEinbauen(aktuell, meins, k) {
  const fremd = new Set(aktuell.nuggets.filter(n => n.besitzer !== k.benutzer).map(n => n.id));
  const alt = new Map(aktuell.nuggets.filter(n => n.besitzer === k.benutzer).map(n => [n.id, n]));
  const eigene = new Map();
  (meins.nuggets || []).forEach(n => {
    if (!n || fremd.has(n.id) || live.nuggets.some(x => x.id === n.id && x.besitzer !== k.benutzer)) throw fehler(400, `Die ID „${n && n.id}“ ist schon vergeben. Bitte im Feld ID eine andere wählen.`);
    const x = Object.assign({}, n, { besitzer: k.benutzer });
    const vorher = alt.get(n.id) || live.nuggets.find(l => l.id === n.id);
    if (vorher && vorher.oeffentlich) x.oeffentlich = true; else delete x.oeffentlich;   // Teilen entscheidet der Admin
    eigene.set(n.id, x);
  });
  const nuggets = [];
  aktuell.nuggets.forEach(n => {
    if (n.besitzer !== k.benutzer) nuggets.push(n);
    else if (eigene.has(n.id)) { nuggets.push(eigene.get(n.id)); eigene.delete(n.id); }
  });
  eigene.forEach(n => nuggets.push(n));
  const kategorien = aktuell.kategorien.concat((meins.kategorien || []).filter(x => x && x.id && x.name && !aktuell.kategorien.some(a => a.id === x.id)));
  return Object.assign({}, aktuell, { kategorien, nuggets });
}
const nurEigene = (d, k) => Object.assign({}, d, { nuggets: d.nuggets.filter(n => n.besitzer === k.benutzer) });
// Rollen der Ersteller, damit das Studio "in Arbeit / eingereicht" anzeigen kann
const besitzerInfo = d => Object.fromEntries([...new Set(d.nuggets.map(n => n.besitzer).filter(Boolean))].map(b => {
  const k = kontoVon(b); return [b, { name: k ? k.name : b, freigabe: !k || k.rolle === 'anwender' }];
}));

const proben = new Map();   // konto → Zeitpunkte der Proben (Begrenzung)

// ---------- Vertonung und Videobau (ein Auftrag zur Zeit) ----------
const auftrag = { laeuft: false, nochmal: false, start: null, ende: null, ok: null, log: [], alles: false, von: null };
function logAuftrag(z) {
  String(z).split(/\r?\n/).filter(Boolean).forEach(l => { auftrag.log.push(l); });
  if (auftrag.log.length > 400) auftrag.log.splice(0, auftrag.log.length - 400);
  fs.appendFile(D('auftrag.log'), String(z).endsWith('\n') ? String(z) : z + '\n', () => {});
}
function lauf(cmd, args) {
  return new Promise(resolve => {
    logAuftrag(`$ ${path.basename(cmd)} ${args.join(' ')}`);
    const p = spawn(cmd, args, { cwd: APP, env: Object.assign({}, env, { LERN_DATEN: CFG.daten, PYTHONUNBUFFERED: '1' }) });
    p.stdout.on('data', b => logAuftrag(b.toString()));
    p.stderr.on('data', b => logAuftrag(b.toString()));
    p.on('error', e => { logAuftrag(`Fehler: ${e.message}`); resolve(1); });
    p.on('close', code => resolve(code));
  });
}
async function starteAuftrag(von, alles) {
  if (auftrag.laeuft) { auftrag.nochmal = true; auftrag.alles = auftrag.alles || !!alles; return; }
  Object.assign(auftrag, { laeuft: true, nochmal: false, start: jetzt(), ende: null, ok: null, log: [], von: von || null });
  const tts = [path.join(APP, 'tools/tts.py'), '--engine', CFG.engine, '--cache', D('piper-stimmen')];
  if (CFG.piper) tts.push('--piper', CFG.piper);
  if (alles) tts.push('--alles');
  let code = await lauf(CFG.python, tts);
  if (code === 0) code = await lauf(CFG.python, [path.join(APP, 'tools/video.py')]);
  Object.assign(auftrag, { laeuft: false, ende: jetzt(), ok: code === 0, alles: false });
  logAuftrag(code === 0 ? 'Fertig.' : `Abgebrochen (Code ${code}).`);
  liveRev++;
  if (auftrag.nochmal) starteAuftrag(auftrag.von, auftrag.alles);
}

// ---------- HTTP-Hilfen ----------
function fehler(status, text) { const e = new Error(text); e.status = status; return e; }
const SICHERHEIT = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
const CSP = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
function senden(res, status, body, typ, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': typ || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, SICHERHEIT, extra || {}));
  res.end(body);
}
const json = (res, status, obj) => senden(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
const weiter = (res, ziel) => { res.writeHead(303, Object.assign({ Location: ziel, 'Cache-Control': 'no-store' }, SICHERHEIT)); res.end(); };
function body(req, max) {
  return new Promise((resolve, reject) => {
    const teile = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { reject(fehler(413, 'Zu groß.')); req.destroy(); } else teile.push(c); });
    req.on('end', () => resolve(Buffer.concat(teile)));
    req.on('error', reject);
  });
}
async function jsonBody(req, max = 8 * 1048576) {
  const b = await body(req, max);
  try { return b.length ? JSON.parse(b.toString('utf8')) : {}; } catch (e) { throw fehler(400, 'Ungültige Anfrage.'); }
}
// Schutz gegen Anfragen von fremden Seiten (CSRF): ändernde Anfragen nur von dieser Adresse
function gleicheHerkunft(req) {
  const o = req.headers.origin;
  if (o) { try { return new URL(o).host === req.headers.host; } catch (e) { return false; } }
  return req.headers['sec-fetch-site'] === 'same-origin';
}
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime',
  '.webm': 'video/webm', '.srt': 'application/x-subrip; charset=utf-8', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

// Datei ausliefern, mit ETag und Range (für Audio/Video nötig)
async function datei(req, res, basis, rel, extra) {
  const ziel = path.resolve(basis, rel);
  if (!ziel.startsWith(basis + path.sep)) return senden(res, 404, 'Nicht gefunden');
  let st;
  try { st = await fsp.stat(ziel); } catch (e) { return senden(res, 404, 'Nicht gefunden'); }
  if (!st.isFile()) return senden(res, 404, 'Nicht gefunden');
  const typ = TYPEN[path.extname(ziel).toLowerCase()] || 'application/octet-stream';
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const kopf = Object.assign({ 'Content-Type': typ, ETag: etag, 'Cache-Control': 'private, no-cache', 'Accept-Ranges': 'bytes' }, SICHERHEIT, extra || {});
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, kopf); return res.end(); }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let a = range[1] ? +range[1] : st.size - +range[2], b = range[1] && range[2] ? +range[2] : st.size - 1;
    if (a < 0) a = 0;
    if (a >= st.size || b < a) { res.writeHead(416, Object.assign(kopf, { 'Content-Range': `bytes */${st.size}` })); return res.end(); }
    b = Math.min(b, st.size - 1);
    res.writeHead(206, Object.assign(kopf, { 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }));
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(ziel, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, Object.assign(kopf, { 'Content-Length': st.size }));
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(ziel).pipe(res);
}

// HTML-Seiten des Repositorys mit Server-Ergänzungen ausliefern
function seite(res, name, opt) {
  opt = opt || {};
  let html;
  try { html = fs.readFileSync(path.join(APP, name), 'utf8'); } catch (e) { return senden(res, 404, 'Nicht gefunden'); }
  const build = `${START}-${liveRev}`;
  html = html.replace(/__BUILD__/g, build)
    .replace('<html lang="de"', `<html lang="de" data-server="1"${opt.freigabe ? ` data-freigabe="${opt.freigabe}"` : ''}`)
    .replace('<head>', '<head>\n  <base href="/">');
  // Konto-Infos und Kopfzeile vor das erste Skript setzen
  html = html.replace(/(\s*)<script /, `$1<script src="konto.js?v=${build}-${opt.k || 0}"></script>$1<script src="assets/kopf.js?v=${build}"></script>$1<script `);
  senden(res, 200, html, 'text/html; charset=utf-8', { 'Content-Security-Policy': CSP });
}

// ---------- Rechte ----------
const darfBearbeiten = k => k && (k.rolle === 'admin' || k.rolle === 'support');   // alle Inhalte, Kontoverwaltung
const darfStudio = k => !!k;                                                       // alle Rollen erstellen Lernnuggets
const istAdmin = k => k && k.rolle === 'admin';
// Darf "wer" das Konto "ziel" verwalten?
const darfVerwalten = (wer, ziel) => istAdmin(wer) || (wer && wer.rolle === 'support' && ziel.rolle === 'anwender');

// ---------- API ----------
async function api(req, res, url, s) {
  const k = s && s.konto;
  const m = req.method;
  const p = url.pathname;
  if (m !== 'GET' && m !== 'HEAD' && !gleicheHerkunft(req)) throw fehler(403, 'Anfrage von fremder Seite abgelehnt.');

  if (p === '/api/anmelden' && m === 'POST') {
    const { benutzer, passwort } = await jsonBody(req, 10000);
    const ip = clientIp(req), name = String(benutzer || '').trim().toLowerCase();
    const warte = Math.max(gesperrtFuer('ip:' + ip), gesperrtFuer('u:' + name));
    if (warte) throw fehler(429, `Zu viele Versuche. Bitte in ${warte} Minute${warte === 1 ? '' : 'n'} erneut versuchen.`);
    const konto = kontoVon(name);
    const ok = pruefePasswort(passwort, konto ? konto.hash : DUMMY_HASH) && konto;
    if (!ok || konto.gesperrt) {
      fehlversuch('ip:' + ip); fehlversuch('u:' + name);
      protokoll(req, null, 'anmeldung-fehlgeschlagen', { benutzer: name.slice(0, 40) });
      throw fehler(401, konto && konto.gesperrt && ok ? 'Dieses Konto ist gesperrt. Bitte an den Support wenden.' : 'Benutzername oder Passwort stimmt nicht.');
    }
    versuche.delete('u:' + name);
    konto.letzte_anmeldung = jetzt(); speichereKonten();
    neueSitzung(res, konto);
    protokoll(req, konto, 'anmeldung');
    return json(res, 200, { ok: true, muss_aendern: !!konto.muss_aendern, rolle: konto.rolle });
  }
  if (p === '/api/abmelden' && m === 'POST') {
    if (s) { delete sitzungen[s.key]; speichereSitzungen(); protokoll(req, k, 'abmeldung'); }
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax${CFG.cookieSecure ? '; Secure' : ''}; Max-Age=0`);
    if ((req.headers['content-type'] || '').includes('form')) return weiter(res, '/anmelden');
    return json(res, 200, { ok: true });
  }

  if (!k) throw fehler(401, 'Bitte anmelden.');

  if (p === '/api/ich' && m === 'GET') return json(res, 200, oeffentlichesKonto(k));
  if (p === '/api/passwort' && m === 'POST') {
    const { alt, neu } = await jsonBody(req, 10000);
    if (!pruefePasswort(alt, k.hash)) { fehlversuch('u:' + k.benutzer); throw fehler(400, 'Das bisherige Passwort stimmt nicht.'); }
    const r = passwortRegel(neu); if (r) throw fehler(400, r);
    if (neu === alt) throw fehler(400, 'Bitte ein neues Passwort wählen.');
    k.hash = hashPasswort(neu); k.muss_aendern = false; speichereKonten();
    beendeSitzungenVon(k.id, s.key);
    protokoll(req, k, 'passwort-geaendert');
    return json(res, 200, { ok: true });
  }
  // Bis zur Änderung des Einmal-Passworts ist nichts anderes erlaubt
  if (k.muss_aendern) throw fehler(403, 'Bitte zuerst ein eigenes Passwort festlegen.');

  // --- Konten verwalten (Admin, Support für Anwender) ---
  if (p === '/api/konten' && m === 'GET') {
    if (!darfBearbeiten(k)) throw fehler(403, 'Keine Berechtigung.');
    return json(res, 200, konten.filter(z => darfVerwalten(k, z) || z.id === k.id).map(oeffentlichesKonto));
  }
  if (p === '/api/konten' && m === 'POST') {
    if (!darfBearbeiten(k)) throw fehler(403, 'Keine Berechtigung.');
    const b = await jsonBody(req, 10000);
    const rolle = b.rolle || 'anwender';
    if (!istAdmin(k) && rolle !== 'anwender') throw fehler(403, 'Support kann nur Anwender-Konten anlegen.');
    const { konto, passwort } = neuesKonto({ benutzer: b.benutzer, name: b.name, rolle });
    protokoll(req, k, 'konto-angelegt', { benutzer: konto.benutzer, rolle });
    return json(res, 201, { konto: oeffentlichesKonto(konto), passwort });
  }
  const km = /^\/api\/konten\/([\w-]+)(\/passwort)?$/.exec(p);
  if (km) {
    const ziel = kontoId(km[1]);
    if (!ziel || !darfVerwalten(k, ziel)) throw fehler(404, 'Konto nicht gefunden.');
    if (km[2] && m === 'POST') {
      const pw = einmalPasswort();
      ziel.hash = hashPasswort(pw); ziel.muss_aendern = true; speichereKonten();
      beendeSitzungenVon(ziel.id);
      protokoll(req, k, 'passwort-zurueckgesetzt', { benutzer: ziel.benutzer });
      return json(res, 200, { passwort: pw });
    }
    if (!km[2] && m === 'PATCH') {
      const b = await jsonBody(req, 10000);
      const vorher = { rolle: ziel.rolle, gesperrt: !!ziel.gesperrt };
      if (b.name != null) ziel.name = String(b.name).trim().slice(0, 80) || ziel.benutzer;
      if (b.rolle != null) {
        if (!istAdmin(k)) throw fehler(403, 'Nur Admins ändern Rollen.');
        if (!ROLLEN.includes(b.rolle)) throw fehler(400, 'Unbekannte Rolle.');
        if (ziel.rolle === 'admin' && b.rolle !== 'admin' && adminAnzahl() <= 1) throw fehler(400, 'Es muss mindestens ein aktiver Admin bleiben.');
        ziel.rolle = b.rolle;
      }
      if (b.gesperrt != null) {
        if (ziel.id === k.id) throw fehler(400, 'Das eigene Konto kann nicht gesperrt werden.');
        if (b.gesperrt && ziel.rolle === 'admin' && adminAnzahl() <= 1) throw fehler(400, 'Es muss mindestens ein aktiver Admin bleiben.');
        ziel.gesperrt = !!b.gesperrt;
        if (ziel.gesperrt) beendeSitzungenVon(ziel.id);
      }
      speichereKonten();
      protokoll(req, k, 'konto-geaendert', { benutzer: ziel.benutzer, vorher, nachher: { rolle: ziel.rolle, gesperrt: !!ziel.gesperrt } });
      return json(res, 200, oeffentlichesKonto(ziel));
    }
    if (!km[2] && m === 'DELETE') {
      if (!istAdmin(k)) throw fehler(403, 'Nur Admins löschen Konten.');
      if (ziel.id === k.id) throw fehler(400, 'Das eigene Konto kann nicht gelöscht werden.');
      if (ziel.rolle === 'admin' && adminAnzahl() <= 1) throw fehler(400, 'Es muss mindestens ein aktiver Admin bleiben.');
      konten = konten.filter(z => z.id !== ziel.id); speichereKonten();
      beendeSitzungenVon(ziel.id);
      protokoll(req, k, 'konto-geloescht', { benutzer: ziel.benutzer });
      return json(res, 200, { ok: true });
    }
  }

  // --- Studio: Entwurf, Medien, Veröffentlichen ---
  if (p.startsWith('/api/entwurf') || p.startsWith('/api/medien') || p.startsWith('/api/auftrag') || p === '/api/veroeffentlichen' || p === '/api/probe') {
    if (!darfStudio(k)) throw fehler(403, 'Kein Zugang zum Studio.');
  }
  if (p === '/api/entwurf' && m === 'GET') {
    const e = leseEntwurf();
    const d = e ? e.data : live, version = e ? e.version : 0;
    if (!verlauf.has(version)) merkeVersion(version, d);
    const sicht = darfBearbeiten(k) ? d : nurEigene(d, k);
    return json(res, 200, { data: sicht, version, von: e && e.von, am: e && e.am, liveRev, besitzer: besitzerInfo(d),
      live: darfBearbeiten(k) ? live : nurEigene(live, k) });
  }
  if (p === '/api/entwurf' && m === 'PUT') {
    const b = await jsonBody(req);
    const e = leseEntwurf();
    const aktuell = e ? e.data : live, version = e ? e.version : 0;
    let neu, zusammen = false;
    if (!darfBearbeiten(k)) {
      neu = anwenderEinbauen(aktuell, b.data || {}, k);
    } else if (+b.version === version) {
      neu = b.data;
    } else {
      const basis = verlauf.get(+b.version);
      if (!basis) return json(res, 409, { fehler: 'Der Entwurf wurde inzwischen geändert. Bitte neu laden.' });
      const r = zusammenfuehren(JSON.parse(basis), aktuell, b.data);
      if (r.konflikte.length) return json(res, 409, { fehler: `Gleichzeitig von ${e && e.von ? `„${e.von}“` : 'jemand anderem'} geändert: ${r.konflikte.join(', ')}. Bitte neu laden.` });
      neu = r.data; zusammen = true;
    }
    pruefeInhalte(neu);
    const n = { version: version + 1, von: k.benutzer, am: jetzt(), data: neu };
    schreibeAtomar(ENTWURF, JSON.stringify(n));
    merkeVersion(n.version, neu);
    if (!e) protokoll(req, k, 'entwurf-begonnen');
    const eingereicht = neu.nuggets.filter(x => x.eingereicht && !(aktuell.nuggets.find(a => a.id === x.id) || {}).eingereicht);
    eingereicht.forEach(x => protokoll(req, k, 'eingereicht', { id: x.id, titel: x.titel }));
    const sicht = darfBearbeiten(k) ? neu : nurEigene(neu, k);
    return json(res, 200, { version: n.version, am: n.am, data: zusammen || !darfBearbeiten(k) ? sicht : undefined, besitzer: besitzerInfo(neu) });
  }
  if (p === '/api/entwurf' && m === 'DELETE') {
    if (!darfBearbeiten(k)) throw fehler(403, 'Nur Admin und Support können den Entwurf verwerfen.');
    try { fs.unlinkSync(ENTWURF); } catch (e) { /* schon weg */ }
    protokoll(req, k, 'entwurf-verworfen');
    return json(res, 200, { ok: true });
  }
  if (p === '/api/veroeffentlichen' && m === 'POST') {
    if (!istAdmin(k)) throw fehler(403, 'Nur Admins veröffentlichen.');
    const b = await jsonBody(req);
    let e = leseEntwurf();
    // Letzte Änderungen aus dem Studio vorher übernehmen
    if (b.data && b.version != null) {
      const aktuell = e ? e.data : live, version = e ? e.version : 0;
      let d0 = b.data;
      if (+b.version !== version) {
        const basis = verlauf.get(+b.version);
        if (!basis) throw fehler(409, 'Der Entwurf wurde inzwischen geändert. Bitte neu laden.');
        const r = zusammenfuehren(JSON.parse(basis), aktuell, b.data);
        if (r.konflikte.length) throw fehler(409, `Gleichzeitig geändert: ${r.konflikte.join(', ')}. Bitte neu laden.`);
        d0 = r.data;
      }
      e = { version: version + 1, data: pruefeInhalte(d0) };
    }
    const entwurf = pruefeInhalte(e ? e.data : kopie(live));
    const d = liveAusEntwurf(entwurf);
    // Vorherige Fassung aufheben (die letzten 30)
    const archiv = D('archiv');
    fs.mkdirSync(archiv, { recursive: true });
    fs.copyFileSync(LIVE, path.join(archiv, `inhalte-${jetzt().replace(/[:.]/g, '-')}.js`));
    fs.readdirSync(archiv).sort().slice(0, -30).forEach(f => fs.unlinkSync(path.join(archiv, f)));
    schreibeAtomar(LIVE, alsJS('LERN_DATA', d));
    ladeLive();
    // Was noch nicht live gehen durfte (Anwender-Lernnuggets in Arbeit), bleibt im Entwurf
    const rest = kopie(entwurf);
    rest.nuggets.forEach(n => { delete n.eingereicht; });
    const zurueck = entwurf.nuggets.filter(n => brauchtFreigabe(n) && !n.eingereicht).map(n => n.titel || n.id);
    let neuerEntwurf = null;
    if (gleich(rest, d)) { try { fs.unlinkSync(ENTWURF); } catch (x) { /* kein Entwurf */ } merkeVersion(0, d); }
    else {
      neuerEntwurf = { version: (e ? e.version : 0) + 1, von: k.benutzer, am: jetzt(), data: rest };
      schreibeAtomar(ENTWURF, JSON.stringify(neuerEntwurf)); merkeVersion(neuerEntwurf.version, rest);
    }
    const freigegeben = entwurf.nuggets.filter(n => brauchtFreigabe(n) && n.eingereicht).map(n => n.id);
    protokoll(req, k, 'veroeffentlicht', { nuggets: d.nuggets.length, oeffentlich: d.nuggets.filter(n => n.oeffentlich).map(n => n.id), freigegeben });
    starteAuftrag(k.benutzer, false);
    return json(res, 200, { ok: true, liveRev, live: d, zurueckgehalten: zurueck,
      entwurf: neuerEntwurf ? { data: neuerEntwurf.data, version: neuerEntwurf.version } : { data: d, version: 0 }, besitzer: besitzerInfo(rest) });
  }
  // Probe: einzelnen Satz sofort vertonen (Aussprache testen, Szene anhören) – begrenzt, um Azure-Kontingent zu schonen
  if (p === '/api/probe' && m === 'POST') {
    const b = await jsonBody(req, 60000);
    const text = String(b.text || '').trim().slice(0, 600);
    if (!text) throw fehler(400, 'Kein Text zum Anhören.');
    const t = Date.now(), l = (proben.get(k.id) || []).filter(x => t - x < 3600e3);
    if (l.length >= 80) throw fehler(429, 'Zu viele Proben in der letzten Stunde. Bitte später erneut versuchen.');
    l.push(t); proben.set(k.id, l);
    const dir = D('probe'); fs.mkdirSync(dir, { recursive: true });
    const id = zufall(9), q = path.join(dir, id + '.json'), out = path.join(dir, id + '.mp3');
    fs.writeFileSync(q, JSON.stringify({ text, stimme: b.stimme || null, sprache: b.sprache === 'en' ? 'en' : 'de',
      aussprache: Array.isArray(b.aussprache) ? b.aussprache.slice(0, 500) : undefined, aussprache_modus: b.aussprache_modus || undefined }));
    const args = [path.join(APP, 'tools/tts.py'), '--engine', CFG.engine, '--cache', D('piper-stimmen'), '--probe', q, '--ausgabe', out];
    if (CFG.piper) args.push('--piper', CFG.piper);
    const r = await new Promise(resolve => {
      let log = '';
      const pr = spawn(CFG.python, args, { cwd: APP, env: Object.assign({}, env, { LERN_DATEN: CFG.daten }) });
      const timer = setTimeout(() => pr.kill('SIGKILL'), 45000);
      pr.stdout.on('data', d => { log += d; }); pr.stderr.on('data', d => { log += d; });
      pr.on('error', e => { clearTimeout(timer); resolve({ code: 1, log: e.message }); });
      pr.on('close', code => { clearTimeout(timer); resolve({ code, log }); });
    });
    let mp3 = null;
    try { if (r.code === 0) mp3 = fs.readFileSync(out); } catch (e) { /* fehlt */ }
    for (const f of [q, out]) { try { fs.unlinkSync(f); } catch (e) { /* weg */ } }
    if (!mp3) { console.error('Probe fehlgeschlagen:', r.log.slice(-500)); throw fehler(502, /AZURE_SPEECH_KEY/.test(r.log) ? 'Azure-Schlüssel fehlt auf dem Server.' : 'Die Probe konnte nicht erzeugt werden.'); }
    return senden(res, 200, mp3, 'audio/mpeg');
  }
  if (p === '/api/auftrag' && m === 'GET') return json(res, 200, Object.assign({}, auftrag, { log: auftrag.log.slice(-80), engine: CFG.engine }));
  if (p === '/api/auftrag' && m === 'POST') {
    if (!istAdmin(k)) throw fehler(403, 'Nur Admins.');
    const b = await jsonBody(req, 1000);
    protokoll(req, k, 'neu-vertonen', { alles: !!b.alles });
    starteAuftrag(k.benutzer, !!b.alles);
    return json(res, 202, { ok: true });
  }
  if (p === '/api/medien' && m === 'GET') {
    const dir = D('media');
    const liste = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter(n => MEDIEN_RE.test(n)).map(n => {
      const st = fs.statSync(path.join(dir, n)); return { name: n, groesse: st.size, geaendert: st.mtime.toISOString() };
    });
    return json(res, 200, liste);
  }
  if (p === '/api/medien' && m === 'POST') {
    const roh = String(url.searchParams.get('name') || '');
    const name = path.basename(roh).normalize('NFC').replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^\w.-]+/g, '-').replace(/^[-.]+/, '').slice(0, 100);
    if (!name || !MEDIEN_RE.test(name)) throw fehler(400, 'Erlaubt sind SVG, PNG, JPG, WEBP, MOV, MP4, M4V und WEBM.');
    const len = +req.headers['content-length'] || 0;
    if (len > CFG.maxUploadMB * 1048576) throw fehler(413, `Höchstens ${CFG.maxUploadMB} MB pro Datei.`);
    fs.mkdirSync(D('media'), { recursive: true });
    const tmp = D(`media/.${zufall(6)}.upload`);
    await new Promise((resolve, reject) => {
      let n = 0; const out = fs.createWriteStream(tmp, { mode: 0o640 });
      req.on('data', c => { n += c.length; if (n > CFG.maxUploadMB * 1048576) { req.destroy(); out.destroy(); reject(fehler(413, 'Datei zu groß.')); } });
      req.pipe(out); out.on('finish', resolve); out.on('error', reject); req.on('error', reject);
    }).catch(e => { try { fs.unlinkSync(tmp); } catch (x) { /* egal */ } throw e; });
    fs.renameSync(tmp, D('media/' + name));
    protokoll(req, k, 'medium-hochgeladen', { name });
    return json(res, 201, { name, pfad: 'media/' + name });
  }
  const mm = /^\/api\/medien\/([^/]+)$/.exec(p);
  if (mm && m === 'DELETE') {
    if (!istAdmin(k)) throw fehler(403, 'Nur Admins löschen Medien.');
    const name = path.basename(decodeURIComponent(mm[1]));
    const benutzt = JSON.stringify(live).includes(`media/${name}`) || JSON.stringify((leseEntwurf() || {}).data || {}).includes(`media/${name}`);
    if (benutzt) throw fehler(400, 'Die Datei wird noch verwendet.');
    try { fs.unlinkSync(D('media/' + name)); } catch (e) { throw fehler(404, 'Nicht gefunden.'); }
    protokoll(req, k, 'medium-geloescht', { name });
    return json(res, 200, { ok: true });
  }
  if (p === '/api/protokoll' && m === 'GET') {
    if (!istAdmin(k)) throw fehler(403, 'Nur Admins.');
    let zeilen = [];
    try { zeilen = fs.readFileSync(D('protokoll.log'), 'utf8').trim().split('\n').slice(-300).reverse().map(z => JSON.parse(z)); } catch (e) { /* leer */ }
    return json(res, 200, zeilen);
  }
  throw fehler(404, 'Unbekannte Anfrage.');
}

// ---------- Seiten und Dateien ----------
async function anfrage(req, res) {
  const url = new URL(req.url, 'http://x');
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { return senden(res, 400, 'Ungültige Adresse'); }
  if (p.includes('\0') || p.split('/').includes('..')) return senden(res, 400, 'Ungültige Adresse');
  kontenAktuell();
  const s = sitzungAus(req);
  const k = s && s.konto;
  const bereit = k && !k.muss_aendern;

  if (p.startsWith('/api/')) return api(req, res, url, s);
  if (req.method !== 'GET' && req.method !== 'HEAD') return senden(res, 405, 'Nicht erlaubt');

  // Öffentliche Teile: Anmeldeseite, Programmdateien (CSS/JS/Icons), öffentlich geteilte Lernnuggets
  if (p === '/anmelden' || p === '/anmelden.html') return bereit && !url.searchParams.has('neu') ? weiter(res, '/') : seite(res, 'anmelden.html');
  if (p.startsWith('/assets/')) return datei(req, res, path.join(APP, 'assets'), p.slice(8));
  if (p === '/konto.js') {
    const info = k ? Object.assign(oeffentlichesKonto(k), { rollenname: ROLLENNAME[k.rolle], darf_bearbeiten: darfBearbeiten(k), darf_studio: darfStudio(k), admin: istAdmin(k) }) : null;
    return senden(res, 200, `window.LERN_KONTO = ${JSON.stringify(info)};\n`, 'text/javascript; charset=utf-8');
  }
  const t = /^\/teilen\/([\w-]+)\/?$/.exec(p);
  if (t) {
    const n = live.nuggets.find(x => x.id === t[1]);
    if (n && n.oeffentlich) return seite(res, 'index.html', { freigabe: n.id, k: k ? 1 : 0 });
    if (bereit && n) return weiter(res, `/#/nugget/${n.id}`);
    return senden(res, 404, 'Dieses Lernnugget ist nicht öffentlich geteilt.');
  }
  if (p === '/data/inhalte.js') {
    const d = bereit ? live : Object.assign({}, live, { nuggets: oeffentlich() });
    return senden(res, 200, alsJS('LERN_DATA', d), 'text/javascript; charset=utf-8', { 'Cache-Control': 'private, no-cache' });
  }
  if (/^\/(audio|media|downloads)\//.test(p)) {
    const rel = p.slice(1);
    if (!bereit) {
      if (rel === 'downloads/index.js') {
        const alle = leseJSON(D('downloads/index.json'), null) || (() => { try { return leseJS(D('downloads/index.js')); } catch (e) { return {}; } })();
        const frei = Object.fromEntries(Object.entries(alle).filter(([id]) => oeffentlich().some(n => n.id === id)));
        return senden(res, 200, alsJS('LERN_DOWNLOADS', frei), 'text/javascript; charset=utf-8');
      }
      if (!freieDateien().has(rel)) return senden(res, 401, 'Bitte anmelden.');
    }
    if (/\/_index\.json$|\.tmp$|\.upload$/.test(rel)) return senden(res, 404, 'Nicht gefunden');
    // Noch nicht erzeugte Verzeichnisse (vor der ersten Vertonung) als leere Liste ausliefern
    const leer = { 'downloads/index.js': 'LERN_DOWNLOADS', 'audio/stimmen/index.js': 'LERN_STIMMEN_INFO' }[rel];
    if (leer && !fs.existsSync(D(rel))) return senden(res, 200, alsJS(leer, leer === 'LERN_DOWNLOADS' ? {} : { engine: CFG.engine, stimmen: {} }), 'text/javascript; charset=utf-8');
    // Hochgeladene SVGs dürfen nie als eigene Seite Skripte ausführen
    const extra = rel.startsWith('media/') ? { 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox" } : null;
    return datei(req, res, CFG.daten, rel, extra);
  }

  // Ab hier nur mit Anmeldung
  if (!k) return weiter(res, '/anmelden?weiter=' + encodeURIComponent(p + url.search));
  if (k.muss_aendern) return weiter(res, '/anmelden?neu');
  if (p === '/' || p === '/index.html') return seite(res, 'index.html', { k: 1 });
  if (p === '/konto' || p === '/konto.html') return seite(res, 'konto.html', { k: 1 });
  if (p === '/studio' || p === '/studio.html') return darfStudio(k) ? seite(res, 'studio.html', { k: 1 }) : weiter(res, '/');
  if (p === '/verwaltung' || p === '/verwaltung.html') return darfBearbeiten(k) ? seite(res, 'verwaltung.html', { k: 1 }) : weiter(res, '/');
  return senden(res, 404, 'Nicht gefunden');
}

// ---------- Erster Start: Inhalte aus dem Repository übernehmen ----------
function einrichten() {
  fs.mkdirSync(CFG.daten, { recursive: true });
  for (const dir of ['data', 'media', 'audio', 'downloads', 'archiv']) fs.mkdirSync(D(dir), { recursive: true });
  if (!fs.existsSync(LIVE)) {
    fs.copyFileSync(path.join(APP, 'data/inhalte.js'), LIVE);
    for (const dir of ['media', 'audio']) {
      const q = path.join(APP, dir);
      if (fs.existsSync(q)) fs.cpSync(q, D(dir), { recursive: true, force: false, errorOnExist: false });
    }
    console.log(`Inhalte aus ${APP} nach ${CFG.daten} übernommen.`);
    return true;
  }
  return false;
}

// ---------- Kommandozeile ----------
const [befehl, arg1, ...rest] = process.argv.slice(2);
if (befehl === 'admin-anlegen' || befehl === 'passwort-neu') {
  einrichten();
  if (befehl === 'admin-anlegen') {
    try {
      const { konto, passwort } = neuesKonto({ benutzer: arg1, name: rest.join(' ') || arg1, rolle: 'admin' });
      protokoll(null, null, 'konto-angelegt', { benutzer: konto.benutzer, rolle: 'admin', ueber: 'konsole' });
      console.log(`Admin „${konto.benutzer}“ angelegt.\nEinmal-Passwort: ${passwort}\nBeim ersten Anmelden muss ein eigenes Passwort gewählt werden.`);
    } catch (e) { console.error(e.message); process.exit(1); }
  } else {
    const konto = kontoVon(arg1);
    if (!konto) { console.error(`Kein Konto „${arg1}“.`); process.exit(1); }
    const pw = einmalPasswort();
    konto.hash = hashPasswort(pw); konto.muss_aendern = true; konto.gesperrt = false; konto.gen = (konto.gen || 0) + 1;
    speichereKonten();
    protokoll(null, null, 'passwort-zurueckgesetzt', { benutzer: konto.benutzer, ueber: 'konsole' });
    console.log(`Einmal-Passwort für „${konto.benutzer}“: ${pw}`);
  }
  process.exit(0);
} else if (befehl) {
  console.error('Unbekannter Befehl. Möglich: admin-anlegen <name> [Anzeigename] | passwort-neu <name>');
  process.exit(1);
}

// ---------- Start ----------
const erstStart = einrichten();
ladeLive();
if (!konten.some(k => k.rolle === 'admin')) console.warn('Noch kein Admin-Konto. Anlegen mit: node server/server.js admin-anlegen <name>');
http.createServer((req, res) => {
  anfrage(req, res).catch(e => {
    const st = e.status || 500;
    if (st >= 500) console.error(e);
    if (res.headersSent) return res.end();
    json(res, st, { fehler: st === 500 ? 'Interner Fehler.' : e.message });
  });
}).listen(CFG.port, CFG.host, () => {
  console.log(`Lernnuggets läuft auf http://${CFG.host}:${CFG.port} (Daten: ${CFG.daten}, Sprachausgabe: ${CFG.engine})`);
  // Beim ersten Start oder wenn noch keine Videos da sind: einmal vertonen und Videos bauen
  if (erstStart || !fs.existsSync(D('downloads/index.js'))) starteAuftrag('start', false);
});
