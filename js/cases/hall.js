/* Case File #2 — The Fallen Hall.
 * Forces and structures: why did the school hall collapse in the earthquake when the clinic
 * and the house next to it stayed standing?
 *
 * Engineering check (transparent, so learners can do the maths):
 *   earthquake force F = mass × acceleration × ground effect
 *     mass = roof + half the walls (800 kg of walls → 400 kg)
 *     acceleration: magnitude 6 → 2.5 m/s², magnitude 7 → 4 m/s²
 *     ground effect: rock 0.7, soil 1.0, sand 1.5
 *   strength (sideways) = bracing × joints × foundations
 *     bracing: none 2 kN, one diagonal per bay 8 kN, X-braces 14 kN
 *     joints: nails × 1, bolted steel plates × 1.4
 *     foundations: on loose sand × 0.6 (sand turns soft when shaken), otherwise × 1
 *   force ÷ strength: under 0.7 stands, 0.7–1 damaged, over 1 collapses.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // ---------- the engineering model ----------
  const ROOF = { tiles: { name: 'Clay tiles', kg: 2400 }, thatch: { name: 'Palm thatch', kg: 600 }, metal: { name: 'Metal sheets', kg: 500 } };
  const BRACE = { none: { name: 'No braces', kN: 2 }, single: { name: 'One diagonal per bay', kN: 8 }, x: { name: 'X-braces', kN: 14 } };
  const GROUND = { rock: { name: 'Rock', amp: 0.7 }, soil: { name: 'Firm soil', amp: 1.0 }, sand: { name: 'Loose sand', amp: 1.5 } };
  const ACC = { 6: 2.5, 7: 4 };
  function check(d) {
    const mass = ROOF[d.roof].kg + 400;
    const force = mass * ACC[d.mag || 6] * GROUND[d.ground].amp / 1000; // kN
    const strength = BRACE[d.brace].kN * (d.bolts ? 1.4 : 1) * (d.ground === 'sand' && !d.footings ? 0.6 : 1);
    const ratio = force / strength;
    return { mass, force: Math.round(force * 100) / 100, strength: Math.round(strength * 100) / 100, ratio: Math.round(ratio * 100) / 100, outcome: ratio < 0.7 ? 'stands' : ratio <= 1 ? 'damaged' : 'collapses' };
  }
  const OLD = { brace: 'none', roof: 'tiles', ground: 'sand', bolts: false, footings: false };

  // ---------- frame drawing and animation ----------
  function frameSVG(p) {
    const W = 600, H = 380, gy = 300, bays = 3, bw = 100, lh = 95, x0 = 150;
    const c = p.collapse || 0, s = p.sway || 0;
    const node = (i, j) => ({ x: x0 + i * bw + s * (j / 2) + c * 70 * j, y: gy - j * lh * (1 - c * 0.86) + (p.tilt || 0) * (i - 1.5) });
    const sticks = [];
    for (let j = 0; j <= 2; j++) for (let i = 0; i <= bays; i++) {
      if (i < bays && j > 0) sticks.push([node(i, j), node(i + 1, j), 'beam']);
      if (j < 2) sticks.push([node(i, j), node(i, j + 1), 'post']);
      if (j < 2 && i < bays) {
        if (p.brace === 'single' || p.brace === 'x') sticks.push([node(i, j), node(i + 1, j + 1), 'brace']);
        if (p.brace === 'x') sticks.push([node(i + 1, j), node(i, j + 1), 'brace']);
      }
    }
    const top = [0, 1, 2, 3].map(i => node(i, 2));
    const roofCol = { tiles: '#A84A2C', thatch: '#C9A35A', metal: '#8E9AA0' }[p.roof];
    const groundCol = { rock: '#8A8377', soil: '#7B5B3E', sand: '#E3CF9B' }[p.ground];
    const peak = { x: (top[0].x + top[3].x) / 2, y: top[0].y - 70 * (1 - c * 0.5) };
    const shake = p.shakeX || 0;
    return `<svg viewBox="0 0 ${W} ${H}" class="frame-svg" role="img" aria-label="${esc(p.label || 'Hall frame')}">
      <rect width="${W}" height="${H}" fill="#DCEBF0"/>
      <g transform="translate(${shake},0)">
        <rect x="-40" y="${gy}" width="${W + 80}" height="${H - gy}" fill="${groundCol}"/>
        ${p.ground === 'rock' ? [60, 210, 380, 520].map(x => `<path d="M${x},${gy + 20} l18,14 l-6,18" stroke="#5f584d" stroke-width="2" fill="none"/>`).join('') : ''}
        ${p.ground === 'sand' && p.boils ? [90, 230, 470, 540].map(x => `<g transform="translate(${x},${gy + 14})"><ellipse rx="16" ry="6" fill="#C9B27C"/><ellipse rx="6" ry="3" fill="#7EA9B8"/></g>`).join('') : ''}
        ${p.footings ? [0, 1, 2, 3].map(i => `<rect x="${x0 + i * bw - 9}" y="${gy}" width="18" height="${H - gy - 6}" fill="#9AA3A6" stroke="#4A636C"/>`).join('') : ''}
        <rect x="${x0 - 20}" y="${gy - 6}" width="${bays * bw + 40}" height="10" fill="#9AA3A6"/>
        ${sticks.map(([a, b, kind]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${p.damaged && kind === 'brace' ? '#C2412D' : kind === 'brace' ? '#B4691F' : '#6B4A2B'}" stroke-width="${kind === 'brace' ? 6 : 9}" stroke-linecap="round"/>`).join('')}
        ${[0, 1, 2].map(j => [0, 1, 2, 3].map(i => { const n = node(i, j); return `<circle cx="${n.x}" cy="${n.y}" r="${p.bolts ? 7 : 5}" fill="${p.bolts ? '#4A636C' : '#C9C2B4'}" stroke="#10262E" stroke-width="1.5"/>`; }).join('')).join('')}
        <polygon points="${top[0].x - 30},${top[0].y} ${peak.x},${peak.y} ${top[3].x + 30},${top[3].y}" fill="${roofCol}" stroke="#3a2e22" stroke-width="3"/>
        ${p.roof === 'tiles' ? [0.25, 0.5, 0.75].map(f => `<line x1="${top[0].x - 30 + (peak.x - top[0].x + 30) * f}" y1="${top[0].y + (peak.y - top[0].y) * f}" x2="${top[3].x + 30 - (top[3].x + 30 - peak.x) * f}" y2="${top[3].y + (peak.y - top[3].y) * f}" stroke="#6E2A16" stroke-width="2"/>`).join('') : ''}
      </g>
      ${p.verdict ? `<g transform="translate(${W / 2},40)"><rect x="-110" y="-22" width="220" height="40" rx="10" fill="${p.verdict === 'stands' ? '#2C7A4B' : p.verdict === 'damaged' ? '#B7791F' : '#B03A28'}"/><text y="6" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">${p.verdict === 'stands' ? 'Still standing' : p.verdict === 'damaged' ? 'Damaged' : 'Collapsed'}</text></g>` : ''}
    </svg>`;
  }
  // shake a frame for ~3 s, then show the outcome. Returns a stop function.
  function shakeFrame(holder, d, res, done) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const amp = Math.min(46, 8 + res.ratio * 9), groundAmp = 5 * GROUND[d.ground].amp;
    const t0 = performance.now(); let raf = null;
    const frame = now => {
      const t = (now - t0) / 1000;
      if (reduce || t > 3.2) { holder.innerHTML = frameSVG(Object.assign({}, d, { collapse: res.outcome === 'collapses' ? 1 : 0, damaged: res.outcome === 'damaged', verdict: res.outcome, boils: d.ground === 'sand', tilt: d.ground === 'sand' && !d.footings ? 12 : 0 })); done && done(); return; }
      const env = Math.min(1, t / 0.6) * (t > 2.6 ? Math.max(0, (3.2 - t) / 0.6) : 1);
      const c = res.outcome === 'collapses' ? Math.max(0, Math.min(1, (t - 1.4) / 1.2)) : 0;
      holder.innerHTML = frameSVG(Object.assign({}, d, { sway: Math.sin(t * 12) * amp * env * (1 - c), shakeX: Math.sin(t * 14) * groundAmp * env, collapse: c, boils: d.ground === 'sand' && t > 1, tilt: d.ground === 'sand' && !d.footings ? Math.min(12, t * 5) : 0 }));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  // ---------- glossary and handbook ----------
  const GLOSSARY = {
    'engineer': 'Someone who designs and builds structures, machines and systems, and works out why they fail.',
    'force': 'A push or a pull. Measured in newtons (N); 1,000 N is a kilonewton (kN).',
    'load': 'A force that a structure has to carry, such as the weight of a roof or a push from the wind.',
    'tension': 'A pulling force that stretches a part, like a rope in a tug-of-war.',
    'compression': 'A pushing force that squashes a part, like a pillar holding up a roof.',
    'brace': 'A diagonal piece that turns a square frame into triangles, so it cannot fold over.',
    'joint': 'The place where two parts of a structure meet and are fixed together.',
    'foundation': 'The part of a building under the ground that spreads its weight and holds it steady.',
    'magnitude': 'A number that describes how strong an earthquake is. Each step up means much stronger shaking.',
    'seismograph': 'An instrument that records how the ground shakes during an earthquake.',
    'liquefaction': 'When wet, loose sand is shaken so hard that it behaves like a liquid and buildings sink or tilt.',
    'mass': 'How much matter something contains, measured in kilograms (kg).',
    'acceleration': 'How quickly something speeds up or changes direction. Measured in metres per second squared (m/s²).',
    'fair test': 'An experiment where you change only one thing at a time, so you know what caused the result.',
    'variable': 'Something that can change in an experiment.',
    'sway': 'How far the top of a structure moves sideways.'
  };
  const HANDBOOK = [
    { id: 'forces', title: 'Forces on buildings', html: '<p>A building always carries its own <strong>weight</strong> downwards. Wind and earthquakes add <strong>sideways forces</strong>.</p><p>Parts of a frame are either pulled (<strong>tension</strong>) or squashed (<strong>compression</strong>). A good design shares these forces between many parts.</p>' },
    { id: 'triangles', title: 'Triangles and bracing', html: '<p>The joints in a frame let the parts turn a little. A <strong>square</strong> can therefore lean over into a diamond shape and fall.</p><p>A <strong>triangle</strong> cannot change shape unless a side breaks. Adding a diagonal <strong>brace</strong> splits a square into two triangles. X-braces make two pairs of triangles, which is even stronger.</p>' },
    { id: 'mass', title: 'Mass and earthquake force', html: '<p>In an earthquake the ground moves suddenly, and the building has to move with it. The force needed is:</p><p><strong>Force (N) = mass (kg) × acceleration (m/s²)</strong></p><p>A heavier roof needs a bigger force to move, so it puts more strain on the walls. A magnitude 6 earthquake on firm soil gives about 2.5 m/s².</p>' },
    { id: 'ground', title: 'Ground and foundations', html: '<p>Shaking is stronger on soft ground: about ×1.5 on loose sand, ×1 on firm soil and ×0.7 on rock.</p><p>Wet, loose sand can turn almost liquid when shaken (<strong>liquefaction</strong>). Little "sand boils" appear and buildings sink or tilt. Deep foundations that reach firm ground stop this.</p>' },
    { id: 'check', title: 'The engineer\'s check', html: '<p>Engineers compare the <strong>force</strong> an earthquake puts on a building with the <strong>strength</strong> of its frame.</p><ul><li>Force ÷ strength below 0.7: safe</li><li>0.7 to 1: damaged</li><li>Above 1: the frame fails</li></ul><p>Strength comes from bracing (none 2 kN, one diagonal 8 kN, X-braces 14 kN), multiplied by the joints (bolted steel plates ×1.4) and the foundations (loose sand without deep foundations ×0.6).</p>' },
    { id: 'fair', title: 'Fair tests', html: '<p>In a <strong>fair test</strong> you change only one <strong>variable</strong> at a time and keep everything else the same. Then you know which change caused the result.</p><p>If you change two things at once, you cannot tell which one made the difference.</p>' }
  ];

  // ---------- stage 1: introduction ----------
  function seismo() {
    const pts = []; for (let x = 0; x <= 600; x += 3) { const t = x / 600, env = t > 0.25 && t < 0.75 ? Math.sin((t - 0.25) / 0.5 * Math.PI) : 0; pts.push(`${x},${60 + Math.sin(x * 0.9) * (2 + env * 46) * (0.6 + 0.4 * Math.sin(x * 0.13))}`); }
    return `<svg viewBox="0 0 600 120" class="seismo" role="img" aria-label="Seismograph trace of the earthquake: quiet, then 20 seconds of strong shaking, then quiet again"><rect width="600" height="120" fill="#F7F3E8"/>${[20, 40, 60, 80, 100].map(y => `<line x1="0" x2="600" y1="${y}" y2="${y}" stroke="#E2D9C4"/>`).join('')}<polyline points="${pts.join(' ')}" fill="none" stroke="#B03A28" stroke-width="1.5"/><text x="8" y="16" font-family="IBM Plex Mono, monospace" font-size="11" fill="#4A636C">02:14 · magnitude 6.1 · 20 seconds of shaking</text></svg>`;
  }
  function renderIntro(api, el) {
    const q = { id: 'i1', text: 'The council asks you to find out why the hall collapsed. Which question will help you most?', options: ['What was different about the hall, compared with the buildings that stayed up?', 'What colour was the hall painted?', 'How many people use the hall?'], correct: 0, explain: 'Comparing what failed with what survived is how engineers find causes.' };
    el.innerHTML = `<div class="intro-board">
      <article class="message">
        <div class="msg-head"><span class="msg-icon" aria-hidden="true">✉</span><div><strong>From: The Village Council</strong><br><span class="muted">To: GHA Engineer · Subject: The school hall has collapsed</span></div></div>
        <p data-read>${api.gloss('Last night at 2 a.m. an earthquake shook the island for 20 seconds. Thankfully nobody was inside, but our new school hall collapsed completely.')}</p>
        <p data-read>${api.gloss('The strange thing is that the clinic and the Okafor family house, only a short walk away, are still standing. The children need a school, and we must not let this happen again.')}</p>
        <p data-read>${api.gloss('As the team engineer, can you investigate why the hall fell and design a safe new one?')}</p>
      </article>
      <div class="intro-side">
        <div class="role-card"><span class="role-badge" aria-hidden="true">🛠️</span><div><span class="label">Your role</span><strong>Engineer</strong><small>Find out why the hall fell, and rebuild it safely.</small></div></div>
        <div class="chart-frame">${seismo()}</div>
        <div class="before-after"><figure>${frameSVG({ brace: 'none', roof: 'tiles', ground: 'sand' })}<figcaption>Before</figcaption></figure><figure>${frameSVG({ brace: 'none', roof: 'tiles', ground: 'sand', collapse: 1, tilt: 12, boils: true })}<figcaption>After</figcaption></figure></div>
      </div>
    </div>
    <div class="stage-tasks">${api.question(q)}
      <label class="field"><span data-read>Your first ideas: why might one building fall while others stand?</span><textarea id="ideas" rows="2" placeholder="We think…">${esc(api.S.data.ideas || '')}</textarea></label>
      <div class="actions">${api.answered(['i1']) ? '<button type="button" class="btn primary" id="next">Inspect the site</button>' : '<p class="muted">Answer the question to start the investigation.</p>'}</div></div>`;
    el.querySelector('#ideas').addEventListener('input', e => { api.S.data.ideas = e.target.value; api.save(); });
    api.bindQuestions([q], () => { api.complete('intro'); api.stepDone('briefing'); });
    const n = el.querySelector('#next'); if (n) n.addEventListener('click', () => api.go('site'));
  }

  // ---------- stage 2: site inspection ----------
  const SPOTS = [
    { id: 'hall-walls', x: 700, y: 360, icon: '▦', title: 'Hall walls', text: 'The wall frames are made of squares. There are no diagonal braces anywhere.', cause: 'frame' },
    { id: 'hall-joints', x: 820, y: 400, icon: '🔩', title: 'Hall joints', text: 'Each joint was held by a single nail. The nails bent and pulled out.', cause: 'frame' },
    { id: 'hall-roof', x: 760, y: 430, icon: '🧱', title: 'Hall roof', text: 'A heavy clay-tile roof, about 2,400 kg, now lies on the floor.', cause: 'roof' },
    { id: 'hall-ground', x: 860, y: 480, icon: '💧', title: 'Ground by the hall', text: 'Little "volcanoes" of wet sand around the hall. The loose sand turned soft during the shaking.', cause: 'ground' },
    { id: 'hall-tilt', x: 660, y: 470, icon: '📐', title: 'Hall floor', text: 'The concrete floor has sunk 15 cm on one side and tilts.', cause: 'ground' },
    { id: 'hall-paint', x: 900, y: 360, icon: '🎨', title: 'Hall paint', text: 'The broken boards are painted bright blue.', cause: 'none' },
    { id: 'clinic-walls', x: 430, y: 350, icon: '✖', title: 'Clinic walls', text: 'The clinic walls have X-shaped braces in every section.', cause: 'frame' },
    { id: 'clinic-roof', x: 480, y: 270, icon: '🌾', title: 'Clinic roof', text: 'The clinic has a light palm-thatch roof, about 600 kg.', cause: 'roof' },
    { id: 'house-ground', x: 170, y: 440, icon: '🪨', title: 'Under the Okafor house', text: 'The house stands on solid rock.', cause: 'ground' },
    { id: 'seismo', x: 590, y: 400, icon: '📈', title: 'Seismograph', text: 'Magnitude 6.1. All three buildings felt the same earthquake.', cause: 'none' }
  ];
  function siteScene(st) {
    const gy = 430;
    return `<svg viewBox="0 0 1000 600" class="site" role="img" aria-label="The site: the Okafor house on a rocky hill, the clinic on a field and the collapsed hall on sand by the sea">
      <defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFDDEA"/><stop offset="1" stop-color="#E8F1EE"/></linearGradient></defs>
      <rect width="1000" height="600" fill="url(#sky2)"/>
      <path d="M0,${gy - 120} C80,${gy - 150} 200,${gy - 110} 300,${gy - 20} L300,600 L0,600 Z" fill="#8A8377"/>
      ${[[40, 360], [120, 330], [230, 380], [90, 420]].map(([x, y]) => `<path d="M${x},${y} l20,12 l-8,16" stroke="#5f584d" stroke-width="2" fill="none"/>`).join('')}
      <rect x="290" y="${gy}" width="330" height="170" fill="#7B5B3E"/><rect x="290" y="${gy}" width="330" height="10" fill="#6E8A4A"/>
      <path d="M610,${gy} L1000,${gy + 10} L1000,600 L610,600 Z" fill="#E3CF9B"/>
      <path d="M900,${gy + 30} C940,${gy + 20} 970,${gy + 40} 1000,${gy + 30} L1000,600 L900,600 Z" fill="#4B9EC8" opacity="0.9"/>
      ${[[700, 490], [820, 500], [880, 470]].map(([x, y]) => `<g transform="translate(${x},${y})"><ellipse rx="16" ry="6" fill="#C9B27C"/><ellipse rx="6" ry="3" fill="#7EA9B8"/></g>`).join('')}
      <g transform="translate(170,${gy - 112})"><rect x="-60" y="0" width="120" height="70" fill="#F3E4C4" stroke="#6b5a40" stroke-width="2"/><polygon points="-70,0 0,-40 70,0" fill="#C9A35A" stroke="#3a2e22" stroke-width="2"/><rect x="-12" y="30" width="24" height="40" fill="#7A5634"/><text y="96" text-anchor="middle" class="vlabel">Okafor house</text></g>
      <g transform="translate(455,${gy})"><rect x="-90" y="-120" width="180" height="120" fill="#F7F3E8" stroke="#4A636C" stroke-width="2"/>
        ${[-90, -30, 30].map(x => `<line x1="${x}" y1="-120" x2="${x + 60}" y2="0" stroke="#B4691F" stroke-width="4"/><line x1="${x + 60}" y1="-120" x2="${x}" y2="0" stroke="#B4691F" stroke-width="4"/>`).join('')}
        <polygon points="-104,-120 0,-176 104,-120" fill="#C9A35A" stroke="#3a2e22" stroke-width="2"/><rect x="-20" y="-40" width="40" height="40" fill="#5B8FB0"/><text y="22" text-anchor="middle" class="vlabel">Clinic ✚</text></g>
      <g transform="translate(590,${gy - 34})"><rect x="-16" y="0" width="32" height="34" fill="#DCE6E2" stroke="#4A636C" stroke-width="2"/><polyline points="-12,18 -6,10 -2,26 3,6 8,22 12,16" fill="none" stroke="#B03A28" stroke-width="2"/></g>
      <g transform="translate(770,${gy + 10})">
        ${[[-120, -10, 60, -40], [-60, -6, 40, -70], [-20, -30, 110, 0], [30, -50, 120, -10], [-110, -40, -10, -90]].map(([a, b, c, d2]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d2}" stroke="#6B4A2B" stroke-width="9" stroke-linecap="round"/>`).join('')}
        <polygon points="-140,-6 -60,-60 70,-48 140,0" fill="#A84A2C" stroke="#3a2e22" stroke-width="2"/>
        ${[[-40, -30], [20, -20], [70, -14]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="10" fill="#8E3A20" transform="rotate(${x / 3} ${x} ${y})"/>`).join('')}
        <rect x="80" y="-90" width="60" height="30" fill="#5B8FD0" transform="rotate(-25 80 -90)"/>
        <text y="44" text-anchor="middle" class="vlabel">School hall (collapsed)</text></g>
      ${SPOTS.map(sp => `<g class="spot ${st.found[sp.id] ? 'found' : ''} ${st.sel === sp.id ? 'sel' : ''}" data-spot="${sp.id}" transform="translate(${sp.x},${sp.y})" tabindex="0" role="button" aria-label="Inspect: ${sp.title}">
        <circle r="22" class="spot-ring"/><circle r="16" fill="${st.found[sp.id] ? '#2C7A4B' : '#F2B630'}" stroke="#10262E" stroke-width="2"/><text y="6" text-anchor="middle" font-size="16">${st.found[sp.id] ? '✓' : '🔍'}</text></g>`).join('')}
    </svg>`;
  }
  function renderSite(api, el) {
    const S = api.S, st = S.data.site = S.data.site || { found: {}, sel: null };
    const n = Object.keys(st.found).length, sp = SPOTS.find(x => x.id === st.sel);
    const q = { id: 's1', text: 'What did the clinic and the house have that the hall did not? Choose all that apply.', options: ['Diagonal braces in the walls', 'A light roof', 'Firm ground underneath', 'Brightly painted walls'], correct: [0, 1, 2], multi: true, explain: 'The hall had no braces, a heavy roof and loose sand underneath. Three weaknesses, not one.', hint: 'Compare your findings for the clinic and the house with the hall. Is paint really a difference that matters?' };
    el.innerHTML = `<div class="lab-grid">
      <div class="scene"><div class="scene-bar"><span class="mono">Findings: ${n} / ${SPOTS.length}</span><span class="muted">Tap the 🔍 markers to inspect.</span></div>
        <div class="scene-frame">${siteScene(st)}</div></div>
      <div class="scene-side">
        ${sp ? `<article class="interview"><h3><span aria-hidden="true">${sp.icon}</span> ${esc(sp.title)}</h3><p data-read>${api.gloss(sp.text)}</p></article>` : `<p class="muted" data-read>Tap a magnifying glass to inspect that part of the site. Compare the hall with the buildings that survived.</p>`}
        <div class="table-wrap"><table class="tally-t"><caption>Engineer's notebook</caption><tbody>${SPOTS.filter(x => st.found[x.id]).map(x => `<tr><td><span aria-hidden="true">${x.icon}</span> ${esc(x.title)}</td><td>${esc(x.text)}</td></tr>`).join('') || '<tr><td class="muted">No findings yet.</td></tr>'}</tbody></table></div>
      </div></div>
      <div class="stage-tasks"><h2>Compare the buildings</h2>${n >= 8 ? api.question(q) + (api.answered(['s1']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Go to the force lab</button></div>' : '') : `<p class="muted">Inspect at least 8 places (${8 - n} more).</p>`}</div>`;
    el.querySelectorAll('[data-spot]').forEach(g => { const pick = () => { st.sel = g.dataset.spot; st.found[st.sel] = true; api.save(); if (Object.keys(st.found).length >= 8) api.stepDone('inspect'); api.rerender(); }; g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); });
    api.bindQuestions([q], () => { api.stepDone('compare'); api.complete('site'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('lab'));
  }

  // ---------- stage 3: force lab ----------
  const STIFF = { none: 40, single: 400, x: 700 }; // newtons per millimetre of sway
  function pushView(t) {
    const sway = Math.round(t.force * 1000 / STIFF[t.frame]);
    const fails = sway > 60;
    return { sway, fails, svg: frameSVG({ brace: t.frame, roof: 'thatch', ground: 'soil', sway: fails ? 0 : Math.min(60, sway) * 1.2, collapse: fails ? 1 : 0, verdict: fails ? 'collapses' : null }) };
  }
  function labState(S) { S.data.lab = S.data.lab || { tool: 'push', push: { frame: 'none', force: 0 }, roof: 'tiles', results: { push: {}, roof: {}, ground: {} } }; return S.data.lab; }
  function labTodo(L) {
    const out = [];
    ['none', 'single', 'x'].forEach(f => { if (L.results.push[f] == null) out.push(['push', f]); });
    ['thatch', 'metal', 'tiles'].forEach(r => { if (L.results.roof[r] == null) out.push(['roof', r]); });
    if (!L.results.ground.done) out.push(['ground', 'all']);
    return out;
  }
  function renderLab(api, el) {
    const S = api.S, L = labState(S), todo = labTodo(L), done = !todo.length;
    const tools = { push: 'Push test', roof: 'Roof weight', ground: 'Ground tray' };
    let tool = '';
    if (L.tool === 'push') {
      const v = pushView(L.push);
      tool = `<div class="tool"><div class="tool-frame">${v.svg}</div><div class="tool-controls">
        <p data-read>${api.gloss('Push the top of the frame sideways with a force of 2 kN, and measure how far it sways. Test all three frames.')}</p>
        <div class="seg">${Object.entries(BRACE).map(([k, b]) => `<label class="${L.push.frame === k ? 'on' : ''}"><input type="radio" name="frame" value="${k}" ${L.push.frame === k ? 'checked' : ''}> ${b.name}</label>`).join('')}</div>
        <label class="ctl" for="force"><span>Push: <output class="mono" id="force-out">${L.push.force} kN</output></span><input type="range" id="force" min="0" max="3" step="0.25" value="${L.push.force}"></label>
        <dl class="measures"><div><dt>Sway at the top</dt><dd class="mono" id="sway-out">${v.fails ? 'Frame folded over!' : v.sway + ' mm'}</dd></div></dl>
        <div class="actions"><button type="button" class="btn small primary" id="rec-push">Record at 2 kN</button></div><p class="calc-fb" id="push-fb" aria-live="polite"></p></div></div>`;
    } else if (L.tool === 'roof') {
      const r = ROOF[L.roof];
      tool = `<div class="tool"><div class="tool-frame" id="roof-frame">${frameSVG({ brace: 'single', roof: L.roof, ground: 'soil' })}</div><div class="tool-controls">
        <p data-read>${api.gloss('In a magnitude 6 earthquake on firm soil, the ground accelerates at 2.5 m/s². Calculate the force on each roof: force = mass × acceleration.')}</p>
        <div class="seg">${Object.entries(ROOF).map(([k, x]) => `<label class="${L.roof === k ? 'on' : ''}"><input type="radio" name="roof" value="${k}" ${L.roof === k ? 'checked' : ''}> ${x.name} (${x.kg.toLocaleString('en-GB')} kg)</label>`).join('')}</div>
        <div class="actions"><button type="button" class="btn small ghost" id="shake-roof">Shake it</button></div>
        <label class="field"><span>Force on the ${r.name.toLowerCase()} roof (in newtons)</span><input id="roof-f" inputmode="numeric" placeholder="${r.kg} × 2.5 = ?" value="${L.results.roof[L.roof] != null ? L.results.roof[L.roof] : ''}" ${L.results.roof[L.roof] != null ? 'disabled' : ''}></label>
        ${L.results.roof[L.roof] != null ? '<p class="calc-fb ok">Recorded.</p>' : '<div class="actions"><button type="button" class="btn small primary" id="rec-roof">Check and record</button></div><p class="calc-fb" id="roof-fb" aria-live="polite"></p>'}</div></div>`;
    } else {
      const g = L.results.ground;
      tool = `<div class="tool ground-tool"><div class="trays">${Object.entries(GROUND).map(([k, x]) => `<figure class="tray" id="tray-${k}">${frameSVG({ brace: 'single', roof: 'thatch', ground: k, verdict: g.done ? null : null, tilt: g.done && k === 'sand' ? 12 : 0, boils: g.done && k === 'sand' })}<figcaption>${x.name}${g.done ? ` · <strong class="mono">${(7 * x.amp).toFixed(1)} cm</strong>` : ''}</figcaption></figure>`).join('')}</div>
        <div class="tool-controls"><p data-read>${api.gloss('The same model building on three trays: rock, firm soil and loose wet sand. Shake all three trays with the same force and measure how far each one moves.')}</p>
          <div class="actions"><button type="button" class="btn small primary" id="shake-trays">${g.done ? 'Shake again' : 'Shake the trays'}</button></div>
          ${g.done ? '<p class="calc-fb ok">Recorded: rock 4.9 cm, firm soil 7.0 cm, loose sand 10.5 cm. Look at the building on sand!</p>' : ''}</div></div>`;
    }
    const qs = [
      { id: 'f1', text: 'Which frame swayed the most when pushed with 2 kN?', options: ['No braces', 'One diagonal per bay', 'X-braces'], correct: 0, explain: 'Without triangles, the square frame folded over completely.' },
      { id: 'f2', text: 'The tile roof is 4 times as heavy as the thatch roof. What happens to the earthquake force?', options: ['It is 4 times bigger', 'It stays the same', 'It is 4 times smaller'], correct: 0, explain: 'Force = mass × acceleration: 4 times the mass needs 4 times the force (6,000 N instead of 1,500 N).' },
      { id: 'f3', text: 'Why did the building on loose wet sand tilt?', options: ['Shaking made the wet sand soft, like a liquid, so the building sank', 'Sand is heavier than rock', 'The building was too light'], correct: 0, explain: 'This is liquefaction: the same thing happened under the hall.' }
    ];
    el.innerHTML = `<div class="bench">
      <div class="nb-head"><span class="mono">${7 - todo.length} of 7 measurements${todo.length ? ` · ${todo.length} to go` : ' · all done!'}</span>${todo.length ? '<button type="button" class="btn small primary" id="next-test">Next test →</button>' : ''}</div>
      <div class="tools" role="tablist">${Object.entries(tools).map(([k, n]) => `<button type="button" class="tool-tab ${L.tool === k ? 'on' : ''}" data-tool="${k}" id="tool-${k}" role="tab" aria-selected="${L.tool === k}">${n}</button>`).join('')}</div>
      <div class="tool-wrap">${tool}</div>
      <div class="table-wrap"><table class="tally-t notebook"><caption>Lab notebook</caption><tbody>
        <tr><th>Push test (sway at 2 kN)</th>${Object.entries(BRACE).map(([k, b]) => `<td>${b.name}: <strong class="mono">${L.results.push[k] != null ? (L.results.push[k] === 'fold' ? 'folded over' : L.results.push[k] + ' mm') : '—'}</strong></td>`).join('')}</tr>
        <tr><th>Earthquake force on the roof</th>${['thatch', 'metal', 'tiles'].map(k => `<td>${ROOF[k].name}: <strong class="mono">${L.results.roof[k] != null ? L.results.roof[k].toLocaleString('en-GB') + ' N' : '—'}</strong></td>`).join('')}</tr>
        <tr><th>Ground shaking</th>${Object.entries(GROUND).map(([k, x]) => `<td>${x.name}: <strong class="mono">${L.results.ground.done ? (7 * x.amp).toFixed(1) + ' cm' : '—'}</strong></td>`).join('')}</tr>
      </tbody></table></div></div>
      <div class="stage-tasks"><h2>What did you find?</h2>${done ? qs.map(q => api.question(q)).join('') + (api.answered(['f1', 'f2', 'f3']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Next: why did the hall fall?</button></div>' : '') : '<p class="note">Finish all 7 measurements to unlock the questions. Tap <strong>Next test</strong>.</p>'}</div>`;
    el.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { L.tool = b.dataset.tool; api.save(); api.rerender(); }));
    const nt = el.querySelector('#next-test'); if (nt) nt.addEventListener('click', () => { const [tl, v] = todo[0]; L.tool = tl; if (tl === 'push') L.push = { frame: v, force: 0 }; if (tl === 'roof') L.roof = v; api.save(); api.rerender(); el.querySelector('.bench').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    if (L.tool === 'push') {
      el.querySelectorAll('input[name=frame]').forEach(r => r.addEventListener('change', () => { L.push.frame = r.value; L.push.force = 0; api.save(); api.rerender(); }));
      const f = el.querySelector('#force');
      f.addEventListener('input', () => { L.push.force = Number(f.value); const v = pushView(L.push); el.querySelector('.tool-frame').innerHTML = v.svg; el.querySelector('#force-out').textContent = L.push.force + ' kN'; el.querySelector('#sway-out').textContent = v.fails ? 'Frame folded over!' : v.sway + ' mm'; });
      f.addEventListener('change', () => api.save());
      el.querySelector('#rec-push').addEventListener('click', () => {
        const fb = el.querySelector('#push-fb');
        if (L.push.force !== 2) { fb.className = 'calc-fb no'; fb.textContent = 'Set the push to exactly 2 kN, so the test is fair.'; return; }
        const v = pushView(L.push); L.results.push[L.push.frame] = v.fails ? 'fold' : v.sway; api.save(); api.rerender();
      });
    } else if (L.tool === 'roof') {
      el.querySelectorAll('input[name=roof]').forEach(r => r.addEventListener('change', () => { L.roof = r.value; api.save(); api.rerender(); }));
      el.querySelector('#shake-roof').addEventListener('click', () => { const d = { brace: 'single', roof: L.roof, ground: 'soil' }; shakeFrame(el.querySelector('#roof-frame'), d, { ratio: ROOF[L.roof].kg / 600, outcome: 'stands' }, () => {}); });
      const rr = el.querySelector('#rec-roof');
      if (rr) rr.addEventListener('click', () => {
        const v = Number(String(el.querySelector('#roof-f').value).replace(/[ ,]/g, '')), want = ROOF[L.roof].kg * 2.5, fb = el.querySelector('#roof-fb');
        if (v === want) { L.results.roof[L.roof] = want; api.save(); api.rerender(); } else { fb.className = 'calc-fb no'; fb.textContent = `Not quite: multiply the mass (${ROOF[L.roof].kg} kg) by 2.5.`; }
      });
    } else {
      el.querySelector('#shake-trays').addEventListener('click', () => {
        let left = 3;
        Object.keys(GROUND).forEach(k => shakeFrame(el.querySelector('#tray-' + k), { brace: 'single', roof: 'thatch', ground: k }, { ratio: GROUND[k].amp, outcome: 'stands' }, () => { left -= 1; if (!left) { L.results.ground.done = true; api.save(); api.rerender(); } }));
      });
    }
    api.bindQuestions(qs, () => { if (api.answered(['f1', 'f2', 'f3'])) { api.stepDone('measure'); api.complete('lab'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('h1'));
  }

  // ---------- stage 4: hypothesis 1 ----------
  const BINS = { frame: 'Weak frame', roof: 'Heavy roof', ground: 'Soft ground', none: 'Does not explain why only the hall fell' };
  function renderH1(api, el) {
    const S = api.S, st = S.data.h1 = S.data.h1 || { place: {}, pick: null };
    const cards = SPOTS.filter(sp => sp.id.startsWith('hall') || sp.id === 'seismo');
    const all = cards.every(c => st.place[c.id]);
    const q = { id: 'h1b', text: 'Now choose the best hypothesis.', options: ['The hall fell only because it had no braces', 'The hall fell only because of its heavy roof', 'The hall fell because several weaknesses came together: a weak frame, a heavy roof and soft ground', 'The earthquake was stronger at the hall'], correct: 2, explain: 'Your evidence points to three causes at once. In the next stage you will test whether fixing just one would have been enough.' };
    el.innerHTML = `<div class="board">
      <p class="board-help" data-read>Sort your evidence about the hall into causes. Tap a card, then tap a column.</p>
      <div class="cards">${cards.filter(c => !st.place[c.id]).map(c => `<button type="button" class="ev-card ${st.pick === c.id ? 'picked' : ''}" data-ev="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('') || '<p class="muted">All cards sorted.</p>'}</div>
      <div class="columns four">${Object.entries(BINS).map(([k, t]) => `<div class="ev-col" data-col="${k}" role="button" tabindex="0"><h3>${t}</h3>${cards.filter(c => st.place[c.id] === k).map(c => `<button type="button" class="ev-card placed ${st.wrong && st.wrong.includes(c.id) ? 'wrong' : ''}" data-back="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('')}</div>`).join('')}</div>
      <div class="actions"><button type="button" class="btn primary" id="check-board" ${all && !api.answered(['h1a']) ? '' : 'disabled'}>Check my sorting</button></div>
      <p class="calc-fb ${api.answered(['h1a']) ? 'ok' : ''}" id="board-fb" aria-live="polite">${api.answered(['h1a']) ? 'Correct. Five pieces of evidence point to three different causes.' : ''}</p></div>
      <div class="stage-tasks">${api.answered(['h1a']) ? api.question(q) : ''}${api.answered(['h1a', 'h1b']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Test it fairly</button></div>' : ''}</div>`;
    el.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { st.pick = st.pick === b.dataset.ev ? null : b.dataset.ev; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-col]').forEach(c => c.addEventListener('click', e => { if (e.target.closest('[data-back]') || !st.pick) return; st.place[st.pick] = c.dataset.col; st.pick = null; st.wrong = null; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { if (api.answered(['h1a'])) return; delete st.place[b.dataset.back]; st.wrong = null; api.save(); api.rerender(); }));
    const cb = el.querySelector('#check-board');
    if (cb) cb.addEventListener('click', () => {
      const wrong = cards.filter(c => st.place[c.id] !== c.cause).map(c => c.id), n = api.tries('h1a');
      if (!wrong.length) { api.award('h1a', n === 1); api.stepDone('sort'); api.rerender(); }
      else { st.wrong = wrong; api.save(); api.rerender(); const fb = el.querySelector('#board-fb'); fb.className = 'calc-fb no'; fb.textContent = `${wrong.length} card${wrong.length > 1 ? 's are' : ' is'} in the wrong column (marked in red).`; }
    });
    api.bindQuestions([q], () => { api.stepDone('hypothesis'); api.complete('h1'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('h2'));
  }

  // ---------- stage 5: fair test ----------
  const TESTS = [
    { id: 'old', label: 'The hall as it was', d: OLD },
    { id: 'brace', label: 'Change only the braces (X-braces)', d: Object.assign({}, OLD, { brace: 'x' }) },
    { id: 'roof', label: 'Change only the roof (thatch)', d: Object.assign({}, OLD, { roof: 'thatch' }) },
    { id: 'ground', label: 'Change only the ground (rock)', d: Object.assign({}, OLD, { ground: 'rock' }) },
    { id: 'two', label: 'X-braces and a thatch roof', d: Object.assign({}, OLD, { brace: 'x', roof: 'thatch' }) }
  ];
  function renderH2(api, el) {
    const S = api.S, st = S.data.h2 = S.data.h2 || { cur: 'old', ran: {} };
    const t = TESTS.find(x => x.id === st.cur), res = check(t.d);
    const needed = ['old', 'brace', 'roof', 'ground'], ready = needed.every(id => st.ran[id]);
    const qs = [
      { id: 'h2a', text: 'Did changing just one thing save the hall?', options: ['Yes, any one change was enough', 'No, the hall still collapsed after every single change'], correct: 1, explain: 'Each weakness alone was enough to bring the hall down. It needed more than one fix.' },
      { id: 'h2b', text: 'Which single change made the biggest difference?', options: ['X-braces', 'A thatch roof', 'Building on rock'], correct: 0, explain: 'X-braces cut the force-to-strength ratio from 8.75 to 1.25, the biggest drop of the three.' },
      { id: 'h2c', text: 'Why should you change only one thing at a time?', options: ['So you know which change caused the result', 'Because it is quicker', 'To use fewer materials'], correct: 0, explain: 'That is a fair test.' }
    ];
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Rebuild the hall in the simulation and run the same magnitude 6 earthquake. Change only one thing at a time: that is a fair test.')}</p></div>
      <div class="lab-grid">
        <div class="scene"><div class="scene-frame" id="ft-frame">${frameSVG(Object.assign({}, t.d, st.ran[t.id] ? { collapse: res.outcome === 'collapses' ? 1 : 0, damaged: res.outcome === 'damaged', verdict: res.outcome, tilt: t.d.ground === 'sand' && !t.d.footings ? 12 : 0, boils: t.d.ground === 'sand' } : {}))}</div></div>
        <div class="scene-side">
          <div class="test-list">${TESTS.map(x => `<button type="button" class="test-btn ${st.cur === x.id ? 'on' : ''}" data-test="${x.id}">${esc(x.label)}${st.ran[x.id] ? ` <span class="pill ${check(x.d).outcome}">${check(x.d).outcome}</span>` : ''}</button>`).join('')}</div>
          <dl class="measures"><div><dt>Braces</dt><dd>${BRACE[t.d.brace].name}</dd></div><div><dt>Roof</dt><dd>${ROOF[t.d.roof].name}</dd></div><div><dt>Ground</dt><dd>${GROUND[t.d.ground].name}</dd></div></dl>
          <div class="actions"><button type="button" class="btn primary" id="run">Run the earthquake</button></div>
          ${st.ran[t.id] ? `<div class="calc-box mono">Force: (${ROOF[t.d.roof].kg} + 400) kg × 2.5 m/s² × ${GROUND[t.d.ground].amp} = ${res.force} kN<br>Strength: ${BRACE[t.d.brace].kN} kN${t.d.ground === 'sand' ? ' × 0.6 (soft sand)' : ''} = ${res.strength} kN<br><strong>Force ÷ strength = ${res.ratio}</strong> → ${res.outcome}</div>` : ''}
        </div></div>
      <div class="table-wrap"><table class="tally-t"><caption>Fair test results</caption><thead><tr><th>Test</th><th>Force (kN)</th><th>Strength (kN)</th><th>Force ÷ strength</th><th>Result</th></tr></thead><tbody>
        ${TESTS.filter(x => st.ran[x.id]).map(x => { const r = check(x.d); return `<tr><td>${esc(x.label)}</td><td class="mono">${r.force}</td><td class="mono">${r.strength}</td><td class="mono">${r.ratio}</td><td><span class="pill ${r.outcome}">${r.outcome}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">No tests yet.</td></tr>'}
      </tbody></table></div>
      <div class="stage-tasks">${ready ? qs.map((q, i) => (i === 0 || api.answered([qs[i - 1].id])) ? api.question(q) : '').join('') + (api.answered(['h2a', 'h2b', 'h2c']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Design the new hall</button></div>' : '') : `<p class="note">Run the first four tests: the hall as it was, then change only the braces, only the roof, only the ground (${needed.filter(id => !st.ran[id]).length} to go).</p>`}</div>`;
    el.querySelectorAll('[data-test]').forEach(b => b.addEventListener('click', () => { st.cur = b.dataset.test; api.save(); api.rerender(); }));
    el.querySelector('#run').addEventListener('click', () => {
      const btn = el.querySelector('#run'); btn.disabled = true;
      shakeFrame(el.querySelector('#ft-frame'), t.d, res, () => { st.ran[t.id] = true; api.save(); if (needed.every(id => st.ran[id])) api.stepDone('test'); api.rerender(); });
    });
    api.bindQuestions(qs, () => { if (api.answered(['h2a', 'h2b', 'h2c'])) { api.stepDone('conclude'); api.complete('h2'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('design'));
  }

  // ---------- stage 6: design the new hall ----------
  const COST = { brace: { none: 0, single: 15, x: 30 }, roof: { tiles: 25, thatch: 10, metal: 20 }, bolts: 15, footings: 25, straps: 5, move: 10 };
  const BUDGET = 90;
  function designCost(d) { return COST.brace[d.brace] + COST.roof[d.roof] + (d.bolts ? COST.bolts : 0) + (d.footings ? COST.footings : 0) + (d.straps ? COST.straps : 0) + (d.ground === 'soil' ? COST.move : 0); }
  function windCheck(d) {
    const demand = 6; // kN sideways at 130 km/h
    const strength = BRACE[d.brace].kN * (d.bolts ? 1.4 : 1);
    const uplift = d.roof !== 'tiles' && !d.straps;
    return { ratio: Math.round(demand / strength * 100) / 100, uplift, ok: demand / strength < 0.7 && !uplift };
  }
  function renderDesign(api, el) {
    const S = api.S, d = S.data.design = S.data.design || { brace: 'none', roof: 'tiles', ground: 'sand', bolts: false, footings: false, straps: false, runs: 0 };
    const cost = designCost(d), over = cost > BUDGET;
    const q = check(Object.assign({}, d, { mag: 7 })), w = windCheck(d);
    const radio = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<label class="${val === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${val === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
    const tick = (id, l, on) => `<label class="toggle"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span><strong>${l}</strong></span></label>`;
    const qd = { id: 'd2', text: 'Why are bolted steel plates better than single nails at the joints?', options: ['They hold the parts together firmly, so the frame stays strong while it shakes', 'They make the hall lighter', 'They stop rain getting in'], correct: 0, explain: 'In the old hall, nails bent and pulled out, and the frame came apart.' };
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Design the new school hall. It must survive a stronger, magnitude 7 earthquake and a 130 km/h storm, within a budget of 90 credits.')}</p></div>
      <div class="lab-grid">
        <div class="scene"><div class="scene-frame" id="ds-frame">${frameSVG(Object.assign({}, d, d.last ? { collapse: d.last.q === 'collapses' ? 1 : 0, damaged: d.last.q === 'damaged', verdict: d.last.q } : {}))}</div></div>
        <div class="scene-side">
          <div class="load ${over ? 'over' : ''}"><span class="mono big">${cost} / ${BUDGET} credits</span><div class="meter"><i style="width:${Math.min(100, cost / BUDGET * 100)}%"></i></div></div>
          <span class="field-l">Wall bracing</span>${radio('brace', [['none', 'None (0)'], ['single', 'Diagonals (15)'], ['x', 'X-braces (30)']], d.brace)}
          <span class="field-l">Roof</span>${radio('roof', [['tiles', 'Clay tiles (25)'], ['thatch', 'Thatch (10)'], ['metal', 'Metal sheets (20)']], d.roof)}
          <span class="field-l">Site</span>${radio('ground', [['sand', 'Same place, on sand (0)'], ['soil', 'Move to the firm field (10)']], d.ground)}
          ${tick('bolts', 'Bolted steel plates at the joints (15)', d.bolts)}${tick('footings', 'Deep foundations down to firm ground (25)', d.footings)}${tick('straps', 'Roof straps against the wind (5)', d.straps)}
          <div class="actions"><button type="button" class="btn primary" id="run" ${over ? 'disabled' : ''}>Test the design</button></div>
          ${over ? '<p class="note">Over budget. Remove something.</p>' : ''}
          ${d.last ? `<div class="gauges"><div class="${d.last.q === 'stands' ? '' : 'bad'}"><span>Magnitude 7 earthquake</span><b>${d.last.q} (${d.last.qr})</b></div><div class="${d.last.w ? '' : 'bad'}"><span>130 km/h storm</span><b>${d.last.w ? 'stands' : d.last.up ? 'roof blown off' : 'damaged'}</b></div></div>` : ''}
        </div></div>
      <div class="stage-tasks">${api.answered(['d1']) ? api.question(qd) : ''}${api.answered(['d1', 'd2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Write the case summary</button></div>' : ''}</div>`;
    el.querySelectorAll('input[name=brace], input[name=roof], input[name=ground]').forEach(r => r.addEventListener('change', () => { d[r.name] = r.value; d.last = null; api.save(); api.rerender(); }));
    ['bolts', 'footings', 'straps'].forEach(id => el.querySelector('#' + id).addEventListener('change', e => { d[id] = e.target.checked; d.last = null; api.save(); api.rerender(); }));
    el.querySelector('#run').addEventListener('click', () => {
      el.querySelector('#run').disabled = true;
      shakeFrame(el.querySelector('#ds-frame'), Object.assign({}, d), q, () => {
        d.runs += 1; d.last = { q: q.outcome, qr: q.ratio, w: w.ok, up: w.uplift }; api.save();
        if (q.outcome === 'stands' && w.ok) { api.award('d1', d.runs <= 2); api.stepDone('build'); }
        api.rerender();
      });
    });
    api.bindQuestions([qd], () => { api.stepDone('joints'); api.complete('design'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('summary'));
  }

  // ---------- stage 7: case summary ----------
  const RECS = [['Add diagonal or X-braces to every wall', true], ['Use light roofs, or make sure the frame is strong enough for a heavy one', true], ['Build on firm ground, or use deep foundations', true], ['Fix joints with bolted plates, not single nails', true], ['Paint buildings a different colour', false], ['Make the walls taller', false]];
  function renderSummary(api, el) {
    const S = api.S, chosen = S.data.recs || [], ok = api.answered(['s2']), d = S.data.design || {};
    const right = RECS.map((r, i) => (r[1] ? i : -1)).filter(i => i >= 0);
    const total = Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), max = CASE.stages.reduce((a, s) => a + (s.points || 0), 0);
    const report = () => ['OPERATION ISLAND 2040 · CASE FILE #2: THE FALLEN HALL', '', 'WHAT HAPPENED', 'A magnitude 6.1 earthquake made the school hall collapse; the clinic and the Okafor house next to it stayed standing.', '',
      'CAUSES', '- Weak frame: square wall frames with no braces, and joints held by single nails.', '- Heavy roof: 2,400 kg of clay tiles meant 4 times the earthquake force of a thatch roof.', '- Soft ground: loose wet sand amplified the shaking and turned soft (liquefaction).', '',
      'FAIR TEST', 'Changing only one weakness did not save the hall. X-braces made the biggest difference; braces plus a light roof made it safe.', '',
      'NEW DESIGN', `${BRACE[d.brace || 'none'].name}; ${ROOF[d.roof || 'tiles'].name.toLowerCase()} roof; ${GROUND[d.ground || 'sand'].name.toLowerCase()}${d.bolts ? '; bolted joints' : ''}${d.footings ? '; deep foundations' : ''}${d.straps ? '; roof straps' : ''}.`, '',
      'RECOMMENDATIONS', ...((S.data.recs || []).map(i => '- ' + RECS[i][0])), '', 'MESSAGE TO THE COUNCIL', (S.data.message || '').trim() || '—'].join('\n');
    el.innerHTML = `<div class="report">
      <div class="report-head"><span class="stamp ${ok ? 'closed' : ''}">${ok ? 'Case closed' : 'Draft'}</span><div><p class="eyebrow">Engineer's report</p><h2>The Fallen Hall</h2></div></div>
      <div class="report-grid">
        <section><h3>What happened</h3><p>A magnitude 6.1 earthquake. The school hall collapsed; the clinic and the Okafor house stood.</p></section>
        <section><h3>The causes</h3><ul><li><strong>Weak frame:</strong> no braces, single-nail joints.</li><li><strong>Heavy roof:</strong> 2,400 kg of tiles, 4× the force of thatch.</li><li><strong>Soft ground:</strong> loose wet sand shook harder and turned soft.</li></ul></section>
        <section><h3>The fair test</h3><p>No single fix saved the hall. X-braces helped most; braces plus a light roof made it safe.</p></section>
        <section><h3>The new hall</h3><p>${BRACE[d.brace || 'none'].name} · ${ROOF[d.roof || 'tiles'].name} · ${GROUND[d.ground || 'sand'].name}${d.bolts ? ' · bolted joints' : ''}${d.footings ? ' · deep foundations' : ''}${d.straps ? ' · roof straps' : ''}</p></section>
      </div>
      <h3>Recommendations for every new building on the island</h3>
      <div class="cq-options">${RECS.map((r, i) => `<label class="${chosen.includes(i) ? 'on' : ''}"><input type="checkbox" data-rec="${i}" ${chosen.includes(i) ? 'checked' : ''} ${ok ? 'disabled' : ''}> ${esc(r[0])}</label>`).join('')}</div>
      ${ok ? '<p class="calc-fb ok">These four rules would protect every new building on the island.</p>' : '<div class="actions"><button type="button" class="btn" id="check-recs">Check recommendations</button></div><p class="calc-fb" id="recs-fb" aria-live="polite"></p>'}
      <label class="field"><span>Message to the village council</span><textarea id="message" rows="4">${esc(S.data.message || '')}</textarea></label>
      ${ok ? `<div class="final"><span class="mono big">${total} / ${max}</span><span>Final score. Well done, Engineer!</span></div>` : ''}
      <div class="actions"><button type="button" class="btn ghost" id="copy-report">Copy the report</button>${ok ? '<a class="btn primary" href="#cases">Back to Case Files</a>' : ''}</div>
      <p class="muted" id="copy-status" aria-live="polite"></p><textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea></div>`;
    el.querySelectorAll('[data-rec]').forEach(c => c.addEventListener('change', () => { const i = Number(c.dataset.rec); S.data.recs = c.checked ? chosen.concat(i) : chosen.filter(x => x !== i); api.save(); api.rerender(); }));
    el.querySelector('#message').addEventListener('input', e => { S.data.message = e.target.value; api.save(); });
    const cr = el.querySelector('#check-recs');
    if (cr) cr.addEventListener('click', () => {
      const n = api.tries('s2');
      if ((S.data.recs || []).slice().sort().join(',') === right.join(',')) { api.award('s2', n === 1); api.stepDone('recs'); api.complete('summary'); OI.store.get().log.case2 = { score: Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), at: new Date().toISOString() }; api.save(); api.rerender(); }
      else { const fb = el.querySelector('#recs-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Not quite. Which rules deal with the three causes and the joints? Is anything missing, or useless?'; }
    });
    el.querySelector('#copy-report').addEventListener('click', () => {
      const txt = report(), status = el.querySelector('#copy-status'), ta = el.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied.'; }, fallback); } catch (e) { fallback(); }
    });
  }

  const CASE = {
    id: 'hall', number: 2, title: 'The Fallen Hall', glossary: GLOSSARY, handbook: HANDBOOK,
    stages: [
      { id: 'intro', title: 'Introduction', color: '#E8613C', points: 2, steps: [{ id: 'briefing', title: 'The council\'s message' }], render: renderIntro,
        coach: [{ sel: '#case-stage .term', text: 'Orange words are in the glossary. Tap one.' }, { sel: '.before-after', text: 'Compare the hall before and after the earthquake.' }, { sel: '.cq', text: 'Answer the question to start.' }] },
      { id: 'site', title: 'Site inspection', color: '#F0A33A', points: 2, steps: [{ id: 'inspect', title: 'Inspect the site' }, { id: 'compare', title: 'Compare the buildings' }], render: renderSite,
        coach: [{ sel: '[data-spot="hall-walls"]', text: 'Tap a magnifying glass to inspect that part of the site.' }, { sel: '.tally-t', text: 'Your findings are saved in the engineer\'s notebook.' }] },
      { id: 'lab', title: 'Force lab', color: '#D9B92E', points: 6, steps: [{ id: 'measure', title: 'Push, weigh and shake' }], render: renderLab,
        coach: [{ sel: '#tool-push', text: 'Three experiments. Start with the push test.' }, { sel: '#next-test', text: 'Tap Next test to go to the next measurement.' }] },
      { id: 'h1', title: 'Hypothesis 1', color: '#8CC152', points: 4, steps: [{ id: 'sort', title: 'Sort the causes' }, { id: 'hypothesis', title: 'Choose a hypothesis' }], render: renderH1,
        coach: [{ sel: '.ev-card', text: 'Tap a card, then tap the cause it belongs to.' }] },
      { id: 'h2', title: 'Hypothesis 2', color: '#3FB6A8', points: 6, steps: [{ id: 'test', title: 'Run fair tests' }, { id: 'conclude', title: 'Draw conclusions' }], render: renderH2,
        coach: [{ sel: '.test-list', text: 'Choose a test. Each one changes only one thing.' }, { sel: '#run', text: 'Run the earthquake and watch.' }] },
      { id: 'design', title: 'New hall', color: '#4FA3E0', points: 4, steps: [{ id: 'build', title: 'Design and test' }, { id: 'joints', title: 'Joints' }], render: renderDesign,
        coach: [{ sel: '.scene-side .seg', text: 'Choose the design. Watch your budget.' }, { sel: '#run', text: 'Test it against a magnitude 7 earthquake and a storm.' }] },
      { id: 'summary', title: 'Case summary', color: '#9B8BE0', points: 2, steps: [{ id: 'recs', title: 'Recommendations' }], render: renderSummary,
        coach: [{ sel: '[data-rec="0"]', text: 'Choose the rules for every new building on the island.' }] }
    ]
  };

  OI.cases = OI.cases || {};
  OI.cases.hall = { def: CASE, check, mount(el) { this.inst = OI.caseKit.mount(el, CASE); }, unmount() { if (this.inst) this.inst.unmount(); } };
})();
