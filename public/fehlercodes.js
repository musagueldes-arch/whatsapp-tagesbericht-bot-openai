/* G-Therm Haustechnik — interne Fehlercode-Kurzliste.
 * Auswahl häufiger Codes der Hauptmarken, aus öffentlichen/offiziellen Quellen zusammengestellt.
 * OHNE GEWÄHR — verbindlich sind stets die Angaben des jeweiligen Herstellers.
 */
(function () {
  'use strict';

  // Gemeinsame Code-Basis für Bosch/Buderus (EMS-Plattform)
  var EMS_CODES = {
    '6A':  { bedeutung: 'Keine bzw. zu geringe Flammenbildung nach der Zündung', hinweis: 'Gaszufuhr und Zündung prüfen — der Brenner startet nicht.' },
    'EA':  { bedeutung: 'Flammenausfall (v. a. ältere Geräte) — Brenner startet nicht', hinweis: 'Gaszufuhr, Zündelektrode und Flammenüberwachung prüfen.' },
    'H07': { bedeutung: 'Wasserdruck zu niedrig', hinweis: 'Anlagendruck prüfen und ggf. Wasser nachfüllen (Mindestdruck je nach Gerät ~0,2–0,8 bar).' },
    'A01': { bedeutung: 'Kritische Abgastemperatur überschritten', hinweis: 'Sofort Fachbetrieb hinzuziehen — nicht selbst weiter versuchen.' }
  };

  var DB = {
    'Vaillant': {
      quelle: { name: 'vaillant.de', url: 'https://www.vaillant.de/service/reparatur/fehlercodes-gasheizung/' },
      codes: {
        'F.22': { bedeutung: 'Wassermangel / Anlagendruck zu niedrig', hinweis: 'Anlagendruck prüfen (oft < 1 bar), ggf. Wasser nachfüllen; auf Undichtigkeit/Luft im Heizkreis und Drucksensor achten.' },
        'F.28': { bedeutung: 'Fehlzündung beim Start — keine Flamme', hinweis: 'Gaszufuhr/Gashahn, Zündelektrode und Gasventil prüfen.' },
        'F.29': { bedeutung: 'Flamme erlischt im Betrieb', hinweis: 'Gasversorgung und Abgasweg prüfen.' },
        'F.75': { bedeutung: 'Kein Druckanstieg trotz laufender Pumpe', hinweis: 'Umwälzpumpe und Drucksensor prüfen; System entlüften.' }
      }
    },
    'Viessmann': {
      quelle: { name: 'viessmann.de', url: 'https://www.viessmann.de/de/wissen/wartung-und-reparatur/fehlercodes.html' },
      codes: {
        'F5': { bedeutung: 'Störung Feuerungsautomat / Abgas-Luft-Weg', hinweis: 'Gebläse, Druckdose/Luftdruckwächter, Gemischklappe und Abgasleitung prüfen (Vitodens 200/300).' }
      }
    },
    'Bosch': {
      quelle: { name: 'bosch-homecomfort.com', url: 'https://www.bosch-homecomfort.com/de/de/wohngebaeude/service/' },
      codes: EMS_CODES
    },
    'Buderus': {
      quelle: { name: 'buderus.de', url: 'https://www.buderus.de/de/service' },
      codes: EMS_CODES
    },
    'Wolf': {
      quelle: { name: 'wolf.eu', url: 'https://www.wolf.eu/de-de/service' },
      codes: {
        '001': { bedeutung: 'Sicherheitstemperaturbegrenzer / Übertemperatur', hinweis: 'Fühler, Anlagendruck und Wärmeabnahme prüfen.' },
        '004': { bedeutung: 'Keine Zündung beim Brennerstart', hinweis: 'Gaszufuhr, Zündung und Ionisation prüfen.' },
        '005': { bedeutung: 'Flammenausfall im Betrieb', hinweis: 'Gasversorgung/Abgasweg prüfen — tritt oft bei hoher Last auf.' },
        '007': { bedeutung: 'Abgastemperatur zu hoch', hinweis: 'Abgassystem auf Verstopfung/Defekt und den Wärmetauscher prüfen.' },
        '022': { bedeutung: 'Luftmangel', hinweis: 'Luftzufuhr/Abgassystem und Gebläse prüfen.' }
      }
    }
  };

  function norm(s) { return String(s || '').toUpperCase().replace(/[\s.\-]/g, ''); }

  // Normalisierten Index je Marke aufbauen (F.22 == F22, 6 A == 6A ...)
  Object.keys(DB).forEach(function (brand) {
    var codes = DB[brand].codes, idx = {};
    Object.keys(codes).forEach(function (k) { idx[norm(k)] = { code: k, data: codes[k] }; });
    DB[brand]._idx = idx;
  });

  window.GThermFehlercodes = {
    lookup: function (brand, code) {
      if (!brand) return { status: 'no-brand' };
      var b = DB[brand];
      if (!b) return { status: 'brand-not-listed' };
      if (!norm(code)) return { status: 'empty' };
      var hit = b._idx[norm(code)];
      if (hit) return { status: 'found', code: hit.code, bedeutung: hit.data.bedeutung, hinweis: hit.data.hinweis, quelle: b.quelle };
      return { status: 'not-found', quelle: b.quelle };
    }
  };
})();
