/* Operation Island — Mission 3 structure physics.
 * A shelter frame is marshmallow joints (nodes) on a 1 m grid joined by sticks.
 * Each stick is a stiff spring; joints are free to turn, like real marshmallows.
 * So a square can fold over, but a triangle keeps its shape.
 * Rules learners can reason about:
 *  - A stick breaks when it is stretched or squashed past its limit
 *    (bamboo bends further before breaking; hardwood is stiffer and heavier).
 *  - The roof sits on the top row of joints. Tiles are heavy, thatch is light.
 *  - Earthquake: the ground slides back and forth. Sand shakes 1.5× harder, rock 0.7×.
 *  - Wind pushes from the east, harder higher up (force grows with speed²),
 *    and lifts the roof. A heavy roof resists lifting; a light one may blow off.
 */
window.OI = window.OI || {};

(function () {
  const COLS = 7, LEVELS = 6; // grid: x 0..6, y 0..5 (metres)
  const MATERIALS = {
    bamboo: { name: 'Bamboo', K: 5200, breakStrain: 0.045, mass: 0.35, regrows: true, note: 'Light and springy. Regrows in 3–5 years.' },
    hardwood: { name: 'Hardwood', K: 11000, breakStrain: 0.026, mass: 0.9, regrows: false, note: 'Stiff and strong, but heavy. Trees take 30+ years to regrow.' }
  };
  const ROOFS = {
    thatch: { name: 'Palm thatch', perNode: 1.2, note: 'Light. Cool in the sun, but wind can lift it.' },
    tiles: { name: 'Clay tiles', perNode: 5, note: 'Heavy. Stays put in wind, but adds weight that sways in an earthquake.' }
  };
  const GROUND = { sand: { name: 'Sand', amp: 1.5 }, soil: { name: 'Soil', amp: 1.0 }, rock: { name: 'Rock', amp: 0.7 } };
  const QUAKES = [
    { id: 5, name: 'Moderate', label: 'Magnitude 5', amp: 0.035, freq: 2.2 },
    { id: 6, name: 'Strong', label: 'Magnitude 6', amp: 0.07, freq: 2.0 },
    { id: 7, name: 'Severe', label: 'Magnitude 7', amp: 0.11, freq: 1.8 }
  ];
  const G = 9.8, SUB = 40, FRAME = 1 / 60;
  const nkey = (x, y) => x + ',' + y;
  const skey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  function adjacent(a, b) {
    const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number);
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return (dx || dy) && dx <= 1 && dy <= 1;
  }

  // ---- design analysis ----
  function analyse(design) {
    const sticks = design.sticks.map(s => s.split('|'));
    const used = new Set(sticks.flat());
    const nodes = [...used].map(k => { const [x, y] = k.split(',').map(Number); return { k, x, y }; });
    const top = nodes.length ? Math.max(...nodes.map(n => n.y)) : 0;
    const topNodes = nodes.filter(n => n.y === top);
    const roofWidth = topNodes.length ? Math.max(...topNodes.map(n => n.x)) - Math.min(...topNodes.map(n => n.x)) : 0;
    const grounded = nodes.filter(n => n.y === 0).length;
    const long = sticks.filter(([a, b]) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return ax !== bx && ay !== by; }).length;
    // triangles: count closed 3-cycles
    const adj = {}; sticks.forEach(([a, b]) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); });
    let tri = 0; sticks.forEach(([a, b]) => { adj[a].forEach(c => { if (c !== b && adj[b].has(c)) tri++; }); });
    return { nodes: nodes.length, sticks: sticks.length, short: sticks.length - long, long, height: top, roofWidth, grounded, triangles: tri / 3,
      meetsBrief: top >= 3 && roofWidth >= 2 && grounded >= 2 };
  }

  // ---- simulation ----
  function create(design, env) {
    const mat = MATERIALS[design.material], roof = ROOFS[design.roof];
    const a = analyse(design);
    const idx = {}, P = [];
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    design.sticks.forEach(s => s.split('|').forEach(k => {
      if (idx[k] != null) return;
      const [x, y] = k.split(',').map(Number);
      idx[k] = P.length;
      // tiny imperfections, as in any real build
      const jx = 0; void rnd;
      P.push({ k, x0: x, y0: y, x: x + jx, y, vx: 0, vy: 0, m: 0.25, fixed: y === 0, roof: false });
    }));
    const S = design.sticks.map(s => {
      const [ka, kb] = s.split('|'), i = idx[ka], j = idx[kb];
      const L = Math.hypot(P[i].x0 - P[j].x0, P[i].y0 - P[j].y0);
      P[i].m += mat.mass * L / 2; P[j].m += mat.mass * L / 2;
      return { key: s, i, j, L, k: mat.K / L, broken: false, strain: 0, peak: 0 };
    });
    P.forEach(p => { if (p.y0 === a.height && a.height > 0) { p.roof = true; p.m += roof.perNode; } });
    return { P, S, t: 0, env, mat, roof, a, collapsed: false, groundX: 0, firstBreak: null, maxSway: 0, willLift: roofLift(design, env), roofLost: false };
  }

  function groundOffset(sim) {
    const e = sim.env;
    if (e.test !== 'quake') return 0;
    const q = QUAKES.find(x => x.id === e.magnitude), amp = q.amp * GROUND[e.ground].amp;
    const t = sim.t - 1; if (t < 0) return 0;
    const env = Math.min(1, t / 1.5) * (t > 7 ? Math.max(0, 1 - (t - 7) / 1.5) : 1);
    return amp * env * Math.sin(2 * Math.PI * q.freq * t);
  }
  function windForce(sim, y) {
    const e = sim.env;
    if (e.test !== 'wind') return { fx: 0, fy: 0 };
    const t = sim.t - 1; if (t < 0) return { fx: 0, fy: 0 };
    const ramp = Math.min(1, t / 4) * (1 + 0.18 * Math.sin(t * 5.3) * Math.sin(t * 1.7));
    const v = e.windKmh / 3.6 * Math.pow(Math.max(0.5, y) / 3, 0.2); // stronger higher up
    const f = 0.0105 * v * v * ramp; // newtons per joint (simplified drag)
    return { fx: -f, fy: 0 };
  }

  function step(sim) {
    const dt = FRAME / SUB, P = sim.P, S = sim.S;
    for (let s = 0; s < SUB; s++) {
      sim.t += dt;
      const gx = groundOffset(sim);
      sim.groundX = gx;
      P.forEach(p => { p.fx = 0; p.fy = -p.m * G; });
      P.forEach(p => {
        if (p.fixed) return;
        const w = windForce(sim, p.y);
        p.fx += w.fx;
        if (p.roof && sim.env.test === 'wind') p.fy += -w.fx * 1.15 * (sim.roof.perNode < 3 ? 1 : 0.5); // uplift on the roof
      });
      S.forEach(st => {
        if (st.broken) return;
        const a = P[st.i], b = P[st.j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        st.strain = (d - st.L) / st.L;
        st.peak = Math.max(st.peak, Math.abs(st.strain));
        if (Math.abs(st.strain) > sim.mat.breakStrain) { st.broken = true; if (!sim.firstBreak) sim.firstBreak = { key: st.key, t: sim.t }; return; }
        const nx = dx / d, ny = dy / d;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const f = st.k * (d - st.L) + 0.9 * Math.sqrt(st.k) * rv * 0.6;
        a.fx += f * nx; a.fy += f * ny; b.fx -= f * nx; b.fy -= f * ny;
      });
      P.forEach(p => {
        if (p.fixed) { p.x = p.x0 + gx; p.y = 0; p.vx = 0; p.vy = 0; return; }
        p.vx += (p.fx / p.m) * dt; p.vy += (p.fy / p.m) * dt;
        p.vx *= 0.9996; p.vy *= 0.9996;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < 0) { p.y = 0; p.vy = 0; p.vx *= 0.9; }
      });
    }
    if (sim.willLift && !sim.roofLost && sim.t > 4) sim.roofLost = sim.t;
    // sway of the roof relative to the ground
    const roofNodes = P.filter(p => p.roof);
    if (roofNodes.length) {
      const sway = Math.abs(roofNodes.reduce((a, p) => a + (p.x - p.x0 - sim.groundX), 0) / roofNodes.length);
      sim.maxSway = Math.max(sim.maxSway, sway);
    }
    return sim;
  }

  // Roof uplift: wind blowing over a roof lifts it like a wing.
  // Untied thatch lifts off from 90 km/h; untied tiles from 140 km/h; tied roofs stay.
  function roofLift(design, env) {
    if (env.test !== 'wind' || design.straps) return false;
    return env.windKmh >= (design.roof === 'thatch' ? 90 : 140);
  }

  function status(sim) {
    const broken = sim.S.filter(s => s.broken).length;
    const free = sim.P.filter(p => !p.fixed);
    const fallen = free.filter(p => p.y0 >= 1 && p.y < p.y0 * 0.5).length;
    const roofNodes = sim.P.filter(p => p.roof);
    const roofDrop = roofNodes.length ? roofNodes.reduce((a, p) => a + (p.y0 - p.y), 0) / roofNodes.length : 0;
    const collapsed = fallen > free.length * 0.25 || roofDrop > 0.6;
    const roofLost = !!sim.roofLost;
    const damaged = !collapsed && (broken > 0 || roofDrop > 0.2 || sim.maxSway > 0.35 || roofLost);
    return { broken, collapsed, damaged, standing: !collapsed, roofDrop, sway: sim.maxSway, roofLost };
  }

  // Run a whole test without drawing (used for scoring and in tests).
  function run(design, env, seconds) {
    const sim = create(design, env);
    const frames = Math.round((seconds || 10) / FRAME);
    for (let i = 0; i < frames; i++) step(sim);
    return { sim, ...status(sim) };
  }

  // Templates to start from
  function frame(cols, levels, brace) {
    const st = new Set();
    for (let y = 0; y <= levels; y++) for (let x = 0; x < cols; x++) {
      const x0 = 2 + x - Math.floor(cols / 2) + (cols % 2 ? 0 : 1) - 1;
      const k = nkey(x0 + 1, y);
      if (x < cols - 1) st.add(skey(k, nkey(x0 + 2, y)));
      if (y < levels) {
        st.add(skey(k, nkey(x0 + 1, y + 1)));
        if (brace && x < cols - 1) st.add(((x + y) % 2 ? skey(k, nkey(x0 + 2, y + 1)) : skey(nkey(x0 + 2, y), nkey(x0 + 1, y + 1))));
      }
    }
    return [...st];
  }
  const TEMPLATES = {
    box: { name: 'Box frame (squares only)', sticks: () => frame(3, 3, false) },
    braced: { name: 'Braced frame (with triangles)', sticks: () => frame(3, 3, true) },
    tall: { name: 'Tall tower', sticks: () => frame(2, 5, true) }
  };

  OI.build = { COLS, LEVELS, MATERIALS, ROOFS, GROUND, QUAKES, FRAME, nkey, skey, adjacent, analyse, create, step, status, run, TEMPLATES, groundOffset, roofLift };
})();
