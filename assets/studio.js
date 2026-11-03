/*
 * Studio – Redaktionsoberfläche für die Lernnuggets.
 * Alles läuft im Browser. Eigene Dateien werden nur lokal geladen (Blob-URL), nichts wird hochgeladen.
 * Ergebnis ist eine neue data/inhalte.js, die über die GitHub-Weboberfläche hochgeladen wird.
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

  const published = clone(window.LERN_DATA);
  let data = store.get(KEY_STUDIO) || clone(published);
  data.meta = data.meta || {};
  let cur = data.nuggets.length ? 0 : -1;     // -1 = Einstellungen

  // ---------- Medienbibliothek ----------
  // name -> { name, url, source: 'lokal'|'repo', kind: 'bild'|'video', duration, w, h, ok, size, inRepo }
  const lib = new Map();
  const libList = document.getElementById('lib-list');
  const kindOf = name => VIDEO_RE.test(name) ? 'video' : 'bild';
  // Pfad aus den Daten → abspielbare URL (lokale Datei hat Vorrang)
  const urlOf = p => { const e = p && lib.get(fileOf(p)); return e ? e.url : p; };

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
      ? '<span class="st bad">✕ im Browser nicht abspielbar – vermutlich ProRes. Als H.264 ausgeben oder Grafik verwenden.</span>'
      : '<span class="st bad">✕ Bild kann nicht geladen werden</span>';
    else st = `<span class="st good">✓ ${e.kind === 'video' ? fmtS(e.duration) + ' · ' : ''}${e.w}×${e.h}</span>`;
    const big = e.size > 25 * 1024 * 1024 ? '<span class="st bad">Größer als 25 MB – Web-Upload bei GitHub nicht möglich</span>' : '';
    const prev = e.ok === false ? '<span class="vthumb-x">!</span>'
      : e.kind === 'video' ? `<video src="${esc(e.url)}" muted preload="metadata" data-end></video>`
        : `<img src="${esc(e.url)}" alt="">`;
    const where = e.source === 'lokal' ? (e.inRepo ? 'lokal · auch im Repository' : 'lokal · noch nicht hochgeladen') : 'im Repository (media/)';
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
  if (repo) {
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
  referenced(data).forEach(p => {
    const nm = fileOf(p);
    if (!lib.has(nm)) { const e = { name: nm, url: p, source: 'repo', kind: kindOf(nm) }; lib.set(nm, e); probe(e); }
  });

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
      const nb = cleanBg(n.hintergrund); if (nb) n.hintergrund = nb; else delete n.hintergrund;
      n.szenen.forEach(sc => {
        ['sprechtext', 'video', 'grafik', 'stichwort'].forEach(k => { if (sc[k] === '' || sc[k] == null) delete sc[k]; });
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
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const ok = store.set(KEY_STUDIO, data);
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
      <span>${esc(n.titel || '(ohne Titel)')}</span><small>${esc(kat[n.kategorie] || '')} · ${n.szenen.length} Szenen${n.freigabestatus === 'freigegeben' ? ' · freigegeben' : ''}</small></button></li>`).join('');
    listEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { cur = +b.dataset.i; renderAll(); editor.focus(); }));
  }
  settingsBtn.addEventListener('click', () => { cur = -1; renderAll(); editor.focus(); });

  document.getElementById('btn-new').addEventListener('click', () => {
    let id = 'neues-nugget', k = 2;
    while (data.nuggets.some(n => n.id === id)) id = 'neues-nugget-' + k++;
    data.nuggets.push({
      id, titel: 'Neues Lernnugget', kategorie: data.kategorien[0].id, schlagwoerter: [], kurztext: '', lernziel: '', langtext: '',
      quelle: '', freigabestatus: 'entwurf',
      szenen: [{ icon: 'report', animation: 'fade', stichwort: '', text: '' }], quiz: []
    });
    cur = data.nuggets.length - 1; renderAll(); save();
    const t = editor.querySelector('[data-f="titel"]'); if (t) { t.focus(); t.select(); }
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
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
    if (v.length) html += `<optgroup label="Fertige Videos">${v.map(e => opt('v:media/' + e.name, `${e.name}${e.duration ? ' · ' + fmtS(e.duration) : ''}${e.ok === false ? ' (nicht abspielbar)' : ''}`, e.ok === false)).join('')}</optgroup>`;
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
      if (e && e.duration) inner += `<span class="badge">Video · ${fmtS(e.duration)}</span>`;
    } else {
      inner = `<div class="mini-visual">${SZ.visualHTML(sc, ICONS, { urlFn: urlOf })}</div>`;
    }
    return `<div class="mini-stage" data-ton="${SZ.ton(bg)}" style="${SZ.bgStyle(bg, urlOf)}" title="Klicken zum Abspielen">
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
    if (cur === -1) return renderSettings();
    const n = data.nuggets[cur];
    if (!n) { editor.innerHTML = '<div class="ed-card">Kein Lernnugget vorhanden. Links „＋ Neu“ wählen.</div>'; return; }
    const katOpts = data.kategorien.map(k => `<option value="${k.id}" ${k.id === n.kategorie ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    const iconOpts = sel => Object.keys(ICONS).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
    const animOpts = sel => SZ.ANIMATIONEN.map(([v, l]) => `<option value="${v}" ${v === (sel || 'fade') ? 'selected' : ''}>${l}</option>`).join('');
    const durOpts = sel => {
      const s = sel ? String(sel) : '';
      const known = DAUERN.some(([v]) => v === s);
      return DAUERN.map(([v, l]) => `<option value="${v}" ${v === s ? 'selected' : ''}>${l}</option>`).join('')
        + `<option value="frei" ${!known ? 'selected' : ''}>eigene Angabe …</option>`;
    };
    editor.innerHTML = `
      <section class="ed-card">
        <h2>Allgemein <button class="linkbtn" id="del-nugget">Lernnugget löschen</button></h2>
        <div class="fgrid">
          ${field('Titel', 'titel', n.titel)}
          <label class="field"><span>Kategorie</span><div class="inline"><select data-f="kategorie">${katOpts}</select><button class="ctrl" id="add-kat" type="button" title="Neue Kategorie">＋</button></div></label>
          ${field('Kurztext', 'kurztext', n.kurztext, { full: true, hint: 'erscheint auf der Kachel' })}
          ${field('Lernziel', 'lernziel', n.lernziel, { full: true, area: true, rows: 2 })}
          ${field('Erklärung', 'langtext', n.langtext, { full: true, area: true, rows: 4 })}
          ${field('Schlagwörter', 'schlagwoerter', (n.schlagwoerter || []).join(', '), { hint: 'mit Komma trennen – für die Suche' })}
          ${field('Quelle', 'quelle', n.quelle)}
          <label class="field"><span>Freigabestatus</span><select data-f="freigabestatus">
            <option value="entwurf" ${n.freigabestatus !== 'freigegeben' ? 'selected' : ''}>Entwurf – fachlich ungeprüft</option>
            <option value="freigegeben" ${n.freigabestatus === 'freigegeben' ? 'selected' : ''}>Fachlich freigegeben</option></select></label>
          ${field('ID', 'id', n.id, { hint: 'Teil der Adresse und der Dateinamen' })}
          <div class="field full"><span>Hintergrund für alle Szenen dieses Lernnuggets</span>${bgEditor(n.hintergrund, 'Standard der Plattform', 'n')}</div>
        </div>
      </section>

      <section class="ed-card">
        <h2>Szenen <span class="small" style="margin:0">Eine Szene läuft, bis Sprecher, Mindestdauer und ggf. Video fertig sind.</span></h2>
        <div class="scenes">${n.szenen.map((sc, k) => `
          <div class="scene" data-k="${k}">
            <div class="scene-head"><strong>Szene ${k + 1}</strong>
              <div class="scene-tools">
                <button data-act="up" ${k === 0 ? 'disabled' : ''} title="Nach oben">↑</button>
                <button data-act="down" ${k === n.szenen.length - 1 ? 'disabled' : ''} title="Nach unten">↓</button>
                <button data-act="dup" title="Duplizieren">⧉</button>
                <button data-act="del" ${n.szenen.length === 1 ? 'disabled' : ''} title="Löschen">✕</button>
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
              ${sc.grafik ? '' : `<label class="field"><span>Platzhalter-Icon</span><select data-sf="icon">${iconOpts(sc.icon)}</select></label>`}`}
              <label class="field"><span>Stichwort auf der Bühne</span><input data-sf="stichwort" value="${esc(sc.stichwort)}"></label>
              <label class="field"><span>Sprechertext / Untertitel</span><textarea data-sf="text" rows="3">${esc(sc.text)}</textarea></label>
              <label class="field"><span>Aussprache <em class="hint">optional, z. B. „eins, eins, zwei“ statt „112“</em></span><input data-sf="sprechtext" value="${esc(sc.sprechtext)}"></label>
              <div class="field"><span>Hintergrund dieser Szene</span>${bgEditor(sc.hintergrund, 'wie Lernnugget', 's' + k)}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="add-row" style="margin-top:12px"><button class="btn ghost" id="add-scene">＋ Szene hinzufügen</button></div>
      </section>

      <section class="ed-card">
        <h2>Quiz <span class="small" style="margin:0">optional</span></h2>
        <div class="scenes">${(n.quiz || []).map((q, k) => `
          <div class="qedit" data-q="${k}">
            <div class="scene-head"><strong>Frage ${k + 1}</strong><div class="scene-tools"><button data-qact="del" title="Frage löschen">✕</button></div></div>
            <label class="field"><span>Frage</span><input data-qf="frage" value="${esc(q.frage)}"></label>
            <div class="field"><span>Antworten <em class="hint">richtige Antwort markieren</em></span>
              ${q.antworten.map((a, j) => `<div class="ans"><input type="radio" name="r${k}" data-qr="${j}" ${q.richtig === j ? 'checked' : ''} aria-label="Antwort ${j + 1} ist richtig">
                <input data-qa="${j}" value="${esc(a)}" aria-label="Antwort ${j + 1}"><button class="ctrl" data-qdel="${j}" ${q.antworten.length <= 2 ? 'disabled' : ''} title="Antwort entfernen">✕</button></div>`).join('')}
              ${q.antworten.length < 4 ? '<div><button class="ctrl" data-qadd type="button">＋ Antwort</button></div>' : ''}
            </div>
            <label class="field"><span>Erklärung nach dem Antworten</span><textarea data-qf="erklaerung" rows="2">${esc(q.erklaerung)}</textarea></label>
          </div>`).join('')}
        </div>
        <div class="add-row" style="margin-top:12px"><button class="btn ghost" id="add-q">＋ Frage hinzufügen</button></div>
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
          <div class="field full"><span>Standard-Hintergrund für alle Lernnuggets</span>${bgEditor(m.hintergrund, null, 'm')}</div>
        </div>
        <p class="hint-line">Reihenfolge: Hintergrund der Szene → des Lernnuggets → dieser Standard.</p>
      </section>
      <section class="ed-card"><h2>Vorschau</h2><div class="settings-prev">${stagePreview(null, { icon: 'report', animation: 'pop', stichwort: 'Beispiel-Stichwort' })}</div></section>`;
    editor.querySelectorAll('[data-f]').forEach(el => el.addEventListener('input', () => {
      m[el.dataset.f.slice(2)] = el.value; save();
    }));
    const ap = editor.querySelector('[data-mf="akzent-p"]'), ah = editor.querySelector('[data-mf="akzent"]');
    const setAkzent = v => { m.akzentfarbe = v; document.documentElement.style.setProperty('--accent', v); save(); };
    ap.addEventListener('input', () => { ah.value = ap.value; setAkzent(ap.value); });
    ah.addEventListener('input', () => { const v = SZ.normHex(ah.value); ah.classList.toggle('invalid', !v); if (v) { ap.value = v; setAkzent(v); } });
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
      if (f === 'schlagwoerter') n.schlagwoerter = el.value.split(',');
      else if (f === 'id') n.id = slug(el.value);
      else n[f] = el.value;
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
    editor.querySelector('#del-nugget').addEventListener('click', () => {
      if (!confirm(`„${n.titel}“ wirklich löschen?`)) return;
      data.nuggets.splice(cur, 1); cur = Math.max(-1, Math.min(cur, data.nuggets.length - 1)); renderAll(); save();
    });
    // Hintergrund des Lernnuggets: wirkt auf alle Szenen-Vorschauen
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
        if (['icon', 'animation', 'stichwort'].includes(f)) refresh();
        save();
      }));
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
    store.set(KEY_STUDIO, data);
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
  document.getElementById('btn-export').addEventListener('click', () => {
    const issues = validate();
    const toUpload = [...referenced(cleanData(data))].map(fileOf).filter(nm => { const e = lib.get(nm); return e && e.source === 'lokal' && !e.inRepo; });
    const gh = repo ? `https://github.com/${repo.owner}/${repo.name}` : null;
    document.getElementById('dlg-body').innerHTML = `
      ${issues.length ? `<div class="warn"><strong>Bitte prüfen:</strong><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="ok-note">Keine Probleme gefunden.</div>'}
      <ol>
        <li><strong>inhalte.js herunterladen</strong> (Button unten).</li>
        <li>Auf GitHub ${gh ? `<a href="${gh}/upload/main/data" target="_blank" rel="noopener">den Ordner <code>data</code> öffnen</a>` : 'den Ordner <code>data</code> öffnen'} → „Add file“ → „Upload files“, die Datei <code>inhalte.js</code> hineinziehen und „Commit changes“ klicken. Die alte Datei wird ersetzt.</li>
        ${toUpload.length ? `<li><strong>Neue Dateien hochladen:</strong> ${gh ? `<a href="${gh}/upload/main/media" target="_blank" rel="noopener">Ordner <code>media</code></a>` : 'Ordner <code>media</code>'} → „Upload files“: ${toUpload.map(x => `<code>${esc(x)}</code>`).join(', ')}</li>` : ''}
        <li>Nach etwa 3–5 Minuten ist alles aktuell: Seite, Sprecher für geänderte Texte und die MP4-Downloads (Fortschritt im Reiter „Actions“).</li>
      </ol>`;
    dlg.showModal();
  });
  document.getElementById('btn-download').addEventListener('click', () => {
    const d = cleanData(data);
    const js = 'window.LERN_DATA = ' + JSON.stringify(d, null, 2) + ';\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    a.download = 'inhalte.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  const akz = SZ.normHex(data.meta.akzentfarbe);
  if (akz) document.documentElement.style.setProperty('--accent', akz);
  window.addEventListener('beforeunload', () => store.set(KEY_STUDIO, data));
  renderAll(); save();
})();
