/* G-Therm Haustechnik — Kundenbewertungen (Startseite).
 *
 * SO PFLEGT IHR DIESEN ABSCHNITT:
 *   1) `profilUrl`  → euer echter Google-/g.page-Rezensionslink.
 *   2) `schnitt`    → eure Durchschnittsnote (z. B. 4.9).
 *   3) `anzahl`     → Anzahl eurer Google-Rezensionen (Zahl) oder null.
 *   4) `liste`      → eure BESTEN echten Bewertungen (Text + Vorname + Datum).
 *   5) `istBeispiel`→ auf false setzen, sobald echte Bewertungen eingetragen sind
 *                     (dann verschwinden die „Beispiel"-Kennzeichnungen).
 * Es werden bewusst KEINE Bewertungen erfunden — bis echte vorliegen, sind die
 * Karten klar als Beispiel gekennzeichnet.
 */
(function () {
  'use strict';

  var DATA = {
    profilUrl: 'https://www.google.com/maps/search/?api=1&query=G-Therm+Haustechnik+Bochum',
    schnitt: 5.0,
    anzahl: null,
    istBeispiel: true,
    liste: [
      { stars: 5, text: 'Schnelle Terminvergabe, saubere Arbeit und faire Beratung – jederzeit wieder.', name: 'Beispiel · Bochum', datum: '' },
      { stars: 5, text: 'Neue Heizung termingerecht und ordentlich eingebaut, sehr freundliches Team.', name: 'Beispiel · Ruhrgebiet', datum: '' },
      { stars: 5, text: 'Beim Wasserschaden sofort da und professionell geholfen. Klare Empfehlung.', name: 'Beispiel · Bochum', datum: '' }
    ]
  };

  function starStr(n) { n = Math.max(0, Math.min(5, Math.round(n || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    var grid = document.getElementById('reviewsGrid');
    var summary = document.getElementById('reviewsSummary');
    var beispiel = document.getElementById('reviewsBeispiel');
    var btnRate = document.getElementById('reviewsBtnRate');
    var btnSee = document.getElementById('reviewsBtnSee');
    if (!grid || !summary) return;

    if (btnRate) btnRate.href = DATA.profilUrl;
    if (btnSee) btnSee.href = DATA.profilUrl;

    summary.innerHTML =
      '<div class="reviews-summary">' +
        '<span class="reviews-summary__score">' + esc(DATA.schnitt.toFixed(1).replace('.', ',')) + '</span>' +
        '<span class="reviews-summary__stars" aria-hidden="true">' + starStr(DATA.schnitt) + '</span>' +
        '<span class="reviews-summary__label">' + (DATA.anzahl ? esc(String(DATA.anzahl)) + ' Google-Rezensionen' : 'Bewertungen bei Google') + '</span>' +
      '</div>';

    grid.innerHTML = DATA.liste.map(function (r) {
      return '<figure class="reviewcard">' +
        (DATA.istBeispiel ? '<span class="reviewcard__badge">Beispiel</span>' : '') +
        '<div class="reviewcard__stars" aria-hidden="true">' + starStr(r.stars) + '</div>' +
        '<blockquote class="reviewcard__text">' + esc(r.text) + '</blockquote>' +
        '<figcaption class="reviewcard__meta">' + esc(r.name) + (r.datum ? ' · ' + esc(r.datum) : '') + '</figcaption>' +
      '</figure>';
    }).join('');

    if (beispiel) {
      beispiel.hidden = !DATA.istBeispiel;
      if (DATA.istBeispiel) beispiel.textContent = 'Beispielansicht — hier erscheinen Ihre echten Google-Bewertungen, sobald sie eingetragen sind.';
    }
  }

  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', render);
})();
