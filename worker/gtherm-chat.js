/**
 * G-Therm Haustechnik — KI-Chat-Vermittler (Cloudflare Worker).
 *
 * Hält den Google-Gemini-Schlüssel geheim (nur als Secret im Worker, NIE im Browser)
 * und beantwortet Chat-Anfragen der Website. Aufruf vom Frontend (public/chat.js):
 *   POST { messages: [ { role: "user"|"assistant", content: "…" }, … ] }
 *   → Antwort: { reply: "…" }
 *
 * Einrichtung: siehe KI-BOT-SETUP.md. Secret setzen mit:  wrangler secret put GEMINI_API_KEY
 */

const SYSTEM_PROMPT = `Du bist der freundliche Chat-Assistent auf der Website von G-Therm Haustechnik,
einem SHK-Meisterbetrieb (Sanitär, Heizung, Klima) in Bochum.

FAKTEN (nur diese als gesichert verwenden):
- Leistungen: Heizung (Einbau/Modernisierung/Reparatur), Wärmepumpen inkl. Förderberatung (BEG),
  Klimatechnik, Sanitär & Badsanierung, Wartung, Heizungs-/Sanitär-Notdienst.
- Einzugsgebiet: Bochum und Ruhrgebiet (u. a. Castrop-Rauxel).
- Öffnungszeiten Büro: Mo–Fr 8:00–17:00 Uhr.
- Adresse: Lindener Str. 111, 44879 Bochum.
- Telefon: 0234 - 544 618 55.  E-Mail: info@g-therm.de.
- Kundendienst/Störung online melden: Seite "kundendienst.html". Wärmepumpen-Check: "waermepumpe.html".

STIL & REGELN:
- Antworte auf Deutsch, freundlich und sachlich, per "Sie". Kurz halten (max. 3–4 Sätze).
- Erfinde NIEMALS Preise, Kosten, konkrete Termine oder Verfügbarkeiten. Bei solchen Fragen bitte an
  ein kostenloses, unverbindliches Angebot verweisen: Anruf 0234 - 544 618 55 oder Kundendienst-Formular.
- Bei Notfällen (Heizungsausfall, Wasserschaden, Rohrbruch, Gasgeruch) IMMER zuerst zum Anruf raten
  (0234 - 544 618 55); bei Gasgeruch zusätzlich: Fenster öffnen, keine Schalter/Feuer, ggf. Gasanbieter-Notruf.
- Wenn du etwas nicht sicher weißt, sage das ehrlich und biete den direkten Kontakt an.
- Keine Rechts-, Steuer- oder medizinischen Auskünfte. Bleibe beim Thema Haustechnik/G-Therm.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
    if (!env.GEMINI_API_KEY) return json({ error: 'not_configured' }, 500, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400, cors); }

    const msgs = Array.isArray(body && body.messages) ? body.messages.slice(-12) : [];
    const contents = msgs
      .filter(function (m) { return m && typeof m.content === 'string' && m.content.trim(); })
      .map(function (m) {
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content).slice(0, 1500) }]
        };
      });
    if (!contents.length) return json({ error: 'empty' }, 400, cors);

    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent?key=' + env.GEMINI_API_KEY;

    const payload = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 400, topP: 0.9 }
    };

    let reply = '';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      const parts = data && data.candidates && data.candidates[0] &&
        data.candidates[0].content && data.candidates[0].content.parts;
      if (Array.isArray(parts)) {
        reply = parts.map(function (p) { return (p && p.text) || ''; }).join('').trim();
      }
    } catch (e) {
      reply = '';
    }

    if (!reply) return json({ error: 'ai_unavailable' }, 502, cors);
    return json({ reply: reply }, 200, cors);
  }
};

function corsHeaders(origin, env) {
  const allowed = String((env && env.ALLOWED_ORIGIN) || '')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const ok = allowed.length === 0 || allowed.indexOf(origin) !== -1;
  return {
    'Access-Control-Allow-Origin': ok && origin ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors)
  });
}
