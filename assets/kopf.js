/*
 * Kopfzeile auf dem Server: angemeldetes Konto, Links nach Rolle, Abmelden.
 * Wird nur vom Server eingebunden (nach konto.js). Auf GitHub Pages bleibt die Kopfzeile unverändert.
 */
(function () {
  'use strict';
  const K = window.LERN_KONTO;
  const html = document.documentElement;
  const nav = document.querySelector('.topnav');
  if (!nav) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const badge = nav.querySelector('.proto-badge');
  if (badge) badge.remove();

  // Öffentlich geteiltes Lernnugget ohne Anmeldung: keine Navigation
  if (html.dataset.freigabe && !K) {
    nav.innerHTML = '<a href="anmelden">Anmelden</a>';
    return;
  }
  if (!K) return;

  const hier = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const links = [['/', 'Übersicht']];
  if (K.darf_studio) links.push(['/studio', 'Studio']);
  if (K.darf_bearbeiten) links.push(['/verwaltung', 'Konten']);
  nav.innerHTML = links.map(([href, t]) => `<a href="${href}"${hier === href ? ' aria-current="page"' : ''}>${t}</a>`).join('');

  const box = document.createElement('div');
  box.className = 'konto-menu';
  box.innerHTML = `
    <a class="konto-name" href="/konto" title="Mein Konto"${hier === '/konto' ? ' aria-current="page"' : ''}>
      <span class="konto-initial" aria-hidden="true">${esc((K.name || K.benutzer).trim().charAt(0).toUpperCase())}</span>
      <span><strong>${esc(K.name)}</strong><small>${esc(K.rollenname)}</small></span></a>
    <form method="post" action="/api/abmelden"><button class="ctrl" type="submit">Abmelden</button></form>`;
  const ziel = document.querySelector('.topbar');
  (ziel.querySelector('.top-actions') || nav).insertAdjacentElement('afterend', box);
})();
