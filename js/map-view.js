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

    function resize() {
      const w = Math.max(280, canvas.parentElement.clientWidth);
      ts = w / W.COLS;
      dpr = window.devicePixelRatio || 1;
      const h = ts * W.ROWS;
      for (const cv of [canvas, base]) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBase();
      draw();
    }

    const cx = c => (c + 0.5) * ts, cy = r => (r + 0.5) * ts;

    function smoothPath(g, pts) {
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1]; g.lineTo(last.x, last.y);
    }

    function drawBase() {
      const g = bctx, w = W.COLS * ts, h = W.ROWS * ts;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(OI.terrainImage(), 0, 0, w, h);
      // river: meanders from the volcano's foot to the south-west coast, widening downstream
      const pts = [{ x: cx(8.1), y: cy(4) + ts * 0.45 }];
      W.RIVER.forEach((p, i) => pts.push({ x: cx(p.c) + (W.hash(p.r, p.c) - 0.5) * ts * 0.45, y: cy(p.r) + (i % 2 ? 0.12 : -0.1) * ts }));
      pts.push({ x: cx(5.5), y: cy(10.75) }, { x: cx(5.2), y: cy(11.1) });
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(40, 70, 50, 0.5)'; g.lineWidth = ts * 0.2 + 3; smoothPath(g, pts); g.stroke();
      g.strokeStyle = '#3B8DB0'; g.lineWidth = ts * 0.2; smoothPath(g, pts); g.stroke();
      g.strokeStyle = 'rgba(160, 215, 230, 0.45)'; g.lineWidth = ts * 0.06; smoothPath(g, pts); g.stroke();
      // lake: an irregular shoreline
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 18) {
        const rr = ts * (0.42 + Math.sin(a * 3 + 1) * 0.06 + Math.cos(a * 5) * 0.04);
        const x = cx(9) + Math.cos(a) * rr * 1.15, y = cy(8) + Math.sin(a) * rr * 0.8;
        a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath();
      g.fillStyle = '#3F8FA8'; g.fill();
      g.strokeStyle = 'rgba(230, 210, 160, 0.7)'; g.lineWidth = Math.max(1, ts * 0.05); g.stroke();
      // survey grid
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
      for (let c = 1; c < W.COLS; c++) { g.beginPath(); g.moveTo(c * ts, ts); g.lineTo(c * ts, h - ts); g.stroke(); }
      for (let r = 1; r < W.ROWS; r++) { g.beginPath(); g.moveTo(ts, r * ts); g.lineTo(w - ts, r * ts); g.stroke(); }
      // grid labels in the margin
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.font = `600 ${Math.max(9, ts * 0.3)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let c = 1; c < W.COLS - 1; c++) g.fillText(W.LETTERS[c], cx(c), ts * 0.5);
      for (let r = 1; r < W.ROWS - 1; r++) g.fillText(String(r + 1), ts * 0.5, cy(r));
      // north arrow
      const nx = w - ts * 1.1, ny = ts * 1.6;
      g.fillStyle = 'rgba(255,255,255,0.88)';
      g.beginPath(); g.moveTo(nx, ny - ts * 0.55); g.lineTo(nx + ts * 0.22, ny + ts * 0.2); g.lineTo(nx, ny + ts * 0.05); g.lineTo(nx - ts * 0.22, ny + ts * 0.2); g.closePath(); g.fill();
      g.fillText('N', nx, ny + ts * 0.55);
      // scale bar: 2 squares = 500 m
      const sx = ts * 1.2, sy = h - ts * 0.45;
      g.fillRect(sx, sy - 2, ts, 4); g.strokeStyle = 'rgba(255,255,255,0.88)'; g.lineWidth = 1.5; g.strokeRect(sx + ts, sy - 2, ts, 4);
      g.textAlign = 'left';
      g.font = `500 ${Math.max(8, ts * 0.26)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillText('0', sx - 2, sy - ts * 0.28); g.fillText('500 m', sx + ts * 1.7, sy - ts * 0.28);
    }

    function draw() {
      const v = opts.getView();
      const w = W.COLS * ts, h = W.ROWS * ts;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      const fogOn = v.mode !== 'aerial' && v.mode !== 'overview';
      // clouds over the unknown
      if (fogOn) {
        for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
          if (!W.isLand(r, c) || v.scouted[W.key(r, c)]) continue;
          const x = cx(c) + (W.hash(r, c) - 0.5) * ts * 0.2, y = cy(r) + (W.hash(c, r) - 0.5) * ts * 0.2;
          const grad = ctx.createRadialGradient(x, y, ts * 0.1, x, y, ts * 0.7);
          grad.addColorStop(0, 'rgba(244, 247, 246, 0.72)'); grad.addColorStop(0.7, 'rgba(240, 244, 243, 0.62)'); grad.addColorStop(1, 'rgba(240, 244, 243, 0)');
          ctx.fillStyle = grad; ctx.fillRect(x - ts, y - ts, ts * 2, ts * 2);
        }
      }
      // storm flooding
      if (v.stormT != null) {
        for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
          const d = OI.storm.floodedAt(r, c, v.stormT);
          if (d > 0) {
            const al = Math.min(0.8, 0.4 + d * 0.3), grad = ctx.createRadialGradient(cx(c), cy(r), ts * 0.15, cx(c), cy(r), ts * 0.75);
            grad.addColorStop(0, `rgba(52, 110, 170, ${al})`); grad.addColorStop(0.65, `rgba(52, 110, 170, ${al * 0.85})`); grad.addColorStop(1, 'rgba(52, 110, 170, 0)');
            ctx.fillStyle = grad; ctx.fillRect(cx(c) - ts, cy(r) - ts, ts * 2, ts * 2);
          }
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
      // mission overlays: pipes, hoses and highlighted squares
      (v.lines || []).forEach(L => {
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(16,38,46,0.6)'; ctx.lineWidth = ts * 0.14 + 3;
        ctx.beginPath(); ctx.moveTo(cx(L.a.c), cy(L.a.r)); ctx.lineTo(cx(L.b.c), cy(L.b.r)); ctx.stroke();
        ctx.strokeStyle = L.color || COLORS.signal; ctx.lineWidth = ts * 0.14; if (L.dash) ctx.setLineDash([ts * 0.25, ts * 0.18]);
        ctx.beginPath(); ctx.moveTo(cx(L.a.c), cy(L.a.r)); ctx.lineTo(cx(L.b.c), cy(L.b.r)); ctx.stroke();
        ctx.restore();
      });
      (v.rings || []).forEach(R => {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx(R.c), cy(R.r), ts * 0.46, 0, 7); ctx.stroke();
        ctx.strokeStyle = R.color || COLORS.signal; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx(R.c), cy(R.r), ts * 0.46, 0, 7); ctx.stroke();
      });
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
    // Pointer events work the same for mouse, finger and pen. A tap is a press and release
    // that stays within a few pixels; a swipe is left alone so the page can still scroll.
    const pick = t => { if (t) { cursor = t; opts.onPick && opts.onPick(t); } };
    if (window.PointerEvent) {
      let down = null;
      canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      canvas.addEventListener('pointercancel', () => { down = null; });
      canvas.addEventListener('pointerup', e => {
        if (!down || down.id !== e.pointerId) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        down = null;
        if (moved < 12) pick(tileFromEvent(e));
      });
      canvas.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return; // no hover on touch screens
        const t = tileFromEvent(e);
        if (!t || !hover || t.r !== hover.r || t.c !== hover.c) { hover = t; draw(); opts.onHover && opts.onHover(t); }
      });
      canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = null; draw(); opts.onHover && opts.onHover(null); } });
    } else {
      canvas.addEventListener('click', e => pick(tileFromEvent(e)));
    }
    canvas.addEventListener('focus', () => { let kb = true; try { kb = canvas.matches(':focus-visible'); } catch (err) { /* older browsers */ } if (!kb) return; showCursor = true; draw(); opts.onHover && opts.onHover(cursor); });
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
