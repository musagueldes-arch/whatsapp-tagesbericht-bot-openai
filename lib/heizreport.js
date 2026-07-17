'use strict';

// Anbindung an Heizreport (heizreport.de)
// ─────────────────────────────────────────────────────────────────────────
// Zwei Richtungen:
//   1) Heizreport -> Bot  : Webhook empfangen  (verifyHeizreportAuth)
//   2) Bot -> Heizreport  : API abrufen        (fetchHeizreportReport)
//
// Die mit TODO markierten Stellen hängen vom konkreten Heizreport-Format ab
// (siehe „Anleitung Webhook einrichten" und „API-Anleitung öffnen" in der App)
// und sollten dort final abgeglichen werden.

const crypto = require('crypto');

const webhookAuth = () => process.env.HEIZREPORT_WEBHOOK_AUTH || '';
const apiKey = () => process.env.HEIZREPORT_API_KEY || '';
const apiBase = () => (process.env.HEIZREPORT_API_BASE || 'https://api.heizreport.de').replace(/\/+$/, '');

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Prüft die von Heizreport mitgesendete „Webhook Auth" gegen das konfigurierte
// Geheimnis. Deckt die gängigen Übertragungswege ab; sobald der tatsächliche
// Weg aus der Anleitung bekannt ist, kann hier auf genau diesen reduziert werden.
function verifyHeizreportAuth(req) {
  const expected = webhookAuth();
  if (!expected) {
    console.warn('HEIZREPORT_WEBHOOK_AUTH nicht gesetzt – Webhook ist derzeit ungeschützt.');
    return true; // solange kein Secret konfiguriert ist, nicht blockieren
  }
  const candidates = [];
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    candidates.push(authHeader);
    candidates.push(authHeader.replace(/^Bearer\s+/i, ''));
  }
  if (req.headers['x-webhook-auth']) candidates.push(req.headers['x-webhook-auth']);
  if (req.headers['x-heizreport-auth']) candidates.push(req.headers['x-heizreport-auth']);
  if (req.query && req.query.auth) candidates.push(req.query.auth);
  if (req.body && typeof req.body === 'object' && req.body.auth) candidates.push(req.body.auth);
  return candidates.some((c) => timingSafeEqual(c, expected));
}

// Ruft einen Bericht aktiv über die Heizreport-API ab (API-Key als Bearer-Token).
// TODO: Endpunkt-Pfad und Auth-Header an die echte API-Anleitung anpassen.
async function fetchHeizreportReport(reportId) {
  const key = apiKey();
  if (!key) throw new Error('HEIZREPORT_API_KEY nicht gesetzt');
  const url = `${apiBase()}/reports/${encodeURIComponent(reportId)}`; // TODO: Pfad prüfen
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Heizreport-API ${res.status}: ${body}`);
  }
  return res.json();
}

// Wandelt ein Heizreport-Payload in die interne Bericht-Struktur um, die
// generateReportPdfBuffer erwartet: { datum, arbeitszeit, kunde, mitarbeiter, arbeiten, fotos }.
// TODO: Feldnamen an das echte Webhook-/API-Format anpassen (siehe Anleitung).
function mapHeizreportToReport(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload.report || payload.data || payload;

  const kunde = p.kunde || p.customer || p.client || p.customer_name || '';
  const rawDatum = p.datum || p.date || p.created_at || '';
  const arbeiten = p.arbeiten || p.work || p.description || p.text || p.summary || '';

  // Ohne Kunde und ohne Arbeitsbeschreibung ist kein sinnvolles PDF möglich
  if (!kunde && !arbeiten) return null;

  return {
    datum: typeof rawDatum === 'string' ? rawDatum.slice(0, 10) : '',
    arbeitszeit: p.arbeitszeit || p.working_hours || p.duration || '',
    kunde,
    mitarbeiter: p.mitarbeiter || p.employee || p.technician || p.author || '',
    arbeiten,
    fotos: []
  };
}

module.exports = { verifyHeizreportAuth, fetchHeizreportReport, mapHeizreportToReport };
