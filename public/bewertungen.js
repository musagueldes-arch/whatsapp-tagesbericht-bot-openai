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
    profilUrl: 'https://maps.app.goo.gl/vJLrTp57ZGYrLpbF6',
    schnitt: 5.0,
    anzahl: null,
    istBeispiel: false,
    liste: [
      { stars: 5, text: 'Sehr kurzfristiger Heizungstausch. Ausführung 1A. Handwerker arbeiten schnell, präzise und hinterlassen den Arbeitsort sauberer als vorher. Vielen Dank noch einmal für die kurzfristige Lösung.', name: 'Andreas B.', datum: '' },
      { stars: 5, text: 'Voll verdiente fünf Sterne! Bei einem Wasserschaden in unserem Mehrfamilienhaus hat uns die Firma G-Therm schnell, kompetent und zuverlässig geholfen! Die Kommunikation war zu jeder Zeit einwandfrei – ich kann die Firma uneingeschränkt und gerne jedem empfehlen!', name: 'Agnès E.', datum: '' },
      { stars: 5, text: 'In Castrop-Rauxel wurde unsere alte Ölheizungsanlage fachgerecht stillgelegt und demontiert. Die Umstellung auf eine moderne Gas-Brennwertheizung erfolgte komplett an einem Tag. Sehr saubere, zuverlässige und professionelle Ausführung – uneingeschränkt weiterzuempfehlen.', name: 'Gülo T.', datum: '' },
      { stars: 5, text: 'Wir waren in zeitlicher Not – Herr Güldes hat sich dennoch die Zeit für eine Vor-Ort-Besichtigung genommen und den Auftrag kurzfristig ausgeführt. Ein ausgezeichneter, professioneller Job, sauber gearbeitet. Jederzeit und gerne wieder!', name: 'Achim S.', datum: '' },
      { stars: 5, text: 'Im Winter ist unsere Heizungsanlage ausgefallen. Uns wurde sofort und sehr kurzfristig geholfen und wir wurden kompetent beraten. Die alte Gasheizung wurde fachgerecht durch eine neue Gas-Brennwertheizung ersetzt. Sehr saubere und zuverlässige Arbeit.', name: 'Murat A.', datum: '' },
      { stars: 5, text: 'Akute Notsituation – kein Gas im Haus. G-Therm Haustechnik war sehr schnell vor Ort und hat die Gasleitungen fachgerecht abgedichtet, geprüft und die Anlage sicher wieder in Betrieb genommen. Absolut empfehlenswert bei Gas-Notfällen.', name: 'Ferman Y.', datum: '' },
      { stars: 5, text: 'Preis-Leistung unschlagbar, kundenorientiert und freundlich. Bin sehr zufrieden und kann die Firma mit bestem Gewissen weiterempfehlen. Kompletter Einbau des Kessels – schnell und unkompliziert.', name: 'S. G.', datum: '' },
      { stars: 5, text: 'Tolle Arbeit! Sie gehen erst, wenn alles 100% erledigt und geben sich sehr viel Mühe. Klare Weiterempfehlung!', name: 'Be Motivated', datum: '' }
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
