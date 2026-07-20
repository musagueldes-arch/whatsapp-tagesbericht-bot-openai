# KI-Chatbot aktivieren (Google Gemini + Cloudflare Worker)

Der Chat auf der Website läuft standardmäßig als **geführter Assistent** (feste Fragen/Antworten, ohne
Server). Diese Anleitung schaltet den **KI-Modus** frei: Der Bot versteht dann frei formulierte Fragen.

**Warum ein „Vermittler" (Worker)?** Der KI-Schlüssel darf niemals im Browser stehen — sonst könnte ihn
jeder auslesen und auf eure Kosten missbrauchen. Der Cloudflare-Worker hält den Schlüssel geheim und
spricht für die Website mit Google Gemini.

> Solange der KI-Modus **nicht** aktiviert ist, funktioniert der geführte Assistent normal weiter.
> Fällt die KI mal aus, schaltet der Chat automatisch auf den geführten Modus zurück.

---

## Schritt 1 — Gemini-Schlüssel holen (kostenlos, mit eurem Google-Konto)
1. Auf **https://aistudio.google.com/app/apikey** gehen und mit dem Google-Konto anmelden.
2. **„Create API key"** klicken und den Schlüssel kopieren (beginnt meist mit `AIza…`).
3. Google Gemini hat eine kostenlose Stufe mit Tageslimit — für eine kleine Website i. d. R. ausreichend.

## Schritt 2 — Cloudflare-Konto + Werkzeug
1. Kostenloses Konto auf **https://dash.cloudflare.com/sign-up** anlegen.
2. Auf dem eigenen Rechner (einmalig): **Node.js** installieren, dann `wrangler`:
   ```
   npm install -g wrangler
   wrangler login
   ```

## Schritt 3 — Worker deployen
Im Projektordner:
```
cd worker
wrangler secret put GEMINI_API_KEY      # hier den Schlüssel aus Schritt 1 einfügen
wrangler deploy
```
`wrangler deploy` zeigt am Ende die **Worker-URL** an, z. B.
`https://gtherm-chat.DEIN-NAME.workers.dev` — diese URL kopieren.

## Schritt 4 — Website auf KI-Modus umstellen
1. In `public/chat.js` die Zeile suchen:
   ```js
   var CHAT_API_URL = '';
   ```
   und die Worker-URL eintragen:
   ```js
   var CHAT_API_URL = 'https://gtherm-chat.DEIN-NAME.workers.dev';
   ```
2. Änderung committen/pushen (dann per Merge nach `main` deployen) — fertig. Der Chat versteht nun Freitext.

> Diese eine Zeile kann ich (Claude) für euch eintragen und deployen, sobald ihr mir die Worker-URL schickt.

---

## Kosten & Grenzen
- **Cloudflare Worker:** großzügiges kostenloses Kontingent (für eine Handwerker-Website normalerweise gratis).
- **Google Gemini:** kostenlose Stufe mit Tages-/Minutenlimit. Bei sehr viel Nutzung ggf. kostenpflichtig —
  das Modell in `worker/wrangler.toml` (`GEMINI_MODEL`) und die Limits lassen sich anpassen.

## Datenschutz (bei aktivem KI-Modus in die Datenschutzerklärung aufnehmen)
Fertiger Absatz zum Einfügen in `public/datenschutz.html` (neuer Abschnitt, danach nachfolgende Nummern
anpassen):

> **KI-Chat-Assistent.** Für den Chat-Assistenten auf unserer Website setzen wir einen KI-Dienst
> (Google Gemini) ein, den wir über einen von uns betriebenen Vermittlungsdienst (Cloudflare Worker)
> ansprechen. Wenn Sie im Chat eine Nachricht senden, wird der eingegebene Text zur Beantwortung an
> diesen Dienst übermittelt und verarbeitet. Eine dauerhafte Speicherung des Chatverlaufs auf unserer
> Seite findet nicht statt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO. Dabei kann eine
> Übermittlung an Server außerhalb der EU (USA) erfolgen. Bitte geben Sie im Chat keine sensiblen
> personenbezogenen Daten ein; für konkrete Anliegen nutzen Sie bitte Telefon oder unser Kontaktformular.

*(Hinweis: Für volle DSGVO-Konformität einen Auftragsverarbeitungs-Vertrag/Alternative prüfen.)*

## Wie es technisch funktioniert
- Frontend: `public/chat.js` sendet den Gesprächsverlauf an `CHAT_API_URL`.
- Backend: `worker/gtherm-chat.js` ergänzt einen System-Prompt mit den G-Therm-Fakten (Leistungen,
  Öffnungszeiten, Kontakt) und Regeln (keine Preise erfinden, Notfälle → Anruf) und ruft Gemini auf.
- Der Schlüssel liegt nur als **Secret** im Worker (`GEMINI_API_KEY`), nie im Browser oder im Repository.
