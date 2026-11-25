/*
 * Studio – Redaktionsoberfläche für die Lernnuggets.
 * Zwei Betriebsarten:
 *  - GitHub Pages: alles läuft im Browser, eigene Dateien nur lokal (Blob-URL); Ergebnis ist eine neue
 *    data/inhalte.js, die über die GitHub-Weboberfläche hochgeladen wird.
 *  - Eigener Server (window.LERN_KONTO vorhanden): gemeinsamer Entwurf auf dem Server, Medien werden
 *    hochgeladen, Admins veröffentlichen direkt; Vertonung und Videos entstehen auf dem Server.
 */
(function () {
  'use strict';

  const ICONS = window.LERN_ICONS || {};
  const SZ = window.LERN_SZENE;
  const KEY_STUDIO = 'lernnuggets-studio';     // sauberer Entwurf (mit media/-Pfaden)
  const KEY_PREVIEW = 'lernnuggets-entwurf';   // Vorschau (lokale Dateien als Blob-URL)
  const VIDEO_RE = /\.(mov|mp4|m4v|webm)$/i;
  const BILD_RE = /\.(svg|png|jpe?g|webp)$/i;
  const DAUERN = [['', 'automatisch'], ['3', '3 Sekunden'], ['5', '5 Sekunden'], ['10', '10 Sekunden']];
  // Schlichte Linien-Icons statt Sonderzeichen
  const ICO = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-7 7 1.4 1.4L11 8.8V19h2V8.8l4.6 4.6L19 12z"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l7-7-1.4-1.4-4.6 4.6V5h-2v10.2l-4.6-4.6L5 12z"/></svg>',
    dup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM4 7h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v11h11V9z"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7zm3 2v8h2v-8zm4 0v8h2v-8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5L5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg>'
  };
  const KATALOG = window.LERN_STIMMEN || { standard: 'thorsten', stimmen: [] };
  const STIMMINFO = (window.LERN_STIMMEN_INFO || {}).stimmen || {};
  const ENGINE = (window.LERN_STIMMEN_INFO || {}).engine || 'piper';
  const KONTO = window.LERN_KONTO || null;
  const SERVER = !!KONTO;
  const ADMIN = SERVER && KONTO.rolle === 'admin';
  const ERSTELLER = SERVER && KONTO.rolle === 'anwender';   // sieht und bearbeitet nur eigene Lernnuggets
  let BESITZER = {};                                         // benutzer → { name, freigabe } (vom Server)

  // ---------- Stimmen ----------
  // Auswahl mit Hörprobe; erben = Bezeichnung der geerbten Ebene oder null (Plattform-Standard)
  const spracheVon = v => (v && v.sprache) || 'de';
  const KAT_STANDARD = { de: KATALOG.standard || 'thorsten', en: KATALOG.standard_en || 'cori' };
  function voiceSelect(sel, erben, scope, lang) {
    lang = lang || 'de';
    const opts = KATALOG.stimmen.filter(v => spracheVon(v) === lang).map(v => `<option value="${esc(v.id)}" ${v.id === sel ? 'selected' : ''}>${esc(stimmLabel(v))}</option>`).join('');
    const unknown = sel && !KATALOG.stimmen.some(v => v.id === sel && spracheVon(v) === lang) ? `<option value="${esc(sel)}" selected>${esc(sel)} (unbekannt)</option>` : '';
    return `<div class="voice-row" data-voice="${scope}">
      <select data-vf="sel" aria-label="Stimme">${erben ? `<option value="" ${!sel ? 'selected' : ''}>${esc(erben)}</option>` : ''}${unknown}${opts}</select>
      <button type="button" class="ctrl" data-vf="play" title="Hörprobe abspielen">Probe anhören</button>
      <span class="voice-info" data-vf="info">${voiceInfo(sel)}</span></div>`;
  }
  // Angezeigter Name passend zur aktiven Sprachausgabe (unter Azure spricht z. B. Conrad statt Thorsten)
  function stimmLabel(v) {
    if (ENGINE === 'azure') {
      const n = v.azure_name || v.name;
      return n === v.name || !v.modell ? `${n}, ${v.beschreibung.replace(/,?\s*nur Azure$/, '')}` : `${n} (Azure-Stimme für ${v.name}), ${v.beschreibung}`;
    }
    if (!v.modell) {
      const std = KATALOG.stimmen.find(x => x.id === KAT_STANDARD[spracheVon(v)]);
      return `${v.name}, nur mit Azure (bis dahin spricht ${std ? std.name : 'die Standardstimme'})`;
    }
    return `${v.name}, ${v.beschreibung}`;
  }
  function voiceInfo(id) {
    const i = id && STIMMINFO[id];
    const v = id && KATALOG.stimmen.find(x => x.id === id);
    if (v && !v.modell && ENGINE !== 'azure') return 'Diese Stimme gibt es nur mit Azure. Die Sprachausgabe läuft gerade mit Piper.';
    if (!i) return '';
    return ENGINE === 'azure' ? `Azure-Stimme ${esc(i.qualitaet)}, ${esc(i.lizenz)}` : `Lizenz: ${esc(i.lizenz)}`;
  }
  let hoerprobe = null;
  function bindVoice(root, get, set, fallback) {
    const sel = root.querySelector('[data-vf="sel"]'), btn = root.querySelector('[data-vf="play"]'), info = root.querySelector('[data-vf="info"]');
    sel.addEventListener('change', () => { set(sel.value || null); info.innerHTML = voiceInfo(sel.value); save(); });
    btn.addEventListener('click', () => {
      const id = sel.value || fallback();
      if (hoerprobe) { hoerprobe.pause(); const war = hoerprobe._btn; hoerprobe = null; if (war) war.textContent = 'Probe anhören'; if (war === btn) return; }
      const a = new Audio(`audio/stimmen/${encodeURIComponent(id)}.mp3`);
      a._btn = btn; hoerprobe = a;
      btn.textContent = '… lädt';
      a.addEventListener('playing', () => { btn.textContent = 'Stoppen'; });
      a.addEventListener('ended', () => { btn.textContent = 'Probe anhören'; if (hoerprobe === a) hoerprobe = null; });
      a.addEventListener('error', () => { btn.textContent = 'Probe anhören'; if (hoerprobe === a) hoerprobe = null; info.textContent = 'Hörprobe noch nicht erzeugt – entsteht beim nächsten Veröffentlichen.'; });
      a.play().catch(() => {});
    });
  }
  const standardStimme = lang => lang === 'en' ? (data.meta.stimme_en || KAT_STANDARD.en) : (data.meta.stimme || KAT_STANDARD.de);
  const stimmeVon = (n, sc) => (sc && sc.stimme) || (n && n.stimme) || standardStimme(n && n.sprache);
  const passtZu = (id, lang) => { const v = KATALOG.stimmen.find(x => x.id === id); return !v || spracheVon(v) === (lang || 'de'); };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = SZ.esc;
  const fmtS = d => d == null ? '' : (Math.round(d * 10) / 10).toLocaleString('de-DE') + ' s';
  const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'nugget';
  const fileOf = p => String(p || '').split('/').pop();

  let published = clone(window.LERN_DATA);

  // ---------- Entwurf mit der veröffentlichten Version abgleichen ----------
  // Gespeichert wird { original, data }: original = veröffentlichter Stand beim Start des Entwurfs.
  // Hat sich die veröffentlichte Version seitdem geändert, werden unbearbeitete Lernnuggets aktualisiert
  // und neue übernommen; eigene Änderungen bleiben erhalten.
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let draftOriginal = clone(published);
  let mergeHinweis = '';
  function ladeEntwurf() {
    const saved = store.get(KEY_STUDIO);
    if (!saved) return clone(published);
    const legacy = !saved.data;                      // ältere Entwürfe ohne Ausgangsstand
    const draft = legacy ? saved : saved.data;
    const orig = legacy ? null : saved.original;
    if (orig && same(orig, published)) return draft;
    if (orig && same(orig, draft)) return clone(published);   // nichts bearbeitet → einfach aktuell
    const pubById = new Map(published.nuggets.map(n => [n.id, n]));
    const origById = new Map((orig ? orig.nuggets : []).map(n => [n.id, n]));
    const draftIds = new Set(draft.nuggets.map(n => n.id));
    const neu = [], aktualisiert = [];
    const nuggets = [];
    draft.nuggets.forEach(n => {
      const o = origById.get(n.id), pub = pubById.get(n.id);
      if (o && same(o, n)) { if (pub) { if (!same(pub, n)) aktualisiert.push(pub.titel); nuggets.push(clone(pub)); } }   // unbearbeitet → aktuelle Fassung
      else nuggets.push(n);                                                  // selbst bearbeitet oder neu angelegt
    });
    published.nuggets.forEach(pub => {
      if (!draftIds.has(pub.id) && !origById.has(pub.id)) { nuggets.push(clone(pub)); neu.push(pub.titel); }
    });
    const kat = draft.kategorien.slice();
    published.kategorien.forEach(k => { if (!kat.some(x => x.id === k.id)) kat.push(clone(k)); });
    const meta = orig && same(orig.meta, draft.meta) ? clone(published.meta) : Object.assign({}, published.meta, draft.meta, { version: published.meta.version });
    if (neu.length || aktualisiert.length) {
      mergeHinweis = [neu.length ? `Neu aus der veröffentlichten Version übernommen: ${neu.join(', ')}.` : '',
        aktualisiert.length ? `Aktualisiert: ${aktualisiert.join(', ')}.` : ''].filter(Boolean).join(' ');
    }
    return Object.assign({}, draft, { meta, kategorien: kat, nuggets });
  }
  const speichereEntwurf = () => SERVER ? true : store.set(KEY_STUDIO, { original: draftOriginal, data });
  let data = SERVER ? clone(published) : ladeEntwurf();
  data.meta = data.meta || {};
  let cur = data.nuggets.length ? 0 : -1;     // -1 = Einstellungen

  // ---------- Medienbibliothek ----------
  // name -> { name, url, source: 'lokal'|'repo', kind: 'bild'|'video', duration, w, h, ok, size, inRepo }
  const lib = new Map();
  const libList = document.getElementById('lib-list');
  const kindOf = name => VIDEO_RE.test(name) ? 'video' : 'bild';
  // Pfad aus den Daten → abspielbare URL (lokale Datei hat Vorrang)
  const urlOf = p => { const e = p && lib.get(fileOf(p)); return e && (e.source === 'lokal' || e.source === 'upload') ? e.url : p; };

  function probe(entry) {
    entry.ok = null;
    let finished = false, t = 0;
    const finish = (ok, info) => {
      if (finished) return; finished = true; clearTimeout(t);
      entry.ok = ok;
      if (ok && info) Object.assign(entry, info);
      drawLib(); renderEditor(true);
    };
    t = setTimeout(() => finish(false), 10000);
    if (entry.kind === 'bild') {
      const im = new Image();
      im.onload = () => finish(true, { w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => finish(false);
      im.src = entry.url;
      return;
    }
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true;
    v.addEventListener('loadeddata', () => {
      const ok = v.videoWidth > 0;
      finish(ok, { duration: v.duration, w: v.videoWidth, h: v.videoHeight });
      v.removeAttribute('src'); v.load();
    }, { once: true });
    v.addEventListener('error', () => finish(false), { once: true });
    v.src = entry.url;
  }

  function addLocalFiles(files) {
    if (SERVER) return hochladen(files);
    [...files].filter(f => VIDEO_RE.test(f.name) || BILD_RE.test(f.name)).forEach(f => {
      const old = lib.get(f.name);
      if (old && old.source === 'lokal') URL.revokeObjectURL(old.url);
      const e = { name: f.name, url: URL.createObjectURL(f), source: 'lokal', kind: kindOf(f.name), size: f.size,
        inRepo: !!(old && (old.source === 'repo' || old.inRepo)) };
      lib.set(f.name, e); probe(e);
    });
    drawLib(); renderEditor(true);
  }

  function libItem(e) {
    let st;
    if (e.ok === null) st = '<span class="st">wird geprüft …</span>';
    else if (!e.ok) st = e.kind === 'video'
      ? '<span class="st bad">Im Browser nicht abspielbar, vermutlich ProRes. Als H.264 ausgeben oder eine Grafik verwenden.</span>'
      : '<span class="st bad">Bild kann nicht geladen werden.</span>';
    else st = `<span class="st good">Bereit: ${e.kind === 'video' ? fmtS(e.duration) + ', ' : ''}${e.w} × ${e.h} px</span>`;
    const big = !SERVER && e.size > 25 * 1024 * 1024 ? '<span class="st bad">Größer als 25 MB – Web-Upload bei GitHub nicht möglich</span>' : '';
    const prev = e.ok === false ? '<span class="vthumb-x">!</span>'
      : e.kind === 'video' ? `<video src="${esc(e.url)}" muted preload="metadata" data-end></video>`
        : `<img src="${esc(e.url)}" alt="">`;
    const where = e.source === 'upload' ? (e.fehler ? `<span class="bad">${esc(e.fehler)}</span>` : 'Wird hochgeladen …')
      : SERVER ? 'Auf dem Server' : e.source === 'lokal' ? (e.inRepo ? 'Lokal geladen, auch im Repository' : 'Lokal geladen, noch nicht hochgeladen') : 'Im Repository (media/)';
    return `<li class="lib-item">${prev}<div><div class="nm">${esc(e.name)}</div>${st}<div class="st">${where}</div>${big}</div></li>`;
  }

  function drawLib() {
    const items = [...lib.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!items.length) { libList.innerHTML = '<li class="small">Noch keine Dateien geladen.</li>'; return; }
    const g = items.filter(e => e.kind === 'bild'), v = items.filter(e => e.kind === 'video');
    libList.innerHTML = (g.length ? `<li class="lib-h">Bilder (${g.length})</li>${g.map(libItem).join('')}` : '')
      + (v.length ? `<li class="lib-h">Videos (${v.length})</li>${v.map(libItem).join('')}` : '');
    libList.querySelectorAll('video[data-end]').forEach(endFrame);
  }

  function endFrame(v) {
    const seek = () => { if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05); };
    if (v.readyState >= 1) seek(); else v.addEventListener('loadedmetadata', seek, { once: true });
  }

  // Dateien im Repository-Ordner media/ über die öffentliche GitHub-API auflisten (nur auf *.github.io)
  const repo = (() => {
    const h = location.hostname;
    if (!h.endsWith('.github.io')) return null;
    const owner = h.split('.')[0];
    const first = location.pathname.split('/').filter(Boolean)[0];
    const name = first && !/\.html$/.test(first) ? first : `${owner}.github.io`;
    return { owner, name };
  })();
  const repoInfo = document.getElementById('repo-info');
  if (SERVER) {
    document.getElementById('lib-text').textContent = 'Grafiken (SVG, PNG), Hintergrundbilder (JPG, PNG) und Videos (.mov, .mp4). Neue Dateien werden auf den Server hochgeladen und stehen allen im Studio zur Verfügung.';
    ladeMedien();
  } else if (repo) {
    repoInfo.textContent = 'Lade Dateien aus dem Repository …';
    fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}/contents/media`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(list => {
        const files = list.filter(f => f.type === 'file' && (VIDEO_RE.test(f.name) || BILD_RE.test(f.name)));
        files.forEach(f => {
          const ex = lib.get(f.name);
          if (ex && ex.source === 'lokal') { ex.inRepo = true; return; }
          if (ex) return;
          const e = { name: f.name, url: 'media/' + f.name, source: 'repo', kind: kindOf(f.name), size: f.size };
          lib.set(f.name, e); probe(e);
        });
        repoInfo.textContent = `${files.length} Datei(en) im Repository ${repo.owner}/${repo.name} gefunden.`;
        drawLib(); renderEditor(true);
      })
      .catch(() => { repoInfo.textContent = 'Ordner media/ im Repository ist noch leer.'; });
  } else {
    repoInfo.textContent = 'Lokal geöffnet: Dateien aus media/ werden erst auf GitHub Pages automatisch aufgelistet.';
  }
  // ---------- Eigener Server ----------
  async function api(pfad, methode, daten, roh) {
    const r = await fetch(pfad, { method: methode || 'GET', credentials: 'same-origin',
      headers: roh ? { 'Content-Type': 'application/octet-stream' } : daten ? { 'Content-Type': 'application/json' } : {},
      body: roh || (daten ? JSON.stringify(daten) : undefined) });
    let j = null;
    try { j = await r.json(); } catch (e) { /* leer */ }
    if (r.status === 401) { location.href = '/anmelden?weiter=/studio'; throw new Error('Bitte neu anmelden.'); }
    if (!r.ok) { const e = new Error((j && j.fehler) || `Fehler ${r.status}`); e.status = r.status; e.daten = j; throw e; }
    return j;
  }
  function ladeMedien() {
    repoInfo.textContent = 'Lade Dateien vom Server …';
    api('/api/medien').then(list => {
      list.forEach(f => {
        const ex = lib.get(f.name);
        if (ex && ex.source === 'server' && ex.size === f.groesse) return;
        const e = { name: f.name, url: 'media/' + encodeURIComponent(f.name) + '?t=' + Date.parse(f.geaendert), source: 'server', kind: kindOf(f.name), size: f.groesse };
        lib.set(f.name, e); probe(e);
      });
      repoInfo.textContent = `${list.length} Datei(en) auf dem Server.`;
      drawLib(); renderEditor(true);
    }).catch(e => { repoInfo.textContent = e.message; });
  }
  async function hochladen(files) {
    const liste = [...files].filter(f => VIDEO_RE.test(f.name) || BILD_RE.test(f.name));
    if (!liste.length) { repoInfo.textContent = 'Nur SVG, PNG, JPG, WEBP, MOV, MP4, M4V und WEBM sind möglich.'; return; }
    for (const f of liste) {
      const e = { name: f.name, url: URL.createObjectURL(f), source: 'upload', kind: kindOf(f.name), size: f.size, ok: null };
      lib.set(f.name, e); drawLib();
      try {
        const r = await api('/api/medien?name=' + encodeURIComponent(f.name), 'POST', null, f);
        URL.revokeObjectURL(e.url); lib.delete(f.name);
        const ne = { name: r.name, url: r.pfad + '?t=' + Date.now(), source: 'server', kind: kindOf(r.name), size: f.size };
        lib.set(r.name, ne); probe(ne);
      } catch (err) { e.fehler = err.message; e.ok = false; drawLib(); }
    }
    drawLib(); renderEditor(true);
  }

  // bereits referenzierte Dateien aufnehmen, damit Status sichtbar ist
  function referenced(d) {
    const out = new Set();
    const bgs = [d.meta.hintergrund];
    d.nuggets.forEach(n => {
      bgs.push(n.hintergrund);
      n.szenen.forEach(sc => { if (sc.video) out.add(sc.video); if (sc.grafik) out.add(sc.grafik); bgs.push(sc.hintergrund); });
    });
    bgs.forEach(b => { if (b && b.bild) out.add(b.bild); });
    return out;
  }
  function referenzenAufnehmen() {
    if (SERVER) return;   // auf dem Server listet /api/medien alle Dateien
    referenced(data).forEach(p => {
      const nm = fileOf(p);
      if (!lib.has(nm)) { const e = { name: nm, url: p, source: 'repo', kind: kindOf(nm) }; lib.set(nm, e); probe(e); }
    });
  }

  const fileIn = document.getElementById('file-in');
  fileIn.addEventListener('change', () => { addLocalFiles(fileIn.files); fileIn.value = ''; });
  const drop = document.getElementById('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addLocalFiles(e.dataTransfer.files));
  drawLib();

  // ---------- Speichern ----------
  const saveState = document.getElementById('save-state');
  let saveT = 0;
  function cleanBg(bg) {
    if (!bg) return null;
    if (bg.bild) return { bild: bg.bild, farbe: SZ.normHex(bg.farbe) || '#ffffff' };
    const f = SZ.normHex(bg.farbe);
    return f ? { farbe: f } : null;
  }
  function cleanData(d) {
    const out = clone(d);
    const mb = cleanBg(out.meta.hintergrund); if (mb) out.meta.hintergrund = mb; else delete out.meta.hintergrund;
    out.nuggets.forEach(n => {
      n.schlagwoerter = (n.schlagwoerter || []).map(s => s.trim()).filter(Boolean);
      if (!n.stimme) delete n.stimme;
      if (!n.eingereicht) delete n.eingereicht;
      if (n.sprache !== 'en') delete n.sprache;
      const nb = cleanBg(n.hintergrund); if (nb) n.hintergrund = nb; else delete n.hintergrund;
      n.szenen.forEach(sc => {
        ['sprechtext', 'video', 'grafik', 'stichwort', 'stimme', 'darstellung'].forEach(k => { if (sc[k] === '' || sc[k] == null) delete sc[k]; });
        if (!sc.grafik) delete sc.darstellung;
        if (!sc.video) delete sc.laenge;
        if (!(+sc.mindestdauer > 0)) delete sc.mindestdauer; else sc.mindestdauer = +sc.mindestdauer;
        const sb = cleanBg(sc.hintergrund); if (sb) sc.hintergrund = sb; else delete sc.hintergrund;
      });
      if (!n.quiz || !n.quiz.length) delete n.quiz;
    });
    return out;
  }
  // Vorschau: lokal geladene Dateien als Blob-URL einsetzen
  function previewData() {
    const d = cleanData(data);
    const loc = p => { const e = p && lib.get(fileOf(p)); return e && e.source === 'lokal' ? e.url : p; };
    const fixBg = b => { if (b && b.bild) b.bild = loc(b.bild); };
    fixBg(d.meta.hintergrund);
    d.nuggets.forEach(n => {
      fixBg(n.hintergrund);
      n.szenen.forEach(sc => { if (sc.video) sc.video = loc(sc.video); if (sc.grafik) sc.grafik = loc(sc.grafik); fixBg(sc.hintergrund); });
    });
    return d;
  }
  const isDirty = () => JSON.stringify(cleanData(data)) !== JSON.stringify(cleanData(published));
  // Server: gemeinsamer Entwurf mit Versionsnummer (verhindert, dass zwei Personen sich gegenseitig überschreiben)
  const srv = { version: 0, offen: false, laeuft: false, konflikt: false, von: null, am: null };
  const uhr = iso => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  function zeigeStand() {
    if (srv.konflikt) return;
    saveState.textContent = srv.offen || srv.laeuft ? 'Speichert …'
      : !isDirty() ? 'Keine Änderungen gegenüber der veröffentlichten Fassung'
      : `Entwurf gespeichert${srv.am ? ' um ' + uhr(srv.am) : ''}${srv.von && srv.von !== KONTO.benutzer ? ` (zuletzt von ${srv.von})` : ''}, noch nicht veröffentlicht`;
  }
  async function serverSpeichern() {
    if (srv.laeuft || srv.konflikt) { srv.offen = true; return; }
    srv.offen = false; srv.laeuft = true; zeigeStand();
    try {
      const gesendet = cleanData(data);
      const r = await api('/api/entwurf', 'PUT', { version: srv.version, data: gesendet });
      srv.version = r.version; srv.am = r.am; srv.von = KONTO.benutzer;
      if (r.besitzer) BESITZER = r.besitzer;
      if (r.data) uebernehme(gesendet, r.data);
    } catch (e) {
      if (e.status === 409) {
        srv.konflikt = true;
        saveState.innerHTML = `${esc(e.message)} <button class="linkbtn on-dark" type="button" id="btn-neu-laden">Neu laden</button>`;
        document.getElementById('btn-neu-laden').addEventListener('click', () => location.reload());
      } else { saveState.textContent = `Nicht gespeichert: ${e.message}`; srv.offen = true; }
    }
    srv.laeuft = false;
    if (srv.offen && !srv.konflikt) { clearTimeout(saveT); saveT = setTimeout(serverSpeichern, 1500); }
    zeigeStand();
  }
  // Stand vom Server übernehmen (Änderungen anderer), ohne die laufende Eingabe zu stören
  function uebernehme(gesendet, neu) {
    const curId = data.nuggets[cur] && data.nuggets[cur].id;
    const lokal = new Map(data.nuggets.map(n => [n.id, n])), sent = new Map(gesendet.nuggets.map(n => [n.id, n]));
    const geaendert = new Set();
    const liste = [];
    neu.nuggets.forEach(n => {
      const l = lokal.get(n.id), g = sent.get(n.id);
      if (l && g && same(g, n)) liste.push(l);          // unverändert → lokales Objekt (evtl. mit neuen Eingaben)
      else if (!l && g) { /* inzwischen lokal gelöscht */ }
      else { liste.push(n); geaendert.add(n.id); }
    });
    data.nuggets.forEach(l => { if (!sent.has(l.id) && !neu.nuggets.some(n => n.id === l.id)) liste.push(l); });   // lokal neu
    data.nuggets = liste;
    if (!same(gesendet.meta, neu.meta) && !ERSTELLER) data.meta = neu.meta;
    if (!same(gesendet.kategorien, neu.kategorien)) data.kategorien = neu.kategorien;
    const i = data.nuggets.findIndex(n => n.id === curId);
    if (cur !== -1) cur = i >= 0 ? i : (data.nuggets.length ? 0 : -1);
    renderNav();
    if (geaendert.has(curId) || i < 0) renderEditor();
  }
  // Freigabe: Lernnuggets von Anwendern gehen erst live, wenn sie eingereicht sind
  const brauchtFreigabe = n => SERVER && !!n.besitzer && (ERSTELLER ? n.besitzer === KONTO.benutzer : !BESITZER[n.besitzer] || BESITZER[n.besitzer].freigabe);
  const besitzerName = n => (BESITZER[n.besitzer] && BESITZER[n.besitzer].name) || n.besitzer;
  const freigabeText = n => !brauchtFreigabe(n) ? '' : n.eingereicht ? 'zur Freigabe eingereicht' : 'in Arbeit';
  function save() {
    clearTimeout(saveT);
    if (SERVER) { srv.offen = true; zeigeStand(); saveT = setTimeout(serverSpeichern, 900); return; }
    saveT = setTimeout(() => {
      const ok = speichereEntwurf();
      saveState.textContent = !ok ? 'Entwurf konnte nicht im Browser gespeichert werden'
        : isDirty() ? 'Entwurf gespeichert (in diesem Browser, noch nicht veröffentlicht)' : 'Keine Änderungen gegenüber der veröffentlichten Version';
    }, 300);
  }

  // ---------- Navigation ----------
  const listEl = document.getElementById('nugget-list');
  const settingsBtn = document.getElementById('btn-settings');
  function renderNav() {
    const kat = Object.fromEntries(data.kategorien.map(k => [k.id, k.name]));
    settingsBtn.setAttribute('aria-current', cur === -1);
    listEl.innerHTML = data.nuggets.map((n, i) => `<li><button data-i="${i}" aria-current="${i === cur}">
      <span>${esc(n.titel || '(ohne Titel)')}</span><small>${[n.sprache === 'en' ? 'Englisch' : '', esc(kat[n.kategorie] || ''), n.szenen.length + ' Szenen', n.freigabestatus === 'freigegeben' ? 'fachlich freigegeben' : '', SERVER && n.oeffentlich ? 'öffentlich geteilt' : '',
        !ERSTELLER && brauchtFreigabe(n) ? `von ${esc(besitzerName(n))}` : '', freigabeText(n)].filter(Boolean).join(', ')}</small></button></li>`).join('');
    const akt = data.nuggets[cur];
    document.getElementById('bar-kontext').textContent = cur === -1 ? 'Studio' : 'Lernnugget bearbeiten';
    document.getElementById('bar-name').textContent = cur === -1 ? (ERSTELLER ? 'Meine Lernnuggets' : 'Einstellungen der Plattform') : akt ? (akt.titel || '(ohne Titel)') : 'Inhalte';
    listEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { cur = +b.dataset.i; renderAll(); editor.focus(); }));
  }
  settingsBtn.addEventListener('click', () => { cur = -1; renderAll(); editor.focus(); });

  document.getElementById('btn-new').addEventListener('click', () => {
    // Auf dem Server eindeutige ID, weil Anwender die Lernnuggets der anderen nicht sehen
    let id = SERVER ? 'nugget-' + Date.now().toString(36) : 'neues-nugget', k = 2;
    while (data.nuggets.some(n => n.id === id)) id = 'neues-nugget-' + k++;
    data.nuggets.push({
      id, titel: 'Neues Lernnugget', kategorie: data.kategorien[0].id, schlagwoerter: [], kurztext: '', lernziel: '', langtext: '',
      quelle: '', freigabestatus: 'entwurf', ...(SERVER ? { besitzer: KONTO.benutzer } : {}),
      szenen: [{ icon: 'report', animation: 'fade', stichwort: '', text: '' }], quiz: []
    });
    if (SERVER && !BESITZER[KONTO.benutzer]) BESITZER[KONTO.benutzer] = { name: KONTO.name, freigabe: ERSTELLER };
    cur = data.nuggets.length - 1; renderAll(); save();
    const t = editor.querySelector('[data-f="titel"]'); if (t) { t.focus(); t.select(); }
  });
  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (SERVER) {
      if (!confirm('Den gemeinsamen Entwurf verwerfen? Alle noch nicht veröffentlichten Änderungen gehen für alle verloren.')) return;
      try { await api('/api/entwurf', 'DELETE'); } catch (e) { alert(e.message); return; }
      store.del(KEY_PREVIEW); location.reload(); return;
    }
    if (!confirm('Alle Änderungen in diesem Browser verwerfen und die veröffentlichte Version laden?')) return;
    data = clone(published); store.del(KEY_STUDIO); store.del(KEY_PREVIEW); cur = 0; renderAll(); save();
  });

  // ---------- Bausteine ----------
  const editor = document.getElementById('editor');
  const field = (label, f, val, opt = {}) => {
    const attrs = `data-f="${f}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''}`;
    const ctl = opt.area ? `<textarea ${attrs} rows="${opt.rows || 3}">${esc(val)}</textarea>` : `<input ${attrs} value="${esc(val)}">`;
    return `<label class="field ${opt.full ? 'full' : ''}"><span>${label}${opt.hint ? ` <em class="hint">${opt.hint}</em>` : ''}</span>${ctl}</label>`;
  };
  const images = () => [...lib.values()].filter(e => e.kind === 'bild').sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const videos = () => [...lib.values()].filter(e => e.kind === 'video').sort((a, b) => a.name.localeCompare(b.name, 'de'));

  function imageOptions(sel, emptyLabel) {
    const selName = fileOf(sel);
    let html = `<option value="">${emptyLabel}</option>`;
    if (sel && !lib.has(selName)) html += `<option value="${esc(sel)}" selected>${esc(selName)} (nicht gefunden)</option>`;
    return html + images().map(e => `<option value="media/${esc(e.name)}" ${e.name === selName ? 'selected' : ''} ${e.ok === false ? 'disabled' : ''}>${esc(e.name)}</option>`).join('');
  }

  // Bildinhalt einer Szene: Platzhalter | Grafik | Video
  function contentOptions(sc) {
    const val = sc.video ? 'v:' + sc.video : sc.grafik ? 'g:' + sc.grafik : '';
    const opt = (v, label, dis) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(label)}</option>`;
    let html = opt('', '– Platzhalter-Icon –');
    const missing = val && !lib.has(fileOf(val.slice(2)));
    if (missing) html += opt(val, fileOf(val.slice(2)) + ' (nicht gefunden)');
    const g = images(), v = videos();
    if (g.length) html += `<optgroup label="Grafiken (Animation wählbar)">${g.map(e => opt('g:media/' + e.name, e.name, e.ok === false)).join('')}</optgroup>`;
    if (v.length) html += `<optgroup label="Fertige Videos">${v.map(e => opt('v:media/' + e.name, `${e.name}${e.duration ? ' (' + fmtS(e.duration) + ')' : ''}${e.ok === false ? ' (nicht abspielbar)' : ''}`, e.ok === false)).join('')}</optgroup>`;
    return html;
  }

  // Hintergrund-Editor; erben = Bezeichnung der geerbten Ebene oder null (Standard-Ebene)
  function bgEditor(bg, erben, scope) {
    const mode = bg && bg.bild !== undefined ? 'bild' : bg && SZ.normHex(bg.farbe) ? 'farbe' : (erben ? 'erben' : 'farbe');
    const farbe = (bg && SZ.normHex(bg.farbe)) || '#ffffff';
    return `<div class="bg-ed" data-bg="${scope}">
      <div class="bg-modes" role="radiogroup" aria-label="Hintergrund">
        ${erben ? `<label><input type="radio" name="bgm-${scope}" value="erben" ${mode === 'erben' ? 'checked' : ''}> ${erben}</label>` : ''}
        <label><input type="radio" name="bgm-${scope}" value="farbe" ${mode === 'farbe' ? 'checked' : ''}> Farbe</label>
        <label><input type="radio" name="bgm-${scope}" value="bild" ${mode === 'bild' ? 'checked' : ''}> Bild</label>
      </div>
      <div class="bg-row" ${mode === 'erben' ? 'hidden' : ''}>
        <input type="color" data-bgf="picker" value="${farbe}" aria-label="Farbe wählen">
        <input data-bgf="hex" value="${farbe}" maxlength="7" aria-label="Hex-Wert" placeholder="#ffffff" class="hex">
        ${mode === 'bild' ? `<select data-bgf="bild" aria-label="Hintergrundbild">${imageOptions(bg && bg.bild, '– Bild wählen –')}</select>` : ''}
      </div>
      ${mode === 'bild' ? '<p class="hint-line">Die Farbe dient als Rückfall, solange das Bild lädt. Stichwörter erscheinen auf Bildern auf einer hellen Plakette.</p>' : ''}
    </div>`;
  }

  function bindBg(root, get, set, onChange) {
    const box = root;
    box.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', () => {
      const old = get() || {};
      const farbe = SZ.normHex(old.farbe) || '#ffffff';
      if (r.value === 'erben') set(null);
      else if (r.value === 'farbe') set({ farbe });
      else set({ bild: old.bild || '', farbe });
      onChange(true);
    }));
    const picker = box.querySelector('[data-bgf="picker"]'), hex = box.querySelector('[data-bgf="hex"]'), bild = box.querySelector('[data-bgf="bild"]');
    if (picker) picker.addEventListener('input', () => { hex.value = picker.value; set(Object.assign({}, get() || {}, { farbe: picker.value })); onChange(false); });
    if (hex) hex.addEventListener('input', () => {
      const v = SZ.normHex(hex.value);
      hex.classList.toggle('invalid', !v);
      if (v) { picker.value = v; set(Object.assign({}, get() || {}, { farbe: v })); onChange(false); }
    });
    if (bild) bild.addEventListener('change', () => { set(Object.assign({}, get() || {}, { bild: bild.value })); onChange(false); });
  }

  // Mini-Bühne wie im Player: Hintergrund + Bildinhalt + Stichwort
  function stagePreview(n, sc) {
    const bg = SZ.hintergrund(data.meta, n, sc);
    let inner;
    if (sc.video) {
      const e = lib.get(fileOf(sc.video));
      inner = `<video src="${esc(urlOf(sc.video))}" muted playsinline preload="metadata" data-end></video>`;
      if (e && e.duration) inner += `<span class="badge">Video, ${fmtS(e.duration)}</span>`;
    } else {
      inner = `<div class="mini-visual">${SZ.visualHTML(sc, ICONS, { urlFn: urlOf })}</div>`;
    }
    return `<div class="mini-stage${SZ.vollbild(sc) ? ' vollbild' : ''}" data-ton="${SZ.ton(bg)}" style="${SZ.bgStyle(bg, urlOf)}" title="Klicken zum Abspielen">
      ${inner}${sc.stichwort ? `<div class="mini-word">${esc(sc.stichwort)}</div>` : ''}</div>`;
  }

  function sceneWarn(sc) {
    const p = sc.video || sc.grafik;
    if (!p) return '';
    const e = lib.get(fileOf(p));
    if (!e) return `<div class="warn">Datei „${esc(fileOf(p))}“ nicht gefunden. Rechts laden oder in media/ hochladen.</div>`;
    if (e.ok === false) return '<div class="warn">Diese Datei kann im Browser nicht angezeigt werden.</div>';
    if (e.source === 'lokal' && !e.inRepo) return '<div class="ok-note">Lokal geladen – beim Veröffentlichen in den Ordner media/ hochladen.</div>';
    return '';
  }

  // ---------- Editor ----------
  function renderEditor(soft) {
    if (soft && editor.contains(document.activeElement) && /input|textarea/i.test(document.activeElement.tagName)) {
      // nur Auswahllisten/Hinweise aktualisieren, damit die Eingabe nicht gestört wird
      const n = data.nuggets[cur];
      if (n) editor.querySelectorAll('.scene').forEach((el, k) => {
        const sc = n.szenen[k]; if (!sc) return;
        const s = el.querySelector('[data-sf="inhalt"]'); if (s) s.innerHTML = contentOptions(sc);
        const w = el.querySelector('.warn-slot'); if (w) w.innerHTML = sceneWarn(sc);
      });
      return;
    }
    if (cur === -1 && !ERSTELLER) return renderSettings();
    const n = data.nuggets[cur];
    if (!n) {
      editor.innerHTML = ERSTELLER
        ? `<section class="ed-card leer-start"><h2>Willkommen im Studio</h2><p>Hier erstellen Sie eigene Lernnuggets: Szenen mit Grafik, Sprechertext und Stimme, dazu ein Quiz.
           Wenn ein Lernnugget fertig ist, reichen Sie es zur Freigabe ein. Ein Admin prüft es und veröffentlicht es dann für alle.</p>
           <p><button class="btn" type="button" id="leer-neu">Erstes Lernnugget anlegen</button></p></section>`
        : '<div class="ed-card">Kein Lernnugget vorhanden. Links „Neu anlegen“ wählen.</div>';
      const b = editor.querySelector('#leer-neu'); if (b) b.addEventListener('click', () => document.getElementById('btn-new').click());
      return;
    }
    const katOpts = data.kategorien.map(k => `<option value="${k.id}" ${k.id === n.kategorie ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    const iconOpts = sel => Object.keys(ICONS).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
    const animOpts = sel => SZ.ANIMATIONEN.map(([v, l]) => `<option value="${v}" ${v === (sel || 'fade') ? 'selected' : ''}>${l}</option>`).join('');
    const durOpts = sel => {
      const s = sel ? String(sel) : '';
      const known = DAUERN.some(([v]) => v === s);
      return DAUERN.map(([v, l]) => `<option value="${v}" ${v === s ? 'selected' : ''}>${l}</option>`).join('')
        + `<option value="frei" ${!known ? 'selected' : ''}>eigene Angabe …</option>`;
    };
    const liveFassung = published.nuggets.some(x => x.id === n.id);
    const freigabeBox = !brauchtFreigabe(n) ? '' : ERSTELLER ? `
      <div class="freigabe ${n.eingereicht ? 'ist-eingereicht' : ''}">
        <div><strong>${n.eingereicht ? 'Zur Freigabe eingereicht' : 'In Arbeit'}</strong>
          <p>${n.eingereicht ? 'Ein Admin prüft das Lernnugget und veröffentlicht es. Weitere Änderungen werden mit übernommen.'
            : liveFassung ? 'Ihre Änderungen sind gespeichert. Sichtbar bleibt die veröffentlichte Fassung, bis Sie erneut einreichen und ein Admin freigibt.'
              : 'Ihre Änderungen sind gespeichert, aber nur für Sie und die Admins sichtbar. Wenn alles fertig ist, reichen Sie das Lernnugget zur Freigabe ein.'}</p></div>
        <button class="btn ${n.eingereicht ? 'ghost' : ''}" type="button" id="btn-einreichen">${n.eingereicht ? 'Einreichung zurückziehen' : 'Zur Freigabe einreichen'}</button>
      </div>` : `
      <div class="freigabe ${n.eingereicht ? 'ist-eingereicht' : ''}">
        <div><strong>Von ${esc(besitzerName(n))}, ${n.eingereicht ? 'zur Freigabe eingereicht' : 'noch in Arbeit'}</strong>
          <p>${n.eingereicht ? 'Geht beim nächsten Veröffentlichen live.' : liveFassung ? 'Beim Veröffentlichen bleibt die bisherige Fassung online, bis die Änderungen eingereicht sind.' : 'Wird beim Veröffentlichen noch nicht übernommen.'}</p></div>
      </div>`;
    editor.innerHTML = `${freigabeBox}
      <section class="ed-card">
        <h2>Allgemein <button class="linkbtn" id="del-nugget">Lernnugget löschen</button></h2>
        <div class="fgrid">
          ${field('Titel', 'titel', n.titel)}
          <label class="field"><span>Sprache</span><select data-f="sprache">
            <option value="de" ${n.sprache !== 'en' ? 'selected' : ''}>Deutsch</option>
            <option value="en" ${n.sprache === 'en' ? 'selected' : ''}>Englisch</option></select></label>
          <label class="field"><span>Kategorie</span><div class="inline"><select data-f="kategorie">${katOpts}</select><button class="btn ghost" id="add-kat" type="button">Neue Kategorie</button></div></label>
          ${field('Kurztext', 'kurztext', n.kurztext, { full: true, hint: 'erscheint auf der Kachel' })}
          ${field('Lernziel', 'lernziel', n.lernziel, { full: true, area: true, rows: 2 })}
          ${field('Erklärung', 'langtext', n.langtext, { full: true, area: true, rows: 4 })}
          ${field('Schlagwörter', 'schlagwoerter', (n.schlagwoerter || []).join(', '), { hint: 'mit Komma trennen – für die Suche' })}
          ${field('Quelle', 'quelle', n.quelle)}
          <label class="field"><span>Fachliche Prüfung</span><select data-f="freigabestatus">
            <option value="entwurf" ${n.freigabestatus !== 'freigegeben' ? 'selected' : ''}>Entwurf – fachlich ungeprüft</option>
            <option value="freigegeben" ${n.freigabestatus === 'freigegeben' ? 'selected' : ''}>Fachlich freigegeben</option></select></label>
          ${field('ID', 'id', n.id, { hint: 'Teil der Adresse und der Dateinamen' })}
          ${SERVER && !ERSTELLER ? `<div class="field full teilen"><span>Teilen</span>
            <label class="check"><input type="checkbox" data-f="oeffentlich" ${n.oeffentlich ? 'checked' : ''}> Öffentlich teilbar: über einen Link auch ohne Anmeldung ansehen</label>
            <p class="hint-line" id="teilen-link">${n.oeffentlich ? `Link nach dem Veröffentlichen: <code>${esc(location.origin)}/teilen/${esc(n.id)}</code>` : 'Ohne Haken sehen nur angemeldete Konten dieses Lernnugget.'}</p></div>` : ''}
          <div class="field full"><span>Stimme für alle Szenen dieses Lernnuggets</span>${voiceSelect(n.stimme, `wie Standard (${n.sprache === 'en' ? 'Englisch' : 'Deutsch'})`, 'n', n.sprache)}</div>
          <div class="field full"><span>Hintergrund für alle Szenen dieses Lernnuggets</span>${bgEditor(n.hintergrund, 'Standard der Plattform', 'n')}</div>
        </div>
      </section>

      <section class="ed-card">
        <h2>Szenen <span class="small" style="margin:0">Eine Szene läuft, bis Sprecher, Mindestdauer und ggf. Video fertig sind.</span></h2>
        <div class="scenes">${n.szenen.map((sc, k) => `
          <div class="scene" data-k="${k}">
            <div class="scene-head"><strong>Szene ${k + 1}</strong>
              <div class="scene-tools">
                <button data-act="up" ${k === 0 ? 'disabled' : ''} title="Nach oben" aria-label="Szene ${k + 1} nach oben">${ICO.up}</button>
                <button data-act="down" ${k === n.szenen.length - 1 ? 'disabled' : ''} title="Nach unten" aria-label="Szene ${k + 1} nach unten">${ICO.down}</button>
                <button data-act="dup" title="Duplizieren" aria-label="Szene ${k + 1} duplizieren">${ICO.dup}</button>
                <button data-act="del" ${n.szenen.length === 1 ? 'disabled' : ''} title="Löschen" aria-label="Szene ${k + 1} löschen">${ICO.del}</button>
              </div></div>
            <div class="scene-left">${stagePreview(n, sc)}<p class="hint-line">Vorschau anklicken = Animation abspielen</p></div>
            <div class="scene-fields">
              <label class="field"><span>Bildinhalt</span><select data-sf="inhalt">${contentOptions(sc)}</select></label>
              <div class="warn-slot">${sceneWarn(sc)}</div>
              ${sc.video ? '<p class="hint-line">Fertiges Video: Bewegung und Länge kommen aus der Datei. Der Hintergrund ist rund um das Video sichtbar.</p>' : `
              <div class="inline">
                <label class="field"><span>Animation</span><select data-sf="animation">${animOpts(sc.animation)}</select></label>
                <label class="field"><span>Mindestdauer</span><select data-sf="dauerwahl">${durOpts(sc.mindestdauer)}</select></label>
                <label class="field dauer-frei" ${DAUERN.some(([v]) => v === String(sc.mindestdauer || '')) ? 'hidden' : ''}><span>Sekunden</span><input type="number" min="1" max="60" step="0.5" data-sf="mindestdauer" value="${esc(sc.mindestdauer || '')}"></label>
              </div>
              ${sc.grafik ? `<label class="field"><span>Darstellung</span><select data-sf="darstellung">
                <option value="" ${sc.darstellung !== 'vollbild' ? 'selected' : ''}>Grafik mittig, mit Stichwort</option>
                <option value="vollbild" ${sc.darstellung === 'vollbild' ? 'selected' : ''}>Vollbild (fertige Erklärgrafik mit eigenem Titel)</option></select></label>`
                : `<label class="field"><span>Platzhalter-Icon</span><select data-sf="icon">${iconOpts(sc.icon)}</select></label>`}`}
              <label class="field"><span>Stichwort auf der Bühne</span><input data-sf="stichwort" value="${esc(sc.stichwort)}"></label>
              <label class="field"><span>Sprechertext / Untertitel</span><textarea data-sf="text" rows="3">${esc(sc.text)}</textarea></label>
              <label class="field"><span>Aussprache <em class="hint">optional, z. B. „eins, eins, zwei“ statt „112“</em></span><input data-sf="sprechtext" value="${esc(sc.sprechtext)}"></label>
              <div class="field"><span>Stimme dieser Szene</span>${voiceSelect(sc.stimme, 'wie Lernnugget', 's' + k, n.sprache)}</div>
              <div class="field"><span>Hintergrund dieser Szene</span>${bgEditor(sc.hintergrund, 'wie Lernnugget', 's' + k)}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="add-row" style="margin-top:12px"><button class="btn ghost" id="add-scene">Szene hinzufügen</button></div>
      </section>

      <section class="ed-card">
        <h2>Quiz <span class="small" style="margin:0">optional</span></h2>
        <div class="scenes">${(n.quiz || []).map((q, k) => `
          <div class="qedit" data-q="${k}">
            <div class="scene-head"><strong>Frage ${k + 1}</strong><div class="scene-tools"><button data-qact="del" title="Frage löschen" aria-label="Frage ${k + 1} löschen">${ICO.del}</button></div></div>
            <label class="field"><span>Frage</span><input data-qf="frage" value="${esc(q.frage)}"></label>
            <div class="field"><span>Antworten <em class="hint">richtige Antwort markieren</em></span>
              ${q.antworten.map((a, j) => `<div class="ans"><input type="radio" name="r${k}" data-qr="${j}" ${q.richtig === j ? 'checked' : ''} aria-label="Antwort ${j + 1} ist richtig">
                <input data-qa="${j}" value="${esc(a)}" aria-label="Antwort ${j + 1}"><button class="ctrl icon-btn" data-qdel="${j}" ${q.antworten.length <= 2 ? 'disabled' : ''} title="Antwort entfernen" aria-label="Antwort ${j + 1} entfernen">${ICO.x}</button></div>`).join('')}
              ${q.antworten.length < 4 ? '<div><button class="ctrl" data-qadd type="button">Antwort hinzufügen</button></div>' : ''}
            </div>
            <label class="field"><span>Erklärung nach dem Antworten</span><textarea data-qf="erklaerung" rows="2">${esc(q.erklaerung)}</textarea></label>
          </div>`).join('')}
        </div>
        <div class="add-row" style="margin-top:12px"><button class="btn ghost" id="add-q">Frage hinzufügen</button></div>
      </section>`;
    bindEditor(n);
  }

  function renderSettings() {
    const m = data.meta;
    editor.innerHTML = `
      <section class="ed-card">
        <h2>Einstellungen der Plattform</h2>
        <div class="fgrid">
          ${field('Titel', 'm-titel', m.titel)}
          ${field('Untertitel', 'm-untertitel', m.untertitel)}
          <label class="field"><span>Akzentfarbe <em class="hint">Buttons, Linien, Platzhalter-Icons</em></span>
            <div class="bg-row"><input type="color" data-mf="akzent-p" value="${SZ.normHex(m.akzentfarbe) || '#0b6fb8'}"><input class="hex" data-mf="akzent" value="${esc(SZ.normHex(m.akzentfarbe) || '#0b6fb8')}" maxlength="7"></div></label>
          <div class="field full"><span>Standard-Stimme für deutsche Lernnuggets</span>${voiceSelect(m.stimme || KAT_STANDARD.de, null, 'm', 'de')}</div>
          <div class="field full"><span>Standard-Stimme für englische Lernnuggets</span>${voiceSelect(m.stimme_en || KAT_STANDARD.en, null, 'me', 'en')}</div>
          <div class="field full"><span>Standard-Hintergrund für alle Lernnuggets</span>${bgEditor(m.hintergrund, null, 'm')}</div>
        </div>
        <p class="hint-line">Ein Hintergrund an der Szene ersetzt den des Lernnuggets, und dieser ersetzt den Standard.</p>
      </section>
      <section class="ed-card"><h2>Vorschau</h2><div class="settings-prev">${stagePreview(null, { icon: 'report', animation: 'pop', stichwort: 'Beispiel-Stichwort' })}</div></section>`;
    editor.querySelectorAll('[data-f]').forEach(el => el.addEventListener('input', () => {
      m[el.dataset.f.slice(2)] = el.value; save();
    }));
    const ap = editor.querySelector('[data-mf="akzent-p"]'), ah = editor.querySelector('[data-mf="akzent"]');
    const setAkzent = v => { m.akzentfarbe = v; document.documentElement.style.setProperty('--accent', v); save(); };
    ap.addEventListener('input', () => { ah.value = ap.value; setAkzent(ap.value); });
    ah.addEventListener('input', () => { const v = SZ.normHex(ah.value); ah.classList.toggle('invalid', !v); if (v) { ap.value = v; setAkzent(v); } });
    bindVoice(editor.querySelector('[data-voice="m"]'), () => m.stimme, v => { m.stimme = v || KAT_STANDARD.de; }, () => KAT_STANDARD.de);
    bindVoice(editor.querySelector('[data-voice="me"]'), () => m.stimme_en, v => { m.stimme_en = v || KAT_STANDARD.en; }, () => KAT_STANDARD.en);
    bindBg(editor.querySelector('[data-bg="m"]'), () => m.hintergrund, v => { m.hintergrund = v || { farbe: '#ffffff' }; save(); },
      full => { if (full) renderEditor(); else editor.querySelector('.settings-prev').innerHTML = stagePreview(null, { icon: 'report', animation: 'pop', stichwort: 'Beispiel-Stichwort' }); wireStages(); });
    wireStages();
  }

  function wireStages() {
    editor.querySelectorAll('.mini-stage').forEach(st => {
      st.querySelectorAll('video[data-end]').forEach(endFrame);
      st.addEventListener('click', () => {
        const v = st.querySelector('video');
        if (v) { v.currentTime = 0; v.play().catch(() => {}); v.onended = () => endFrame(v); return; }
        const a = st.querySelector('.mini-visual > div');
        if (a) { const c = a.className; a.className = ''; void a.offsetWidth; a.className = c; }
      });
    });
  }

  function bindEditor(n) {
    wireStages();
    editor.querySelectorAll('[data-f]').forEach(el => el.addEventListener('input', () => {
      const f = el.dataset.f;
      if (f === 'oeffentlich') {
        if (el.checked) n.oeffentlich = true; else delete n.oeffentlich;
        save(); renderNav(); return renderEditor();
      }
      if (f === 'schlagwoerter') n.schlagwoerter = el.value.split(',');
      else if (f === 'id') n.id = slug(el.value);
      else n[f] = el.value;
      if (f === 'sprache') {
        // Stimmen der anderen Sprache entfernen, damit nichts Unpassendes vertont wird
        if (n.stimme && !passtZu(n.stimme, n.sprache)) delete n.stimme;
        n.szenen.forEach(sc => { if (sc.stimme && !passtZu(sc.stimme, n.sprache)) delete sc.stimme; });
        save(); return renderAll();
      }
      if (['titel', 'kategorie', 'freigabestatus'].includes(f)) renderNav();
      save();
    }));
    const idEl = editor.querySelector('[data-f="id"]');
    idEl.addEventListener('change', () => {
      let id = slug(idEl.value), k = 2; const base = id;
      while (data.nuggets.some((x, i) => i !== cur && x.id === id)) id = `${base}-${k++}`;
      n.id = id; idEl.value = id; save();
    });
    editor.querySelector('#add-kat').addEventListener('click', () => {
      const name = (prompt('Name der neuen Kategorie:') || '').trim();
      if (!name) return;
      let id = slug(name), k = 2; const base = id;
      while (data.kategorien.some(x => x.id === id)) id = `${base}-${k++}`;
      data.kategorien.push({ id, name }); n.kategorie = id; renderAll(); save();
    });
    const einr = editor.querySelector('#btn-einreichen');
    if (einr) einr.addEventListener('click', () => {
      if (!n.eingereicht) {
        const t = n.titel || n.id, fehlt = [];
        if (!n.titel) fehlt.push('Titel');
        n.szenen.forEach((sc, k) => { if (!String(sc.text || '').trim()) fehlt.push(`Sprechertext in Szene ${k + 1}`); });
        if (fehlt.length) { alert(`Bitte vor dem Einreichen ergänzen: ${fehlt.join(', ')}.`); return; }
        if (!confirm(`„${t}“ zur Freigabe einreichen?`)) return;
        n.eingereicht = true;
      } else delete n.eingereicht;
      save(); renderAll();
    });
    editor.querySelector('#del-nugget').addEventListener('click', () => {
      if (!confirm(`„${n.titel}“ wirklich löschen?`)) return;
      data.nuggets.splice(cur, 1); cur = Math.max(-1, Math.min(cur, data.nuggets.length - 1)); renderAll(); save();
    });
    // Hintergrund des Lernnuggets: wirkt auf alle Szenen-Vorschauen
    bindVoice(editor.querySelector('[data-voice="n"]'), () => n.stimme, v => { if (v) n.stimme = v; else delete n.stimme; }, () => standardStimme(n.sprache));
    bindBg(editor.querySelector('[data-bg="n"]'), () => n.hintergrund, v => { if (v) n.hintergrund = v; else delete n.hintergrund; save(); },
      full => { if (full) renderEditor(); else refreshStages(n); });

    editor.querySelectorAll('.scene').forEach(el => {
      const k = +el.dataset.k, sc = n.szenen[k];
      const refresh = () => { el.querySelector('.scene-left').firstElementChild.outerHTML = stagePreview(n, sc); wireStages(); };
      el.querySelectorAll('[data-sf]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
        const f = inp.dataset.sf;
        if (f === 'inhalt') {
          const v = inp.value;
          delete sc.video; delete sc.grafik; delete sc.laenge;
          if (v.startsWith('v:')) { sc.video = v.slice(2); const e = lib.get(fileOf(sc.video)); if (e && e.duration) sc.laenge = Math.round(e.duration * 10) / 10; }
          else if (v.startsWith('g:')) sc.grafik = v.slice(2);
          save(); return renderEditor();
        }
        if (f === 'dauerwahl') {
          const frei = el.querySelector('.dauer-frei');
          if (inp.value === 'frei') { frei.hidden = false; frei.querySelector('input').focus(); }
          else { frei.hidden = true; if (inp.value) sc.mindestdauer = +inp.value; else delete sc.mindestdauer; }
          return save();
        }
        if (f === 'mindestdauer') { const v = parseFloat(inp.value); if (v > 0) sc.mindestdauer = v; else delete sc.mindestdauer; return save(); }
        sc[f] = inp.value;
        if (['icon', 'animation', 'stichwort', 'darstellung'].includes(f)) refresh();
        save();
      }));
      bindVoice(el.querySelector(`[data-voice="s${k}"]`), () => sc.stimme, v => { if (v) sc.stimme = v; else delete sc.stimme; }, () => stimmeVon(n, null));
      bindBg(el.querySelector(`[data-bg="s${k}"]`), () => sc.hintergrund, v => { if (v) sc.hintergrund = v; else delete sc.hintergrund; save(); },
        full => { if (full) renderEditor(); else refresh(); });
      el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.act, s = n.szenen;
        if (a === 'up') [s[k - 1], s[k]] = [s[k], s[k - 1]];
        if (a === 'down') [s[k + 1], s[k]] = [s[k], s[k + 1]];
        if (a === 'dup') s.splice(k + 1, 0, clone(sc));
        if (a === 'del') s.splice(k, 1);
        renderAll(); save();
      }));
    });
    editor.querySelector('#add-scene').addEventListener('click', () => {
      n.szenen.push({ icon: 'report', animation: 'fade', stichwort: '', text: '' }); renderAll(); save();
      const all = editor.querySelectorAll('.scene'); all[all.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    editor.querySelectorAll('.qedit').forEach(el => {
      const k = +el.dataset.q, q = n.quiz[k];
      el.querySelectorAll('[data-qf]').forEach(inp => inp.addEventListener('input', () => { q[inp.dataset.qf] = inp.value; save(); }));
      el.querySelectorAll('[data-qa]').forEach(inp => inp.addEventListener('input', () => { q.antworten[+inp.dataset.qa] = inp.value; save(); }));
      el.querySelectorAll('[data-qr]').forEach(r => r.addEventListener('change', () => { q.richtig = +r.dataset.qr; save(); }));
      el.querySelectorAll('[data-qdel]').forEach(b => b.addEventListener('click', () => {
        const j = +b.dataset.qdel; q.antworten.splice(j, 1);
        if (q.richtig === j) q.richtig = 0; else if (q.richtig > j) q.richtig--;
        renderEditor(); save();
      }));
      const add = el.querySelector('[data-qadd]');
      if (add) add.addEventListener('click', () => { q.antworten.push(''); renderEditor(); save(); });
      el.querySelector('[data-qact="del"]').addEventListener('click', () => { n.quiz.splice(k, 1); renderEditor(); save(); });
    });
    editor.querySelector('#add-q').addEventListener('click', () => {
      (n.quiz = n.quiz || []).push({ frage: '', antworten: ['', '', ''], richtig: 0, erklaerung: '' }); renderEditor(); save();
    });
  }

  function refreshStages(n) {
    editor.querySelectorAll('.scene').forEach(el => {
      const sc = n.szenen[+el.dataset.k];
      el.querySelector('.scene-left').firstElementChild.outerHTML = stagePreview(n, sc);
    });
    wireStages();
  }

  function renderAll() { renderNav(); renderEditor(); }

  // ---------- Vorschau ----------
  document.getElementById('btn-preview').addEventListener('click', () => {
    speichereEntwurf();
    if (!store.set(KEY_PREVIEW, previewData())) { alert('Vorschau konnte nicht im Browser gespeichert werden.'); return; }
    const n = data.nuggets[cur];
    window.open(`index.html?vorschau${n ? '#/nugget/' + encodeURIComponent(n.id) : ''}`, '_blank');
  });

  // ---------- Veröffentlichen ----------
  function validate() {
    const issues = [];
    const ids = new Set();
    const checkFile = (p, where) => {
      if (!p) return;
      const e = lib.get(fileOf(p));
      if (!e) issues.push(`${where}: Datei „${fileOf(p)}“ nicht gefunden.`);
      else if (e.source === 'upload') issues.push(`${where}: „${e.name}“ ist noch nicht hochgeladen.`);
      else if (e.ok === false) issues.push(`${where}: „${e.name}“ kann nicht angezeigt werden.`);
    };
    if (data.meta.hintergrund && data.meta.hintergrund.bild !== undefined && !data.meta.hintergrund.bild) issues.push('Standard-Hintergrund: Bild ausgewählt, aber keine Datei gewählt.');
    checkFile(data.meta.hintergrund && data.meta.hintergrund.bild, 'Standard-Hintergrund');
    data.nuggets.forEach(n => {
      const t = n.titel || n.id;
      if (!n.titel) issues.push(`Ein Lernnugget hat keinen Titel (${n.id}).`);
      if (ids.has(n.id)) issues.push(`Die ID „${n.id}“ ist doppelt vergeben.`); ids.add(n.id);
      checkFile(n.hintergrund && n.hintergrund.bild, `„${t}“, Hintergrund`);
      n.szenen.forEach((sc, k) => {
        if (!String(sc.text || '').trim()) issues.push(`„${t}“, Szene ${k + 1}: Sprechertext fehlt.`);
        checkFile(sc.video || sc.grafik, `„${t}“, Szene ${k + 1}`);
        checkFile(sc.hintergrund && sc.hintergrund.bild, `„${t}“, Szene ${k + 1}, Hintergrund`);
      });
      (n.quiz || []).forEach((q, k) => {
        if (!q.frage.trim() || q.antworten.some(a => !String(a).trim())) issues.push(`„${t}“, Quizfrage ${k + 1}: Frage oder Antwort leer.`);
      });
    });
    return issues;
  }

  const dlg = document.getElementById('dlg-export');
  // ---------- Veröffentlichen auf dem eigenen Server ----------
  let auftragT = 0;
  function auftragHTML(a) {
    if (!a || !a.start) return '<p class="hint-line">Noch keine Vertonung gelaufen.</p>';
    const st = a.laeuft ? `Läuft seit ${uhr(a.start)} …` : a.ok ? `Fertig um ${uhr(a.ende)}` : `Abgebrochen um ${uhr(a.ende)}`;
    return `<p class="auftrag-st ${a.laeuft ? '' : a.ok ? 'gut' : 'bad'}"><strong>Sprecher und Videos:</strong> ${st}${a.engine ? ` (Sprachausgabe: ${a.engine === 'azure' ? 'Azure' : 'Piper'})` : ''}</p>
      <details class="auftrag-log" ${a.laeuft || !a.ok ? 'open' : ''}><summary>Protokoll</summary><pre>${esc((a.log || []).slice(-40).join('\n'))}</pre></details>`;
  }
  async function zeigeAuftrag() {
    clearTimeout(auftragT);
    const box = document.getElementById('auftrag'); if (!box || !dlg.open) return;
    try {
      const a = await api('/api/auftrag');
      box.innerHTML = auftragHTML(a);
      const pre = box.querySelector('pre'); if (pre) pre.scrollTop = pre.scrollHeight;
      if (a.laeuft) auftragT = setTimeout(zeigeAuftrag, 2500);
    } catch (e) { box.textContent = e.message; }
  }
  function dialogErsteller(issues) {
    const eigene = cleanData(data).nuggets;
    document.getElementById('dlg-h').textContent = 'Freigabe';
    document.getElementById('dlg-body').innerHTML = `
      <p>Ihre Lernnuggets werden automatisch gespeichert. Ein Admin veröffentlicht alles, was Sie zur Freigabe eingereicht haben.</p>
      ${eigene.length ? `<table class="frei-liste"><tbody>${eigene.map(n => `<tr><td>${esc(n.titel || n.id)}</td>
        <td>${n.eingereicht ? '<span class="status freigegeben">Eingereicht</span>' : '<span class="status entwurf">In Arbeit</span>'}</td>
        <td>${published.nuggets.some(x => x.id === n.id) ? 'veröffentlicht' : 'noch nicht veröffentlicht'}</td></tr>`).join('')}</tbody></table>`
        : '<p class="hint-line">Sie haben noch keine eigenen Lernnuggets.</p>'}
      ${issues.length ? `<div class="warn"><strong>Noch offen:</strong><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
      <p class="hint-line">Einreichen: Lernnugget links auswählen und oben auf „Zur Freigabe einreichen“ klicken.</p>`;
    document.getElementById('dlg-actions').innerHTML = '<button class="btn" value="close">Schließen</button>';
    dlg.showModal();
  }
  function dialogServer(issues) {
    if (ERSTELLER) return dialogErsteller(issues);
    const geaendert = isDirty();
    const d = cleanData(data);
    const eingereicht = d.nuggets.filter(n => brauchtFreigabe(n) && n.eingereicht);
    const inArbeit = d.nuggets.filter(n => brauchtFreigabe(n) && !n.eingereicht);
    const entfernt = published.nuggets.filter(p => !d.nuggets.some(n => n.id === p.id));
    const oeff = cleanData(data).nuggets.filter(n => n.oeffentlich);
    document.getElementById('dlg-body').innerHTML = `
      ${issues.length ? `<div class="warn"><strong>Bitte prüfen:</strong><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="ok-note">Keine Probleme gefunden.</div>'}
      <p>${geaendert ? 'Der Entwurf enthält Änderungen, die noch nicht veröffentlicht sind.' : 'Der Entwurf entspricht der veröffentlichten Fassung.'}
        ${ADMIN ? 'Nach dem Veröffentlichen vertont der Server geänderte Szenen und baut die MP4-Downloads neu. Das dauert je nach Umfang einige Minuten.'
          : 'Ihre Änderungen sind auf dem Server gespeichert. Veröffentlichen kann nur ein Admin.'}</p>
      ${eingereicht.length ? `<p><strong>Zur Freigabe eingereicht:</strong> ${eingereicht.map(n => `${esc(n.titel || n.id)} (${esc(besitzerName(n))})`).join(', ')}${ADMIN ? '. Wird mit veröffentlicht.' : ''}</p>` : ''}
      ${inArbeit.length ? `<p class="hint-line">Noch in Arbeit und deshalb nicht dabei: ${inArbeit.map(n => `${esc(n.titel || n.id)} (${esc(besitzerName(n))})`).join(', ')}</p>` : ''}
      ${entfernt.length ? `<p class="hint-line">Wird entfernt: ${entfernt.map(n => esc(n.titel || n.id)).join(', ')}</p>` : ''}
      ${oeff.length ? `<p class="hint-line">Öffentlich teilbar: ${oeff.map(n => `<a href="/teilen/${esc(n.id)}" target="_blank" rel="noopener">${esc(n.titel)}</a>`).join(', ')}</p>` : ''}
      <div id="auftrag"></div>`;
    document.getElementById('dlg-actions').innerHTML = `<button class="btn ghost" value="close">Schließen</button>
      ${ADMIN ? `<button class="btn ghost" id="btn-neu-vertonen" type="button" title="Alle Szenen neu vertonen, z. B. nach einem Stimmenwechsel bei Azure">Alles neu vertonen</button>
      <button class="btn" id="btn-publish" type="button" ${geaendert ? '' : 'disabled'}>Jetzt veröffentlichen</button>` : ''}`;
    if (ADMIN) {
      document.getElementById('btn-publish').addEventListener('click', async ev => {
        const b = ev.currentTarget;
        if (issues.length && !confirm('Es gibt noch Hinweise. Trotzdem veröffentlichen?')) return;
        b.disabled = true; b.textContent = 'Wird veröffentlicht …';
        try {
          clearTimeout(saveT); if (srv.offen) await serverSpeichern();
          const r = await api('/api/veroeffentlichen', 'POST', { version: srv.version, data: cleanData(data) });
          const curId = data.nuggets[cur] && data.nuggets[cur].id;
          published = r.live; data = r.entwurf.data; srv.version = r.entwurf.version; srv.am = null; BESITZER = r.besitzer || BESITZER;
          const i = data.nuggets.findIndex(n => n.id === curId); if (cur !== -1) cur = i >= 0 ? i : 0;
          renderAll(); zeigeStand();
          b.textContent = 'Veröffentlicht';
          setTimeout(zeigeAuftrag, 600);
        } catch (e) { b.disabled = false; b.textContent = 'Jetzt veröffentlichen'; alert(e.message); }
      });
      document.getElementById('btn-neu-vertonen').addEventListener('click', async () => {
        if (!confirm('Alle Szenen und Hörproben der veröffentlichten Fassung neu vertonen? Das verbraucht bei Azure Zeichenkontingent.')) return;
        try { await api('/api/auftrag', 'POST', { alles: true }); setTimeout(zeigeAuftrag, 600); } catch (e) { alert(e.message); }
      });
    }
    dlg.showModal();
    zeigeAuftrag();
  }
  dlg.addEventListener('close', () => clearTimeout(auftragT));

  document.getElementById('btn-export').addEventListener('click', () => {
    const issues = validate();
    if (SERVER) return dialogServer(issues);
    const toUpload = [...referenced(cleanData(data))].map(fileOf).filter(nm => { const e = lib.get(nm); return e && e.source === 'lokal' && !e.inRepo; });
    const gh = repo ? `https://github.com/${repo.owner}/${repo.name}` : null;
    document.getElementById('dlg-body').innerHTML = `
      ${issues.length ? `<div class="warn"><strong>Bitte prüfen:</strong><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="ok-note">Keine Probleme gefunden.</div>'}
      <h3 class="dlg-h">Weg 1: Kopieren und einfügen (ohne Download)</h3>
      <ol>
        <li>Unten auf <strong>„Inhalte kopieren“</strong> klicken.</li>
        <li>${gh ? `<a href="${gh}/edit/main/data/inhalte.js" target="_blank" rel="noopener">Datei <code>data/inhalte.js</code> auf GitHub bearbeiten</a>` : 'Auf GitHub die Datei <code>data/inhalte.js</code> öffnen und auf das Stift-Symbol klicken'}.</li>
        <li>Im Editor <strong>Strg + A</strong> (alles markieren), dann <strong>Strg + V</strong> (einfügen) und oben rechts „Commit changes …“ klicken.</li>
      </ol>
      <h3 class="dlg-h">Weg 2: Als Datei hochladen</h3>
      <p class="hint-line">Unten „Als .json herunterladen“, dann ${gh ? `<a href="${gh}/upload/main/data" target="_blank" rel="noopener">im Ordner <code>data</code> hochladen</a>` : 'im Ordner <code>data</code> hochladen'}. GitHub übernimmt die Datei automatisch.</p>
      ${toUpload.length ? `<h3 class="dlg-h">Neue Medien hochladen</h3><p class="hint-line">${gh ? `<a href="${gh}/upload/main/media" target="_blank" rel="noopener">Ordner <code>media</code> öffnen</a>` : 'Ordner <code>media</code> öffnen'}, „Upload files“: ${toUpload.map(x => `<code>${esc(x)}</code>`).join(', ')}</p>` : ''}
      <p class="hint-line">Nach etwa 3–5 Minuten ist alles aktuell: Seite, Sprecher für geänderte Texte und die MP4-Downloads (Fortschritt im Reiter „Actions“).</p>
      <textarea id="copy-fallback" class="copy-fallback" hidden readonly aria-label="Inhalte zum manuellen Kopieren"></textarea>`;
    dlg.showModal();
  });
  const exportJs = () => 'window.LERN_DATA = ' + JSON.stringify(cleanData(data), null, 2) + ';\n';
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy');
    const text = exportJs();
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Kopiert';
      setTimeout(() => { btn.textContent = 'Inhalte kopieren'; }, 2500);
    } catch (e) {
      // Zwischenablage gesperrt: Text zum manuellen Kopieren anzeigen
      const ta = document.getElementById('copy-fallback');
      ta.hidden = false; ta.value = text; ta.focus(); ta.select();
      btn.textContent = 'Markiert – jetzt Strg + C';
    }
  });
  document.getElementById('btn-json').addEventListener('click', () => {
    const json = JSON.stringify(cleanData(data), null, 2) + '\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'inhalte.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  function start() {
    data.meta = data.meta || {};
    cur = data.nuggets.length ? 0 : -1;
    referenzenAufnehmen(); drawLib();
    const akz = SZ.normHex(data.meta.akzentfarbe);
    if (akz) document.documentElement.style.setProperty('--accent', akz);
    renderAll();
    if (SERVER) zeigeStand(); else save();
    if (mergeHinweis) setTimeout(() => { saveState.textContent = mergeHinweis; }, 400);
  }
  if (SERVER) {
    window.addEventListener('beforeunload', e => { if (srv.offen || srv.laeuft) { e.preventDefault(); e.returnValue = ''; } });
    document.getElementById('btn-export').textContent = ADMIN ? 'Veröffentlichen …' : ERSTELLER ? 'Freigabe …' : 'Stand prüfen …';
    if (ERSTELLER) {
      document.getElementById('btn-settings').hidden = true;
      document.getElementById('btn-reset').hidden = true;
      document.querySelector('.nav-head h2').textContent = 'Meine Lernnuggets';
    }
    saveState.textContent = 'Lade Entwurf …';
    api('/api/entwurf').then(r => {
      data = r.data; srv.version = r.version; srv.von = r.von; srv.am = r.am;
      if (r.live) published = r.live;
      BESITZER = r.besitzer || {};
      start();
    }).catch(e => { saveState.textContent = `Entwurf konnte nicht geladen werden: ${e.message}`; start(); });
  } else {
    window.addEventListener('beforeunload', () => speichereEntwurf());
    start();
  }
})();
