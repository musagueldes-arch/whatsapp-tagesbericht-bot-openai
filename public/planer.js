// G-Therm Haustechnik — Anschluss- & Heizlast-Planer
// Dependency-frei, läuft komplett im Browser. Einheiten: Meter.
(function () {
  'use strict';

  var canvas = document.getElementById('planCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // ── Bauteilkatalog ────────────────────────────────────────────────────────
  // Maße als Circa-Werte (Grundfläche B×T und Höhe in m). Höhen der Buderus-
  // Außeneinheiten laut Reihe; vor Aufstellplanung im Datenblatt gegenprüfen.
  // Anbindematerial nach G-Therm-Standard: Gewinde-Übergänge als Sanpress
  // (Rotguss) oder verzinkte Gewindefittings; Rohr je nach Projekt Profipress
  // (Kupfer) oder Prestabo (Stahl verzinkt) – daher System-Angabe nur als
  // Dimension. Fußbodenheizung Wavin (¾" Eurokonus). Dimensionen sind
  // Standard-Annahmen und im Angebot (das Programm) je Projekt zu prüfen.
  var UEB = 'Gewinde-Übergang'; // Sanpress (Rotguss) o. verzinkt – Auswahl im Angebot
  var UEB_SUF = ' — Sanpress (Rotguss) o. verzinkt';
  var CATALOG = [
    { group: 'Vaillant Wärmepumpe', items: [
      { id: 'arotherm', name: 'aroTHERM plus 35/55/75', sub: 'Außeneinheit · R290 · 1,10 × 0,45 m · H 0,97 m',
        kind: 'wp-out', w: 1.10, d: 0.45, h: 0.97, color: '#1c6a99', r290: true,
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1¼"', sys: '28 mm' },
        anbinde: [{ n: 2, name: UEB + ' 28 × G 1¼" AG' + UEB_SUF }] },
      { id: 'arotherm-l', name: 'aroTHERM plus 105/125', sub: 'Außeneinheit · R290 · 1,10 × 0,45 m · H 1,57 m',
        kind: 'wp-out', w: 1.10, d: 0.45, h: 1.57, color: '#15577f', r290: true,
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1¼"', sys: '35 mm' },
        anbinde: [{ n: 2, name: UEB + ' 35 × G 1¼" AG' + UEB_SUF }] },
      { id: 'unitower', name: 'uniTOWER', sub: 'Inneneinheit · 0,60 × 0,69 m · H 1,88 m · 190 l WW',
        kind: 'wp-in', w: 0.595, d: 0.693, h: 1.88, color: '#123e5c',
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1"', sys: '28 mm' },
        anbinde: [{ n: 2, name: UEB + ' 28 × G 1" AG' + UEB_SUF }] }
    ]},
    { group: 'Buderus WLW186i AR', items: [
      { id: 'wlw186-ar-s', name: 'WLW-4/5/7 MB AR', sub: 'Außeneinheit · R290 · 1,10 × 0,54 m · H 0,80 m',
        kind: 'wp-out', w: 1.10, d: 0.54, h: 0.80, color: '#1c6a99', r290: true,
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1¼"', sys: '28 mm' },
        anbinde: [{ n: 2, name: UEB + ' 28 × G 1¼" AG' + UEB_SUF }] },
      { id: 'wlw186-ar-l', name: 'WLW-10/12 MB AR', sub: 'Außeneinheit · R290 · 1,35 × 0,54 m · H 1,10 m',
        kind: 'wp-out', w: 1.35, d: 0.54, h: 1.10, color: '#15577f', r290: true,
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1¼"', sys: '35 mm' },
        anbinde: [{ n: 2, name: UEB + ' 35 × G 1¼" AG' + UEB_SUF }] },
      { id: 't180', name: 'Logatherm T180', sub: 'Inneneinheit · 0,60 × 0,60 m · H 1,78 m · 170 l WW',
        kind: 'wp-in', w: 0.60, d: 0.60, h: 1.78, color: '#123e5c',
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1"', sys: '28 mm' },
        anbinde: [{ n: 2, name: UEB + ' 28 × G 1" AG' + UEB_SUF }] }
    ]},
    { group: 'Viessmann Vitocal (R290)', items: [
      { id: 'vitocal250a-out', name: 'Vitocal 250-A (Außeneinheit)', sub: 'Monoblock · R290 · ca. 1,14 × 0,60 m · H 1,38 m',
        kind: 'wp-out', w: 1.14, d: 0.60, h: 1.38, color: '#1c6a99', r290: true,
        ports: ['VL', 'RL'], fitting: { gewinde: '', sys: '28 mm (CU)' },
        anbinde: [{ n: 2, name: 'Pressmuffe 28 mm (direkter CU-Anschluss)' }],
        hint: 'Maße mit Vorbehalt (große 2-Lüfter-Bauform A10–A16) – am Datenblatt DB-6195458 prüfen. R290-Schutzbereich 1 m, mit gasdichter Trennwand auf 0,5 m reduzierbar.' },
      { id: 'vitocal250a-in', name: 'Vitocal 250-A (Inneneinheit)', sub: 'Hydraulikeinheit · ca. 0,60 × 0,36 m · H 0,92 m',
        kind: 'wp-in', w: 0.60, d: 0.36, h: 0.92, color: '#123e5c',
        ports: ['VL', 'RL'], fitting: { gewinde: '', sys: '28 mm (CU)' },
        anbinde: [{ n: 2, name: 'Pressmuffe 28 mm (direkter CU-Anschluss)' }] },
      { id: 'vitocal252a', name: 'Vitocal 252-A (Kompakt, 190 l)', sub: 'Speicher-Kompakt · ca. 0,60 × 0,60 m · H 1,90 m · 190 l WW',
        kind: 'wp-in', w: 0.60, d: 0.60, h: 1.90, color: '#123e5c',
        ports: ['VL', 'RL'], fitting: { gewinde: 'G 1"', sys: '28 mm' },
        anbinde: [{ n: 2, name: UEB + ' 28 × G 1" AG' + UEB_SUF }],
        hint: 'Kompaktgerät mit 190-l-WW-Speicher; nutzt dieselbe 250-A-Außeneinheit. Anschlussgröße am Datenblatt DB-6195459 prüfen.' }
    ]},
    { group: 'Heizflächen', items: [
      { id: 'heizkoerper', name: 'Heizkörper', sub: 'Anschluss ½" · 15 mm',
        kind: 'emitter-hk', w: 1.00, d: 0.12, h: 0.60, color: '#d9591f',
        ports: ['VL', 'RL'], fitting: { gewinde: '½"', sys: '15 mm' },
        anbinde: [{ n: 2, name: UEB + ' 15 × ½" AG' + UEB_SUF },
                  { n: 1, name: 'Heizkörper-Anschlussverschraubung ½" (verzinkt, Eck/Durchgang)' }] },
      { id: 'fbh', name: 'FBH-Verteiler', sub: 'Wavin · ¾" Eurokonus',
        kind: 'emitter-fbh', w: 0.55, d: 0.14, h: 0.45, color: '#f0a12e',
        ports: ['VL', 'RL'], fitting: { gewinde: '¾" Eurokonus', sys: 'Wavin' },
        anbinde: [{ n: 2, name: UEB + ' 28 × 1" AG (Verteileranschluss)' + UEB_SUF },
                  { n: 2, name: 'Wavin Kugelhahn-Anschlussset 1" für Verteiler' }],
        hint: 'Pro Heizkreis zusätzlich Wavin Klemmverschraubung ¾" Eurokonus × 16 mm und Wavin-Rohr 16 × 2 mm.' }
    ]},
    { group: 'Armaturen', items: [
      { id: 'verschraubung', name: 'Verschraubung', sub: 'Gewinde-Übergang',
        kind: 'fitting', w: 0.14, d: 0.14, h: 0.14, color: '#8aa0ad',
        ports: [], fitting: { gewinde: '', sys: '' } },
      { id: 'panzerschlauch', name: 'Panzerschlauch', sub: 'flexibel · WP-Anbindung · 1¼" ÜM',
        kind: 'fitting', w: 0.10, d: 0.10, h: 0.10, color: '#7c8b96',
        ports: [], fitting: { gewinde: '1¼" ÜM', sys: 'DN32' },
        hint: 'Flexibler Anschlussschlauch zur Schwingungsentkopplung an der Außeneinheit – meist paarweise (VL+RL).' },
      { id: 'pufferspeicher', name: 'Pufferspeicher', sub: 'z. B. 100–200 l',
        kind: 'fitting', w: 0.55, d: 0.55, h: 1.20, color: '#6f8592',
        ports: ['VL', 'RL'], fitting: { gewinde: '1"', sys: '35 mm' },
        anbinde: [{ n: 4, name: UEB + ' 35 × 1" AG' + UEB_SUF }] }
    ]}
  ];

  var CAT_BY_ID = {};
  CATALOG.forEach(function (g) { g.items.forEach(function (it) { CAT_BY_ID[it.id] = it; }); });

  // ── Zustand ───────────────────────────────────────────────────────────────
  var STORE_KEY = 'gtherm_planer_v1';
  var state = { rooms: [], parts: [], nextId: 1 };
  var tool = 'select';           // 'select' | 'room'
  var view = '2d';               // '2d' | '3d'
  var selection = null;          // { kind:'room'|'part', id }
  var snap = true;
  var scale = 46;                // px pro Meter (2D)
  var pan = { x: 40, y: 40 };
  var drag = null;               // laufende Drag-/Zeichen-Operation

  var VL_COLOR = '#e0451f', RL_COLOR = '#1f6f9c';
  var ROOM_FILL = 'rgba(28,106,153,0.06)', ROOM_LINE = '#9db8c8';
  var SNAP_STEP = 0.25;

  // ── Persistenz ──────────────────────────────────────────────────────────────
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.rooms && s.parts) { state = s; state.nextId = s.nextId || 1; return true; }
      }
    } catch (e) {}
    return false;
  }
  function seedDemo() {
    // Kleines Beispiel, damit sofort etwas sichtbar ist.
    var r = { id: id(), type: 'room', x: 1, y: 1, w: 4.5, d: 3.5, name: 'Wohnzimmer', wm2: 60 };
    state.rooms.push(r);
    var hk = mkPart('heizkoerper', 1.6, 4.1);
    state.parts.push(hk);
    var wp = mkPart('wlw186-ar-s', 7.2, 1.4);
    state.parts.push(wp);
  }

  function id() { return state.nextId++; }
  function mkPart(catId, x, y) {
    return { id: id(), type: 'part', catId: catId, x: x, y: y, rot: 0 };
  }
  function partSize(p) {
    var c = CAT_BY_ID[p.catId];
    return p.rot === 90 ? { w: c.d, d: c.w } : { w: c.w, d: c.d };
  }
  function partCenter(p) { var s = partSize(p); return { x: p.x + s.w / 2, y: p.y + s.d / 2 }; }
  function snapVal(v) { return snap ? Math.round(v / SNAP_STEP) * SNAP_STEP : Math.round(v * 100) / 100; }

  // ── Heizlast & Auslegung ────────────────────────────────────────────────────
  function roomAreaM2(r) { return r.w * r.d; }
  function roomLoadKW(r) { return r.wm2 ? roomAreaM2(r) * r.wm2 / 1000 : null; }
  function buildingLoadKW() {
    var sum = 0, any = false;
    state.rooms.forEach(function (r) { var l = roomLoadKW(r); if (l != null) { sum += l; any = true; } });
    return any ? sum : null;
  }
  function roomOf(part) {
    var c = partCenter(part);
    for (var i = state.rooms.length - 1; i >= 0; i--) {
      var r = state.rooms[i];
      if (c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.d) return r;
    }
    return null;
  }
  function emittersInRoom(r) {
    return state.parts.filter(function (p) {
      var c = CAT_BY_ID[p.catId];
      if (c.kind !== 'emitter-hk' && c.kind !== 'emitter-fbh') return false;
      var ct = partCenter(p);
      return ct.x >= r.x && ct.x <= r.x + r.w && ct.y >= r.y && ct.y <= r.y + r.d;
    });
  }

  // ── Geometrie-Helfer ────────────────────────────────────────────────────────
  function w2s(x, y) { return { x: pan.x + x * scale, y: pan.y + y * scale }; }
  function s2w(sx, sy) { return { x: (sx - pan.x) / scale, y: (sy - pan.y) / scale }; }
  function evtToCanvas(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }
  function sceneBounds() {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, has = false;
    function acc(x, y, w, d) { has = true; minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x + w); maxy = Math.max(maxy, y + d); }
    state.rooms.forEach(function (r) { acc(r.x, r.y, r.w, r.d); });
    state.parts.forEach(function (p) { var s = partSize(p); acc(p.x, p.y, s.w, s.d); });
    if (!has) return { minx: 0, miny: 0, maxx: 8, maxy: 6 };
    return { minx: minx, miny: miny, maxx: maxx, maxy: maxy };
  }

  // ── 2D-Rendering ────────────────────────────────────────────────────────────
  function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }

  function drawGrid() {
    var step = 0.5 * scale;
    if (step < 8) step = 1 * scale;
    ctx.save();
    ctx.strokeStyle = '#e7eef3'; ctx.lineWidth = 1;
    var ox = pan.x % step, oy = pan.y % step;
    for (var x = ox; x < canvas.width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (var y = oy; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    ctx.restore();
  }

  function render2D() {
    clear();
    drawGrid();
    // Räume
    state.rooms.forEach(function (r) {
      var a = w2s(r.x, r.y);
      var wpx = r.w * scale, dpx = r.d * scale;
      ctx.fillStyle = ROOM_FILL;
      ctx.strokeStyle = isSel('room', r.id) ? '#0a2c42' : ROOM_LINE;
      ctx.lineWidth = isSel('room', r.id) ? 2.5 : 1.5;
      ctx.fillRect(a.x, a.y, wpx, dpx);
      ctx.strokeRect(a.x, a.y, wpx, dpx);
      // Beschriftung
      ctx.fillStyle = '#0a2c42';
      ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(r.name || 'Raum', a.x + 6, a.y + 5);
      ctx.fillStyle = '#566672';
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      var area = roomAreaM2(r);
      ctx.fillText(area.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' m²', a.x + 6, a.y + 22);
      var load = roomLoadKW(r);
      if (load != null) {
        ctx.fillStyle = '#bd4a14';
        ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('≈ ' + load.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kW', a.x + 6, a.y + 38);
      }
    });
    // Bauteile
    state.parts.forEach(function (p) { drawPart2D(p); });
    // Temporäres Raum-Rechteck
    if (drag && drag.mode === 'newroom' && drag.rect) {
      var rr = drag.rect, s = w2s(rr.x, rr.y);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#1c6a99'; ctx.lineWidth = 1.8;
      ctx.strokeRect(s.x, s.y, rr.w * scale, rr.d * scale);
      ctx.restore();
    }
  }

  function drawPart2D(p) {
    var c = CAT_BY_ID[p.catId], sz = partSize(p), a = w2s(p.x, p.y);
    var wpx = sz.w * scale, dpx = sz.d * scale;
    // R290-Schutzbereich (Außeneinheit mit Propan)
    if (c.r290) {
      var m = 1.0 * scale; // grob 1 m rundum als Orientierung
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(46,160,90,0.85)';
      ctx.fillStyle = 'rgba(46,160,90,0.08)';
      ctx.lineWidth = 1.4;
      ctx.fillRect(a.x - m, a.y - m, wpx + 2 * m, dpx + 2 * m);
      ctx.strokeRect(a.x - m, a.y - m, wpx + 2 * m, dpx + 2 * m);
      ctx.restore();
    }
    // Korpus
    ctx.fillStyle = c.color;
    ctx.strokeStyle = isSel('part', p.id) ? '#0a2c42' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = isSel('part', p.id) ? 2.5 : 1;
    roundRect(a.x, a.y, wpx, dpx, 3);
    ctx.fill(); ctx.stroke();
    // Label (wenn Platz)
    if (wpx > 40) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.beginPath(); ctx.rect(a.x + 2, a.y, wpx - 4, dpx); ctx.clip();
      ctx.fillText(c.name, a.x + 5, a.y + dpx / 2);
      ctx.restore();
    }
    // VL/RL-Punkte an der Vorderkante
    if (c.ports && c.ports.length) {
      var py = a.y + dpx;
      c.ports.forEach(function (port, i) {
        var px = a.x + 8 + i * 12;
        ctx.beginPath();
        ctx.fillStyle = port === 'VL' ? VL_COLOR : RL_COLOR;
        ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── 3D-Rendering (isometrisch) ──────────────────────────────────────────────
  var ISO = { ax: Math.cos(Math.PI / 6), ay: Math.sin(Math.PI / 6) };
  function render3D() {
    clear();
    // Hintergrund
    var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, '#eef4f8'); grd.addColorStop(1, '#dbe6ee');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);

    var b = sceneBounds();
    var spanX = Math.max(2, b.maxx - b.minx), spanY = Math.max(2, b.maxy - b.miny);
    // Iso-Skala so, dass die Szene passt
    var isoW = (spanX + spanY) * ISO.ax;
    var isoH = (spanX + spanY) * ISO.ay + 2.2; // + etwas Höhe für Geräte
    var s3 = Math.min((canvas.width - 80) / isoW, (canvas.height - 110) / isoH);
    s3 = Math.max(18, Math.min(90, s3));
    var cx = b.minx + spanX / 2, cy = b.miny + spanY / 2;
    var origin = { x: canvas.width / 2, y: 70 };

    function proj(x, y, z) {
      var rx = x - cx, ry = y - cy;
      return {
        x: origin.x + (rx - ry) * ISO.ax * s3,
        y: origin.y + (rx + ry) * ISO.ay * s3 - (z || 0) * s3
      };
    }

    // Boden-/Raumflächen
    state.rooms.forEach(function (r) { drawFloor3D(r, proj); });
    // Grundplatte, falls keine Räume
    if (!state.rooms.length) {
      drawFloor3D({ x: b.minx, y: b.miny, w: spanX, d: spanY, _plain: true }, proj);
    }
    // R290-Zonen unter die Bauteile
    state.parts.forEach(function (p) {
      var c = CAT_BY_ID[p.catId];
      if (c.r290) drawR290Pad3D(p, proj);
    });
    // Bauteile nach Tiefe sortiert (painter's algorithm)
    var parts = state.parts.slice().sort(function (p1, p2) {
      var a = partCenter(p1), b2 = partCenter(p2);
      return (a.x + a.y) - (b2.x + b2.y);
    });
    parts.forEach(function (p) { drawBox3D(p, proj); });

    drawTitle3D();
  }

  function polyFill(pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  function drawFloor3D(r, proj) {
    var p = [proj(r.x, r.y, 0), proj(r.x + r.w, r.y, 0), proj(r.x + r.w, r.y + r.d, 0), proj(r.x, r.y + r.d, 0)];
    polyFill(p, r._plain ? 'rgba(200,214,224,0.5)' : 'rgba(28,106,153,0.10)',
      isSel('room', r.id) ? '#0a2c42' : '#9db8c8', isSel('room', r.id) ? 2.5 : 1.2);
    if (!r._plain) {
      var ctr = proj(r.x + r.w / 2, r.y + r.d / 2, 0);
      ctx.fillStyle = '#0a2c42';
      ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(r.name || 'Raum', ctr.x, ctr.y - 7);
      var load = roomLoadKW(r);
      if (load != null) {
        ctx.fillStyle = '#bd4a14';
        ctx.fillText('≈ ' + load.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kW', ctr.x, ctr.y + 9);
      }
      ctx.textAlign = 'left';
    }
  }

  function drawR290Pad3D(p, proj) {
    var s = partSize(p), m = 1.0;
    var x0 = p.x - m, y0 = p.y - m, x1 = p.x + s.w + m, y1 = p.y + s.d + m;
    var pts = [proj(x0, y0, 0), proj(x1, y0, 0), proj(x1, y1, 0), proj(x0, y1, 0)];
    ctx.save();
    ctx.setLineDash([5, 4]);
    polyFill(pts, 'rgba(46,160,90,0.12)', 'rgba(46,160,90,0.85)', 1.4);
    ctx.restore();
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')';
  }

  function drawBox3D(p, proj) {
    var c = CAT_BY_ID[p.catId], s = partSize(p), h = c.h;
    var x0 = p.x, y0 = p.y, x1 = p.x + s.w, y1 = p.y + s.d;
    // Ecken
    var A0 = proj(x0, y0, 0), B0 = proj(x1, y0, 0), C0 = proj(x1, y1, 0), D0 = proj(x0, y1, 0);
    var At = proj(x0, y0, h), Bt = proj(x1, y0, h), Ct = proj(x1, y1, h), Dt = proj(x0, y1, h);
    // Sichtbare Flächen: rechts (x1), vorne (y1), oben
    polyFill([B0, C0, Ct, Bt], shade(c.color, 0.72), 'rgba(0,0,0,0.28)', 1);  // rechts
    polyFill([D0, C0, Ct, Dt], shade(c.color, 0.55), 'rgba(0,0,0,0.28)', 1);  // vorne
    polyFill([At, Bt, Ct, Dt], shade(c.color, 1.0), isSel('part', p.id) ? '#0a2c42' : 'rgba(0,0,0,0.28)', isSel('part', p.id) ? 2.5 : 1); // oben
    // Label auf Oberseite
    if (s3ok(At, Ct)) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.name, (At.x + Ct.x) / 2, (At.y + Ct.y) / 2);
      ctx.textAlign = 'left';
    }
    // VL/RL an Vorderkante unten
    if (c.ports && c.ports.length) {
      c.ports.forEach(function (port, i) {
        var t = 0.25 + i * 0.4;
        var pt = proj(x0 + Math.min(s.w - 0.05, t), y1, 0.15);
        ctx.beginPath();
        ctx.fillStyle = port === 'VL' ? VL_COLOR : RL_COLOR;
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  }
  function s3ok(a, b) { return Math.abs(a.x - b.x) > 34; }

  function drawTitle3D() {
    ctx.save();
    ctx.fillStyle = 'rgba(10,44,66,0.92)';
    ctx.fillRect(0, 0, canvas.width, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('G-Therm Haustechnik · Anschlussplan (3D)', 14, 18);
    var bl = buildingLoadKW();
    var right = (bl != null ? 'Gebäudeheizlast ≈ ' + bl.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kW · ' : '') + dateStr();
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(right, canvas.width - 14, 18);
    ctx.textAlign = 'left';
    // Legende VL/RL
    var ly = canvas.height - 18;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = VL_COLOR; ctx.beginPath(); ctx.arc(16, ly, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123e5c'; ctx.fillText('Vorlauf', 26, ly);
    ctx.fillStyle = RL_COLOR; ctx.beginPath(); ctx.arc(96, ly, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123e5c'; ctx.fillText('Rücklauf', 106, ly);
    ctx.strokeStyle = 'rgba(46,160,90,0.85)'; ctx.setLineDash([5, 4]);
    ctx.strokeRect(188, ly - 6, 14, 12); ctx.setLineDash([]);
    ctx.fillStyle = '#123e5c'; ctx.fillText('R290-Schutzbereich', 210, ly);
    ctx.restore();
  }
  function dateStr() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  // ── Zeichnen dispatchen ─────────────────────────────────────────────────────
  function render() { if (view === '3d') render3D(); else render2D(); }

  // ── Auswahl-Helfer ──────────────────────────────────────────────────────────
  function isSel(kind, id) { return selection && selection.kind === kind && selection.id === id; }
  function selectedObj() {
    if (!selection) return null;
    var arr = selection.kind === 'room' ? state.rooms : state.parts;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === selection.id) return arr[i];
    return null;
  }
  function hitTest(wx, wy) {
    // Bauteile zuerst (oben liegend), dann Räume
    for (var i = state.parts.length - 1; i >= 0; i--) {
      var p = state.parts[i], s = partSize(p);
      if (wx >= p.x && wx <= p.x + s.w && wy >= p.y && wy <= p.y + s.d) return { kind: 'part', id: p.id, obj: p };
    }
    for (var j = state.rooms.length - 1; j >= 0; j--) {
      var r = state.rooms[j];
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.d) return { kind: 'room', id: r.id, obj: r };
    }
    return null;
  }

  // ── Palette bauen ───────────────────────────────────────────────────────────
  function buildPalette() {
    var host = document.getElementById('palette');
    var html = '';
    CATALOG.forEach(function (g) {
      html += '<div class="palette__group">' + g.group + '</div>';
      g.items.forEach(function (it) {
        html += '<button type="button" class="chip" data-cat="' + it.id + '">' +
          '<span class="chip__swatch" style="background:' + it.color + '"></span>' +
          '<span class="chip__txt"><span class="chip__name">' + it.name + '</span>' +
          '<span class="chip__sub">' + it.sub + '</span></span></button>';
      });
    });
    host.innerHTML = html;
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-cat]');
      if (!chip) return;
      addPartCentered(chip.getAttribute('data-cat'));
    });
  }
  function addPartCentered(catId) {
    var c = s2w(canvas.width / 2, canvas.height / 2);
    var sz = CAT_BY_ID[catId];
    var p = mkPart(catId, snapVal(c.x - sz.w / 2), snapVal(c.y - sz.d / 2));
    state.parts.push(p);
    selection = { kind: 'part', id: p.id };
    setTool('select');
    save(); render(); renderProps(); renderBom();
  }

  // ── Eigenschaften-Panel ─────────────────────────────────────────────────────
  function renderProps() {
    var host = document.getElementById('props');
    var obj = selectedObj();
    if (!obj) { host.innerHTML = '<p class="props__empty">Kein Element ausgewählt. Tippe einen Raum oder ein Bauteil an.</p>'; return; }
    if (selection.kind === 'room') renderRoomProps(host, obj);
    else renderPartProps(host, obj);
  }

  function renderRoomProps(host, r) {
    var load = roomLoadKW(r);
    host.innerHTML =
      '<div class="props__head"><span class="props__dot" style="background:' + ROOM_FILL + ';border-color:' + ROOM_LINE + '"></span>' +
        '<span class="props__name">Raum</span></div>' +
      field('Name', '<input type="text" id="pf-name" value="' + escAttr(r.name || '') + '" />') +
      '<div class="field__row">' +
        field('Breite (m)', '<input type="number" id="pf-w" min="0.5" step="0.1" value="' + r.w + '" />') +
        field('Tiefe (m)', '<input type="number" id="pf-d" min="0.5" step="0.1" value="' + r.d + '" />') +
      '</div>' +
      field('Spezifische Heizlast (W/m²)',
        '<input type="number" id="pf-wm2" min="0" step="5" placeholder="z. B. 60" value="' + (r.wm2 || '') + '" />') +
      '<div class="readout">' +
        '<div class="readout__lbl">Fläche ' + roomAreaM2(r).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' m² · Heizlast</div>' +
        '<div class="readout__big">' + (load != null ? '≈ ' + load.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' kW' : '– kW') + '</div>' +
      '</div>' +
      '<p class="hint-line">Richtwerte W/m²: Bestand 60–100 · saniert 40–60 · Neubau 25–40.</p>' +
      '<div class="props__actions">' +
        '<button type="button" class="mini-btn mini-btn--danger" id="pf-del"><svg class="ico"><use href="#i-trash"/></svg> Löschen</button>' +
      '</div>';

    bindInput('pf-name', function (v) { r.name = v; });
    bindNum('pf-w', function (v) { if (v >= 0.5) r.w = v; });
    bindNum('pf-d', function (v) { if (v >= 0.5) r.d = v; });
    bindNum('pf-wm2', function (v) { r.wm2 = v > 0 ? v : null; }, true);
    delBtn();
  }

  function renderPartProps(host, p) {
    var c = CAT_BY_ID[p.catId], sz = partSize(p);
    var html =
      '<div class="props__head"><span class="props__dot" style="background:' + c.color + '"></span>' +
        '<span class="props__name">' + c.name + '</span></div>' +
      '<p class="props__meta">' + c.sub + '</p>' +
      '<p class="props__meta">Grundfläche <strong>' + fmtM(sz.w) + ' × ' + fmtM(sz.d) + ' m</strong>, Höhe <strong>' + fmtM(c.h) + ' m</strong></p>';
    if (c.fitting && (c.fitting.gewinde || c.fitting.sys)) {
      var parts = [];
      if (c.fitting.gewinde) parts.push(c.fitting.gewinde);
      if (c.fitting.sys) parts.push(c.fitting.sys);
      html += '<p class="props__meta">Anschluss <strong>' + parts.join(' · ') + '</strong></p>';
    }
    if (c.r290) html += '<p class="props__meta">⚠︎ Betrieb mit R290 (Propan) – Schutzbereich beachten.</p>';

    // Anbindematerial (Sanpress / verzinkt / Wavin)
    if (c.anbinde && c.anbinde.length) {
      html += '<div class="anbinde"><div class="anbinde__head">Anbindematerial</div><ul class="anbinde__list">';
      c.anbinde.forEach(function (a) {
        html += '<li><span class="anbinde__n">' + a.n + '×</span> ' + a.name + '</li>';
      });
      html += '</ul>';
      if (c.hint) html += '<p class="anbinde__hint">' + c.hint + '</p>';
      html += '</div>';
    } else if (c.hint) {
      html += '<p class="hint-line">' + c.hint + '</p>';
    }

    // Heizkörper-/FBH-Schnellauslegung
    if (c.kind === 'emitter-hk' || c.kind === 'emitter-fbh') {
      var r = roomOf(p);
      if (r && r.wm2) {
        var demandW = Math.round(roomAreaM2(r) * r.wm2);
        var ems = emittersInRoom(r);
        var n = Math.max(1, ems.length);
        var per = Math.round(demandW / n);
        html += '<div class="readout">' +
          '<div class="readout__lbl">Raumbedarf · ' + escAttr(r.name || 'Raum') + '</div>' +
          '<div class="readout__big">' + demandW.toLocaleString('de-DE') + ' W</div>' +
          '<div class="readout__split">' + n + ' Heizfläche' + (n > 1 ? 'n' : '') + ' im Raum → je <strong>' + per.toLocaleString('de-DE') + ' W</strong></div>' +
        '</div>' +
        '<p class="hint-line">So viel Leistung muss die Heizfläche bei deiner Vorlauftemperatur bringen. Datenblatt-Normleistung entsprechend wählen.</p>';
      } else if (r) {
        html += '<p class="hint-line">Raum „' + escAttr(r.name || '') + '" hat noch keine Heizlast. Raum antippen und W/m² eintragen.</p>';
      } else {
        html += '<p class="hint-line">Heizfläche in keinem Raum. Über einen Raum mit Heizlast schieben, dann erscheint der Leistungsbedarf.</p>';
      }
    }

    html += '<div class="props__actions">' +
        '<button type="button" class="mini-btn" id="pf-rot"><svg class="ico"><use href="#i-rotate"/></svg> Drehen</button>' +
        '<button type="button" class="mini-btn mini-btn--danger" id="pf-del"><svg class="ico"><use href="#i-trash"/></svg> Löschen</button>' +
      '</div>';
    host.innerHTML = html;

    var rot = document.getElementById('pf-rot');
    if (rot) rot.addEventListener('click', function () { p.rot = p.rot === 90 ? 0 : 90; save(); render(); renderProps(); });
    delBtn();
  }

  function delBtn() {
    var del = document.getElementById('pf-del');
    if (del) del.addEventListener('click', deleteSelected);
  }
  function deleteSelected() {
    if (!selection) return;
    if (selection.kind === 'room') state.rooms = state.rooms.filter(function (r) { return r.id !== selection.id; });
    else state.parts = state.parts.filter(function (p) { return p.id !== selection.id; });
    selection = null;
    save(); render(); renderProps(); renderBom();
  }

  function field(label, inner) { return '<div class="field"><label>' + label + '</label>' + inner + '</div>'; }
  function bindInput(id, cb) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () { cb(el.value); save(); render(); renderBom(); });
  }
  function bindNum(id, cb, reprops) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      cb(parseFloat(el.value));
      save(); render(); renderBom();
      if (reprops) { var o = selectedObj(); if (o) { var h = document.getElementById('props'); renderRoomProps(h, o); document.getElementById(id).focus(); } }
    });
  }

  // ── Stückliste ──────────────────────────────────────────────────────────────
  function threadCell(c) {
    var f = c.fitting || {};
    var g = f.gewinde ? '<span class="bom__thread">' + f.gewinde + '</span>' : '';
    var s = f.sys ? '<span class="bom__sys">' + f.sys + '</span>' : '';
    if (!g && !s) return '–';
    return g + (g && s ? ' · ' : '') + s;
  }
  function renderBom() {
    var host = document.getElementById('bom');
    var counts = {};
    state.parts.forEach(function (p) { counts[p.catId] = (counts[p.catId] || 0) + 1; });
    var ids = Object.keys(counts);
    var html = '';
    if (!ids.length && !state.rooms.length) {
      host.innerHTML = '<p class="bom__empty">Noch nichts platziert. Bauteile aus der Palette hinzufügen oder einen Raum aufziehen.</p>';
      return;
    }
    if (ids.length) {
      html += '<table><thead><tr><th>Bauteil</th><th class="num">Anz.</th><th>Anschluss</th></tr></thead><tbody>';
      ids.forEach(function (cid) {
        var c = CAT_BY_ID[cid];
        html += '<tr><td>' + c.name + '</td><td class="num">' + counts[cid] + '×</td><td>' + threadCell(c) + '</td></tr>';
      });
      html += '</tbody></table>';

      // Anbindematerial aggregieren (Sanpress / verzinkt / Wavin)
      var mat = {};
      ids.forEach(function (cid) {
        var c = CAT_BY_ID[cid];
        if (!c.anbinde) return;
        c.anbinde.forEach(function (a) { mat[a.name] = (mat[a.name] || 0) + a.n * counts[cid]; });
      });
      var names = Object.keys(mat);
      if (names.length) {
        html += '<div class="bom__subhead">Anbindematerial <span>Sanpress · verzinkt · Wavin</span></div>';
        html += '<table><tbody>';
        names.forEach(function (nm) {
          html += '<tr><td>' + nm + '</td><td class="num">' + mat[nm] + '×</td></tr>';
        });
        html += '</tbody></table>';
        html += '<p class="bom__foot">Gewinde-Übergänge als Sanpress (Rotguss) oder verzinkt; Dimensionen sind Standard-Annahmen – im Angebot je Projekt prüfen.</p>';
      }
    }
    var rooms = state.rooms.length;
    var bl = buildingLoadKW();
    if (rooms) {
      html += '<div class="bom__total"><span class="lbl">Gebäudeheizlast (überschlägig · ' + rooms + ' Raum' + (rooms > 1 ? 'e' : '') + ')</span>' +
        '<span class="val">' + (bl != null ? '≈ ' + bl.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kW' : '– kW') + '</span></div>';
    }
    host.innerHTML = html;
  }

  // ── Pointer-Interaktion ─────────────────────────────────────────────────────
  canvas.addEventListener('pointerdown', function (e) {
    if (view === '3d') return; // 3D nur Ansicht
    canvas.setPointerCapture(e.pointerId);
    var cvs = evtToCanvas(e), w = s2w(cvs.x, cvs.y);
    if (tool === 'room') {
      drag = { mode: 'newroom', start: { x: snapVal(w.x), y: snapVal(w.y) }, rect: null };
      return;
    }
    var hit = hitTest(w.x, w.y);
    if (hit) {
      selection = { kind: hit.kind, id: hit.id };
      drag = { mode: 'move', kind: hit.kind, id: hit.id, off: { x: w.x - hit.obj.x, y: w.y - hit.obj.y }, moved: false };
      renderProps();
    } else {
      selection = null; renderProps();
    }
    render();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var cvs = evtToCanvas(e), w = s2w(cvs.x, cvs.y);
    if (drag.mode === 'newroom') {
      var x = Math.min(drag.start.x, snapVal(w.x)), y = Math.min(drag.start.y, snapVal(w.y));
      var ww = Math.abs(snapVal(w.x) - drag.start.x), dd = Math.abs(snapVal(w.y) - drag.start.y);
      drag.rect = { x: x, y: y, w: ww, d: dd };
      render();
    } else if (drag.mode === 'move') {
      var obj = (drag.kind === 'room' ? state.rooms : state.parts).filter(function (o) { return o.id === drag.id; })[0];
      if (!obj) return;
      obj.x = snapVal(w.x - drag.off.x);
      obj.y = snapVal(w.y - drag.off.y);
      drag.moved = true;
      render();
    }
  });

  canvas.addEventListener('pointerup', function (e) {
    if (!drag) return;
    if (drag.mode === 'newroom' && drag.rect && drag.rect.w >= 0.5 && drag.rect.d >= 0.5) {
      var r = { id: id(), type: 'room', x: drag.rect.x, y: drag.rect.y, w: Math.round(drag.rect.w * 100) / 100, d: Math.round(drag.rect.d * 100) / 100, name: 'Raum ' + (state.rooms.length + 1), wm2: null };
      state.rooms.push(r);
      selection = { kind: 'room', id: r.id };
      setTool('select');
      renderProps();
    }
    if (drag.mode === 'move' && drag.moved) renderProps(); // Auslegung ggf. aktualisieren (Raumwechsel)
    drag = null;
    save(); render(); renderBom();
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection) { e.preventDefault(); deleteSelected(); }
  });

  // ── Werkzeuge / Ansicht / Zoom ──────────────────────────────────────────────
  function setTool(t) {
    tool = t;
    Array.prototype.forEach.call(document.querySelectorAll('.tool'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-tool') === t);
    });
    canvas.classList.toggle('tool-select', t === 'select');
  }
  Array.prototype.forEach.call(document.querySelectorAll('.tool'), function (b) {
    b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); });
  });

  function setView(v) {
    view = v;
    Array.prototype.forEach.call(document.querySelectorAll('.seg__btn'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === v);
    });
    document.getElementById('photoBtn').hidden = (v !== '3d');
    render();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.seg__btn'), function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
  });

  document.getElementById('snapToggle').addEventListener('change', function (e) { snap = e.target.checked; });
  document.getElementById('zoomIn').addEventListener('click', function () { zoomBy(1.2); });
  document.getElementById('zoomOut').addEventListener('click', function () { zoomBy(1 / 1.2); });
  document.getElementById('zoomFit').addEventListener('click', fitView);
  function zoomBy(f) {
    var cx = canvas.width / 2, cy = canvas.height / 2, before = s2w(cx, cy);
    scale = Math.max(14, Math.min(160, scale * f));
    var after = s2w(cx, cy);
    pan.x += (after.x - before.x) * scale; pan.y += (after.y - before.y) * scale;
    render();
  }
  function fitView() {
    var b = sceneBounds();
    var w = Math.max(1, b.maxx - b.minx), h = Math.max(1, b.maxy - b.miny);
    var pad = 40;
    scale = Math.max(14, Math.min(120, Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h)));
    pan.x = pad - b.minx * scale; pan.y = pad - b.miny * scale;
    render();
  }

  // ── Foto-Export ─────────────────────────────────────────────────────────────
  document.getElementById('photoBtn').addEventListener('click', function () {
    if (view !== '3d') setView('3d');
    render3D();
    try {
      var url = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = url;
      a.download = 'g-therm-anschlussplan-' + dateStr().replace(/\./g, '-') + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (err) {
      alert('Foto konnte nicht erstellt werden: ' + err);
    }
  });

  // ── Angebot vorbereiten (preisfreier Export) ────────────────────────────────
  function buildExport() {
    var raeume = state.rooms.map(function (r) {
      var l = roomLoadKW(r);
      return { name: r.name || 'Raum', flaecheM2: Math.round(roomAreaM2(r) * 10) / 10, wm2: r.wm2 || null, heizlastKW: l != null ? Math.round(l * 100) / 100 : null };
    });
    var counts = {};
    state.parts.forEach(function (p) { counts[p.catId] = (counts[p.catId] || 0) + 1; });
    var geraete = Object.keys(counts).map(function (cid) {
      var c = CAT_BY_ID[cid];
      return { name: c.name, anzahl: counts[cid], anschluss: [c.fitting && c.fitting.gewinde, c.fitting && c.fitting.sys].filter(Boolean).join(' · ') };
    });
    var mat = {};
    Object.keys(counts).forEach(function (cid) {
      var c = CAT_BY_ID[cid];
      if (!c.anbinde) return;
      c.anbinde.forEach(function (a) { mat[a.name] = (mat[a.name] || 0) + a.n * counts[cid]; });
    });
    var anbinde = Object.keys(mat).map(function (nm) { return { name: nm, menge: mat[nm] }; });
    var bl = buildingLoadKW();

    var data = {
      quelle: 'G-Therm Anschluss- & Heizlast-Planer',
      erstellt: dateStr(),
      gebaeudeheizlastKW: bl != null ? Math.round(bl * 10) / 10 : null,
      raeume: raeume, geraete: geraete, anbindematerial: anbinde,
      hinweis: 'Heizlast überschlägig (W/m²), kein Ersatz für DIN EN 12831. Artikel & Preise im Angebot (das Programm) je Projekt.'
    };

    var L = [];
    L.push('G-Therm · Anschlussplan-Stückliste (' + data.erstellt + ')');
    L.push('');
    if (raeume.length) {
      L.push('RÄUME');
      raeume.forEach(function (r) {
        L.push('- ' + r.name + ': ' + r.flaecheM2.toLocaleString('de-DE') + ' m²' +
          (r.wm2 ? ' · ' + r.wm2 + ' W/m² · ≈ ' + (r.heizlastKW != null ? r.heizlastKW.toLocaleString('de-DE') + ' kW' : '–') : ' · keine Heizlast'));
      });
      L.push('Gebäudeheizlast (überschlägig): ' + (bl != null ? '≈ ' + bl.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kW' : '–'));
      L.push('');
    }
    if (geraete.length) {
      L.push('GERÄTE / HEIZFLÄCHEN');
      geraete.forEach(function (g) { L.push('- ' + g.anzahl + '× ' + g.name + (g.anschluss ? ' (' + g.anschluss + ')' : '')); });
      L.push('');
    }
    if (anbinde.length) {
      L.push('ANBINDEMATERIAL (Sanpress / verzinkt / Wavin)');
      anbinde.forEach(function (a) { L.push('- ' + a.menge + '× ' + a.name); });
      L.push('');
    }
    L.push('Hinweis: ' + data.hinweis);
    return { text: L.join('\n'), json: data };
  }

  function flash(msg) {
    var note = document.getElementById('exportNote');
    if (!note) return;
    var prev = note.textContent;
    note.textContent = msg;
    note.classList.add('is-ok');
    setTimeout(function () { note.textContent = prev; note.classList.remove('is-ok'); }, 3500);
  }

  function exportAngebot() {
    if (!state.rooms.length && !state.parts.length) { flash('Nichts zu exportieren – erst Räume/Bauteile anlegen.'); return; }
    var ex = buildExport();
    // JSON-Datei herunterladen
    try {
      var blob = new Blob([JSON.stringify(ex.json, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'g-therm-stueckliste-' + dateStr().replace(/\./g, '-') + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {}
    // Text in Zwischenablage
    var done = function () { flash('Stückliste kopiert & als Datei geladen ✓'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ex.text).then(done, function () { flash('Datei geladen ✓ (Kopieren nicht möglich)'); });
    } else { done(); }
  }

  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportAngebot);

  // ── Init ────────────────────────────────────────────────────────────────────
  buildPalette();
  if (!load()) { seedDemo(); save(); }
  setTool('select');
  fitView();
  renderProps();
  renderBom();

  function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtM(n) { return n.toLocaleString('de-DE', { maximumFractionDigits: 2 }); }
})();
