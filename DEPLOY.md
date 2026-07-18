# Website live schalten

Die Website unter `public/` ist **rein statisch** und kann auf jedem Static-Host laufen.
Am schnellsten geht es kostenlos über Netlify oder Cloudflare Pages.

## Variante A — Netlify über GitHub (empfohlen)

1. Auf <https://app.netlify.com> einloggen → **Add new site → Import an existing project**.
2. **GitHub** wählen und das Repo `musagueldes-arch/whatsapp-tagesbericht-bot-openai` verbinden.
3. Branch **`claude/website-6lsiap`** wählen. Dank `netlify.toml` ist das Verzeichnis
   `public` bereits als Veröffentlichungsordner gesetzt, **Build command bleibt leer**.
4. **Deploy** klicken → nach wenigen Sekunden ist die Seite unter
   `https://<name>.netlify.app` erreichbar.

## Variante B — Ganz ohne Git (Drag & Drop)

1. <https://app.netlify.com/drop> öffnen.
2. Den Ordner **`public/`** per Drag & Drop in das Feld ziehen → sofort live.
   (Für Updates den Ordner erneut hineinziehen.)

## Variante C — Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Repo verbinden, Branch `claude/website-6lsiap`.
3. **Build command** leer, **Build output directory** = `public`.
4. **Save and Deploy**.

## Eigene Domain

Nach dem ersten Deploy im Hosting-Dashboard die Domain `g-therm.de`
verbinden (DNS-Eintrag folgt der Anleitung des Anbieters). Danach passen auch die im
Code hinterlegten Adressen (`canonical`, Open Graph, `sitemap.xml`).

## Wichtiger Hinweis (Formulare & WhatsApp)

Auf einem Static-Host laufen die Server-Endpunkte (`/api/kundendienst`,
`/api/waermepumpe`, WhatsApp-Webhook) **nicht**. Die Formulare fallen dann automatisch
auf einen vorausgefüllten **E-Mail-Entwurf** zurück — für „Seite ansehen" und erste
Anfragen völlig ausreichend.

Für die **serverseitige WhatsApp-Benachrichtigung** braucht es später:
- die noch fehlenden Bot-Module unter `lib/` (`openai`, `pdf`, `auftrag`, `whatsapp`,
  `transcribe`, `util`) bzw. eine abgesicherte Variante von `server.js`,
- einen **Node-Host** (z. B. Render/Railway) statt eines reinen Static-Hosts,
- die Umgebungsvariablen aus `.env.example` (API-Keys, Telefonnummern).
