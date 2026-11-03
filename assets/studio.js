/*
 * Studio – Redaktionsoberfläche für die Lernnuggets.
 * Alles läuft im Browser. Eigene Videos werden nur lokal geladen (Blob-URL), nichts wird hochgeladen.
 * Ergebnis ist eine neue data/inhalte.js, die über die GitHub-Weboberfläche hochgeladen wird.
 */
(function () {
  'use strict';

  const ICONS = window.LERN_ICONS || {};
  const KEY_STUDIO = 'lernnuggets-studio';     // sauberer Entwurf (mit media/-Pfaden)
  const KEY_PREVIEW = 'lernnuggets-entwurf';   // Vorschau (lokale Videos als Blob-URL)
  const VIDEO_RE = /\.(mov|mp4|m4v|webm)$/i;
  const ANIMS = [['slide-left', 'Slide von links'], ['slide-right', 'Slide von rechts'], ['pop', 'Pop-up'], ['fade', 'Fade']];

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtS = d => d == null ? '' : (Math.round(d * 10) / 10).toLocaleString('de-DE') + ' s';
  const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'nugget';
  const fileOf = p => String(p || '').split('/').pop();

  const published = clone(window.LERN_DATA);
  let data = store.get(KEY_STUDIO) || clone(published);
  let cur = 0;

  // ---------- Medienbibliothek ----------
  // name -> { name, url, source: 'lokal'|'repo', duration, w, h, ok: null|true|false }
  const lib = new Map();
  const libList = document.getElementById('lib-list');

  function probe(entry) {
    entry.ok = null;
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true;
    let finished = false;
    const finish = ok => {
      if (finished) return; finished = true; clearTimeout(t);
      entry.ok = ok && v.videoWidth > 0;
      if (entry.ok) { entry.duration = v.duration; entry.w = v.videoWidth; entry.h = v.videoHeight; }
      v.removeAttribute('src'); v.load();
      drawLib(); renderEditor(true);
    };
    const t = setTimeout(() => finish(false), 10000);
    v.addEventListener('loadeddata', () => finish(true), { once: true });
    v.addEventListener('error', () => finish(false), { once: true });
    v.src = entry.url;
  }

  function addLocalFiles(files) {
    [...files].filter(f => VIDEO_RE.test(f.name) || /^video\//.test(f.type)).forEach(f => {
      const old = lib.get(f.name);
      if (old && old.source === 'lokal') URL.revokeObjectURL(old.url);
      const e = { name: f.name, url: URL.createObjectURL(f), source: 'lokal', size: f.size, inRepo: !!(old && (old.source === 'repo' || old.inRepo)) };
      lib.set(f.name, e); probe(e);
    });
    drawLib();
  }

  function drawLib() {
    const items = [...lib.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!items.length) { libList.innerHTML = '<li class="small">Noch keine Animationen geladen.</li>'; return; }
    libList.innerHTML = items.map(e => {
      const st = e.ok === null ? '<span class="st">wird geprüft …</span>'
        : e.ok ? `<span class="st good">✓ ${fmtS(e.duration)} · ${e.w}×${e.h}</span>`
          : '<span class="st bad">✕ im Browser nicht abspielbar – vermutlich ProRes/Animation-Codec. Als H.264 ausgeben.</span>';
      const big = e.size > 25 * 1024 * 1024 ? '<span class="st bad">Größer als 25 MB – Web-Upload bei GitHub nicht möglich</span>' : '';
      return `<li class="lib-item">${e.ok === false ? '<span class="vthumb-x">!</span>' : `<video src="${esc(e.url)}" muted preload="metadata" data-end></video>`}
        <div><div class="nm">${esc(e.name)}</div>${st}<div class="st">${e.source === 'lokal' ? (e.inRepo ? 'lokal · auch im Repository' : 'lokal · noch nicht hochgeladen') : 'im Repository (media/)'}</div>${big}</div></li>`;
    }).join('');
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
        const vids = list.filter(f => f.type === 'file' && VIDEO_RE.test(f.name));
        vids.forEach(f => {
          const ex = lib.get(f.name);
          if (ex && ex.source === 'lokal') { ex.inRepo = true; return; }
          const e = { name: f.name, url: 'media/' + f.name, source: 'repo', size: f.size };
          lib.set(f.name, e); probe(e);
        });
        repoInfo.textContent = `${vids.length} Animation(en) im Repository ${repo.owner}/${repo.name} gefunden.`;
        drawLib();
      })
      .catch(() => { repoInfo.textContent = 'Repository-Ordner media/ konnte nicht gelesen werden (leer oder privat).'; });
  } else {
    repoInfo.textContent = 'Lokal geöffnet: Dateien aus media/ werden erst auf GitHub Pages automatisch aufgelistet.';
  }
  // bereits referenzierte Videos aufnehmen, damit Dauer und Abspielbarkeit sichtbar sind
  data.nuggets.forEach(n => n.szenen.forEach(sc => {
    const nm = fileOf(sc.video);
    if (sc.video && !lib.has(nm)) { const e = { name: nm, url: sc.video, source: 'repo' }; lib.set(nm, e); probe(e); }
  }));

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
  function cleanData(d) {
    const out = clone(d);
    out.nuggets.forEach(n => {
      n.schlagwoerter = (n.schlagwoerter || []).map(s => s.trim()).filter(Boolean);
      n.szenen.forEach(sc => {
        ['sprechtext', 'video', 'stichwort'].forEach(k => { if (sc[k] === '' || sc[k] == null) delete sc[k]; });
        if (!sc.video) delete sc.laenge;
      });
      if (!n.quiz || !n.quiz.length) delete n.quiz;
    });
    return out;
  }
  function previewData() {
    const d = cleanData(data);
    d.nuggets.forEach(n => n.szenen.forEach(sc => {
      const e = sc.video && lib.get(fileOf(sc.video));
      if (e && e.source === 'lokal') sc.video = e.url;
    }));
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
  function renderNav() {
    const kat = Object.fromEntries(data.kategorien.map(k => [k.id, k.name]));
    listEl.innerHTML = data.nuggets.map((n, i) => `<li><button data-i="${i}" aria-current="${i === cur}">
      <span>${esc(n.titel || '(ohne Titel)')}</span><small>${esc(kat[n.kategorie] || '')} · ${n.szenen.length} Szenen${n.freigabestatus === 'freigegeben' ? ' · freigegeben' : ''}</small></button></li>`).join('');
    listEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { cur = +b.dataset.i; renderAll(); editor.focus(); }));
  }

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

  // ---------- Editor ----------
  const editor = document.getElementById('editor');
  const field = (label, f, val, opt = {}) => {
    const attrs = `data-f="${f}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''}`;
    const ctl = opt.area ? `<textarea ${attrs} rows="${opt.rows || 3}">${esc(val)}</textarea>` : `<input ${attrs} value="${esc(val)}">`;
    return `<label class="field ${opt.full ? 'full' : ''}"><span>${label}${opt.hint ? ` <em class="hint">${opt.hint}</em>` : ''}</span>${ctl}</label>`;
  };

  function videoOptions(sel) {
    const items = [...lib.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const selName = fileOf(sel);
    let html = `<option value="">– Platzhalter-Icon –</option>`;
    if (sel && !lib.has(selName)) html += `<option value="${esc(sel)}" selected>${esc(selName)} (nicht gefunden)</option>`;
    html += items.map(e => `<option value="media/${esc(e.name)}" ${e.name === selName ? 'selected' : ''} ${e.ok === false ? 'disabled' : ''}>${esc(e.name)}${e.duration ? ' · ' + fmtS(e.duration) : ''}${e.ok === false ? ' (nicht abspielbar)' : ''}</option>`).join('');
    return html;
  }

  function scenePreview(sc) {
    if (!sc.video) return `<div class="scene-prev" title="Platzhalter-Icon">${ICONS[sc.icon] || ''}<span class="badge">Platzhalter</span></div>`;
    const e = lib.get(fileOf(sc.video));
    const url = e ? e.url : sc.video;
    const d = (e && e.duration) || sc.laenge;
    return `<div class="scene-prev" title="Klicken zum Abspielen"><video src="${esc(url)}" muted playsinline preload="metadata" data-end></video><span class="badge">${d ? fmtS(d) : 'Video'}</span></div>`;
  }

  function sceneWarn(sc) {
    if (!sc.video) return '';
    const e = lib.get(fileOf(sc.video));
    if (!e) return `<div class="warn">Datei „${esc(fileOf(sc.video))}“ nicht gefunden. Rechts wählen oder in media/ hochladen.</div>`;
    if (e.ok === false) return '<div class="warn">Diese Datei kann im Browser nicht abgespielt werden. In Media Encoder als H.264 (.mp4 oder .mov) ausgeben.</div>';
    if (e.source === 'lokal' && !e.inRepo) return '<div class="ok-note">Lokal geladen – beim Veröffentlichen in den Ordner media/ hochladen.</div>';
    return '';
  }

  function renderEditor(soft) {
    const n = data.nuggets[cur];
    if (!n) { editor.innerHTML = '<div class="ed-card">Kein Lernnugget vorhanden. Links „＋ Neu“ wählen.</div>'; return; }
    if (soft && editor.contains(document.activeElement) && /input|textarea/i.test(document.activeElement.tagName)) {
      // nur Vorschauen/Hinweise aktualisieren, um die Eingabe nicht zu stören
      editor.querySelectorAll('.scene').forEach((el, k) => {
        const sc = n.szenen[k]; if (!sc) return;
        el.querySelector('[data-sf="video"]').innerHTML = videoOptions(sc.video);
        el.querySelector('.warn-slot').innerHTML = sceneWarn(sc);
      });
      return;
    }
    const katOpts = data.kategorien.map(k => `<option value="${k.id}" ${k.id === n.kategorie ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    const iconOpts = sel => Object.keys(ICONS).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
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
          ${field('ID', 'id', n.id, { hint: 'Teil der Adresse und der Audiodateinamen' })}
        </div>
      </section>

      <section class="ed-card">
        <h2>Szenen <span class="small" style="margin:0">Eine Szene läuft, bis Sprecher und Animation fertig sind.</span></h2>
        <div class="scenes">${n.szenen.map((sc, k) => `
          <div class="scene" data-k="${k}">
            <div class="scene-head"><strong>Szene ${k + 1}</strong>
              <div class="scene-tools">
                <button data-act="up" ${k === 0 ? 'disabled' : ''} title="Nach oben">↑</button>
                <button data-act="down" ${k === n.szenen.length - 1 ? 'disabled' : ''} title="Nach unten">↓</button>
                <button data-act="dup" title="Duplizieren">⧉</button>
                <button data-act="del" ${n.szenen.length === 1 ? 'disabled' : ''} title="Löschen">✕</button>
              </div></div>
            <div>${scenePreview(sc)}</div>
            <div class="scene-fields">
              <label class="field"><span>Animation</span><select data-sf="video">${videoOptions(sc.video)}</select></label>
              <div class="warn-slot">${sceneWarn(sc)}</div>
              <label class="field"><span>Stichwort auf der Bühne</span><input data-sf="stichwort" value="${esc(sc.stichwort)}"></label>
              <label class="field"><span>Sprechertext / Untertitel</span><textarea data-sf="text" rows="3">${esc(sc.text)}</textarea></label>
              <label class="field"><span>Aussprache <em class="hint">optional, z. B. „eins, eins, zwei“ statt „112“</em></span><input data-sf="sprechtext" value="${esc(sc.sprechtext)}"></label>
              ${sc.video ? '' : `<div class="inline"><label class="field"><span>Platzhalter-Icon</span><select data-sf="icon">${iconOpts(sc.icon)}</select></label>
                <label class="field"><span>Einblendung</span><select data-sf="animation">${ANIMS.map(([v, l]) => `<option value="${v}" ${v === sc.animation ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>`}
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

  function bindEditor(n) {
    editor.querySelectorAll('video[data-end]').forEach(endFrame);
    editor.querySelectorAll('.scene-prev video').forEach(v => v.parentElement.addEventListener('click', () => {
      v.currentTime = 0; v.play().catch(() => {}); v.onended = () => endFrame(v);
    }));
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
      data.nuggets.splice(cur, 1); cur = Math.max(0, cur - 1); renderAll(); save();
    });

    editor.querySelectorAll('.scene').forEach(el => {
      const k = +el.dataset.k, sc = n.szenen[k];
      el.querySelectorAll('[data-sf]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
        const f = inp.dataset.sf;
        sc[f] = inp.value;
        if (f === 'video') {
          const e = lib.get(fileOf(inp.value));
          if (e && e.duration) sc.laenge = Math.round(e.duration * 10) / 10; else delete sc.laenge;
          renderEditor();
        } else if (f === 'icon' || f === 'animation') {
          el.querySelector('.scene-prev').outerHTML = scenePreview(sc);
        }
        save();
      }));
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
    data.nuggets.forEach(n => {
      const t = n.titel || n.id;
      if (!n.titel) issues.push(`Ein Lernnugget hat keinen Titel (${n.id}).`);
      if (ids.has(n.id)) issues.push(`Die ID „${n.id}“ ist doppelt vergeben.`); ids.add(n.id);
      n.szenen.forEach((sc, k) => {
        if (!String(sc.text || '').trim()) issues.push(`„${t}“, Szene ${k + 1}: Sprechertext fehlt.`);
        const e = sc.video && lib.get(fileOf(sc.video));
        if (e && e.ok === false) issues.push(`„${t}“, Szene ${k + 1}: Video nicht abspielbar (${e.name}).`);
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
    const used = new Set();
    data.nuggets.forEach(n => n.szenen.forEach(sc => { if (sc.video) used.add(fileOf(sc.video)); }));
    const toUpload = [...used].filter(nm => { const e = lib.get(nm); return e && e.source === 'lokal' && !e.inRepo; });
    const gh = repo ? `https://github.com/${repo.owner}/${repo.name}` : null;
    document.getElementById('dlg-body').innerHTML = `
      ${issues.length ? `<div class="warn"><strong>Bitte prüfen:</strong><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="ok-note">Keine Probleme gefunden.</div>'}
      <ol>
        <li><strong>inhalte.js herunterladen</strong> (Button unten).</li>
        <li>Auf GitHub ${gh ? `<a href="${gh}/upload/main/data" target="_blank" rel="noopener">den Ordner <code>data</code> öffnen</a>` : 'den Ordner <code>data</code> öffnen'}, „Add file“ → „Upload files“, die Datei <code>inhalte.js</code> hineinziehen und „Commit changes“ klicken. Die alte Datei wird ersetzt.</li>
        ${toUpload.length ? `<li><strong>Neue Animationen hochladen:</strong> ${gh ? `<a href="${gh}/upload/main/media" target="_blank" rel="noopener">Ordner <code>media</code></a>` : 'Ordner <code>media</code>'} → „Upload files“: ${toUpload.map(x => `<code>${esc(x)}</code>`).join(', ')}</li>` : ''}
        <li>Nach etwa 2–3 Minuten ist die Seite aktualisiert. Geänderte Sprechertexte werden dabei automatisch neu vertont (Fortschritt im Reiter „Actions“).</li>
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

  window.addEventListener('beforeunload', () => store.set(KEY_STUDIO, data));
  renderAll(); save();
})();
