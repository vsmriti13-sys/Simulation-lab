/* Operation Island — map renderer (canvas).
 * createMap(canvas, opts) draws the survey chart and reports clicks / keyboard picks.
 * opts.getView() returns { mode, scouted, discovered, scoutable, base, pin, stormT, selectable }
 */
(function () {
  const W = OI.world;
  const COLORS = {
    deep: '#0E4A5A', ocean: '#16697A', shallow: '#2B8C93', reef: '#5FC1B8',
    b: '#E4D19F', g: '#9EBE6A', f: '#3E7845', h: '#90A05E', k: '#7E776A', M: '#6A5A4E', V: '#3A2E29',
    s: '#6E8B5C', m: '#4C7458', w: '#9EBE6A', l: '#9EBE6A', river: '#3D93B5', lake: '#4B9EBE',
    ink: '#10262E', fog: 'rgba(236, 241, 238, 0.55)', hatch: 'rgba(16, 38, 46, 0.18)', signal: '#F2B630'
  };

  OI.createMap = function (canvas, opts) {
    const ctx = canvas.getContext('2d');
    const base = document.createElement('canvas');
    const bctx = base.getContext('2d');
    let ts = 30, dpr = 1, raf = null;
    let cursor = { r: W.LANDING.r, c: W.LANDING.c }, hover = null, showCursor = false;
    let hatchPattern = null;

    function resize() {
      const w = Math.max(280, canvas.parentElement.clientWidth);
      ts = w / W.COLS;
      dpr = window.devicePixelRatio || 1;
      const h = ts * W.ROWS;
      for (const cv of [canvas, base]) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBase();
      makeHatch();
      draw();
    }

    function makeHatch() {
      const p = document.createElement('canvas'); p.width = p.height = 8;
      const pc = p.getContext('2d');
      pc.strokeStyle = COLORS.hatch; pc.lineWidth = 1;
      pc.beginPath(); pc.moveTo(0, 8); pc.lineTo(8, 0); pc.stroke();
      hatchPattern = ctx.createPattern(p, 'repeat');
    }

    const cx = c => (c + 0.5) * ts, cy = r => (r + 0.5) * ts;

    function blob(g, r, c, color, radius) {
      // organic tile: circle plus bridges toward same-kind neighbours
      g.fillStyle = color;
      g.beginPath(); g.arc(cx(c), cy(r), ts * radius, 0, Math.PI * 2); g.fill();
    }

    function drawBase() {
      const g = bctx, w = W.COLS * ts, h = W.ROWS * ts;
      const grad = g.createRadialGradient(w / 2, h / 2, ts * 2, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, COLORS.ocean); grad.addColorStop(1, COLORS.deep);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      // gentle swell lines
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
      for (let y = ts * 0.4; y < h; y += ts * 0.55) {
        g.beginPath();
        for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / (ts * 0.9) + y) * ts * 0.06);
        g.stroke();
      }
      const land = [];
      for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
        if (W.code(r, c) === 'r') blob(g, r, c, 'rgba(95,193,184,0.55)', 0.62);
        if (W.isLand(r, c)) land.push({ r, c });
      }
      land.forEach(t => blob(g, t.r, t.c, 'rgba(43,140,147,0.65)', 1.0));
      land.forEach(t => blob(g, t.r, t.c, COLORS.b, 0.74));
      // terrain fills: full squares inside, rounded at the coast
      land.forEach(({ r, c }) => {
        const ch = W.code(r, c);
        if (ch === 'b') return;
        const color = COLORS[ch];
        const inner = [[-1, 0], [1, 0], [0, -1], [0, 1]].every(([dr, dc]) => W.isLand(r + dr, c + dc) && W.code(r + dr, c + dc) !== 'b');
        g.fillStyle = color;
        if (inner) g.fillRect(c * ts - 0.5, r * ts - 0.5, ts + 1, ts + 1);
        else {
          g.beginPath(); g.arc(cx(c), cy(r), ts * 0.6, 0, Math.PI * 2); g.fill();
          [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
            const n = W.code(r + dr, c + dc);
            if (W.isLand(r + dr, c + dc) && n !== 'b') {
              g.fillRect(cx(c) + Math.min(0, dc) * ts * 0.5 - (dc ? 0 : ts * 0.5), cy(r) + Math.min(0, dr) * ts * 0.5 - (dr ? 0 : ts * 0.5),
                dc ? ts * 0.5 + 1 : ts, dr ? ts * 0.5 + 1 : ts);
            }
          });
        }
      });
      // textures
      land.forEach(({ r, c }) => texture(g, r, c));
      // river + lake
      g.strokeStyle = COLORS.river; g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = ts * 0.2;
      g.beginPath();
      g.moveTo(cx(8), cy(4) + ts * 0.3);
      W.RIVER.forEach(p => g.lineTo(cx(p.c) + (W.hash(p.r, p.c) - 0.5) * ts * 0.25, cy(p.r)));
      g.lineTo(cx(5.6), cy(10.9));
      g.stroke();
      g.fillStyle = COLORS.lake;
      g.beginPath(); g.ellipse(cx(9), cy(8), ts * 0.48, ts * 0.36, 0.3, 0, Math.PI * 2); g.fill();
      // survey grid
      g.strokeStyle = 'rgba(16,38,46,0.10)'; g.lineWidth = 1;
      for (let c = 1; c < W.COLS; c++) { g.beginPath(); g.moveTo(c * ts, ts); g.lineTo(c * ts, h - ts); g.stroke(); }
      for (let r = 1; r < W.ROWS; r++) { g.beginPath(); g.moveTo(ts, r * ts); g.lineTo(w - ts, r * ts); g.stroke(); }
      // grid labels in the margin
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.font = `600 ${Math.max(9, ts * 0.32)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let c = 1; c < W.COLS - 1; c++) g.fillText(W.LETTERS[c], cx(c), ts * 0.5);
      for (let r = 1; r < W.ROWS - 1; r++) g.fillText(String(r + 1), ts * 0.5, cy(r));
      // north arrow
      const nx = w - ts * 1.1, ny = ts * 1.6;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.moveTo(nx, ny - ts * 0.55); g.lineTo(nx + ts * 0.22, ny + ts * 0.2); g.lineTo(nx, ny + ts * 0.05); g.lineTo(nx - ts * 0.22, ny + ts * 0.2); g.closePath(); g.fill();
      g.fillText('N', nx, ny + ts * 0.55);
      // scale bar: 2 tiles = 500 m
      const sx = ts * 1.2, sy = h - ts * 0.45;
      g.fillRect(sx, sy - 2, ts, 4); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5; g.strokeRect(sx + ts, sy - 2, ts, 4);
      g.textAlign = 'left';
      g.font = `500 ${Math.max(8, ts * 0.26)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillText('0', sx - 2, sy - ts * 0.28); g.fillText('500 m', sx + ts * 1.7, sy - ts * 0.28);
    }

    function texture(g, r, c) {
      const ch = W.code(r, c), x = c * ts, y = r * ts;
      let seed = W.hash(r, c) * 1000;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      if (ch === 'f') {
        for (let i = 0; i < 5; i++) {
          const px = x + ts * (0.2 + rnd() * 0.6), py = y + ts * (0.2 + rnd() * 0.6), rr = ts * (0.1 + rnd() * 0.06);
          g.fillStyle = 'rgba(20,60,30,0.55)'; g.beginPath(); g.arc(px + 1.5, py + 1.5, rr, 0, 7); g.fill();
          g.fillStyle = 'rgba(110,170,100,0.55)'; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
        }
      } else if (ch === 'h' || ch === 'k' || ch === 'M') {
        g.strokeStyle = ch === 'M' ? 'rgba(30,20,15,0.45)' : 'rgba(40,50,25,0.45)'; g.lineWidth = Math.max(1, ts * 0.05);
        for (let i = 0; i < (ch === 'M' ? 3 : 2); i++) {
          const px = x + ts * (0.25 + rnd() * 0.5), py = y + ts * (0.35 + rnd() * 0.4), s = ts * 0.16;
          g.beginPath(); g.moveTo(px - s, py + s * 0.6); g.lineTo(px, py - s * 0.6); g.lineTo(px + s, py + s * 0.6); g.stroke();
        }
      } else if (ch === 'V') {
        const grad = g.createRadialGradient(cx(c), cy(r), 1, cx(c), cy(r), ts * 0.5);
        grad.addColorStop(0, '#F07A2A'); grad.addColorStop(0.45, '#8E3A1F'); grad.addColorStop(1, 'rgba(58,46,41,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(cx(c), cy(r), ts * 0.5, 0, 7); g.fill();
      } else if (ch === 's') {
        g.strokeStyle = 'rgba(40,90,110,0.6)'; g.lineWidth = 1;
        for (let i = 0; i < 4; i++) { const py = y + ts * (0.25 + i * 0.17), px = x + ts * (0.15 + rnd() * 0.3); g.beginPath(); g.moveTo(px, py); g.lineTo(px + ts * 0.35, py); g.stroke(); }
      } else if (ch === 'm') {
        g.fillStyle = 'rgba(25,60,40,0.6)';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + ts * (0.2 + rnd() * 0.6), y + ts * (0.2 + rnd() * 0.6), ts * 0.06, 0, 7); g.fill(); }
      } else if (ch === 'g' || ch === 'w' || ch === 'l') {
        g.strokeStyle = 'rgba(70,110,40,0.5)'; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const px = x + ts * (0.2 + rnd() * 0.6), py = y + ts * (0.3 + rnd() * 0.5); g.beginPath(); g.moveTo(px - 2, py); g.lineTo(px, py - 4); g.lineTo(px + 2, py); g.stroke(); }
      } else if (ch === 'b') {
        g.fillStyle = 'rgba(160,130,80,0.35)';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + ts * (0.2 + rnd() * 0.6), y + ts * (0.2 + rnd() * 0.6), 1, 0, 7); g.fill(); }
      }
    }

    function draw() {
      const v = opts.getView();
      const w = W.COLS * ts, h = W.ROWS * ts;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      const fogOn = v.mode !== 'aerial' && v.mode !== 'overview';
      // fog of the unknown
      for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
        if (!W.isLand(r, c)) continue;
        const k = W.key(r, c);
        if (fogOn && !v.scouted[k]) {
          ctx.fillStyle = COLORS.fog; ctx.fillRect(c * ts, r * ts, ts, ts);
          ctx.fillStyle = hatchPattern; ctx.fillRect(c * ts, r * ts, ts, ts);
        }
        if (v.mode === 'aerial') { ctx.fillStyle = 'rgba(236,241,238,0.12)'; ctx.fillRect(c * ts, r * ts, ts, ts); }
      }
      // storm flooding
      if (v.stormT != null) {
        for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
          const d = OI.storm.floodedAt(r, c, v.stormT);
          if (d > 0) { ctx.fillStyle = `rgba(38, 104, 196, ${Math.min(0.75, 0.35 + d * 0.3)})`; ctx.fillRect(c * ts, r * ts, ts, ts); }
        }
      }
      // scoutable edges
      if (v.mode === 'expedition' && v.scoutable) {
        ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = COLORS.signal; ctx.lineWidth = 1.5;
        v.scoutable.forEach(k => { const [r, c] = k.split(',').map(Number); ctx.strokeRect(c * ts + 2, r * ts + 2, ts - 4, ts - 4); });
        ctx.restore();
      }
      if (v.mode === 'base' && v.selectable) {
        ctx.save(); ctx.strokeStyle = 'rgba(242,182,48,0.55)'; ctx.lineWidth = 1;
        v.selectable.forEach(k => { const [r, c] = k.split(',').map(Number); ctx.strokeRect(c * ts + 1.5, r * ts + 1.5, ts - 3, ts - 3); });
        ctx.restore();
      }
      // discoveries
      if (v.discovered && v.mode !== 'aerial') {
        const byTile = {};
        v.discovered.forEach(id => { const f = W.feature(id); if (!f || f.hidden) return; (byTile[W.key(f.r, f.c)] = byTile[W.key(f.r, f.c)] || []).push(f); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${Math.round(ts * 0.48)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        Object.values(byTile).forEach(list => {
          list.slice(0, 2).forEach((f, i) => {
            const off = list.length > 1 ? (i ? 0.17 : -0.17) * ts : 0;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath(); ctx.arc(cx(f.c) + off, cy(f.r) + off, ts * 0.3, 0, 7); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillText(f.icon, cx(f.c) + off, cy(f.r) + off + 1);
          });
        });
      }
      // first-impression pin
      if (v.pin) {
        const x = cx(v.pin.c), y = cy(v.pin.r);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(x, y, ts * 0.38, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, ts * 0.38, 0, 7); ctx.stroke();
      }
      // base flag
      if (v.base) {
        const x = cx(v.base.c) - ts * 0.12, y = cy(v.base.r) + ts * 0.35;
        ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - ts * 0.8); ctx.stroke();
        ctx.fillStyle = COLORS.signal; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - ts * 0.8); ctx.lineTo(x + ts * 0.5, y - ts * 0.62); ctx.lineTo(x, y - ts * 0.44); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // storm weather: darkening, rain, wind streaks
      if (v.stormT != null) {
        const k = OI.storm.curve.wind(v.stormT);
        ctx.fillStyle = `rgba(8, 18, 28, ${0.35 * k})`; ctx.fillRect(0, 0, w, h);
        const n = Math.round(120 * k), now = performance.now() / 1000;
        ctx.strokeStyle = `rgba(220,235,245,${0.25 + 0.35 * k})`; ctx.lineWidth = 1;
        for (let i = 0; i < n; i++) {
          const sx = ((i * 97.3 - now * 420 * (0.5 + k)) % (w + 60) + w + 60) % (w + 60) - 30;
          const sy = ((i * 53.7 + now * 260) % h + h) % h;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 10 - 18 * k, sy + 8); ctx.stroke();
        }
      }
      // hover and keyboard cursor
      const mark = (p, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.strokeRect(p.c * ts + 1, p.r * ts + 1, ts - 2, ts - 2); };
      if (hover) mark(hover, 'rgba(255,255,255,0.9)', 2);
      if (showCursor) mark(cursor, COLORS.signal, 3);
    }

    function tileFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const c = Math.floor((e.clientX - rect.left) / (rect.width / W.COLS));
      const r = Math.floor((e.clientY - rect.top) / (rect.height / W.ROWS));
      return W.inside(r, c) ? { r, c } : null;
    }
    canvas.addEventListener('mousemove', e => { const t = tileFromEvent(e); if (!t || !hover || t.r !== hover.r || t.c !== hover.c) { hover = t; draw(); opts.onHover && opts.onHover(t); } });
    canvas.addEventListener('mouseleave', () => { hover = null; draw(); opts.onHover && opts.onHover(null); });
    canvas.addEventListener('click', e => { const t = tileFromEvent(e); if (t) { cursor = t; opts.onPick && opts.onPick(t); } });
    canvas.addEventListener('focus', () => { showCursor = true; draw(); opts.onHover && opts.onHover(cursor); });
    canvas.addEventListener('blur', () => { showCursor = false; draw(); });
    canvas.addEventListener('keydown', e => {
      const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        const r = Math.min(W.ROWS - 2, Math.max(1, cursor.r + dr)), c = Math.min(W.COLS - 2, Math.max(1, cursor.c + dc));
        cursor = { r, c }; draw(); opts.onHover && opts.onHover(cursor);
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onPick && opts.onPick(cursor); }
    });

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);
    resize();

    return {
      draw,
      animate(on) {
        if (on && !raf) { const loop = () => { draw(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
        if (!on && raf) { cancelAnimationFrame(raf); raf = null; draw(); }
      },
      destroy() { ro.disconnect(); if (raf) cancelAnimationFrame(raf); }
    };
  };
})();
