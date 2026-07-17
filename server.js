require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { extractReports, extractAuftragFromText } = require('./lib/openai');
const { generateReportPdfBuffer } = require('./lib/pdf');
const { generateAuftragPdfBuffer } = require('./lib/auftrag');
const { sendText, uploadMedia, sendDocument, downloadMedia } = require('./lib/whatsapp');
const { transcribeAudio } = require('./lib/transcribe');
const { safeName } = require('./lib/util');
const { verifyHeizreportAuth, mapHeizreportToReport } = require('./lib/heizreport');

const app = express();
app.use(express.json({ limit: '25mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use('/app', express.static(path.join(__dirname, 'public/app')));
// Firmen-Website (statisch) unter / ausliefern
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'changeme';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const company = {
  firma: process.env.COMPANY_NAME || 'G-Therm Haustechnik',
  adresse: process.env.COMPANY_ADDRESS || 'Lindener Str. 111 · 44879 Bochum',
  telefon: process.env.COMPANY_PHONE || '0234 - 544 618 55',
  email: process.env.COMPANY_EMAIL || '',
  inhaber: process.env.COMPANY_OWNER || 'Musa Güldes'
};

const REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

const signatureRequests = new Map();
const sessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const JA_WORDS = ['ja', 'yes', 'ok', 'jo', 'gut', 'fertig', 'weiter', 'done', 'passt', 'stimmt', 'korrekt', 'alles gut'];

function isAllowed(from) {
  const allowed = process.env.ALLOWED_NUMBERS;
  if (!allowed || !allowed.trim()) return true;
  const list = allowed.split(',').map(n => n.trim().replace(/\D/g, ''));
  return list.includes(String(from).replace(/\D/g, ''));
}

function isJa(text) {
  if (!text) return false;
  return JA_WORDS.some(w => text.toLowerCase().trim().startsWith(w));
}

function getSession(from) { return sessions.get(from) || null; }
function resetTimer(from, s) {
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => sessions.delete(from), SESSION_TIMEOUT_MS);
}
function createSession(from, mode = 'bericht') {
  const s = { mode, status: mode === 'auftrag' ? 'auftrag_details' : 'collecting', photos: [], text: '', transcript: '', reportDraft: null, auftragData: null, timer: null };
  resetTimer(from, s);
  sessions.set(from, s);
  return s;
}
function clearSession(from) {
  const s = sessions.get(from);
  if (s?.timer) clearTimeout(s.timer);
  sessions.delete(from);
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  res.sendStatus(200);
  handleIncoming(req.body).catch(err => console.error('Webhook-Fehler:', err));
});

async function handleIncoming(body) {
  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) return;
  for (const msg of messages) {
    if (!isAllowed(msg.from)) return;
    try { await handleMessage(msg.from, msg); }
    catch (err) {
      console.error('Fehler:', err);
      await sendText(msg.from, '⚠️ Fehler. Bitte erneut versuchen.').catch(() => {});
    }
  }
}

async function handleAuftragFlow(from, session, rawText) {
  resetTimer(from, session);
  if (session.status === 'auftrag_details') {
    await sendText(from, 'Arbeitsauftrag wird strukturiert …');
    const auftrag = await extractAuftragFromText(rawText);
    session.auftragData = auftrag;
    session.status = 'auftrag_preview';
    await sendText(from,
      `*Auftrags-Entwurf:*

` +
      `*Kunde:* ${auftrag.kunde || '-'}
` +
      `*Objekt:* ${auftrag.objekt || '-'}
` +
      `*Termin:* ${auftrag.termin || auftrag.datum || '-'}
` +
      `*Uhrzeit:* ${auftrag.uhrzeit || '-'}
` +
      `*Priorität:* ${auftrag.prioritaet || 'Normal'}

` +
      `*Mitarbeiter:* ${auftrag.mitarbeiter || '-'}

` +
      `*Arbeiten:*
${auftrag.arbeiten || '-'}

` +
      `Korrekt? *ja* → PDF erstellen\nOder schreib, was geändert werden soll.`
    );
    return;
  }

  if (session.status === 'auftrag_preview') {
    if (isJa(rawText)) {
      const auftrag = session.auftragData;
      clearSession(from);
      await sendText(from, 'Arbeitsauftrag-PDF wird erstellt …');
      await sendAuftragPdf(from, auftrag);
    } else {
      session.status = 'auftrag_details';
      await sendText(from, 'Korrektur gespeichert. Bitte gib den Auftrag vollständig mit Änderung nochmal ein.');
    }
  }
}

async function handleMessage(from, msg) {
  const type = msg.type;
  const session = getSession(from);

  if (type === 'text') {
    const rawText = msg.text.body || '';
    const lower = rawText.toLowerCase().trim();

    if ((lower === 'auftrag' || lower.startsWith('auftrag ')) && !session) {
      const s = createSession(from, 'auftrag');
      if (lower === 'auftrag') {
        await sendText(from,
          '*Neuer Arbeitsauftrag*\n\n' +
          'Schick mir die Auftragsdetails in einer Nachricht oder als Sprachnotiz:\n\n' +
          '• Kunde / Auftraggeber\n• Objekt / Baustelle\n• Termin\n• Mitarbeiter\n• Arbeiten\n• Material\n• Priorität'
        );
      } else {
        await handleAuftragFlow(from, s, rawText.slice(7).trim());
      }
      return;
    }

    if (session?.mode === 'auftrag') {
      await handleAuftragFlow(from, session, rawText);
      return;
    }

    if (!session) {
      await sendText(from, 'Notiz wird gelesen …');
      await createAndSendReports(from, rawText, []);
      return;
    }

    resetTimer(from, session);
    if (session.status === 'collecting' && isJa(rawText)) {
      session.status = 'awaiting_desc';
      await sendText(from, `✅ ${session.photos.length} Foto(s) gespeichert. Jetzt Beschreibung eingeben.`);
      return;
    }

    if (session.status === 'collecting') {
      session.text += (session.text ? '\n' : '') + rawText;
      await sendText(from, 'Notiz gespeichert. Noch mehr Fotos oder *ja* wenn fertig.');
      return;
    }

    if (session.status === 'awaiting_desc') {
      session.text += (session.text ? '\n' : '') + rawText;
      session.status = 'preview_text';
      const combined = [session.transcript, session.text].filter(Boolean).join('\n');
      await sendText(from, `Text:\n\n"${combined}"\n\nKorrekt? *ja* → Bericht erstellen`);
      return;
    }

    if (session.status === 'preview_text') {
      if (isJa(rawText)) {
        await sendText(from, 'Bericht-Entwurf wird erstellt …');
        const combined = [session.transcript, session.text].filter(Boolean).join('\n');
        const reports = await extractReports(combined, session.photos);
        const fotoBuffers = session.photos.map(p => Buffer.from(p.base64, 'base64'));
        reports.forEach(r => { r.fotos = fotoBuffers; });
        session.reportDraft = reports;
        session.status = 'preview_report';
        for (const r of reports) {
          await sendText(from, `Entwurf:\n${r.datum || '-'} ${r.arbeitszeit || '-'}\n${r.kunde || '-'}\n${r.mitarbeiter || '-'}\n\nArbeiten:\n${r.arbeiten || '-'}\n\nKorrekt? *ja* → PDF`);
        }
      } else {
        session.text = rawText;
        await sendText(from, `Aktualisiert:\n"${rawText}"\n\n*ja* → weiter`);
      }
      return;
    }

    if (session.status === 'preview_report') {
      if (isJa(rawText)) {
        const reports = session.reportDraft;
        clearSession(from);
        await sendText(from, 'PDF wird erstellt …');
        await sendReportPdfs(from, reports);
      } else {
        session.text = rawText;
        session.status = 'preview_text';
        await sendText(from, `Korrektur: "${rawText}"\n\n*ja* → neuen Entwurf`);
      }
      return;
    }
  }

  if (type === 'image') {
    const s = session || createSession(from, 'bericht');
    const { buffer, mimeType } = await downloadMedia(msg.image.id);
    s.photos.push({ base64: buffer.toString('base64'), mimeType });
    if (msg.image.caption) s.text += (s.text ? '\n' : '') + msg.image.caption;
    resetTimer(from, s);
    await sendText(from, `Foto ${s.photos.length} erhalten. Noch mehr Fotos schicken oder *ja* wenn fertig.`);
    return;
  }

  if (type === 'audio') {
    await sendText(from, 'Sprachnotiz wird transkribiert …');
    const { buffer, mimeType } = await downloadMedia(msg.audio.id);
    const { text } = await transcribeAudio(buffer, mimeType);
    const s = session || createSession(from, session?.mode || 'bericht');
    if (s.mode === 'auftrag') return handleAuftragFlow(from, s, text);
    s.transcript += (s.transcript ? '\n' : '') + text;
    s.status = 'preview_text';
    resetTimer(from, s);
    await sendText(from, `"${text}"\n\nKorrekt? *ja* → weiter`);
    return;
  }

  await sendText(from, 'Schreib *Auftrag* für Arbeitsauftrag oder schick Text/Fotos für Tagesbericht.');
}

async function sendAuftragPdf(from, auftrag) {
  const pdfBuffer = await generateAuftragPdfBuffer(auftrag, company);
  const filename = `Arbeitsauftrag_${safeName(auftrag.kunde || 'Auftrag')}_${(auftrag.termin || auftrag.datum || '').replace(/\./g, '-')}.pdf`;
  fs.writeFileSync(path.join(REPORTS_DIR, filename), pdfBuffer);
  const mediaId = await uploadMedia(pdfBuffer, filename, 'application/pdf');
  await sendDocument(from, mediaId, filename, `Arbeitsauftrag: ${auftrag.kunde || ''}`.trim());
}

async function sendReportPdfs(from, reports) {
  for (const report of reports) {
    const pdfBuffer = await generateReportPdfBuffer(report, company);
    const filename = `Tagesbericht_${safeName(report.kunde)}_${(report.datum || '').replace(/\./g, '-')}.pdf`;
    fs.writeFileSync(path.join(REPORTS_DIR, filename), pdfBuffer);
    const mediaId = await uploadMedia(pdfBuffer, filename, 'application/pdf');
    await sendDocument(from, mediaId, filename, `${report.kunde || ''} – ${report.datum || ''}`.trim());

    const token = crypto.randomBytes(20).toString('hex');
    signatureRequests.set(token, { report, company, from, filename, expiresAt: Date.now() + 48 * 60 * 60 * 1000 });
    await sendText(from, `✅ PDF erstellt!\n\nUnterschrift-Link für den Kunden:\n${BASE_URL}/sign/${token}\n\n(gilt 48h)`);
  }
}

async function createAndSendReports(from, text, images) {
  const reports = await extractReports(text, images);
  reports.forEach(r => { r.fotos = []; });
  await sendReportPdfs(from, reports);
}

app.get('/sign/:token', (req, res) => {
  const data = signatureRequests.get(req.params.token);
  if (!data) return res.status(404).send('Link nicht gefunden oder abgelaufen.');
  if (Date.now() > data.expiresAt) return res.status(410).send('Link abgelaufen.');
  const { report } = data;
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Unterschreiben</title></head><body><h1>Unterschreiben</h1><p>${company.firma}</p><p>Datum: ${report.datum || '-'}</p><p>Kunde: ${report.kunde || '-'}</p><canvas id="c" width="500" height="220" style="border:1px solid #111;touch-action:none"></canvas><br><button onclick="clearC()">Löschen</button><button onclick="send()">Senden</button><script>const c=document.getElementById('c'),x=c.getContext('2d');let d=false;function p(e){const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top}}c.onmousedown=c.ontouchstart=e=>{d=true;const q=p(e);x.beginPath();x.moveTo(q.x,q.y);e.preventDefault()};c.onmousemove=c.ontouchmove=e=>{if(!d)return;const q=p(e);x.lineTo(q.x,q.y);x.stroke();e.preventDefault()};c.onmouseup=c.ontouchend=()=>d=false;function clearC(){x.clearRect(0,0,c.width,c.height)}async function send(){await fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signature:c.toDataURL('image/png')})});document.body.innerHTML='<h2>Danke, Unterschrift übermittelt.</h2>'}</script></body></html>`);
});

app.post('/sign/:token', async (req, res) => {
  const data = signatureRequests.get(req.params.token);
  if (!data) return res.status(404).json({ error: 'nicht gefunden' });
  if (Date.now() > data.expiresAt) return res.status(410).json({ error: 'abgelaufen' });
  const { signature } = req.body;
  if (!signature) return res.status(400).json({ error: 'keine Unterschrift' });
  res.json({ ok: true });
  try {
    signatureRequests.delete(req.params.token);
    const pdfBuffer = await generateReportPdfBuffer(data.report, data.company, signature);
    const signedFilename = data.filename.replace('.pdf', '_unterschrieben.pdf');
    fs.writeFileSync(path.join(REPORTS_DIR, signedFilename), pdfBuffer);
    const mediaId = await uploadMedia(pdfBuffer, signedFilename, 'application/pdf');
    await sendDocument(data.from, mediaId, signedFilename, `Unterschrieben: ${data.report.kunde || ''}`);
    await sendText(data.from, '✅ Kunde hat unterschrieben. Unterschriebenes PDF gesendet.');
  } catch (err) { console.error('Unterschrift-Fehler:', err); }
});

// ── Heizreport-Integration ────────────────────────────────────────────────
// Webhook-Adresse für Heizreport:  https://DEINE-DOMAIN/heizreport/webhook
// Das in Heizreport hinterlegte "Webhook Auth" muss mit HEIZREPORT_WEBHOOK_AUTH
// (aus der .env) übereinstimmen.
app.post('/heizreport/webhook', (req, res) => {
  if (!verifyHeizreportAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  res.sendStatus(200);
  handleHeizreportWebhook(req.body).catch(err => console.error('Heizreport-Webhook-Fehler:', err));
});

async function handleHeizreportWebhook(payload) {
  // Rohdaten immer sichern, damit nichts verloren geht (auch wenn das Mapping noch nicht passt)
  try {
    const stamp = String(payload?.id || payload?.report_id || Date.now()).replace(/\W/g, '');
    fs.writeFileSync(path.join(REPORTS_DIR, `heizreport_${stamp}.json`), JSON.stringify(payload, null, 2));
  } catch (e) { console.error('Heizreport-Rohdaten konnten nicht gespeichert werden:', e); }

  const report = mapHeizreportToReport(payload);
  if (!report) {
    console.warn('Heizreport-Payload nicht auswertbar – nur Rohdaten gespeichert. Feld-Mapping in lib/heizreport.js prüfen.');
    return;
  }
  report.fotos = report.fotos || [];

  const notify = process.env.HEIZREPORT_NOTIFY_NUMBER;
  if (!notify) {
    console.warn('HEIZREPORT_NOTIFY_NUMBER nicht gesetzt – Heizreport gespeichert, aber kein WhatsApp-Versand.');
    return;
  }

  const pdfBuffer = await generateReportPdfBuffer(report, company);
  const filename = `Heizreport_${safeName(report.kunde)}_${(report.datum || '').replace(/\./g, '-')}.pdf`;
  fs.writeFileSync(path.join(REPORTS_DIR, filename), pdfBuffer);
  const mediaId = await uploadMedia(pdfBuffer, filename, 'application/pdf');
  await sendDocument(notify, mediaId, filename, `Heizreport: ${report.kunde || ''} – ${report.datum || ''}`.trim());
  await sendText(notify, '📄 Neuer Heizreport empfangen und als PDF erstellt.');
}

// ── Kundendienst-Anfrage (3-Schritte-Formular der Website) ─────────────────
app.post('/api/kundendienst', (req, res) => {
  const data = req.body || {};
  if (!data.beschreibung || !data.name || !data.telefon) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen (Beschreibung, Name, Telefon).' });
  }
  res.json({ ok: true });
  handleKundendienst(data).catch(err => console.error('Kundendienst-Fehler:', err));
});

async function handleKundendienst(data) {
  const stamp = Date.now();
  const dir = path.join(REPORTS_DIR, `kundendienst_${stamp}`);
  let fotoCount = 0;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const { fotos = [], ...meta } = data;
    fs.writeFileSync(path.join(dir, 'anfrage.json'), JSON.stringify(meta, null, 2));
    fotos.forEach((durl, i) => {
      const m = /^data:(image\/\w+);base64,(.+)$/s.exec(durl || '');
      if (!m) return;
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
      fs.writeFileSync(path.join(dir, `foto_${i + 1}.${ext}`), Buffer.from(m[2], 'base64'));
      fotoCount++;
    });
  } catch (e) { console.error('Kundendienst-Anfrage konnte nicht gespeichert werden:', e); }

  const notify = process.env.KUNDENDIENST_NOTIFY_NUMBER || process.env.HEIZREPORT_NOTIFY_NUMBER;
  if (!notify) {
    console.warn('KUNDENDIENST_NOTIFY_NUMBER nicht gesetzt – Anfrage gespeichert, aber keine WhatsApp-Benachrichtigung.');
    return;
  }
  const txt =
    `🔧 *Neue Kundendienst-Anfrage*${data.notfall ? ' ⚠️ NOTFALL' : ''}\n\n` +
    `*Bereich:* ${data.kategorie || '-'}\n` +
    `*Kundentyp:* ${data.kundentyp || '-'}\n` +
    `*Name:* ${data.name}\n*Telefon:* ${data.telefon}\n` +
    (data.email ? `*E-Mail:* ${data.email}\n` : '') +
    ((data.plz || data.ort) ? `*Ort:* ${(data.plz || '').trim()} ${(data.ort || '').trim()}\n` : '') +
    `*Erreichbar:* ${data.rueckruf || '-'}\n\n` +
    `*Beschreibung:*\n${data.beschreibung}\n\n` +
    `${fotoCount} Foto(s) · gespeichert unter ${path.basename(dir)}`;
  await sendText(notify, txt);
}

// ── Wärmepumpen-Konfigurator (Angebotsanfrage der Website) ─────────────────
app.post('/api/waermepumpe', (req, res) => {
  const d = req.body || {};
  if (!d.name || !d.telefon) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen (Name, Telefon).' });
  }
  res.json({ ok: true });
  handleWaermepumpe(d).catch(err => console.error('Wärmepumpen-Anfrage-Fehler:', err));
});

async function handleWaermepumpe(d) {
  const stamp = Date.now();
  try {
    fs.writeFileSync(path.join(REPORTS_DIR, `waermepumpe_${stamp}.json`), JSON.stringify(d, null, 2));
  } catch (e) { console.error('Wärmepumpen-Anfrage konnte nicht gespeichert werden:', e); }

  const notify = process.env.WAERMEPUMPE_NOTIFY_NUMBER || process.env.KUNDENDIENST_NOTIFY_NUMBER || process.env.HEIZREPORT_NOTIFY_NUMBER;
  if (!notify) {
    console.warn('WAERMEPUMPE_NOTIFY_NUMBER nicht gesetzt – Anfrage gespeichert, aber keine WhatsApp-Benachrichtigung.');
    return;
  }
  const e = d.ergebnis || {};
  const inp = d.eingaben || {};
  const txt =
    `🌡️ *Neue Wärmepumpen-Anfrage*\n\n` +
    `*Name:* ${d.name}\n*Telefon:* ${d.telefon}\n` +
    (d.email ? `*E-Mail:* ${d.email}\n` : '') +
    ((d.plz || d.ort) ? `*Ort:* ${(d.plz || '').trim()} ${(d.ort || '').trim()}\n` : '') +
    `\n*Gebäude:* ${inp.gebaeudetyp || '-'} · ${inp.flaeche || '-'} m² · ${inp.sanierung || '-'}\n` +
    `*Aktuell:* ${inp.aktuell || '-'} · ${inp.verteilung || '-'}\n` +
    `*Geschätzte Heizlast:* ${e.heizlast != null ? e.heizlast + ' kW' : '-'}\n` +
    `*Empfehlung:* ${e.typ || '-'}` +
    (e.ersparnis ? `\n*Geschätzte Ersparnis:* ~ ${e.ersparnis.von}–${e.ersparnis.bis} €/Jahr ggü. ${e.ersparnis.system}` : '');
  await sendText(notify, txt);
}

app.get('/health', (req, res) => res.json({ ok: true, service: 'whatsapp-tagesbericht-bot-openai' }));

if (require.main === module) app.listen(PORT, () => console.log(`OpenAI Bot läuft auf Port ${PORT}`));
module.exports = app;
