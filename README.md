# WhatsApp Tagesbericht Bot – OpenAI Version

Neue separate Version deines WhatsApp-Tagesbericht-Bots. Diese Version nutzt **OpenAI** statt Anthropic/Claude.

Dein altes Repository wird dadurch nicht verändert.

## Funktionen

- WhatsApp-Webhook für Meta Cloud API
- Textnachrichten zu Tagesbericht-PDF
- Fotos sammeln und per OpenAI Vision auswerten
- Sprachnotizen transkribieren
- PDF-Erstellung im G-Therm-Layout
- PDF per WhatsApp zurücksenden
- Lokale Speicherung im Ordner `reports/`
- Firmen-Website (statisch) unter `/`

## Firmen-Website

Im Ordner `public/` liegt die statische Firmen-Website von G-Therm Haustechnik
(Startseite, Leistungen, Über uns, Kontakt sowie Impressum und Datenschutz).
Der Express-Server liefert sie unter der Wurzel-URL aus:

```text
http://localhost:3000/
```

Impressum und Datenschutzerklärung enthalten Platzhalter (z. B. E-Mail, USt-IdNr.,
Handwerkskammer), die vor Veröffentlichung mit den korrekten Angaben zu befüllen sind.

Interaktive Seiten:

- `kundendienst.html` – Störungsmeldung in 3 Schritten (→ `POST /api/kundendienst`)
- `waermepumpe.html` – Wärmepumpen-Konfigurator mit Sofort-Orientierung
  (Heizlast/Empfehlung) und Angebotsanfrage (→ `POST /api/waermepumpe`)

Beide speichern die Anfrage unter `reports/` und benachrichtigen per WhatsApp
(`KUNDENDIENST_NOTIFY_NUMBER` bzw. `WAERMEPUMPE_NOTIFY_NUMBER`; mit Fallback).
Die berechneten Werte des Konfigurators sind eine unverbindliche Orientierung.

### Echte Fotos einbinden

Die Bildflächen (Hero, „Unternehmen", Leistungen, Referenzen) sind foto-fähig: Jede Fläche
zeigt einen gestalteten Marken-Farbverlauf als Fallback und blendet automatisch ein Foto ein,
sobald die passende Datei in `public/images/` liegt. Die erwarteten Dateinamen und Größen
stehen in `public/images/README.md`. Es ist kein Code-Eingriff nötig — nur die Bilddateien
mit den richtigen Namen ablegen.

## Einrichtung

```bash
npm install
cp .env.example .env
npm start
```

Dann `.env` mit deinen Werten ausfüllen.

## Meta Webhook

Callback-URL:

```text
https://DEINE-DOMAIN/webhook
```

Verify Token muss mit `WHATSAPP_VERIFY_TOKEN` aus der `.env` übereinstimmen.

## Lokal testen

```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=dein_verify_token&hub.challenge=test123"
curl http://localhost:3000/health
```

## Heizreport-Integration

Anbindung an [heizreport.de](https://www.heizreport.de) in beide Richtungen.

**1. Heizreport → Bot (Webhook)**

In Heizreport unter *Menü → API/Webhook* eintragen:

- **Webhook Adresse:** `https://DEINE-DOMAIN/heizreport/webhook`
- **Webhook Auth:** dasselbe Geheimnis wie `HEIZREPORT_WEBHOOK_AUTH` in der `.env`

Eingehende Berichte werden als Rohdaten unter `reports/heizreport_*.json` gesichert
und – sofern `HEIZREPORT_NOTIFY_NUMBER` gesetzt ist – als PDF per WhatsApp gesendet.

**2. Bot → Heizreport (API)**

`HEIZREPORT_API_KEY` (und ggf. `HEIZREPORT_API_BASE`) in der `.env` setzen. Der Abruf
erfolgt über `fetchHeizreportReport()` in `lib/heizreport.js`.

> **Hinweis:** Das genaue Webhook-Format (Feldnamen), der Übertragungsweg der
> „Webhook Auth" und die API-Endpunkte hängen von der Heizreport-Anleitung ab. Die
> betroffenen Stellen in `lib/heizreport.js` sind mit `TODO` markiert und müssen
> anhand der offiziellen Doku final abgeglichen werden.
>
> **Sicherheit:** Der API-Key ist ein Geheimnis – nur in die `.env` (nicht ins Git),
> und nach Weitergabe (z. B. in Screenshots) in Heizreport neu generieren.

## OpenAI Modelle

Empfohlen:

```env
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Für bessere Qualität kannst du später ein stärkeres Modell einsetzen.
