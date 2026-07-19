// G-Therm Haustechnik — website interactions
(function () {
  'use strict';

  // Mobile navigation toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    // Close menu after clicking a link
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Current year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Reveal-on-scroll (progressive enhancement; respects reduced motion)
  var reveals = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Contact form — client-side handling (no backend endpoint yet)
  var form = document.getElementById('kontaktForm');
  var status = document.getElementById('formStatus');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var data = {
        name: (form.name.value || '').trim(),
        tel: (form.tel.value || '').trim(),
        email: (form.email.value || '').trim(),
        betreff: form.betreff.value,
        nachricht: (form.nachricht.value || '').trim()
      };

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.dataset.label = submitBtn.textContent; submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }
      if (status) { status.className = 'form-status'; status.textContent = 'Wird gesendet …'; }

      // Versand über FormSubmit (formsubmit.co) – kein Server/Account nötig.
      fetch('https://formsubmit.co/ajax/info@g-therm.de', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          Name: data.name,
          Telefon: data.tel,
          email: data.email,
          Betreff: data.betreff,
          Nachricht: data.nachricht,
          _subject: 'Anfrage über die Website: ' + data.betreff,
          _template: 'table',
          _captcha: 'false'
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.label || 'Nachricht senden'; }
        if (status) {
          status.className = 'form-status ok';
          status.textContent = 'Danke! Ihre Nachricht wurde gesendet – wir melden uns schnellstmöglich bei Ihnen zurück.';
        }
        form.reset();
      }).catch(function () {
        // Fallback: E-Mail-Programm mit vorausgefüllter Nachricht öffnen
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.label || 'Nachricht senden'; }
        var subject = encodeURIComponent('Anfrage über die Website: ' + data.betreff);
        var body = encodeURIComponent(
          'Name: ' + data.name + '\n' +
          'Telefon: ' + data.tel + '\n' +
          'E-Mail: ' + data.email + '\n\n' +
          'Nachricht:\n' + data.nachricht
        );
        if (status) {
          status.className = 'form-status form-status--info';
          status.innerHTML =
            '<strong>Fast geschafft!</strong> Ihre Nachricht ist vorbereitet — senden Sie sie mit einem Klick per E-Mail, oder rufen Sie kurz an.' +
            '<span class="form-status__actions">' +
              '<a class="btn btn--accent" href="mailto:info@g-therm.de?subject=' + subject + '&body=' + body + '">Als E-Mail senden</a>' +
              '<a class="btn btn--ghost" href="tel:+4923454461855">0234 - 544 618 55</a>' +
            '</span>';
        }
      });
    });
  }
})();
