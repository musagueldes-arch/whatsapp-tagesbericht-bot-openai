// G-Therm Haustechnik — Wärmepumpen-Konfigurator
(function () {
  'use strict';

  var form = document.getElementById('wpForm');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.kd__step'));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll('.stepper__item'));
  var status = document.getElementById('wpStatus');
  var successEl = document.getElementById('wpSuccess');
  var resultEl = document.getElementById('wpResult');
  var current = 1;
  var lastEstimate = null;

  function showStep(n) {
    current = n;
    steps.forEach(function (s) { s.classList.toggle('is-active', Number(s.dataset.step) === n); });
    stepperItems.forEach(function (it) {
      var step = Number(it.dataset.for);
      it.classList.toggle('is-active', step === n);
      it.classList.toggle('is-done', step < n);
    });
    var active = steps[n - 1];
    if (active) {
      var legend = active.querySelector('legend');
      if (legend) { legend.setAttribute('tabindex', '-1'); legend.focus(); }
      active.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateStep(n) {
    var required = steps[n - 1].querySelectorAll('[required]');
    for (var i = 0; i < required.length; i++) {
      if (!required[i].checkValidity()) { required[i].reportValidity(); return false; }
    }
    return true;
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.length && el[0] && el[0].type === 'radio') {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : '';
    }
    return el.value;
  }

  // ── Schätzung (unverbindliche Orientierung) ──────────────────────────────
  // Spezifische Heizlast (W/m²) und Jahres-Wärmebedarf (kWh/m²·a) nach Gebäudezustand.
  var W_PRO_M2 = { neubau: 40, saniert: 60, teilsaniert: 90, unsaniert: 120 };
  var KWH_PRO_M2 = { neubau: 45, saniert: 90, teilsaniert: 130, unsaniert: 180 };
  // Angenommene Energiepreise (€/kWh) – leicht anpassbar
  var PREISE = { gas: 0.11, oel: 0.11, stromDirekt: 0.35, wpStrom: 0.28 };
  // CO₂-Emissionsfaktoren (kg CO₂ / kWh Endenergie) – leicht anpassbar
  var EMISSION = { gas: 0.201, oel: 0.266, strom: 0.38 };

  function estimate(d) {
    var flaeche = Math.max(20, Math.min(2000, Number(d.flaeche) || 0));
    var wm2 = W_PRO_M2[d.sanierung] || 90;
    var kwhm2 = KWH_PRO_M2[d.sanierung] || 130;

    var heizlast = flaeche * wm2 / 1000;            // kW
    var jahresWaerme = Math.round(flaeche * kwhm2);  // kWh/a

    // Jahresarbeitszahl abhängig von der Wärmeverteilung (niedrige Vorlauftemp. = besser)
    var jaz = d.verteilung === 'fussboden' ? 4.0 : d.verteilung === 'gemischt' ? 3.6 : 3.2;
    var strom = Math.round(jahresWaerme / jaz);      // kWh/a Strombedarf

    var typ = 'Luft-Wasser-Wärmepumpe';
    if (heizlast > 18 || d.sanierung === 'unsaniert') {
      typ = 'Luft-Wasser- oder Sole-Wasser-Wärmepumpe';
    }

    var vorlaufHinweis = d.verteilung === 'heizkoerper'
      ? 'Mit Heizkörpern kann eine höhere Vorlauftemperatur nötig sein — wir prüfen die Eignung vor Ort.'
      : 'Ihre Wärmeverteilung eignet sich gut für den effizienten Betrieb einer Wärmepumpe.';

    // ── Wirtschaftlichkeit (grobe Orientierung, Preise als Annahmen) ────────
    var wpStromKosten = Math.round(strom * PREISE.wpStrom);
    var altKosten = null, altSystem = '';
    if (d.aktuell === 'Gas') { altKosten = Math.round((jahresWaerme / 0.90) * PREISE.gas); altSystem = 'Gasheizung'; }
    else if (d.aktuell === 'Öl') { altKosten = Math.round((jahresWaerme / 0.85) * PREISE.oel); altSystem = 'Ölheizung'; }
    else if (d.aktuell === 'Strom/Nachtspeicher') { altKosten = Math.round(jahresWaerme * PREISE.stromDirekt); altSystem = 'Stromheizung'; }

    var ersparnis = null;
    if (altKosten != null) {
      var diff = Math.max(0, altKosten - wpStromKosten);
      ersparnis = { von: roundTo(diff * 0.85, 50), bis: roundTo(diff * 1.15, 50), system: altSystem };
    }

    // CO₂-Einsparung (kg/Jahr) gegenüber dem bisherigen System
    var wpCo2 = strom * EMISSION.strom;
    var altCo2 = null;
    if (d.aktuell === 'Gas') altCo2 = (jahresWaerme / 0.90) * EMISSION.gas;
    else if (d.aktuell === 'Öl') altCo2 = (jahresWaerme / 0.85) * EMISSION.oel;
    else if (d.aktuell === 'Strom/Nachtspeicher') altCo2 = jahresWaerme * EMISSION.strom;
    var co2 = altCo2 != null ? { kg: roundTo(Math.max(0, altCo2 - wpCo2), 50), system: altSystem } : null;

    // Grober Investitionsrahmen nur für Ein-/Zweifamilienhäuser
    var invest = null;
    if (d.gebaeudetyp === 'Einfamilienhaus' || d.gebaeudetyp === 'Doppel-/Reihenhaus') {
      invest = { von: 25000, bis: 40000 };
    }

    return {
      heizlast: Math.round(heizlast * 10) / 10,
      leistungsklasse: Math.max(4, Math.ceil(heizlast)),
      jahresWaerme: jahresWaerme,
      strom: strom,
      jaz: jaz,
      typ: typ,
      vorlaufHinweis: vorlaufHinweis,
      wpStromKosten: wpStromKosten,
      altKosten: altKosten,
      ersparnis: ersparnis,
      invest: invest,
      co2: co2
    };
  }

  function roundTo(v, step) { return Math.round(v / step) * step; }
  function euro(n) { return n.toLocaleString('de-DE') + ' €'; }
  function co2Text(kg) {
    return kg >= 1000
      ? (kg / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' t'
      : kg.toLocaleString('de-DE') + ' kg';
  }

  function fmt(n) { return n.toLocaleString('de-DE'); }

  function renderResult() {
    var d = {
      gebaeudetyp: val('gebaeudetyp'),
      flaeche: val('flaeche'),
      sanierung: val('sanierung'),
      aktuell: val('aktuell'),
      verteilung: val('verteilung'),
      warmwasser: val('warmwasser'),
      personen: val('personen')
    };
    var e = estimate(d);
    lastEstimate = { eingaben: d, ergebnis: e };

    resultEl.innerHTML =
      '<div class="result__grid">' +
        metric('#i-gauge', 'Geschätzte Heizlast', e.heizlast.toLocaleString('de-DE') + ' kW') +
        metric('#i-leaf', 'Empfohlene Leistung', 'ca. ' + e.leistungsklasse + ' kW') +
        metric('#i-home', 'Jahres-Wärmebedarf', '~ ' + fmt(e.jahresWaerme) + ' kWh') +
        metric('#i-euro', 'Strombedarf WP (ca.)', '~ ' + fmt(e.strom) + ' kWh/Jahr') +
      '</div>' +
      '<div class="result__reco">' +
        '<h3>Unsere Empfehlung: ' + e.typ + '</h3>' +
        '<p>' + e.vorlaufHinweis + '</p>' +
        '<p class="result__foerder"><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-euro"/></svg> ' +
          'Für den Heizungstausch sind aktuell staatliche Zuschüsse möglich (BEG-Förderung, bis zu 70&nbsp;% der Kosten, abhängig von Ihrer Situation). Wir beraten Sie zur Förderung.</p>' +
      '</div>' +
      ecoBlock(e);
  }

  // Wirtschaftlichkeits-Block (nur wenn sinnvoll berechenbar)
  function ecoBlock(e) {
    var rows = '';
    if (e.ersparnis) {
      rows += '<div class="eco-row">' +
        '<span class="eco-row__label">Geschätzte Ersparnis ggü. ' + e.ersparnis.system + '</span>' +
        '<span class="eco-row__value">~ ' + euro(e.ersparnis.von) + ' – ' + euro(e.ersparnis.bis) + ' / Jahr</span>' +
      '</div>';
    }
    if (e.invest) {
      rows += '<div class="eco-row">' +
        '<span class="eco-row__label">Typische Investition (Gerät + Einbau)</span>' +
        '<span class="eco-row__value">' + euro(e.invest.von) + ' – ' + euro(e.invest.bis) +
          ' <em>· abzgl. Förderung</em></span>' +
      '</div>';
    }
    var co2 = '';
    if (e.co2 && e.co2.kg > 0) {
      co2 = '<div class="eco-co2">' +
        '<span class="eco-co2__icon"><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-leaf"/></svg></span>' +
        '<span><strong>ca. ' + co2Text(e.co2.kg) + ' weniger CO₂</strong> pro Jahr gegenüber ' + e.co2.system + '</span>' +
      '</div>';
    }
    if (!rows && !co2) return '';
    return '<div class="result__eco">' +
      '<h3>Wirtschaftlichkeit &amp; Umwelt <span class="legend-opt">(grobe Schätzung)</span></h3>' +
      co2 + rows +
      '<p class="assumptions">Annahmen: Gas/Öl 0,11 €/kWh, Wärmepumpen-Strom 0,28 €/kWh, Direktstrom 0,35 €/kWh; ' +
        'CO₂-Faktoren Erdgas 0,20 · Heizöl 0,27 · Strom 0,38 kg/kWh. ' +
        'Reale Kosten, CO₂ und Förderung hängen von Tarif, Gebäude und Ausführung ab und werden im Angebot konkretisiert.</p>' +
    '</div>';
  }

  function metric(iconId, label, value) {
    return '<div class="metric">' +
      '<span class="metric__icon"><svg class="ico" aria-hidden="true" focusable="false"><use href="' + iconId + '"/></svg></span>' +
      '<span class="metric__value">' + value + '</span>' +
      '<span class="metric__label">' + label + '</span>' +
    '</div>';
  }

  form.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    var prev = e.target.closest('[data-prev]');
    if (next) {
      e.preventDefault();
      if (!validateStep(current)) return;
      var target = Math.min(current + 1, steps.length);
      if (target === 3) renderResult(); // Ergebnis vor dem Anzeigen berechnen
      showStep(target);
    }
    if (prev) { e.preventDefault(); showStep(Math.max(current - 1, 1)); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(4)) return;
    if (!lastEstimate) renderResult();

    var payload = {
      typ: 'Wärmepumpen-Anfrage',
      eingaben: lastEstimate ? lastEstimate.eingaben : {},
      ergebnis: lastEstimate ? lastEstimate.ergebnis : {},
      name: form.name.value.trim(),
      telefon: form.telefon.value.trim(),
      email: form.email.value.trim(),
      plz: form.plz.value.trim(),
      ort: form.ort.value.trim()
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }
    status.textContent = ''; status.className = 'form-status';

    fetch('/api/waermepumpe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function () {
      form.hidden = true;
      document.getElementById('stepper').hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Angebot anfordern'; }
      var e2 = payload.ergebnis || {};
      var subject = encodeURIComponent('Wärmepumpen-Anfrage: ' + (payload.eingaben.gebaeudetyp || '') + ' ' + (payload.eingaben.flaeche || '') + ' m²');
      var body = encodeURIComponent(
        'Gebäudetyp: ' + (payload.eingaben.gebaeudetyp || '') + '\n' +
        'Wohnfläche: ' + (payload.eingaben.flaeche || '') + ' m²\n' +
        'Zustand: ' + (payload.eingaben.sanierung || '') + '\n' +
        'Aktuelles System: ' + (payload.eingaben.aktuell || '') + '\n' +
        'Wärmeverteilung: ' + (payload.eingaben.verteilung || '') + '\n\n' +
        'Geschätzte Heizlast: ' + (e2.heizlast || '-') + ' kW\n' +
        'Empfohlen: ' + (e2.typ || '-') + '\n\n' +
        'Name: ' + payload.name + '\nTelefon: ' + payload.telefon + '\nE-Mail: ' + payload.email + '\n' +
        'PLZ/Ort: ' + payload.plz + ' ' + payload.ort
      );
      status.className = 'form-status err';
      status.innerHTML = 'Online-Versand momentan nicht möglich. ' +
        '<a href="mailto:info@g-therm.de?subject=' + subject + '&body=' + body + '">Anfrage per E-Mail senden</a> ' +
        'oder anrufen: <a href="tel:+4923454461855">0234 - 544 618 55</a>.';
    });
  });
})();
