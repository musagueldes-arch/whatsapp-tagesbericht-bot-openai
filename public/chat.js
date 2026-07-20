/* G-Therm Haustechnik — geführter FAQ-Chat-Assistent.
 * Rein clientseitig: keine Server, keine Cookies, keine Datenübertragung an Dritte.
 * Beantwortet vordefinierte Fragen und leitet sonst an Anruf / WhatsApp / Formular weiter.
 */
(function () {
  'use strict';
  if (window.__gthermChat) return;
  window.__gthermChat = true;

  var TEL = '+4923454461855';
  var TEL_TXT = '0234 - 544 618 55';
  var WA = '491633170579';
  var WA_HREF = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hallo G-Therm, ich habe eine Frage zu ');

  // KI-Modus: URL des Backend-Vermittlers (Cloudflare Worker) hier eintragen, um den KI-Bot zu
  // aktivieren. Leer lassen = geführter Assistent (kein Server). Anleitung in KI-BOT-SETUP.md.
  var CHAT_API_URL = '';
  var history = [];

  var BACK = { label: '↩ Weitere Themen', goto: 'start' };

  var TOPICS = {
    start: {
      bot: 'Hallo! 👋 Ich bin der G-Therm-Assistent. Wobei kann ich Ihnen helfen?',
      options: [
        { label: 'Wärmepumpe & Förderung', goto: 'waermepumpe' },
        { label: 'Heizung', goto: 'heizung' },
        { label: 'Klimaanlage', goto: 'klima' },
        { label: 'Bad & Sanitär', goto: 'bad' },
        { label: 'Störung / Notdienst', goto: 'notdienst' },
        { label: 'Wartung', goto: 'wartung' },
        { label: 'Öffnungszeiten & Kontakt', goto: 'kontakt' },
        { label: 'Angebot / Kosten', goto: 'angebot' }
      ]
    },
    waermepumpe: {
      bot: 'Ob sich eine Wärmepumpe lohnt, prüfen wir kostenlos – inklusive Beratung zur Förderung (BEG). Machen Sie den Wärmepumpen-Check oder fordern Sie ein Angebot an.',
      actions: [
        { label: 'Wärmepumpen-Check starten', href: 'waermepumpe.html', primary: true },
        { label: 'Angebot anfordern', href: 'index.html#kontakt' }
      ],
      options: [BACK]
    },
    heizung: {
      bot: 'Neue Heizung, Modernisierung oder Reparatur – wir beraten Sie herstellerunabhängig und mit Festpreis.',
      actions: [
        { label: 'Zur Heizung', href: 'heizung.html', primary: true },
        { label: 'Angebot anfordern', href: 'index.html#kontakt' }
      ],
      options: [BACK]
    },
    klima: {
      bot: 'Wir planen, montieren und warten Klimaanlagen (Split) für Wohnung, Haus und Gewerbe – kühlen und heizen mit einem Gerät.',
      actions: [
        { label: 'Zur Klimatechnik', href: 'klimatechnik.html', primary: true },
        { label: 'Angebot anfordern', href: 'index.html#kontakt' }
      ],
      options: [BACK]
    },
    bad: {
      bot: 'Von der Reparatur bis zum kompletten Traumbad – aus einer Hand. Sie können Ihr Bad sogar online in 3D planen.',
      actions: [
        { label: 'Zu Sanitär & Bad', href: 'sanitaer-bad.html', primary: true },
        { label: 'Angebot anfordern', href: 'index.html#kontakt' }
      ],
      options: [BACK]
    },
    wartung: {
      bot: 'Regelmäßige Wartung hält Heizung, Wärmepumpe und Klimaanlage effizient und beugt Ausfällen vor – auf Wunsch mit Wartungsvertrag.',
      actions: [
        { label: 'Zur Wartung', href: 'wartung.html', primary: true },
        { label: 'Termin anfragen', href: 'kundendienst.html' }
      ],
      options: [BACK]
    },
    notdienst: {
      bot: 'Heizungsausfall, Rohrbruch oder Wasserschaden? Im Störfall am schnellsten telefonisch – oder melden Sie die Störung online mit Fotos.',
      actions: [
        { label: 'Jetzt anrufen: ' + TEL_TXT, tel: TEL, primary: true },
        { label: 'Störung online melden', href: 'kundendienst.html' },
        { label: 'Über WhatsApp', wa: true }
      ],
      options: [BACK]
    },
    kontakt: {
      bot: 'Wir sind Mo–Fr von 8:00 bis 17:00 Uhr für Sie da.\n📍 Lindener Str. 111, 44879 Bochum\n📞 ' + TEL_TXT + '\n✉️ info@g-therm.de',
      actions: [
        { label: 'Anrufen', tel: TEL, primary: true },
        { label: 'E-Mail schreiben', href: 'mailto:info@g-therm.de' },
        { label: 'Über WhatsApp', wa: true }
      ],
      options: [BACK]
    },
    angebot: {
      bot: 'Ein Angebot ist bei uns kostenlos und unverbindlich. Schildern Sie uns kurz Ihr Anliegen – wir melden uns schnell zurück.',
      actions: [
        { label: 'Angebot anfordern', href: 'index.html#kontakt', primary: true },
        { label: 'Kundendienst-Anfrage', href: 'kundendienst.html' }
      ],
      options: [BACK]
    }
  };

  var KEYWORDS = [
    ['waermepumpe', ['wärmepump', 'waermepump', 'pumpe', 'förder', 'foerder', 'beg']],
    ['klima', ['klima', 'klimaanlage', 'kühl', 'kuehl', 'split', 'kalt']],
    ['notdienst', ['notfall', 'notdienst', 'störung', 'stoerung', 'ausfall', 'kaputt', 'defekt', 'rohrbruch', 'wasserschaden', 'leck', 'kein warm', 'kein gas', 'tropft']],
    ['bad', ['bad', 'sanitär', 'sanitaer', 'dusche', 'wc', 'toilette', 'fliesen', 'wasserhahn', 'armatur', 'waschtisch']],
    ['wartung', ['wartung', 'service', 'inspektion', 'pflege']],
    ['heizung', ['heizung', 'heizen', 'kessel', 'therme', 'brennwert', 'gasheizung']],
    ['kontakt', ['öffnung', 'oeffnung', 'adresse', 'telefon', 'nummer', 'erreichbar', 'kontakt', 'wo ', 'wann', 'termin']],
    ['angebot', ['angebot', 'kosten', 'preis', 'kostenlos', 'kostet', 'günstig', 'guenstig']]
  ];

  function matchTopic(text) {
    var t = ' ' + text.toLowerCase() + ' ';
    for (var i = 0; i < KEYWORDS.length; i++) {
      var words = KEYWORDS[i][1];
      for (var j = 0; j < words.length; j++) {
        if (t.indexOf(words[j]) !== -1) return KEYWORDS[i][0];
      }
    }
    return null;
  }

  // ── DOM aufbauen ─────────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.className = 'chat-root';
  root.innerHTML =
    '<button class="chat-launcher" type="button" aria-expanded="false" aria-controls="gthermChatPanel" aria-label="Chat öffnen">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-4.9A8.5 8.5 0 1 1 21 11.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 11.5h7M8.5 14.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
    '</button>' +
    '<section class="chat-panel" id="gthermChatPanel" role="dialog" aria-label="G-Therm Chat-Assistent" aria-modal="false">' +
      '<header class="chat-head">' +
        '<div><span class="chat-head__title">G-Therm Assistent</span><span class="chat-head__sub">Antwortet in Sekunden</span></div>' +
        '<button class="chat-close" type="button" aria-label="Chat schließen">&times;</button>' +
      '</header>' +
      '<div class="chat-body" id="gthermChatBody" aria-live="polite"></div>' +
      '<form class="chat-input" id="gthermChatForm" autocomplete="off">' +
        '<input type="text" id="gthermChatText" placeholder="Ihre Frage …" aria-label="Nachricht eingeben" />' +
        '<button class="chat-send" type="submit" aria-label="Senden">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 12 20 4l-6 16-3-7-7-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);

  var launcher = root.querySelector('.chat-launcher');
  var panel = root.querySelector('.chat-panel');
  var body = root.querySelector('#gthermChatBody');
  var form = root.querySelector('#gthermChatForm');
  var input = root.querySelector('#gthermChatText');
  var closeBtn = root.querySelector('.chat-close');
  var started = false;

  // vorhandenen Floating-Call-Button ausblenden (Anrufen ist im Chat enthalten)
  Array.prototype.forEach.call(document.querySelectorAll('.fab'), function (el) { el.style.display = 'none'; });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addBot(text) {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--bot';
    el.innerHTML = esc(text).replace(/\n/g, '<br>');
    body.appendChild(el);
    scrollDown();
  }
  function addUser(text) {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--user';
    el.textContent = text;
    body.appendChild(el);
    scrollDown();
  }
  function actionHref(a) {
    if (a.tel) return 'tel:' + a.tel;
    if (a.wa) return WA_HREF;
    return a.href;
  }
  function renderTopic(key) {
    var topic = TOPICS[key] || TOPICS.start;
    addBot(topic.bot);

    if (topic.actions && topic.actions.length) {
      var acts = document.createElement('div');
      acts.className = 'chat-actions';
      topic.actions.forEach(function (a) {
        var link = document.createElement('a');
        link.className = 'chat-action' + (a.primary ? ' chat-action--primary' : '');
        link.href = actionHref(a);
        if (a.href && a.href.indexOf('mailto:') !== 0) { /* interne Links normal */ }
        if (a.wa || (a.href && /^https?:/.test(a.href))) { link.target = '_blank'; link.rel = 'noopener'; }
        link.textContent = a.label;
        acts.appendChild(link);
      });
      body.appendChild(acts);
    }

    if (topic.options && topic.options.length) {
      var chips = document.createElement('div');
      chips.className = 'chat-chips';
      topic.options.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-chip';
        btn.textContent = o.label;
        btn.addEventListener('click', function () {
          addUser(o.label);
          renderTopic(o.goto);
        });
        chips.appendChild(btn);
      });
      body.appendChild(chips);
    }
    scrollDown();
  }
  function renderFallback() {
    addBot('Das gebe ich am besten direkt an unser Team weiter – so erreichen Sie uns schnell:');
    var acts = document.createElement('div');
    acts.className = 'chat-actions';
    var list = [
      { label: 'Anrufen: ' + TEL_TXT, tel: TEL, primary: true },
      { label: 'Über WhatsApp', wa: true },
      { label: 'Kundendienst-Anfrage', href: 'kundendienst.html' }
    ];
    list.forEach(function (a) {
      var link = document.createElement('a');
      link.className = 'chat-action' + (a.primary ? ' chat-action--primary' : '');
      link.href = actionHref(a);
      if (a.wa) { link.target = '_blank'; link.rel = 'noopener'; }
      link.textContent = a.label;
      acts.appendChild(link);
    });
    body.appendChild(acts);
    var chips = document.createElement('div');
    chips.className = 'chat-chips';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chat-chip'; btn.textContent = BACK.label;
    btn.addEventListener('click', function () { addUser(BACK.label); renderTopic('start'); });
    chips.appendChild(btn);
    body.appendChild(chips);
    scrollDown();
  }

  // ── KI-Modus (optional; nur wenn CHAT_API_URL gesetzt) ───────────────────
  function addTyping() {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--bot chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(el);
    scrollDown();
    return el;
  }
  function emergencyCTA(text) {
    var t = ' ' + text.toLowerCase() + ' ';
    var em = ['notfall', 'wasserschaden', 'rohrbruch', 'kein gas', 'gasgeruch', 'gas riecht', 'kein warm', 'ausfall', 'überschwemm', 'ueberschwemm'];
    for (var i = 0; i < em.length; i++) {
      if (t.indexOf(em[i]) !== -1) {
        var acts = document.createElement('div');
        acts.className = 'chat-actions';
        var a = document.createElement('a');
        a.className = 'chat-action chat-action--primary';
        a.href = 'tel:' + TEL;
        a.textContent = 'Im Notfall sofort anrufen: ' + TEL_TXT;
        acts.appendChild(a);
        body.appendChild(acts);
        scrollDown();
        return;
      }
    }
  }
  function guided(text) {
    var key = matchTopic(text);
    if (key) renderTopic(key); else renderFallback();
  }
  function askAI(text) {
    history.push({ role: 'user', content: text });
    if (history.length > 12) history = history.slice(-12);
    var typing = addTyping();
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      clearTimeout(timer);
      if (typing) typing.remove();
      var reply = data && (data.reply || data.text) ? (data.reply || data.text) : '';
      if (!reply) throw new Error('leer');
      addBot(reply);
      history.push({ role: 'assistant', content: reply });
      emergencyCTA(text);
    }).catch(function () {
      clearTimeout(timer);
      if (typing) typing.remove();
      guided(text);
    });
  }

  function openChat() {
    panel.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Chat schließen');
    if (!started) { started = true; renderTopic('start'); }
    setTimeout(function () { input.focus(); }, 60);
  }
  function closeChat() {
    panel.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Chat öffnen');
    launcher.focus();
  }

  launcher.addEventListener('click', function () {
    if (panel.classList.contains('is-open')) closeChat(); else openChat();
  });
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closeChat();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    addUser(text);
    input.value = '';
    if (CHAT_API_URL) askAI(text);
    else guided(text);
  });
})();
