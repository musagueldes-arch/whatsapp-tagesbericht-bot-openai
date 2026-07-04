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

## OpenAI Modelle

Empfohlen:

```env
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Für bessere Qualität kannst du später ein stärkeres Modell einsetzen.
