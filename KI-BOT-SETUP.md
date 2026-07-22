# KI-Chatbot aktivieren (Google Gemini + Cloudflare Worker)

Der Chat auf der Website läuft standardmäßig als **geführter Assistent** (feste Fragen/Antworten, ohne
Server). Diese Anleitung schaltet den **KI-Modus** frei: Der Bot versteht dann frei formulierte Fragen.

**Warum ein „Vermittler" (Worker)?** Der KI-Schlüssel darf niemals im Browser stehen — sonst könnte ihn
jeder auslesen und auf eure Kosten missbrauchen. Der Cloudflare-Worker hält den Schlüssel geheim und
spricht für die Website mit Google Gemini.

> Solange der KI-Modus **nicht** aktiviert ist, funktioniert der geführte Assistent normal weiter.
> Fällt die KI mal aus, schaltet der Chat automatisch auf den geführten Modus zurück.

**Was ihr braucht:** ein Google-Konto (habt ihr) und ein kostenloses Cloudflare-Konto. Insgesamt
ca. 15 Minuten. Ganz ohne Programmierung — nur klicken und kopieren.

---

## Schritt 1 — Gemini-Schlüssel holen (kostenlos, mit eurem Google-Konto)
1. Auf **https://aistudio.google.com/app/apikey** gehen und mit dem Google-Konto anmelden.
2. **„Create API key"** (Schlüssel erstellen) klicken und den Schlüssel kopieren (beginnt meist mit `AIza…`).
3. Diesen Schlüssel gut aufbewahren — ihr braucht ihn in Schritt 2. Google Gemini hat eine kostenlose
   Stufe mit Tageslimit — für eine kleine Website i. d. R. ausreichend.

---

## Schritt 2 — Worker in Cloudflare anlegen (ohne Kommandozeile, nur Weboberfläche)

**Das ist der einfache Weg — komplett im Browser, keine Installation nötig.**

1. Kostenloses Konto anlegen auf **https://dash.cloudflare.com/sign-up** und einloggen.
2. Links im Menü auf **„Workers & Pages"** klicken → Button **„Create application"** →
   Reiter **„Create Worker"** → einen Namen vergeben (z. B. `gtherm-chat`) → **„Deploy"**.
3. Nach dem Anlegen auf **„Edit code"** (Code bearbeiten) klicken. Es öffnet sich ein Editor.
4. Den gesamten vorhandenen Beispielcode links **löschen** und stattdessen den kompletten Inhalt der
   Datei **`worker/gtherm-chat.js`** aus diesem Projekt hineinkopieren. Oben rechts **„Deploy"** klicken.
5. **Schlüssel hinterlegen (Secret):** Zurück zur Worker-Übersicht → Reiter **„Settings"** →
   **„Variables and Secrets"** (Variablen). Unter **„Secret"** (Verschlüsselte Variable):
   - **„Add"** klicken, Name exakt: `GEMINI_API_KEY`, Wert: euer Schlüssel aus Schritt 1 → **Speichern**.
6. **Zwei normale Variablen hinzufügen** (gleiche Seite, unter „Environment Variables", Typ „Text"):
   - `GEMINI_MODEL` = `gemini-2.0-flash`
   - `ALLOWED_ORIGIN` = `https://www.g-therm.de,https://g-therm.de,https://musagueldes-arch.github.io`
   Danach **„Deploy"** / speichern.
7. Oben auf der Worker-Seite steht die **Adresse (URL)** des Workers, z. B.
   `https://gtherm-chat.EUER-NAME.workers.dev`. **Diese URL kopieren** — die braucht die Website.

> **Kurztest:** Ruft ihr die Worker-URL einfach im Browser auf, erscheint `method_not_allowed` —
> das ist **richtig so** (der Worker antwortet nur der Website, nicht dem Browser direkt).

---

## Schritt 3 — Website auf KI-Modus umstellen
Die Worker-URL aus Schritt 2 muss einmal in die Website eingetragen werden — **das mache ich (Claude)
für euch**, schickt mir einfach die URL. Danach committe und deploye ich die Änderung, und der Chat
versteht Freitext.

Falls ihr es selbst machen wollt: in `public/chat.js` die Zeile
```js
var CHAT_API_URL = '';
```
ändern zu (eure echte Worker-URL):
```js
var CHAT_API_URL = 'https://gtherm-chat.EUER-NAME.workers.dev';
```
und die Änderung committen/pushen → per Merge nach `main` deployen.

---

## Alternative: Deploy per Kommandozeile (für Technik-Affine)
Wer lieber die Kommandozeile nutzt, kann Schritt 2 auch so erledigen:
```
cd worker
npm install -g wrangler
wrangler login
wrangler secret put GEMINI_API_KEY      # hier den Schlüssel aus Schritt 1 einfügen
wrangler deploy
```
`wrangler deploy` zeigt am Ende die Worker-URL an. Modell und erlaubte Domains stehen in
`worker/wrangler.toml` und werden mitdeployt.

---

## Kosten & Grenzen
- **Cloudflare Worker:** großzügiges kostenloses Kontingent (für eine Handwerker-Website normalerweise gratis).
- **Google Gemini:** kostenlose Stufe mit Tages-/Minutenlimit. Bei sehr viel Nutzung ggf. kostenpflichtig —
  das Modell (`GEMINI_MODEL`) und die Limits lassen sich anpassen.

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
  Öffnungszeiten, Kontakt) und Regeln (keine Preise erfinden, Notfälle → Anruf, Rückruf-Daten sammeln)
  und ruft Gemini auf.
- Der Schlüssel liegt nur als **Secret** im Worker (`GEMINI_API_KEY`), nie im Browser oder im Repository.
