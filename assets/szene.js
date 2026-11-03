/*
 * Gemeinsame Szenen-Logik für Lernplattform und Studio:
 * Hintergrund (Standard → Lernnugget → Szene), Animationen, Bildinhalt.
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

  function visualHTML(sc, icons, opts) {
    opts = opts || {};
    const urlFn = opts.urlFn || (x => x);
    const anim = opts.animieren === false ? '' : 'anim-' + (sc.animation || 'fade');
    if (sc.grafik) return `<div class="${anim} grafik-wrap"><img class="scene-grafik" src="${esc(urlFn(sc.grafik))}" alt=""></div>`;
    return `<div class="${anim}">${icons[sc.icon] || icons.report || ''}</div>`;
  }

  window.LERN_SZENE = { ANIMATIONEN, STANDARD_BG, hintergrund, ton, bgStyle, art, visualHTML, normHex, esc };
})();
