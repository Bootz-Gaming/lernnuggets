/*
 * Lernnuggets – statischer Prototyp (Handlungsplan Nr. 13–16)
 * Läuft auf GitHub Pages oder direkt aus dem Ordner. Keine Anmeldung, kein Tracking,
 * keine externen Verbindungen. Eigene Animationen (.mov/.mp4/.webm) pro Szene über das Feld "video".
 */
(function () {
  'use strict';

  // Vorschau aus dem Studio: index.html?vorschau lädt den Entwurf aus diesem Browser
  const VORSCHAU = /[?&]vorschau/.test(location.search);
  function loadDraft() {
    if (!VORSCHAU) return null;
    try { return JSON.parse(localStorage.getItem('lernnuggets-entwurf')); } catch (e) { return null; }
  }
  const DATA = loadDraft() || window.LERN_DATA;
  const ICONS = window.LERN_ICONS || {};
  const main = document.getElementById('main');
  const katName = Object.fromEntries(DATA.kategorien.map(k => [k.id, k.name]));
  const STATUS = { entwurf: 'Entwurf – fachlich ungeprüft', freigegeben: 'Fachlich freigegeben' };

  // Zustand nur im Arbeitsspeicher (keine Speicherung)
  const ui = { query: '', kat: 'alle', ton: true, untertitel: true, voiceURI: null };

  document.getElementById('brand-title').textContent = DATA.meta.titel;
  document.getElementById('brand-sub').textContent = DATA.meta.untertitel;
  document.getElementById('version').textContent = DATA.meta.version;
  if (VORSCHAU) {
    const b = document.createElement('div');
    b.className = 'preview-banner';
    b.innerHTML = loadDraft() ? 'Vorschau des Studio-Entwurfs – nur in diesem Browser sichtbar. <a href="studio.html">Zurück zum Studio</a>'
      : 'Kein Studio-Entwurf in diesem Browser gefunden – es werden die veröffentlichten Inhalte gezeigt.';
    document.body.prepend(b);
  }

  // ---------- Hilfsfunktionen ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const icon = name => ICONS[name] || ICONS.report || '';
  const sceneSeconds = sc => Math.max(3.5, sc.text.length / 14 + 1.2); // Lesetempo für Untertitel ohne Ton
  const nuggetSeconds = n => n.szenen.reduce((s, sc) => s + Math.max(sc.laenge || 0, sc.dauer || sceneSeconds(sc)), 0);

  // Video auf den letzten Frame setzen (Endzustand der Animation als Standbild)
  function endFrame(v) {
    const seek = () => { if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05); };
    if (v.readyState >= 1) seek(); else v.addEventListener('loadedmetadata', seek, { once: true });
  }
  function thumb(sc) {
    if (!sc.video) return icon(sc.icon);
    return `<video class="thumb-video" src="${esc(sc.video)}" muted playsinline preload="metadata"></video>`;
  }
  function wireThumbs(root) {
    root.querySelectorAll('video.thumb-video').forEach(v => {
      v.addEventListener('error', () => { const sc = v.closest('[data-icon]'); v.outerHTML = icon(sc ? sc.dataset.icon : ''); }, { once: true });
      endFrame(v);
    });
  }
  const fmtDur = sec => sec < 60 ? `${Math.round(sec / 5) * 5} Sek.` : `ca. ${Math.round(sec / 60)} Min.`;

  function highlight(text, q) {
    if (!q) return esc(text);
    const nt = norm(text), nq = norm(q);
    const i = nt.indexOf(nq);
    if (i < 0 || nt.length !== text.length) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function matches(n, q) {
    if (!q) return true;
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const hay = norm([n.titel, n.kurztext, katName[n.kategorie], ...n.schlagwoerter, ...n.szenen.map(s => s.stichwort)].join(' '));
    return terms.every(t => hay.includes(t));
  }

  // ---------- Routing ----------
  let player = null;
  function route() {
    if (player) { player.destroy(); player = null; }
    const m = location.hash.match(/^#\/nugget\/([\w-]+)/);
    const n = m && DATA.nuggets.find(x => x.id === m[1]);
    if (n) renderDetail(n); else renderHome();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ---------- Startseite ----------
  function renderHome() {
    document.title = `${DATA.meta.titel} – Prototyp`;
    main.innerHTML = `
      <section class="hero">
        <h1>Was möchten Sie heute lernen?</h1>
        <p>Kurze Erklärformate in wenigen Szenen: animiertes Icon, Sprechertext und Untertitel. Zum Abschluss ein kurzes Quiz.</p>
        <div class="search" role="search">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          <label class="sr" for="q">Lerninhalte durchsuchen</label>
          <input id="q" type="search" autocomplete="off" placeholder="Suchen, z. B. Passwort, 112, Rücken …" value="${esc(ui.query)}">
        </div>
      </section>
      <div class="chips" role="group" aria-label="Nach Kategorie filtern" id="chips"></div>
      <p class="result-info" id="info" aria-live="polite"></p>
      <div class="grid" id="grid"></div>`;

    const input = main.querySelector('#q');
    input.addEventListener('input', () => { ui.query = input.value.trim(); drawList(); });
    drawList();
  }

  function drawList() {
    const q = ui.query;
    const hits = DATA.nuggets.filter(n => matches(n, q));
    const chips = main.querySelector('#chips');
    const cats = [{ id: 'alle', name: 'Alle' }, ...DATA.kategorien];
    chips.innerHTML = cats.map(k => {
      const c = k.id === 'alle' ? hits.length : hits.filter(n => n.kategorie === k.id).length;
      return `<button class="chip" data-kat="${k.id}" aria-pressed="${ui.kat === k.id}">${esc(k.name)}<span class="count">${c}</span></button>`;
    }).join('');
    chips.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { ui.kat = b.dataset.kat; drawList(); }));

    const list = hits.filter(n => ui.kat === 'alle' || n.kategorie === ui.kat);
    main.querySelector('#info').textContent = q || ui.kat !== 'alle'
      ? `${list.length} ${list.length === 1 ? 'Lernnugget' : 'Lernnuggets'} gefunden`
      : `${DATA.nuggets.length} Lernnuggets in ${DATA.kategorien.length} Kategorien`;

    const grid = main.querySelector('#grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>Keine Treffer für „${esc(q)}“.</strong><br>Versuchen Sie einen anderen Begriff oder wählen Sie „Alle“.</div>`;
      return;
    }
    grid.innerHTML = list.map(n => `
      <a class="card" href="#/nugget/${n.id}">
        <div class="card-thumb" data-icon="${esc(n.szenen[0].icon)}">${thumb(n.szenen[0])}<span class="dur">${n.szenen.length} Szenen · ${fmtDur(nuggetSeconds(n))}</span></div>
        <div class="card-body">
          <div class="meta"><span class="tag">${esc(katName[n.kategorie])}</span><span class="status ${n.freigabestatus}">${n.freigabestatus === 'freigegeben' ? 'Freigegeben' : 'Entwurf'}</span></div>
          <h2>${highlight(n.titel, q)}</h2>
          <p>${highlight(n.kurztext, q)}</p>
        </div>
      </a>`).join('');
    wireThumbs(grid);
  }

  // ---------- Detailseite ----------
  function renderDetail(n) {
    document.title = `${n.titel} – ${DATA.meta.titel}`;
    const idx = DATA.nuggets.indexOf(n);
    const prev = DATA.nuggets[idx - 1], next = DATA.nuggets[idx + 1];
    main.innerHTML = `
      <nav class="crumbs" aria-label="Brotkrumen"><a href="#/">← Alle Lernnuggets</a> / ${esc(katName[n.kategorie])}</nav>
      <div class="detail-head">
        <h1>${esc(n.titel)}</h1>
        <div class="meta"><span class="tag">${esc(katName[n.kategorie])}</span><span class="tag">${n.szenen.length} Szenen · ${fmtDur(nuggetSeconds(n))}</span><span class="status ${n.freigabestatus}">${esc(STATUS[n.freigabestatus] || n.freigabestatus)}</span></div>
      </div>
      <div class="detail">
        <div class="player" id="player"></div>
        <aside class="side">
          <div class="panel">
            <h2>Lernziel</h2><p>${esc(n.lernziel)}</p>
            <h2>Erklärung</h2><p>${esc(n.langtext)}</p>
          </div>
          <div class="panel">
            <details class="transcript"><summary>Transkript (${n.szenen.length} Szenen)</summary>
              <ol>${n.szenen.map(s => `<li><strong>${esc(s.stichwort)}</strong>${esc(s.text)}</li>`).join('')}</ol>
            </details>
          </div>
          <div class="panel">
            <dl class="kv">
              <dt>Schlagwörter</dt><dd>${n.schlagwoerter.map(esc).join(', ')}</dd>
              <dt>Quelle</dt><dd>${esc(n.quelle)}</dd>
              <dt>Status</dt><dd>${esc(STATUS[n.freigabestatus] || n.freigabestatus)}</dd>
              <dt>ID</dt><dd><code>${esc(n.id)}</code></dd>
            </dl>
          </div>
        </aside>
        ${n.quiz && n.quiz.length ? '<section class="quiz" id="quiz" aria-labelledby="quiz-h"></section>' : ''}
      </div>
      <nav class="pager" aria-label="Weitere Lernnuggets">
        ${prev ? `<a href="#/nugget/${prev.id}">← ${esc(prev.titel)}</a>` : '<span></span>'}
        ${next ? `<a href="#/nugget/${next.id}">${esc(next.titel)} →</a>` : ''}
      </nav>`;

    player = new Player(main.querySelector('#player'), n);
    if (n.quiz && n.quiz.length) renderQuiz(main.querySelector('#quiz'), n);
  }

  // ---------- Sprachausgabe ----------
  // Vorschau-Stimme: ausschließlich lokal installierte Betriebssystem-Stimmen (localService === true).
  // Online-Stimmen des Browsers (z. B. „Natural“/„Google“) werden bewusst ausgeschlossen,
  // weil dabei der Text an einen Cloud-Dienst übertragen würde.
  const tts = {
    ok: 'speechSynthesis' in window,
    voices: [],
    load() {
      if (!this.ok) return;
      this.voices = speechSynthesis.getVoices().filter(v => v.localService && /^de(-|_|$)/i.test(v.lang));
    },
    voice() { return this.voices.find(v => v.voiceURI === ui.voiceURI) || this.voices[0] || null; }
  };
  tts.load();
  if (tts.ok) speechSynthesis.addEventListener('voiceschanged', () => { tts.load(); if (player) player.updateVoiceInfo(); });

  const ICON_SVG = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    replay: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    cc: '<svg viewBox="0 0 24 24"><path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/></svg>'
  };

  // ---------- Erklärplayer (Szenenfolge im Stil eines Erklärvideos) ----------
  class Player {
    constructor(el, n) {
      this.el = el; this.n = n; this.i = 0; this.playing = false; this.token = 0;
      this.audio = null; this.raf = 0; this.source = '';
      el.innerHTML = `
        <div class="stage" id="stage" aria-label="Erklärvideo ${esc(n.titel)}">
          <div class="stage-inner"><div class="stage-visual" id="visual"></div><div class="stage-word" id="word"></div></div>
          <span class="stage-count" id="count"></span>
          <div class="overlay" id="ov-start"><button class="big-play" id="bigplay" aria-label="Erklärvideo abspielen">${ICON_SVG.play}</button></div>
          <div class="overlay" id="ov-end" hidden><div class="end"><strong>Geschafft!</strong><span>Prüfen Sie Ihr Wissen im Quiz.</span>
            <div class="row"><button class="btn ghost" id="again">${'Nochmal ansehen'}</button>${n.quiz && n.quiz.length ? '<a class="btn" href="#quiz" id="toquiz">Zum Quiz</a>' : ''}</div></div></div>
        </div>
        <div class="caption" id="cap" aria-live="polite"></div>
        <div class="progress" id="prog">${n.szenen.map((s, k) => `<button class="seg" data-k="${k}" aria-label="Szene ${k + 1}: ${esc(s.stichwort)}"><span></span></button>`).join('')}</div>
        <div class="controls">
          <button class="ctrl primary" id="pp" aria-label="Abspielen">${ICON_SVG.play}<span>Abspielen</span></button>
          <button class="ctrl" id="prev" aria-label="Vorherige Szene">${ICON_SVG.prev}</button>
          <button class="ctrl" id="next" aria-label="Nächste Szene">${ICON_SVG.next}</button>
          <span class="spacer"></span>
          <button class="ctrl" id="snd" aria-pressed="${ui.ton}">${ICON_SVG.sound}<span>Ton</span></button>
          <button class="ctrl" id="cc" aria-pressed="${ui.untertitel}">${ICON_SVG.cc}<span>Untertitel</span></button>
        </div>
        <div class="voice-info" id="vinfo"></div>`;
      const $ = s => el.querySelector(s);
      this.$ = $;
      $('#bigplay').addEventListener('click', e => { e.stopPropagation(); this.play(); });
      $('#stage').addEventListener('click', () => this.toggle());
      $('#pp').addEventListener('click', () => this.toggle());
      $('#prev').addEventListener('click', () => this.go(this.i - 1));
      $('#next').addEventListener('click', () => this.go(this.i + 1));
      $('#again').addEventListener('click', e => { e.stopPropagation(); this.go(0, true); });
      const tq = $('#toquiz');
      if (tq) tq.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); document.getElementById('quiz').scrollIntoView({ behavior: 'smooth' }); });
      $('#snd').addEventListener('click', () => { ui.ton = !ui.ton; $('#snd').setAttribute('aria-pressed', ui.ton); this.updateVoiceInfo(); if (this.playing) this.show(this.i); });
      $('#cc').addEventListener('click', () => { ui.untertitel = !ui.untertitel; $('#cc').setAttribute('aria-pressed', ui.untertitel); $('#cap').hidden = !ui.untertitel; });
      el.querySelectorAll('.seg').forEach(b => b.addEventListener('click', () => this.go(+b.dataset.k)));
      this.onKey = e => {
        if (/input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === ' ' && !/button|a/i.test(e.target.tagName)) { e.preventDefault(); this.toggle(); }
        else if (e.key === 'ArrowRight') this.go(this.i + 1);
        else if (e.key === 'ArrowLeft') this.go(this.i - 1);
      };
      document.addEventListener('keydown', this.onKey);
      $('#cap').hidden = !ui.untertitel;
      this.render(0);
      this.updateVoiceInfo();
    }

    updateVoiceInfo() {
      const v = tts.voice();
      const t = !ui.ton ? 'Ton aus – Wiedergabe mit Untertiteln im Lesetempo.'
        : `Sprecher: Audiodatei aus dem Ordner „audio“, falls vorhanden. Sonst ${v ? `lokale Systemstimme „${v.name}“ (offline)` : 'keine lokale deutsche Systemstimme gefunden – Wiedergabe ohne Ton'}.`;
      this.$('#vinfo').textContent = t + (this.source ? ` Aktuell: ${this.source}.` : '');
    }

    render(i) {
      const sc = this.n.szenen[i];
      const vis = this.$('#visual');
      const anim = 'anim-' + (sc.animation || 'fade');
      this.video = null; this.vDone = true; this.vFrac = 1;
      if (sc.video) {
        // Eigene AE-Animation: Bewegung steckt im Video, daher keine zusätzliche CSS-Animation
        vis.innerHTML = `<video class="scene-video" src="${esc(sc.video)}" muted playsinline preload="auto"></video>`;
        vis.classList.add('has-video');
        const v = vis.querySelector('video');
        this.video = v; this.vDone = !this.playing; this.vFrac = this.playing ? 0 : 1;
        const tok = this.token;
        v.addEventListener('error', () => {
          console.warn('Video nicht abspielbar (Codec?):', sc.video);
          vis.innerHTML = `<div class="${anim}">${icon(sc.icon)}</div><p class="video-error">Video „${esc(sc.video)}“ kann in diesem Browser nicht abgespielt werden (z. B. ProRes). Bitte als H.264 ausgeben.</p>`;
          if (this.video === v) { this.video = null; this.vDone = true; this.vFrac = 1; if (tok === this.token) this.check(); }
        }, { once: true });
        v.addEventListener('timeupdate', () => { if (this.video === v && v.duration) { this.vFrac = v.currentTime / v.duration; this.paint(); } });
        v.addEventListener('ended', () => { if (this.video === v) { this.vDone = true; this.vFrac = 1; this.check(); } });
        if (this.playing) v.play().catch(() => { if (this.video === v) { this.vDone = true; this.vFrac = 1; this.check(); } });
        else endFrame(v);
      } else {
        vis.classList.remove('has-video');
        vis.innerHTML = `<div class="${anim}">${icon(sc.icon)}</div>`;
      }
      const w = this.$('#word');
      w.className = 'stage-word word-in'; w.textContent = sc.stichwort || ''; w.hidden = !sc.stichwort;
      this.$('#cap').textContent = sc.text;
      this.$('#count').textContent = `${i + 1} / ${this.n.szenen.length}`;
      this.el.querySelectorAll('.seg').forEach((s, k) => {
        s.classList.toggle('done', k < i);
        s.querySelector('span').style.width = k < i ? '100%' : '0';
        s.setAttribute('aria-current', k === i ? 'step' : 'false');
      });
    }

    // Szene endet erst, wenn Sprecher UND Animation fertig sind (Animationen 3, 5 oder 10 s)
    setBar(frac) { this.nFrac = frac; this.paint(); }
    paint() {
      const s = this.el.querySelectorAll('.seg span')[this.i];
      const f = Math.min(this.nFrac == null ? 0 : this.nFrac, this.vFrac == null ? 1 : this.vFrac, 1);
      if (s) s.style.width = (Math.max(0, f) * 100) + '%';
    }
    check() {
      if (!this.playing || !this.nDone || !this.vDone || this.advancing) return;
      this.advancing = true;
      const tok = this.token;
      this.timer = setTimeout(() => { if (tok === this.token) this.advance(); }, 400);
    }

    stopMedia() {
      this.token++;
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
      if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
      if (this.video) { this.video.pause(); }
      this.nDone = false; this.nFrac = 0; this.advancing = false;
      if (tts.ok) speechSynthesis.cancel();
    }

    show(i) {
      this.stopMedia();
      this.i = i; this.render(i);
      if (this.playing) this.narrate(this.n.szenen[i], i);
    }

    // Reihenfolge: Audiodatei (mp3, dann wav) → lokale Systemstimme → Timer im Lesetempo
    narrate(sc, i) {
      const tok = this.token;
      const done = () => { if (tok !== this.token) return; this.setBar(1); this.nDone = true; this.check(); };
      const timed = (secs, label) => {
        this.source = label; this.updateVoiceInfo();
        const t0 = performance.now();
        const tick = () => {
          if (tok !== this.token) return;
          const f = (performance.now() - t0) / (secs * 1000);
          this.setBar(f);
          if (f >= 1) done(); else this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      };
      const speak = () => {
        const v = tts.voice();
        if (!ui.ton || !v) return timed(sc.dauer || sceneSeconds(sc), ui.ton ? 'Untertitel ohne Ton' : 'Ton aus');
        this.source = 'lokale Systemstimme'; this.updateVoiceInfo();
        const u = new SpeechSynthesisUtterance(sc.sprechtext || sc.text);
        u.voice = v; u.lang = v.lang; u.rate = 1;
        const est = sc.text.length / 15;
        const t0 = performance.now();
        const tick = () => { if (tok !== this.token) return; this.setBar((performance.now() - t0) / (est * 1000)); this.raf = requestAnimationFrame(tick); };
        u.onend = () => { cancelAnimationFrame(this.raf); done(); };
        u.onerror = () => { if (tok === this.token) timed(sc.dauer || sceneSeconds(sc), 'Untertitel ohne Ton'); };
        speechSynthesis.speak(u);
        this.raf = requestAnimationFrame(tick);
      };
      if (!ui.ton) return speak();
      const files = sc.audio ? [sc.audio] : [`audio/${this.n.id}-${i + 1}.mp3`, `audio/${this.n.id}-${i + 1}.wav`];
      const tryFile = k => {
        if (tok !== this.token) return;
        if (k >= files.length) return speak();
        const a = new Audio();
        this.audio = a;
        a.preload = 'auto';
        a.addEventListener('error', () => { if (this.audio === a) { this.audio = null; tryFile(k + 1); } }, { once: true });
        a.addEventListener('timeupdate', () => { if (a.duration) this.setBar(a.currentTime / a.duration); });
        a.addEventListener('ended', () => done(), { once: true });
        a.src = files[k];
        a.play().then(() => { this.source = 'Audiodatei ' + files[k]; this.updateVoiceInfo(); })
          .catch(err => { if (err && err.name === 'NotAllowedError' && this.audio === a) { this.audio = null; speak(); } });
      };
      tryFile(0);
    }

    advance() {
      if (this.i < this.n.szenen.length - 1) this.show(this.i + 1);
      else { this.playing = false; this.syncButtons(); this.$('#ov-end').hidden = false; }
    }

    play() {
      this.$('#ov-start').hidden = true; this.$('#ov-end').hidden = true;
      this.playing = true; this.syncButtons(); this.show(this.i);
    }
    pause() { this.playing = false; this.stopMedia(); this.syncButtons(); if (this.video) endFrame(this.video); }
    toggle() {
      if (!this.$('#ov-end').hidden) return this.go(0, true);
      this.playing ? this.pause() : this.play();
    }
    go(i, autoplay) {
      if (i < 0 || i >= this.n.szenen.length) return;
      this.$('#ov-end').hidden = true; this.$('#ov-start').hidden = true;
      if (autoplay) { this.i = i; return this.play(); }
      this.show(i);
    }
    syncButtons() {
      const b = this.$('#pp');
      b.innerHTML = (this.playing ? ICON_SVG.pause : ICON_SVG.play) + `<span>${this.playing ? 'Pause' : 'Abspielen'}</span>`;
      b.setAttribute('aria-label', this.playing ? 'Pause' : 'Abspielen');
    }
    destroy() { this.stopMedia(); document.removeEventListener('keydown', this.onKey); }
  }

  // ---------- Quiz (nur in der laufenden Sitzung) ----------
  function renderQuiz(el, n) {
    const answers = new Array(n.quiz.length).fill(null);
    el.innerHTML = `<h2 id="quiz-h">Quiz</h2>
      <p class="hint">${n.quiz.length} Fragen · Ihr Ergebnis wird nicht gespeichert.</p>
      <div id="qs"></div><div id="score"></div>`;
    const qs = el.querySelector('#qs');
    qs.innerHTML = n.quiz.map((q, k) => `
      <div class="q" data-k="${k}"><fieldset>
        <legend>${k + 1}. ${esc(q.frage)}</legend>
        <div class="opts">${q.antworten.map((a, j) => `<button class="opt" data-j="${j}"><span class="dot" aria-hidden="true"></span><span>${esc(a)}</span></button>`).join('')}</div>
        <div class="fb" aria-live="polite"></div>
      </fieldset></div>`).join('');

    qs.querySelectorAll('.q').forEach(box => {
      const k = +box.dataset.k, q = n.quiz[k];
      box.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
        const j = +btn.dataset.j;
        answers[k] = j === q.richtig;
        box.querySelectorAll('.opt').forEach(b => {
          b.disabled = true;
          const bj = +b.dataset.j;
          if (bj === q.richtig) b.classList.add('correct');
          else if (bj === j) b.classList.add('wrong');
        });
        btn.setAttribute('aria-describedby', `fb-${k}`);
        box.querySelector('.fb').innerHTML = `<div id="fb-${k}" class="feedback ${answers[k] ? 'ok' : 'no'}"><strong>${answers[k] ? 'Richtig.' : 'Nicht ganz.'}</strong> ${esc(q.erklaerung)}</div>`;
        if (answers.every(a => a !== null)) showScore();
      }));
    });

    function showScore() {
      const r = answers.filter(Boolean).length;
      el.querySelector('#score').innerHTML = `<div class="score"><div><strong>${r} von ${n.quiz.length} richtig</strong><br>${r === n.quiz.length ? 'Sehr gut, alles verstanden.' : 'Schauen Sie sich die markierten Fragen noch einmal an.'}</div><button class="btn" id="retry">Quiz wiederholen</button></div>`;
      el.querySelector('#retry').addEventListener('click', () => { renderQuiz(el, n); el.scrollIntoView({ behavior: 'smooth' }); });
    }
  }

  route();
})();
