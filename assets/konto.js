/*
 * Anmelden, eigenes Konto und Kontoverwaltung (nur auf dem eigenen Server).
 */
(function () {
  'use strict';
  const K = window.LERN_KONTO;
  const seite = document.body.dataset.seite;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLLEN = { admin: 'Admin', support: 'Support', anwender: 'Anwender' };
  const ROLLEN_TEXT = {
    admin: 'Alles, auch Veröffentlichen und Admin-Konten',
    support: 'Anwender betreuen, Inhalte im Studio bearbeiten',
    anwender: 'Lernnuggets ansehen'
  };
  const datum = iso => iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'noch nie';

  async function api(pfad, methode, daten) {
    const r = await fetch(pfad, {
      method: methode || 'GET', credentials: 'same-origin',
      headers: daten ? { 'Content-Type': 'application/json' } : {},
      body: daten ? JSON.stringify(daten) : undefined
    });
    let j = null;
    try { j = await r.json(); } catch (e) { /* kein JSON */ }
    if (!r.ok) throw new Error((j && j.fehler) || `Fehler ${r.status}`);
    return j;
  }
  function meldung(form, text, gut) {
    const m = form.querySelector('.form-msg');
    m.textContent = text || '';
    m.classList.toggle('gut', !!gut);
  }
  function sperren(form, an) { form.querySelectorAll('button, input, select').forEach(e => { e.disabled = an; }); }

  if (location.protocol === 'file:' || !document.documentElement.dataset.server) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="hinweis-statisch">Konten gibt es nur auf dem eigenen Server. Diese Seite funktioniert auf GitHub Pages nicht.</p>');
  }

  // ---------- Anmelden ----------
  if (seite === 'anmelden') {
    const fa = $('#f-anmelden'), fn = $('#f-neu');
    const params = new URLSearchParams(location.search);
    const ziel = (() => { const w = params.get('weiter') || '/'; return /^\/(?!\/)/.test(w) && !w.startsWith('/api/') ? w : '/'; })();
    const zeigeNeu = () => {
      fa.hidden = true; fn.hidden = false;
      $('#titel').textContent = 'Eigenes Passwort festlegen';
      $('#untertitel').textContent = K ? `Angemeldet als ${K.name}.` : '';
      fn.querySelector('[name="alt"]').focus();
    };
    if (K && K.muss_aendern) zeigeNeu(); else fa.querySelector('[name="benutzer"]').focus();

    fa.addEventListener('submit', async e => {
      e.preventDefault();
      const b = fa.benutzer.value.trim(), p = fa.passwort.value;
      if (!b || !p) return meldung(fa, 'Bitte Benutzername und Passwort eingeben.');
      sperren(fa, true); meldung(fa, '');
      try {
        const r = await api('/api/anmelden', 'POST', { benutzer: b, passwort: p });
        if (r.muss_aendern) { sperren(fa, false); fn.alt.value = p; zeigeNeu(); fn.neu.focus(); return; }
        location.replace(ziel);
      } catch (err) { sperren(fa, false); meldung(fa, err.message); fa.passwort.select(); }
    });
    fn.addEventListener('submit', async e => {
      e.preventDefault();
      if (fn.neu.value !== fn.neu2.value) return meldung(fn, 'Die beiden neuen Passwörter stimmen nicht überein.');
      sperren(fn, true); meldung(fn, '');
      try { await api('/api/passwort', 'POST', { alt: fn.alt.value, neu: fn.neu.value }); location.replace(ziel); }
      catch (err) { sperren(fn, false); meldung(fn, err.message); }
    });
    return;
  }

  if (!K) return;

  // ---------- Mein Konto ----------
  if (seite === 'konto') {
    $('#untertitel').textContent = `${K.name}, ${ROLLEN[K.rolle]}`;
    $('#angaben').innerHTML = `<dt>Name</dt><dd>${esc(K.name)}</dd><dt>Benutzername</dt><dd>${esc(K.benutzer)}</dd>
      <dt>Rolle</dt><dd>${esc(ROLLEN[K.rolle])}<br><span class="form-note">${esc(ROLLEN_TEXT[K.rolle])}</span></dd>
      <dt>Angelegt</dt><dd>${esc(datum(K.erstellt))}</dd>`;
    const f = $('#f-pw');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.neu.value !== f.neu2.value) return meldung(f, 'Die beiden neuen Passwörter stimmen nicht überein.');
      sperren(f, true); meldung(f, '');
      try { await api('/api/passwort', 'POST', { alt: f.alt.value, neu: f.neu.value }); f.reset(); meldung(f, 'Passwort geändert.', true); }
      catch (err) { meldung(f, err.message); }
      sperren(f, false);
    });
    return;
  }

  // ---------- Kontoverwaltung ----------
  if (seite !== 'verwaltung') return;
  const ADMIN = K.rolle === 'admin';
  $('#untertitel').textContent = ADMIN
    ? 'Als Admin verwalten Sie alle Konten. Support betreut Anwender und bearbeitet Inhalte, Anwender sehen die Lernnuggets.'
    : 'Als Support legen Sie Anwender-Konten an, sperren sie oder setzen Passwörter zurück.';
  const erlaubteRollen = ADMIN ? ['anwender', 'support', 'admin'] : ['anwender'];
  $('#neu-rolle').innerHTML = erlaubteRollen.map(r => `<option value="${r}">${ROLLEN[r]}</option>`).join('');
  if (!ADMIN) $('#neu-rolle').closest('.field').hidden = true;

  let konten = [];
  const tbody = $('#liste'), suche = $('#suche'), listeMsg = $('#liste-msg');

  function einmal(titel, pw) {
    $('#einmal-titel').textContent = titel;
    $('#einmal-pw').textContent = pw;
    $('#einmal').hidden = false;
    $('#einmal').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('#einmal-zu').addEventListener('click', () => { $('#einmal').hidden = true; $('#einmal-pw').textContent = ''; });
  $('#einmal-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#einmal-pw').textContent); $('#einmal-copy').textContent = 'Kopiert'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#einmal-pw')); getSelection().removeAllRanges(); getSelection().addRange(r); $('#einmal-copy').textContent = 'Markiert, Strg + C'; }
    setTimeout(() => { $('#einmal-copy').textContent = 'Kopieren'; }, 2500);
  });

  function zeile(k) {
    const selbst = k.id === K.id;
    const status = k.gesperrt ? '<span class="status gesperrt">Gesperrt</span>'
      : k.muss_aendern ? '<span class="status entwurf">Einmal-Passwort offen</span>' : '<span class="status freigegeben">Aktiv</span>';
    const rolle = ADMIN && !selbst
      ? `<select data-a="rolle" aria-label="Rolle von ${esc(k.name)}">${['anwender', 'support', 'admin'].map(r => `<option value="${r}" ${r === k.rolle ? 'selected' : ''}>${ROLLEN[r]}</option>`).join('')}</select>`
      : esc(ROLLEN[k.rolle]);
    const aktionen = selbst ? '<a href="/konto">Mein Konto</a>' : `
      <button class="ctrl" data-a="pw">Passwort zurücksetzen</button>
      <button class="ctrl" data-a="sperre">${k.gesperrt ? 'Entsperren' : 'Sperren'}</button>
      ${ADMIN ? '<button class="ctrl gefahr" data-a="loeschen">Löschen</button>' : ''}`;
    return `<tr data-id="${esc(k.id)}"${k.gesperrt ? ' class="ist-gesperrt"' : ''}>
      <td><strong>${esc(k.name)}</strong>${selbst ? ' <span class="form-note">(Sie)</span>' : ''}</td>
      <td><code>${esc(k.benutzer)}</code></td><td>${rolle}</td><td>${status}</td>
      <td>${esc(datum(k.letzte_anmeldung))}</td><td class="aktionen">${aktionen}</td></tr>`;
  }
  function zeichne() {
    const q = suche.value.trim().toLowerCase();
    const reihenfolge = { admin: 0, support: 1, anwender: 2 };
    const l = konten.filter(k => !q || k.name.toLowerCase().includes(q) || k.benutzer.includes(q))
      .sort((a, b) => reihenfolge[a.rolle] - reihenfolge[b.rolle] || a.name.localeCompare(b.name, 'de'));
    tbody.innerHTML = l.length ? l.map(zeile).join('') : `<tr><td colspan="6" class="leer">${q ? 'Kein Konto passt zur Suche.' : 'Noch keine Konten.'}</td></tr>`;
  }
  async function lade() {
    try { konten = await api('/api/konten'); zeichne(); } catch (e) { listeMsg.textContent = e.message; }
  }
  suche.addEventListener('input', zeichne);

  tbody.addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = b.closest('tr').dataset.id, k = konten.find(x => x.id === id);
    listeMsg.textContent = '';
    try {
      if (b.dataset.a === 'pw') {
        if (!confirm(`Neues Einmal-Passwort für „${k.name}“ erzeugen? Das bisherige Passwort gilt dann nicht mehr.`)) return;
        const r = await api(`/api/konten/${id}/passwort`, 'POST', {});
        einmal(`Einmal-Passwort für ${k.name} (${k.benutzer})`, r.passwort);
      }
      if (b.dataset.a === 'sperre') {
        if (!k.gesperrt && !confirm(`„${k.name}“ sperren? Die Person wird sofort abgemeldet.`)) return;
        await api(`/api/konten/${id}`, 'PATCH', { gesperrt: !k.gesperrt });
      }
      if (b.dataset.a === 'loeschen') {
        if (!confirm(`Konto „${k.name}“ endgültig löschen?`)) return;
        await api(`/api/konten/${id}`, 'DELETE');
      }
      await lade(); if (ADMIN) ladeProtokoll();
    } catch (err) { listeMsg.textContent = err.message; }
  });
  tbody.addEventListener('change', async e => {
    const s = e.target.closest('select[data-a="rolle"]'); if (!s) return;
    const id = s.closest('tr').dataset.id;
    try { await api(`/api/konten/${id}`, 'PATCH', { rolle: s.value }); } catch (err) { listeMsg.textContent = err.message; }
    await lade(); if (ADMIN) ladeProtokoll();
  });

  const fn = $('#f-neu');
  fn.addEventListener('submit', async e => {
    e.preventDefault();
    const name = fn.name.value.trim(), benutzer = fn.benutzer.value.trim().toLowerCase();
    if (!name || !benutzer) return meldung(fn, 'Bitte Name und Benutzername eingeben.');
    sperren(fn, true); meldung(fn, '');
    try {
      const r = await api('/api/konten', 'POST', { name, benutzer, rolle: fn.rolle.value || 'anwender' });
      einmal(`Konto für ${r.konto.name} angelegt. Benutzername: ${r.konto.benutzer}`, r.passwort);
      fn.reset(); await lade(); if (ADMIN) ladeProtokoll();
    } catch (err) { meldung(fn, err.message); }
    sperren(fn, false);
  });
  // Benutzername aus dem Namen vorschlagen
  fn.name.addEventListener('input', () => {
    if (fn.benutzer.dataset.eigen) return;
    const t = fn.name.value.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').split(/\s+/).filter(Boolean);
    fn.benutzer.value = t.length > 1 ? `${t[0][0]}.${t[t.length - 1]}`.replace(/[^a-z0-9._-]/g, '') : (t[0] || '').replace(/[^a-z0-9._-]/g, '');
  });
  fn.benutzer.addEventListener('input', () => { fn.benutzer.dataset.eigen = fn.benutzer.value ? '1' : ''; });

  // Protokoll (nur Admin)
  const AKTION = {
    'anmeldung': 'Angemeldet', 'anmeldung-fehlgeschlagen': 'Anmeldung fehlgeschlagen', 'abmeldung': 'Abgemeldet',
    'passwort-geaendert': 'Eigenes Passwort geändert', 'passwort-zurueckgesetzt': 'Passwort zurückgesetzt',
    'konto-angelegt': 'Konto angelegt', 'konto-geaendert': 'Konto geändert', 'konto-geloescht': 'Konto gelöscht',
    'entwurf-begonnen': 'Studio-Entwurf begonnen', 'entwurf-verworfen': 'Studio-Entwurf verworfen', 'veroeffentlicht': 'Veröffentlicht',
    'neu-vertonen': 'Neu vertont', 'medium-hochgeladen': 'Datei hochgeladen', 'medium-geloescht': 'Datei gelöscht'
  };
  function details(z) {
    const d = z.details || {};
    if (z.aktion === 'konto-geaendert' && d.nachher) {
      const t = [];
      if (d.vorher.rolle !== d.nachher.rolle) t.push(`Rolle ${ROLLEN[d.vorher.rolle]} → ${ROLLEN[d.nachher.rolle]}`);
      if (d.vorher.gesperrt !== d.nachher.gesperrt) t.push(d.nachher.gesperrt ? 'gesperrt' : 'entsperrt');
      return `${d.benutzer}${t.length ? ': ' + t.join(', ') : ''}`;
    }
    if (z.aktion === 'veroeffentlicht') return `${d.nuggets} Lernnuggets${d.oeffentlich && d.oeffentlich.length ? `, öffentlich: ${d.oeffentlich.join(', ')}` : ''}`;
    return [d.benutzer, d.rolle && ROLLEN[d.rolle], d.name, d.alles ? 'alle Szenen' : ''].filter(Boolean).join(', ');
  }
  async function ladeProtokoll() {
    try {
      const l = await api('/api/protokoll');
      $('#protokoll').innerHTML = l.slice(0, 150).map(z => `<tr class="${z.aktion === 'anmeldung-fehlgeschlagen' ? 'warnzeile' : ''}">
        <td>${esc(datum(z.zeit))}</td><td>${esc(z.wer || '–')}</td><td>${esc(AKTION[z.aktion] || z.aktion)}</td><td>${esc(details(z))}${z.ip ? ` <span class="form-note">${esc(z.ip)}</span>` : ''}</td></tr>`).join('')
        || '<tr><td colspan="4" class="leer">Noch keine Einträge.</td></tr>';
    } catch (e) { /* kein Zugriff */ }
  }
  if (ADMIN) { $('#bereich-protokoll').hidden = false; ladeProtokoll(); }
  lade();
})();
