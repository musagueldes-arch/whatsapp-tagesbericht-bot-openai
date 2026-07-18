// G-Therm Haustechnik — Kundendienst-Anfrage (3-Schritte-Assistent)
(function () {
  'use strict';

  var form = document.getElementById('kdForm');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.kd__step'));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll('.stepper__item'));
  var status = document.getElementById('kdStatus');
  var successEl = document.getElementById('kdSuccess');
  var fileInput = document.getElementById('fotos');
  var previews = document.getElementById('previews');
  var current = 1;
  var MAX_FILES = 5;
  var photos = []; // { name, dataUrl }

  function showStep(n) {
    current = n;
    steps.forEach(function (s) { s.classList.toggle('is-active', Number(s.dataset.step) === n); });
    stepperItems.forEach(function (it) {
      var step = Number(it.dataset.for);
      it.classList.toggle('is-active', step === n);
      it.classList.toggle('is-done', step < n);
    });
    // Fokus auf den ersten Bereich des Schritts (Barrierefreiheit)
    var active = steps[n - 1];
    if (active) {
      var legend = active.querySelector('legend');
      if (legend) legend.setAttribute('tabindex', '-1'), legend.focus();
      active.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Validiert nur die Pflichtfelder des aktuellen Schritts
  function validateStep(n) {
    var step = steps[n - 1];
    var required = step.querySelectorAll('[required]');
    for (var i = 0; i < required.length; i++) {
      if (!required[i].checkValidity()) { required[i].reportValidity(); return false; }
    }
    return true;
  }

  form.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    var prev = e.target.closest('[data-prev]');
    if (next) { e.preventDefault(); if (validateStep(current)) showStep(Math.min(current + 1, steps.length)); }
    if (prev) { e.preventDefault(); showStep(Math.max(current - 1, 1)); }
  });

  // ── Fotos: Auswahl, Vorschau, Drag & Drop ────────────────────────────────
  function readFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return /^image\//.test(f.type); });
    files.forEach(function (file) {
      if (photos.length >= MAX_FILES) return;
      var reader = new FileReader();
      reader.onload = function () {
        photos.push({ name: file.name, dataUrl: reader.result });
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPreviews() {
    previews.innerHTML = '';
    photos.forEach(function (p, idx) {
      var li = document.createElement('li');
      li.className = 'preview';
      var img = document.createElement('img');
      img.src = p.dataUrl; img.alt = p.name;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'preview__remove'; btn.setAttribute('aria-label', 'Foto entfernen'); btn.textContent = '×';
      btn.addEventListener('click', function () { photos.splice(idx, 1); renderPreviews(); });
      li.appendChild(img); li.appendChild(btn);
      previews.appendChild(li);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () { readFiles(fileInput.files); fileInput.value = ''; });
    var dz = document.querySelector('.dropzone');
    if (dz) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-drag'); });
      });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) readFiles(e.dataTransfer.files); });
    }
  }

  // ── Absenden ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    var payload = {
      kundentyp: (form.querySelector('input[name="kundentyp"]:checked') || {}).value || '',
      kategorie: form.kategorie.value,
      notfall: form.notfall.checked,
      beschreibung: form.beschreibung.value.trim(),
      name: form.name.value.trim(),
      telefon: form.telefon.value.trim(),
      email: form.email.value.trim(),
      plz: form.plz.value.trim(),
      ort: form.ort.value.trim(),
      rueckruf: form.rueckruf.value,
      fotos: photos.map(function (p) { return p.dataUrl; })
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }
    status.textContent = '';
    status.className = 'form-status';

    fetch('/api/kundendienst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function () {
      form.hidden = true;
      document.getElementById('stepper').hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      // Fallback: per E-Mail, falls der Server nicht erreichbar ist (z. B. reines Static-Hosting)
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Anfrage senden'; }
      var subject = encodeURIComponent('Kundendienst-Anfrage: ' + payload.kategorie + (payload.notfall ? ' (NOTFALL)' : ''));
      var body = encodeURIComponent(
        'Kundentyp: ' + payload.kundentyp + '\n' +
        'Bereich: ' + payload.kategorie + '\n' +
        'Notfall: ' + (payload.notfall ? 'Ja' : 'Nein') + '\n\n' +
        'Beschreibung:\n' + payload.beschreibung + '\n\n' +
        'Name: ' + payload.name + '\nTelefon: ' + payload.telefon + '\nE-Mail: ' + payload.email + '\n' +
        'PLZ/Ort: ' + payload.plz + ' ' + payload.ort + '\nErreichbar: ' + payload.rueckruf + '\n\n' +
        '(Hinweis: Fotos konnten per E-Mail nicht automatisch angehängt werden.)'
      );
      status.className = 'form-status err';
      status.innerHTML = 'Online-Versand momentan nicht möglich. ' +
        '<a href="mailto:info@g-therm.de?subject=' + subject + '&body=' + body + '">Anfrage per E-Mail senden</a> ' +
        'oder rufen Sie uns an: <a href="tel:+4923454461855">0234 - 544 618 55</a>.';
    });
  });
})();
