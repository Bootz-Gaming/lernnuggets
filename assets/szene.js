/*
 * Gemeinsame Szenen-Logik für Lernplattform und Studio:
 * Hintergrund (Standard → Lernnugget → Szene), Animationen, Bildinhalt,
 * weitere Grafiken pro Szene (erscheinen nacheinander, passend zum gesprochenen Wort).
 * Die gleichen Regeln setzt tools/video.py für den MP4-Export um.
 */
(function () {
  'use strict';

  const ANIMATIONEN = [
    ['slide-left', 'Slide von links'],
    ['slide-right', 'Slide von rechts'],
    ['slide-up', 'Slide von unten'],
    ['pop', 'Pop-up'],
    ['zoom', 'Zoom'],
    ['fade', 'Fade-in']
  ];
  const STANDARD_BG = { farbe: '#ffffff' };
  const HEX = /^#[0-9a-f]{6}$/i;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normHex = v => {
    let s = String(v || '').trim();
    if (!s.startsWith('#')) s = '#' + s;
    if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map(c => c + c).join('');
    return HEX.test(s) ? s.toLowerCase() : null;
  };
  const gueltig = bg => !!bg && (!!bg.bild || !!normHex(bg.farbe));

  // Hintergrund einer Szene: Szene → Lernnugget → Standard der Plattform → Weiß
  function hintergrund(meta, n, sc) {
    if (sc && gueltig(sc.hintergrund)) return sc.hintergrund;
    if (n && gueltig(n.hintergrund)) return n.hintergrund;
    if (meta && gueltig(meta.hintergrund)) return meta.hintergrund;
    return STANDARD_BG;
  }

  function luminanz(hex) {
    const h = normHex(hex) || '#ffffff';
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  // Textdarstellung auf dem Hintergrund: 'hell' (dunkler Text), 'dunkel' (weißer Text) oder 'bild' (Text auf Plakette)
  function ton(bg) {
    if (bg.bild) return 'bild';
    return luminanz(bg.farbe) < 0.35 ? 'dunkel' : 'hell';
  }

  // Stil für die Bühne; urlFn ersetzt Dateipfade (z. B. durch lokale Blob-URLs im Studio)
  function bgStyle(bg, urlFn) {
    const farbe = normHex(bg.farbe) || '#ffffff';
    if (bg.bild) {
      const u = (urlFn ? urlFn(bg.bild) : bg.bild).replace(/["'\\()]/g, encodeURIComponent);
      return `background-color:${farbe};background-image:url('${u}');background-size:cover;background-position:center;`;
    }
    return `background-color:${farbe};`;
  }

  // Bildinhalt: Video > Grafik > Platzhalter-Icon
  function art(sc) { return sc.video ? 'video' : sc.grafik ? 'grafik' : 'icon'; }
  // Vollbild: fertige Erklärgrafik füllt die ganze Bühne (Stichwort entfällt, Titel steckt in der Grafik)
  const vollbild = sc => !!(sc && sc.grafik && !sc.video && sc.darstellung === 'vollbild');

  // Weitere Grafiken: sc.weitere = [{ grafik | icon, animation, bei: 'Wort' }], höchstens 3, nicht bei Video/Vollbild
  const MAX_WEITERE = 3;
  const weitere = sc => (sc && !sc.video && !vollbild(sc) && Array.isArray(sc.weitere)) ? sc.weitere.slice(0, MAX_WEITERE) : [];
  // Stelle des Stichworts im Text als Anteil 0…1 (null = nicht gefunden)
  function fundstelle(wort, sc, ab) {
    wort = String(wort || '').trim().toLowerCase();
    if (!wort) return null;
    for (const t of [sc.sprechtext, sc.text]) {
      const low = String(t || '').toLowerCase();
      if (!low) continue;
      let i = low.indexOf(wort, Math.round((ab || 0) * low.length));
      if (i < 0) i = low.indexOf(wort);
      if (i >= 0) return Math.min(0.97, i / low.length);
    }
    return null;
  }
  // Zeitpunkte der weiteren Grafiken als Anteil am Sprechertext; ohne Wort gleichmäßig verteilt
  function zeitpunkte(sc) {
    const w = weitere(sc);
    let ab = 0;
    return w.map((e, k) => {
      const f = fundstelle(e.bei, sc, ab);
      if (f == null) return (k + 1) / (w.length + 1);
      ab = f; return f;
    });
  }
  function einzelHTML(el, icons, urlFn, anim) {
    if (el.grafik) return `<div class="${anim} grafik-wrap"><img class="scene-grafik" src="${esc(urlFn(el.grafik))}" alt=""></div>`;
    return `<div class="${anim}">${icons[el.icon] || icons.report || ''}</div>`;
  }
  // Weitere Grafik k (1…) sichtbar machen und ihre Animation starten
  function zeigeElement(root, k) {
    const slot = root && root.querySelector(`.slot[data-e="${k}"]`);
    if (!slot || !slot.classList.contains('wartet')) return;
    slot.classList.remove('wartet');
    const inner = slot.firstElementChild;
    if (inner && slot.dataset.anim) inner.classList.add(slot.dataset.anim);
  }

  function visualHTML(sc, icons, opts) {
    opts = opts || {};
    const urlFn = opts.urlFn || (x => x);
    const anim = opts.animieren === false ? '' : 'anim-' + (sc.animation || 'fade');
    const w = weitere(sc);
    if (w.length) {
      const animVon = el => opts.animieren === false ? '' : 'anim-' + (el.animation || 'fade');
      const alle = [{ grafik: sc.grafik, icon: sc.icon, animation: sc.animation }].concat(w);
      return `<div class="multi n${alle.length}">${alle.map((el, k) => {
        const wartet = k > 0 && opts.verborgen === true;
        return `<div class="slot${wartet ? ' wartet' : ''}" data-e="${k}" data-anim="${animVon(el)}">${einzelHTML(el, icons, urlFn, wartet ? '' : animVon(el))}</div>`;
      }).join('')}</div>`;
    }
    if (sc.grafik) return `<div class="${anim} grafik-wrap${vollbild(sc) ? ' vollbild' : ''}"><img class="scene-grafik" src="${esc(urlFn(sc.grafik))}" alt=""></div>`;
    return `<div class="${anim}">${icons[sc.icon] || icons.report || ''}</div>`;
  }

  window.LERN_SZENE = { ANIMATIONEN, STANDARD_BG, MAX_WEITERE, hintergrund, ton, bgStyle, art, vollbild, weitere, fundstelle, zeitpunkte, zeigeElement, visualHTML, normHex, esc };
})();
