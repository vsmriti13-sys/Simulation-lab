/* Mission 3 — Build to Survive.
 * Briefing → Design and predict (marshmallow-and-stick builder) → Shake table + wind tunnel → Debrief
 */
(function () {
  const W = OI.world, B = OI.build, esc = OI.ui.esc, pips = OI.ui.pips;
  const PHASES = [{ id: 'briefing', label: 'Briefing' }, { id: 'design', label: 'Design and predict' }, { id: 'test', label: 'Shake and wind tests' }, { id: 'debrief', label: 'Debrief' }];
  const MAX_STICKS = 30;
  const NEEDS = { quake: 'Earthquake safety', storm: 'Storm safety', brief: 'Meets the brief', materials: 'Materials used', environment: 'Environment' };
  const PILLARS = [{ name: 'Society', needs: ['quake', 'storm', 'brief'] }, { name: 'Economy', needs: ['materials'] }, { name: 'Environment', needs: ['environment'] }];
  const COL = { bamboo: '#C7A341', hardwood: '#7A4A2A', joint: '#FFF7F2', jointEdge: '#E2B9B0', thatch: '#C9A35A', tiles: '#B4512F', sky1: '#CFE6EE', sky2: '#EEF5F2', good: '#2C7A4B', warn: '#D98E16', bad: '#C2412D', ink: '#10262E', grid: 'rgba(16,38,46,0.28)', sel: '#F2B630' };
  const GROUND_COL = { sand: '#E3CF9B', soil: '#7B5B3E', rock: '#7D7468' };

  let root, view = null, timer = null, selected = null;
  const st = () => OI.store.get();
  const bx = () => st().build;
  const save = () => OI.store.save();
  function go(phase) { bx().phase = phase; save(); render(); window.scrollTo({ top: 0 }); }
  function stop() { if (timer) { cancelAnimationFrame(timer); timer = null; } }

  function context() {
    const log = st().log.exploration;
    const base = log ? log.base : { r: 8, c: 11, grid: W.grid(8, 11), terrain: W.terrain(8, 11).name };
    const ch = W.code(base.r, base.c);
    const ground = 'bms'.includes(ch) ? 'sand' : 'hkMV'.includes(ch) ? 'rock' : 'soil';
    const discovered = log ? log.discovered : W.FEATURES.map(f => f.id);
    return { fromMission1: !!log, base, ground, baseWind: OI.storm.assess(base.r, base.c).wind,
      bamboo: discovered.includes('bamboo'), hardwood: discovered.includes('hardwood'), basalt: discovered.includes('basalt'), vents: discovered.includes('vents') };
  }
  function header() {
    const idx = PHASES.findIndex(p => p.id === bx().phase);
    return `<header class="mission-head"><div><p class="eyebrow">Mission 3 · Operation Island 2040</p><h1 class="display">Build to Survive</h1></div>
      <ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol></header>`;
  }

  // ---------- side-view canvas ----------
  function createView(canvas, getState, onTap) {
    const ctx2 = canvas.getContext('2d');
    let u = 60, Wc = 600, Hc = 480, groundH = 50, ox = 0, hover = null;
    const X = x => ox + (x + 0.75) * u, Y = y => Hc - groundH - y * u;
    function resize() {
      Wc = Math.max(280, canvas.parentElement.clientWidth);
      // fit the whole site on screen: never taller than about 65% of the window
      u = Math.min(Wc / (B.COLS + 0.5), Math.max(260, window.innerHeight * 0.65) / (0.75 + (B.LEVELS - 1) + 1.4));
      ox = (Wc - u * (B.COLS + 0.5)) / 2; groundH = u * 0.75; Hc = groundH + (B.LEVELS - 1) * u + u * 1.4;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(Wc * dpr); canvas.height = Math.round(Hc * dpr); canvas.style.width = Wc + 'px'; canvas.style.height = Hc + 'px';
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    function strainColor(base, ratio) {
      if (ratio < 0.45) return base;
      return ratio < 0.75 ? COL.warn : COL.bad;
    }
    function roofShape(top, lift) {
      if (top.length < 1) return null;
      const xs = top.map(p => p.x), ys = top.map(p => p.y);
      const l = Math.min(...xs), r = Math.max(...xs), y = Math.max(...ys);
      const overhang = 0.3, peak = Math.max(0.5, (r - l) * 0.35);
      const dy = lift ? lift.y : 0, dx = lift ? lift.x : 0, rot = lift ? lift.r : 0;
      return { l: l - overhang + dx, r: r + overhang + dx, y: y + 0.05 + dy, peak, rot };
    }
    function drawRoof(shape, kind) {
      if (!shape) return;
      const cxp = X((shape.l + shape.r) / 2), cyp = Y(shape.y);
      ctx2.save(); ctx2.translate(cxp, cyp); ctx2.rotate(shape.rot);
      const hw = (shape.r - shape.l) / 2 * u, ph = shape.peak * u;
      ctx2.beginPath(); ctx2.moveTo(-hw, 0); ctx2.lineTo(0, -ph); ctx2.lineTo(hw, 0); ctx2.closePath();
      ctx2.fillStyle = COL[kind]; ctx2.fill(); ctx2.strokeStyle = 'rgba(16,38,46,0.6)'; ctx2.lineWidth = 1.5; ctx2.stroke();
      ctx2.strokeStyle = kind === 'tiles' ? 'rgba(80,20,10,0.45)' : 'rgba(110,80,30,0.5)'; ctx2.lineWidth = 1;
      for (let i = 1; i < 6; i++) { const f = i / 6; ctx2.beginPath(); ctx2.moveTo(-hw * (1 - f), -ph * f); ctx2.lineTo(hw * (1 - f), -ph * f); ctx2.stroke(); }
      ctx2.restore();
    }
    function draw() {
      const s = getState();
      const sky = ctx2.createLinearGradient(0, 0, 0, Hc);
      const stormy = s.sim && s.sim.env.test === 'wind' && s.sim.t > 1;
      sky.addColorStop(0, stormy ? '#7F98A3' : COL.sky1); sky.addColorStop(1, stormy ? '#B9C7C9' : COL.sky2);
      ctx2.fillStyle = sky; ctx2.fillRect(0, 0, Wc, Hc);
      const gx = s.sim ? s.sim.groundX * u : 0;
      // ground
      ctx2.fillStyle = GROUND_COL[s.ground]; ctx2.fillRect(-20 + gx, Hc - groundH, Wc + 40, groundH);
      ctx2.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 40; i++) { const x = ((i * 53.3) % Wc) + gx, y = Hc - groundH + 6 + ((i * 17.9) % (groundH - 10)); ctx2.fillRect(x, y, 3, 2); }
      ctx2.fillStyle = 'rgba(16,38,46,0.75)'; ctx2.font = `600 ${Math.max(10, u * 0.2)}px "IBM Plex Mono", monospace`; ctx2.textAlign = 'left';
      ctx2.fillText(`${B.GROUND[s.ground].name.toUpperCase()} GROUND`, 10, Hc - 10);
      // height scale
      ctx2.textAlign = 'right'; ctx2.fillStyle = 'rgba(16,38,46,0.55)';
      for (let y = 1; y < B.LEVELS; y++) ctx2.fillText(`${y} m`, Wc - 6, Y(y) + 4);
      // building grid
      if (!s.sim) {
        for (let y = 0; y < B.LEVELS; y++) for (let x = 0; x < B.COLS; x++) {
          ctx2.fillStyle = COL.grid; ctx2.beginPath(); ctx2.arc(X(x), Y(y), Math.max(2, u * 0.05), 0, 7); ctx2.fill();
        }
      }
      // structure
      const design = s.design;
      let pts, sticks;
      if (s.sim) {
        pts = {}; s.sim.P.forEach(p => { pts[p.k] = p; });
        sticks = s.sim.S;
      } else {
        pts = {}; design.sticks.forEach(k => k.split('|').forEach(n => { const [x, y] = n.split(',').map(Number); pts[n] = { x, y, roof: false }; }));
        const top = Object.values(pts).length ? Math.max(...Object.values(pts).map(p => p.y)) : 0;
        Object.values(pts).forEach(p => { p.roof = top > 0 && p.y === top; });
        sticks = design.sticks.map(k => ({ key: k, broken: false, strain: 0 }));
      }
      const roofNodes = Object.values(pts).filter(p => p.roof);
      let lift = null;
      if (s.sim && s.sim.roofLost) { const t = s.sim.t - s.sim.roofLost; lift = { x: -t * 2.2, y: t * 1.6, r: -t * 0.8 }; }
      const shape = roofNodes.length >= 2 ? roofShape(roofNodes, lift) : null;
      sticks.forEach(stk => {
        if (stk.broken) return;
        const [a, b] = stk.key.split('|');
        const pa = pts[a], pb = pts[b];
        const ratio = s.sim ? Math.abs(stk.strain) / s.sim.mat.breakStrain : 0;
        ctx2.strokeStyle = 'rgba(16,38,46,0.35)'; ctx2.lineWidth = Math.max(3, u * 0.09) + 2; ctx2.lineCap = 'round';
        ctx2.beginPath(); ctx2.moveTo(X(pa.x), Y(pa.y)); ctx2.lineTo(X(pb.x), Y(pb.y)); ctx2.stroke();
        ctx2.strokeStyle = strainColor(COL[design.material], ratio); ctx2.lineWidth = Math.max(3, u * 0.09);
        ctx2.beginPath(); ctx2.moveTo(X(pa.x), Y(pa.y)); ctx2.lineTo(X(pb.x), Y(pb.y)); ctx2.stroke();
        if (design.material === 'bamboo') { // bamboo rings
          ctx2.fillStyle = 'rgba(90,70,20,0.55)';
          for (const f of [0.33, 0.66]) { const x = X(pa.x + (pb.x - pa.x) * f), y = Y(pa.y + (pb.y - pa.y) * f); ctx2.beginPath(); ctx2.arc(x, y, Math.max(1.5, u * 0.035), 0, 7); ctx2.fill(); }
        }
      });
      if (shape && !lift) drawRoof(shape, design.roof);
      Object.entries(pts).forEach(([k, p]) => {
        ctx2.fillStyle = COL.joint; ctx2.strokeStyle = COL.jointEdge; ctx2.lineWidth = 2;
        ctx2.beginPath(); ctx2.arc(X(p.x), Y(p.y), Math.max(4, u * 0.1), 0, 7); ctx2.fill(); ctx2.stroke();
        if (selected === k && !s.sim) { ctx2.strokeStyle = COL.sel; ctx2.lineWidth = 3; ctx2.beginPath(); ctx2.arc(X(p.x), Y(p.y), Math.max(8, u * 0.18), 0, 7); ctx2.stroke(); }
      });
      if (shape && lift) drawRoof(shape, design.roof);
      // possible next sticks from the selected joint
      if (!s.sim && selected) {
        const [sx, sy] = selected.split(',').map(Number);
        ctx2.strokeStyle = 'rgba(242,182,48,0.8)'; ctx2.setLineDash([4, 4]); ctx2.lineWidth = 2;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const nx = sx + dx, ny = sy + dy;
          if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= B.COLS || ny >= B.LEVELS) continue;
          ctx2.beginPath(); ctx2.moveTo(X(sx), Y(sy)); ctx2.lineTo(X(nx), Y(ny)); ctx2.stroke();
        }
        ctx2.setLineDash([]);
      }
      if (!s.sim && hover) { ctx2.strokeStyle = COL.ink; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.arc(X(hover.x), Y(hover.y), Math.max(7, u * 0.15), 0, 7); ctx2.stroke(); }
      // wind streaks from the east
      if (stormy) {
        const now = performance.now() / 1000, n = 50;
        ctx2.strokeStyle = 'rgba(255,255,255,0.7)'; ctx2.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
          const x = (((i * 97.1) - now * 520) % (Wc + 80) + Wc + 80) % (Wc + 80) - 40, y = (i * 37.7) % (Hc - groundH - 10);
          ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + 26, y); ctx2.stroke();
        }
        ctx2.fillStyle = 'rgba(16,38,46,0.8)'; ctx2.textAlign = 'right'; ctx2.fillText('← WIND FROM THE EAST', Wc - 10, 20);
      }
      if (s.sim && s.sim.env.test === 'quake' && Math.abs(s.sim.groundX) > 0.001) {
        ctx2.fillStyle = 'rgba(16,38,46,0.8)'; ctx2.textAlign = 'left'; ctx2.fillText('↔ GROUND SHAKING', 10, 20);
      }
    }
    function nodeFromEvent(e) {
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const x = Math.round((px - ox) / u - 0.75), y = Math.round((Hc - groundH - py) / u);
      if (x < 0 || y < 0 || x >= B.COLS || y >= B.LEVELS) return null;
      if (Math.hypot(X(x) - px, Y(y) - py) > u * 0.45) return null;
      return { x, y };
    }
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) { const n = nodeFromEvent(e); if (n) onTap(n); } down = null; });
    canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; hover = nodeFromEvent(e); draw(); });
    canvas.addEventListener('pointerleave', () => { hover = null; draw(); });
    const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement); resize();
    return { draw, destroy() { ro.disconnect(); } };
  }

  // ---------- briefing ----------
  function renderBriefing() {
    const c = context(), s = bx();
    root.innerHTML = header() + `<div class="briefing">
      <article class="letter">
        <p class="letter-from mono">FROM: GHA Engineering Desk<br>TO: Expedition Team<br>RE: Shelters for the settlers</p>
        <h2>Build to survive</h2>
        <p>The settlers need family shelters. This island has two enemies: <strong>storms</strong> from the east, and <strong>earthquakes</strong>${c.vents ? ', because, as your Geologist discovered, the volcano is active' : ' from the volcano'}.</p>
        <p><strong>The brief:</strong> design a shelter frame at least <strong>3 m tall</strong> with a roof at least <strong>2 m wide</strong>, standing on at least two joints on the ground. You have <strong>${MAX_STICKS} sticks</strong>. Joints are like marshmallows: they hold sticks together but let them turn.</p>
        <p>The <strong>Engineer</strong> leads. The <strong>Geologist</strong> advises on the ground and earthquakes, and the <strong>Meteorologist</strong> on the wind.</p>
      </article>
      <section class="panel">
        <h2>Your building site</h2>
        ${c.fromMission1 ? '' : `<p class="note">Your team has not finished Mission 1, so the GHA has chosen the site at Grid ${c.base.grid}.</p>`}
        <dl class="measures">
          <div><dt>Base</dt><dd class="mono">Grid ${c.base.grid} · ${esc(c.base.terrain)}</dd></div>
          <div><dt>Ground</dt><dd>${B.GROUND[c.ground].name}: shakes ${B.GROUND[c.ground].amp}× in an earthquake</dd></div>
          <div><dt>Storm wind at this site</dt><dd class="mono">${c.baseWind} km/h</dd></div>
        </dl>
        <h3>Materials</h3>
        <ul class="near">
          <li>🎋 <strong>Bamboo</strong>: ${B.MATERIALS.bamboo.note} ${c.bamboo ? 'Your team found a bamboo grove.' : 'Not found on the island: the GHA will ship it.'}</li>
          <li>🌳 <strong>Hardwood</strong>: ${B.MATERIALS.hardwood.note} ${c.hardwood ? 'Your team found hardwood trees.' : 'Not found yet: it must be cut from the forest.'}</li>
        </ul>
        <h3>Hands-on link</h3>
        <p>After testing here, build your best design with sticks (or spaghetti) and marshmallows, test it on a shake tray, and design the full shelter in Tinkercad.</p>
        <div class="actions"><button class="btn primary" id="next">Start designing</button></div>
      </section></div>`;
    root.querySelector('#next').addEventListener('click', () => go('design'));
  }

  // ---------- design ----------
  function designPanel() {
    const s = bx(), d = s.design, a = B.analyse(d), p = s.prediction || {}, c = context();
    const check = (ok, text) => `<li class="${ok ? 'yes' : ''}">${ok ? '✔' : '○'} ${text}</li>`;
    return `
      <div class="load ${a.sticks > MAX_STICKS ? 'over' : ''}"><span class="mono big">${a.sticks} / ${MAX_STICKS} sticks</span>
        <div class="meter"><i style="width:${Math.min(100, a.sticks / MAX_STICKS * 100)}%"></i></div>
        <span class="muted">${a.short} short (1 m) · ${a.long} long (1.4 m) · ${a.nodes} joints · ${a.triangles} triangles</span></div>
      <div class="needs-check"><ul>
        ${check(a.height >= 3, `Height ${a.height} m (need 3 m)`)}${check(a.roofWidth >= 2, `Roof ${a.roofWidth} m wide (need 2 m)`)}${check(a.grounded >= 2, `${a.grounded} joints on the ground (need 2)`)}
      </ul></div>
      <p class="muted build-help">Tap a joint, then tap a joint next to it to add a stick. Keep tapping to carry on from there. Tap an existing stick's two joints again to remove it.</p>
      <div class="actions">
        ${Object.entries(B.TEMPLATES).map(([k, t]) => `<button class="btn small ghost" data-template="${k}">${t.name}</button>`).join('')}
      </div>
      <div class="actions"><button class="btn small ghost" id="undo" ${d.sticks.length ? '' : 'disabled'}>Undo</button><button class="btn small ghost" id="clear" ${d.sticks.length ? '' : 'disabled'}>Clear</button></div>
      <fieldset class="group"><legend>Materials</legend>
        <div class="seg">${Object.entries(B.MATERIALS).map(([k, m]) => `<label class="${d.material === k ? 'on' : ''}"><input type="radio" name="material" value="${k}" ${d.material === k ? 'checked' : ''}> ${m.name}</label>`).join('')}</div>
        <small class="muted">${B.MATERIALS[d.material].note}</small>
        <div class="seg">${Object.entries(B.ROOFS).map(([k, r]) => `<label class="${d.roof === k ? 'on' : ''}"><input type="radio" name="roof" value="${k}" ${d.roof === k ? 'checked' : ''}> ${r.name}</label>`).join('')}</div>
        <small class="muted">${B.ROOFS[d.roof].note}</small>
        <label class="toggle"><input type="checkbox" id="straps" ${d.straps ? 'checked' : ''}><span><strong>Tie the roof down with rope straps</strong><small>Straps hold the roof to the frame. Uses one extra stick's worth of material.</small></span></label>
      </fieldset>
      <fieldset class="group"><legend>Tests</legend>
        <label class="field"><span>Earthquake</span><select id="mag">${B.QUAKES.map(q => `<option value="${q.id}" ${s.settings.magnitude === q.id ? 'selected' : ''}>${q.label} · ${q.name}</option>`).join('')}</select></label>
        <label class="field"><span>Storm wind</span><select id="wind">${[[c.baseWind, `${c.baseWind} km/h · the storm at your base`], [100, '100 km/h · strong storm'], [130, '130 km/h · GHA safety standard']].map(([v, l]) => `<option value="${v}" ${s.settings.wind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </fieldset>
      <form id="predict" class="predict">
        <h3>Predict before you test</h3>
        <fieldset><legend>In the earthquake, the shelter will…</legend>${[['stand', 'stand'], ['damage', 'be damaged'], ['collapse', 'collapse']].map(([v, l]) => `<label><input type="radio" name="pq" value="${v}" ${p.quake === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <fieldset><legend>In the storm, the shelter will…</legend>${[['stand', 'stand'], ['damage', 'be damaged'], ['collapse', 'collapse']].map(([v, l]) => `<label><input type="radio" name="pw" value="${v}" ${p.wind === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Our reason</span><textarea id="preason" rows="2" placeholder="We added triangles because…">${esc(p.reason || '')}</textarea></label>
        <button class="btn primary" type="submit" ${a.sticks && a.sticks <= MAX_STICKS ? '' : 'disabled'}>Run both tests</button>
      </form>`;
  }
  function renderDesign() {
    const c = context();
    root.innerHTML = header() + `<div class="workspace build-space"><div class="map-col"><div class="build-frame"><canvas id="build" aria-label="Side view of the building site. Tap joints to add sticks."></canvas></div>
      <p class="readout">Side view · 1 square = 1 m · joints are marshmallows</p></div><aside class="panel" id="panel">${designPanel()}</aside></div>`;
    if (view) view.destroy();
    view = createView(root.querySelector('#build'), () => ({ design: bx().design, ground: c.ground, sim: null }), tap);
    bindDesign();
  }
  function refresh() {
    const y = window.scrollY;
    root.querySelector('#panel').innerHTML = designPanel(); bindDesign(); view.draw(); window.scrollTo({ top: y });
  }
  function tap(n) {
    const d = bx().design, k = B.nkey(n.x, n.y);
    if (!selected || selected === k) { selected = selected === k ? null : k; view.draw(); return; }
    if (!B.adjacent(selected, k)) { selected = k; view.draw(); return; }
    const sk = B.skey(selected, k), i = d.sticks.indexOf(sk);
    if (i >= 0) d.sticks.splice(i, 1);
    else if (d.sticks.length < MAX_STICKS) d.sticks.push(sk);
    selected = k; save(); refresh();
  }
  function bindDesign() {
    const s = bx(), d = s.design;
    root.querySelectorAll('[data-template]').forEach(b => b.addEventListener('click', () => { d.sticks = B.TEMPLATES[b.dataset.template].sticks(); selected = null; save(); refresh(); }));
    root.querySelector('#undo').addEventListener('click', () => { d.sticks.pop(); selected = null; save(); refresh(); });
    root.querySelector('#clear').addEventListener('click', () => { d.sticks = []; selected = null; save(); refresh(); });
    root.querySelectorAll('input[name=material]').forEach(r => r.addEventListener('change', () => { d.material = r.value; save(); refresh(); }));
    root.querySelectorAll('input[name=roof]').forEach(r => r.addEventListener('change', () => { d.roof = r.value; save(); refresh(); }));
    root.querySelector('#straps').addEventListener('change', e => { d.straps = e.target.checked; save(); refresh(); });
    root.querySelector('#mag').addEventListener('change', e => { s.settings.magnitude = Number(e.target.value); save(); });
    root.querySelector('#wind').addEventListener('change', e => { s.settings.wind = Number(e.target.value); save(); });
    const keep = () => { const fd = new FormData(root.querySelector('#predict')); s.prediction = { quake: fd.get('pq'), wind: fd.get('pw'), reason: root.querySelector('#preason').value.trim() }; save(); };
    root.querySelectorAll('#predict input, #predict textarea').forEach(el => el.addEventListener('change', keep));
    root.querySelector('#predict').addEventListener('submit', e => { e.preventDefault(); keep(); s.pendingTest = true; save(); selected = null; go('test'); });
  }

  // ---------- tests ----------
  function outcome(r) { return r.collapsed ? 'collapse' : r.damaged ? 'damage' : 'stand'; }
  function safetyScore(r) { return r.collapsed ? 0 : r.roofLost ? 1 : r.damaged ? (r.broken <= 2 ? 2 : 1) : 3; }
  function score(d, rq, rw) {
    const a = B.analyse(d);
    const used = a.sticks + (d.straps ? 1 : 0);
    const scores = {
      quake: safetyScore(rq), storm: safetyScore(rw),
      brief: a.meetsBrief ? 3 : (a.height >= 3 || a.roofWidth >= 2) ? 1 : 0,
      materials: used <= 18 ? 3 : used <= 24 ? 2 : used <= 31 ? 1 : 0,
      environment: B.MATERIALS[d.material].regrows ? 3 : 1
    };
    // a shelter that falls down in both tests doesn't do its job, however cheap it was
    const wrecked = rq.collapsed && rw.collapsed;
    if (wrecked) { scores.brief = Math.min(scores.brief, 1); scores.materials = 0; }
    return { scores, total: Object.values(scores).reduce((x, y) => x + y, 0), a, used, wrecked };
  }
  function renderTest() {
    const s = bx(), d = s.design, c = context();
    const envs = [
      { test: 'quake', magnitude: s.settings.magnitude, ground: c.ground, title: `Shake table: ${B.QUAKES.find(q => q.id === s.settings.magnitude).label}` },
      { test: 'wind', windKmh: s.settings.wind, ground: c.ground, title: `Wind tunnel: ${s.settings.wind} km/h` }
    ];
    // results are worked out in advance, so they don't depend on the screen's speed
    const results = envs.map(env => B.run(d, env, 10));
    let phase = 0, sim = B.create(d, envs[0]);
    root.innerHTML = header() + `<div class="workspace build-space"><div class="map-col"><div class="build-frame"><canvas id="build" aria-label="Side view of the shelter being tested"></canvas></div><p class="readout" id="test-title">${esc(envs[0].title)}</p></div>
      <aside class="panel" id="panel"><h2>Testing</h2><div id="live"></div><div class="actions"><button class="btn ghost" id="skip">Skip to the results</button></div></aside></div>`;
    if (view) view.destroy();
    view = createView(root.querySelector('#build'), () => ({ design: d, ground: c.ground, sim }), () => {});
    const live = () => {
      const stt = B.status(sim);
      root.querySelector('#live').innerHTML = `<div class="gauges">
        <div><span>Test</span><b>${phase === 0 ? 'Earthquake' : 'Storm'}</b></div>
        <div><span>Time</span><b class="mono">${Math.min(10, sim.t).toFixed(1)} s</b></div>
        <div><span>${phase === 0 ? 'Ground movement' : 'Wind'}</span><b class="mono">${phase === 0 ? Math.round(Math.abs(sim.groundX) * 100) + ' cm' : envs[1].windKmh + ' km/h'}</b></div>
        <div><span>Roof sway</span><b class="mono">${Math.round(stt.sway * 100)} cm</b></div>
        <div class="${stt.broken ? 'bad' : ''}"><span>Sticks broken</span><b class="mono">${stt.broken}</b></div>
        <div class="${stt.collapsed || stt.roofLost ? 'bad' : ''}"><span>Status</span><b>${stt.collapsed ? 'Collapsed' : stt.roofLost ? 'Roof blown off' : 'Standing'}</b></div></div>`;
    };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => { stop(); sim = results[1].sim; view.draw(); showResults(results); };
    root.querySelector('#skip').addEventListener('click', finish);
    if (reduce) return finish();
    let last = 0;
    const loop = now => {
      if (now - last > 90) { live(); last = now; }
      B.step(sim); view.draw();
      if (sim.t >= 10) {
        if (phase === 0) { phase = 1; sim = B.create(d, envs[1]); root.querySelector('#test-title').textContent = envs[1].title; }
        else return finish();
      }
      timer = requestAnimationFrame(loop);
    };
    live();
    timer = requestAnimationFrame(loop);
  }

  function explain(d, rq, rw, a) {
    const c = context(), q = B.QUAKES.find(x => x.id === bx().settings.magnitude), lines = [];
    lines.push(`Your frame has ${a.triangles} triangle${a.triangles === 1 ? '' : 's'}. Joints let sticks turn, so a square can fold into a diamond. A triangle cannot change shape unless a stick breaks.`);
    lines.push(`Earthquake: the ${B.GROUND[c.ground].name.toLowerCase()} ground moved up to ${Math.round(q.amp * B.GROUND[c.ground].amp * 100)} cm, ${q.freq} times a second (${Math.round(q.amp * 100)} cm × ${B.GROUND[c.ground].amp} for ${B.GROUND[c.ground].name.toLowerCase()}). The roof swayed up to ${Math.round(rq.sway * 100)} cm${rq.broken ? ` and ${rq.broken} stick${rq.broken > 1 ? 's' : ''} broke` : ''}.`);
    if (d.roof === 'tiles') lines.push('Heavy clay tiles add weight at the top. In an earthquake that weight swings back and forth and strains the frame.');
    lines.push(`Storm: ${rw.sim.env.windKmh} km/h from the east. Wind force grows with speed squared, so 130 km/h pushes about 1.7 times harder than 100 km/h.${rw.broken ? ` ${rw.broken} stick${rw.broken > 1 ? 's' : ''} broke.` : ''}`);
    if (rw.roofLost) lines.push(`Wind flowing over a roof lifts it, like an aeroplane wing. Untied ${d.roof === 'thatch' ? 'thatch lifts off above 90 km/h' : 'tiles lift off above 140 km/h'}. Rope straps would have held it.`);
    else if (d.straps) lines.push('The rope straps held the roof down against the lifting wind.');
    if (!a.meetsBrief) lines.push(`The brief needs a frame 3 m tall with a 2 m wide roof. Yours is ${a.height} m tall with a ${a.roofWidth} m roof.`);
    return lines;
  }
  function showResults(results) {
    const s = bx(), d = s.design, [rq, rw] = results, sc = score(d, rq, rw), p = s.prediction || {};
    if (s.pendingTest) {
      s.attempts.push({ total: sc.total, quake: outcome(rq), storm: outcome(rw), sticks: sc.a.sticks, material: d.material, roof: d.roof, straps: !!d.straps, design: d.sticks.slice() });
      s.pendingTest = false; save();
    }
    const lbl = { stand: 'stands', damage: 'damaged', collapse: 'collapses' };
    const mark = (pr, res) => !pr ? '<span class="verdict">Not predicted</span>' : pr === res ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>Test report</h2>
      <div class="compare">
        <div><h3>Earthquake</h3><p>You predicted: <strong>${lbl[p.quake] || '—'}</strong>.<br>Result: <strong>${lbl[outcome(rq)]}</strong>${rq.broken ? `, ${rq.broken} broken` : ''}.</p>${mark(p.quake, outcome(rq))}</div>
        <div><h3>Storm</h3><p>You predicted: <strong>${lbl[p.wind] || '—'}</strong>.<br>Result: <strong>${rw.roofLost && !rw.collapsed ? 'roof blown off' : lbl[outcome(rw)]}</strong>${rw.broken ? `, ${rw.broken} broken` : ''}.</p>${mark(p.wind, outcome(rw))}</div>
      </div>
      <div class="actions"><button class="btn small ghost" data-replay="0">Replay earthquake</button><button class="btn small ghost" data-replay="1">Replay storm</button></div>
      <h3>The science</h3>
      <ul class="science">${explain(d, rq, rw, sc.a).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="score"><div class="score-total"><span class="mono big">${sc.total}<small>/15</small></span><span>Shelter score</span></div>
        ${PILLARS.map(P => `<div class="pillar"><p class="label">${P.name} pillar</p><ul class="needs">${P.needs.map(k => `<li><div class="need-row"><strong>${NEEDS[k]}</strong>${pips(sc.scores[k])}</div><p>${esc(noteFor(k, d, rq, rw, sc))}</p></li>`).join('')}</ul></div>`).join('')}</div>
      <h3>Talk about it</h3>
      <ul class="prompts"><li>What happened there? Which stick failed first, and why there?</li><li>What do you think will happen if we add a triangle, or lower the roof?</li><li>What have you seen other teams trying?</li></ul>
      ${s.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Improve the design</button><button class="btn primary" id="debrief">Debrief</button></div>`;
    root.querySelectorAll('[data-replay]').forEach(b => b.addEventListener('click', () => replay(results[Number(b.dataset.replay)].sim.env)));
    root.querySelector('#retry').addEventListener('click', () => go('design'));
    root.querySelector('#debrief').addEventListener('click', () => go('debrief'));
  }
  function replay(env) {
    stop();
    const d = bx().design, c = context();
    let sim = B.create(d, env);
    if (view) view.destroy();
    view = createView(root.querySelector('#build'), () => ({ design: d, ground: c.ground, sim }), () => {});
    root.querySelector('#test-title').textContent = env.test === 'quake' ? 'Replay: shake table' : 'Replay: wind tunnel';
    const loop = () => { B.step(sim); view.draw(); if (sim.t < 10) timer = requestAnimationFrame(loop); };
    timer = requestAnimationFrame(loop);
  }
  function noteFor(k, d, rq, rw, sc) {
    if (k === 'quake') return rq.collapsed ? 'Collapsed in the earthquake.' : rq.damaged ? `Standing but damaged (${rq.broken} sticks broken).` : 'Undamaged.';
    if (k === 'storm') return rw.collapsed ? 'Collapsed in the storm.' : rw.roofLost ? 'The frame stood, but the roof blew away.' : rw.damaged ? `Standing but damaged (${rw.broken} sticks broken).` : 'Undamaged.';
    if (k === 'brief' && sc.wrecked) return 'The frame matched the brief on paper, but it fell down in both tests.';
    if (k === 'materials' && sc.wrecked) return `${sc.used} sticks, all wasted when the shelter collapsed.`;
    if (k === 'brief') return sc.a.meetsBrief ? `${sc.a.height} m tall, ${sc.a.roofWidth} m roof: meets the brief.` : `${sc.a.height} m tall, ${sc.a.roofWidth} m roof: does not meet the brief.`;
    if (k === 'materials') return `${sc.used} sticks${d.straps ? ' (including straps)' : ''}. Fewer sticks means less to cut, carry and pay for.`;
    return B.MATERIALS[d.material].regrows ? 'Bamboo regrows in a few years.' : 'Hardwood trees take decades to regrow.';
  }
  function attemptsTable() {
    const a = bx().attempts, best = Math.max(...a.map(x => x.total)), lbl = { stand: 'Stood', damage: 'Damaged', collapse: 'Collapsed' };
    return `<div class="table-wrap"><table class="attempts"><caption>Designs tested</caption><thead><tr><th>#</th><th>Sticks</th><th>Quake</th><th>Storm</th><th>Score</th></tr></thead>
      <tbody>${a.map((x, i) => `<tr class="${x.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${x.sticks}</td><td>${lbl[x.quake]}</td><td>${lbl[x.storm]}</td><td class="mono">${x.total}/15</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- debrief ----------
  const JOURNAL = [
    'Why do triangles make a structure stronger than squares?',
    'What failed first in your design, and how did you fix it?',
    'How did the ground at your base (sand, soil or rock) affect your design?',
    'Was the light roof or the heavy roof better? Did it depend on the test?',
    'How did your real marshmallow tower compare with the simulation?',
    'What would you change before building a real shelter for a family?'
  ];
  const CHOICE = [['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2], ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]];
  function blueprint(d) {
    const a = B.analyse(d);
    return `${a.short} short sticks (1 m), ${a.long} long sticks (1.4 m), ${a.nodes} joints, ${a.triangles} triangles, ${a.height} m tall, ${a.roofWidth} m roof, ${B.MATERIALS[d.material].name.toLowerCase()} frame, ${B.ROOFS[d.roof].name.toLowerCase()} roof${d.straps ? ' tied down with straps' : ''}`;
  }
  function reportText() {
    const s = bx(), last = s.attempts[s.attempts.length - 1];
    const lines = ['OPERATION ISLAND 2040 · MISSION 3 REPORT: BUILD TO SURVIVE', `Team: ${st().team.name || 'Unnamed team'}`, `Base: Grid ${context().base.grid} (${B.GROUND[context().ground].name.toLowerCase()} ground)`, '',
      `Final design: ${blueprint(s.design)}`, last ? `Tests: earthquake ${last.quake}, storm ${last.storm}, score ${last.total}/15 (${s.attempts.length} design${s.attempts.length > 1 ? 's' : ''} tested)` : '', '',
      'MARSHMALLOW TOWER (HANDS-ON)', `Height: ${s.debrief.mHeight || '—'} cm · sticks: ${s.debrief.mSticks || '—'} · marshmallows: ${s.debrief.mJoints || '—'} · survived the shake tray: ${s.debrief.mSurvived || '—'}`, `Where it failed: ${s.debrief.mFail || '—'}`, '',
      'JOURNAL', ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(s.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION', ...CHOICE.map(([id, l]) => `${l}:\n${(s.debrief[id] || '').trim() || '—'}\n`)];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    const s = bx(), last = s.attempts[s.attempts.length - 1];
    if (!last) return go('design');
    const field = (id, label, rows, ph) => `<label class="field"><span>${label}</span>${rows ? `<textarea id="${id}" rows="${rows}">${esc(s.debrief[id] || '')}</textarea>` : `<input id="${id}" value="${esc(s.debrief[id] || '')}" placeholder="${ph || ''}">`}</label>`;
    root.innerHTML = header() + `<div class="debrief-2">
      <section class="panel"><h2>Hands-on link: the marshmallow challenge</h2>
        <p>Build your best design with sticks (or spaghetti) and marshmallows. Put it on a tray and shake the tray. Then record what happened.</p>
        <p class="blueprint"><span class="label">Your blueprint</span>${esc(blueprint(s.design))}</p>
        <div class="row3">${field('mHeight', 'Height (cm)', 0, 'e.g. 45')}${field('mSticks', 'Sticks used', 0, 'e.g. 20')}${field('mJoints', 'Marshmallows used', 0, 'e.g. 12')}</div>
        <label class="field"><span>Did it survive the shake tray?</span><select id="mSurvived">${['', 'Yes, undamaged', 'Yes, but damaged', 'No, it collapsed'].map(v => `<option ${s.debrief.mSurvived === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${field('mFail', 'Where did it bend or break first?', 2)}
        <p class="note">Real marshmallows get softer as you handle them, and real sticks are never exactly the same. Which differences did you notice between the real tower and the simulation?</p>
        <p><strong>Tinkercad:</strong> design the full shelter, with walls, door and roof, around your tested frame.</p>
      </section>
      <section class="panel"><h2>Mission debrief</h2>
        ${attemptsTable()}
        <form class="journal-form"><h3>Journal entries</h3><p class="muted">Your teacher may choose which questions to answer.</p>
          ${JOURNAL.map((q, i) => field('q' + i, `${i + 1}. ${q}`, 3)).join('')}
          <h3>Choice board: 3-2-1 reflection</h3>${CHOICE.map(([id, l, n]) => field(id, l, n + 1)).join('')}
        </form>
        <div class="actions"><button class="btn ghost" id="copy">Copy mission report</button><button class="btn primary" id="done">${s.completed ? 'Update the Island Log' : 'Save to the Island Log'}</button></div>
        <p class="muted" id="copy-status" aria-live="polite"></p><textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea>
      </section></div>`;
    root.querySelectorAll('input, textarea, select').forEach(el => { if (el.id && el.id !== 'report-text') el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { s.debrief[el.id] = el.value; save(); }); });
    root.querySelector('#copy').addEventListener('click', () => {
      const txt = reportText(), status = root.querySelector('#copy-status'), ta = root.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied. Paste it into a document or email.'; }, fallback); } catch (err) { fallback(); }
    });
    root.querySelector('#done').addEventListener('click', () => {
      s.completed = true;
      st().log.build = { score: last.total, quake: last.quake, storm: last.storm, material: last.material, roof: last.roof, sticks: last.sticks, at: new Date().toISOString() };
      save(); location.hash = '';
    });
  }

  function render() {
    stop(); if (view) { view.destroy(); view = null; }
    const ph = bx().phase;
    if (ph === 'design') return renderDesign();
    if (ph === 'test') return renderTest();
    if (ph === 'debrief') return renderDebrief();
    return renderBriefing();
  }

  OI.missions = OI.missions || {};
  OI.missions.build = {
    mount(el) { root = el; render(); },
    unmount() { stop(); if (view) { view.destroy(); view = null; } root = null; }
  };
})();
