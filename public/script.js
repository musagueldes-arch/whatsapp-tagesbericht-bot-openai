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

      // Fallback: open the user's mail client with a prefilled message.
      // Replace with a real endpoint / mailto address once available.
      var to = 'info@g-therm-haustechnik.de';
      var subject = encodeURIComponent('Anfrage über die Website: ' + data.betreff);
      var body = encodeURIComponent(
        'Name: ' + data.name + '\n' +
        'Telefon: ' + data.tel + '\n' +
        'E-Mail: ' + data.email + '\n\n' +
        'Nachricht:\n' + data.nachricht
      );
      window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;

      if (status) {
        status.textContent = 'Danke! Ihr E-Mail-Programm öffnet sich – bitte senden Sie die Nachricht ab. Alternativ erreichen Sie uns telefonisch.';
        status.className = 'form-status ok';
      }
      form.reset();
    });
  }
})();
