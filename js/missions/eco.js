/* Mission 5 — Protect the Ecosystem.
 * Briefing → Food web (cause and effect) → Land-use plan and predict → 10-year test → Debrief
 */
(function () {
  const W = OI.world, E = OI.eco, esc = OI.ui.esc, pips = OI.ui.pips;
  const PHASES = [{ id: 'briefing', label: 'Briefing' }, { id: 'web', label: 'Food web' }, { id: 'plan', label: 'Plan and predict' }, { id: 'test', label: '10-year test' }, { id: 'debrief', label: 'Debrief' }];
  const NEEDS = { food: 'Food for everyone', economy: 'Self-sufficiency', reef: 'Reef and fish', forest: 'Forest', wildlife: 'Turtles and seabirds' };
  const PILLARS = [{ name: 'Society', needs: ['food'] }, { name: 'Economy', needs: ['economy'] }, { name: 'Environment', needs: ['reef', 'forest', 'wildlife'] }];
  const WEB = [
    { q: 'Too many boats catch the parrotfish that graze algae on the reef. What happens next?', options: ['Algae spreads and smothers the coral', 'The coral grows faster', 'Nothing changes'], a: 0, why: 'Parrotfish keep algae short. Without them, algae covers the coral and blocks its light, so the whole reef suffers, including the fish people eat.' },
    { q: 'The forest on the hill is cleared for farms. Where does the soil go when it rains?', options: ['It stays on the hill', 'Down the river and onto the reef', 'It turns into sand'], a: 1, why: 'Tree roots hold soil. Without them, rain washes mud into the river and out to sea. Mud clouds the water and buries coral.' },
    { q: 'Chemical fertiliser washes from the farms into the lagoon. What happens?', options: ['The fish grow bigger', 'The water gets cleaner', 'Algae bloom and the water loses oxygen'], a: 2, why: 'Fertiliser feeds algae in the sea too. Algae blooms, then dies and rots, using up the oxygen fish need.' },
    { q: 'The village puts up bright lights near the turtle beach. What happens to the baby turtles?', options: ['They crawl towards the lights instead of the sea', 'They hatch faster', 'They are not affected'], a: 0, why: 'Hatchlings find the sea by heading for the brightest horizon, normally moonlight on the water. Electric lights lead them inland, where they die.' },
    { q: 'Mangroves are cut down to make room for houses. What happens to the reef fish?', options: ['More fish, because there is more space', 'Fewer fish, because young fish lose their nursery', 'No change, because mangroves are not in the sea'], a: 1, why: 'Many reef fish spend their first months hiding between mangrove roots. Mangroves also break storm waves before they reach the village.' }
  ];

  let root, map, timer = null, brush = 'farm', shownYear = 0;
  const st = () => OI.store.get();
  const ex = () => st().eco;
  const save = () => OI.store.save();
  function base() { const log = st().log.exploration; return log ? log.base : { r: 8, c: 11, grid: W.grid(8, 11), terrain: W.terrain(8, 11).name }; }
  function plan() { const s = ex(); if (!s.plan) { s.plan = E.defaultPlan(base()); save(); } return s.plan; }
  function go(phase) { ex().phase = phase; save(); render(); window.scrollTo({ top: 0 }); }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } }
  function header() {
    const idx = PHASES.findIndex(p => p.id === ex().phase);
    return `<header class="mission-head"><div><p class="eyebrow">Mission 5 · Operation Island 2040</p><h1 class="display">Protect the Ecosystem</h1></div>
      <ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol></header>`;
  }

  // ---------- map ----------
  function mapView() {
    const e = st().exploration, log = st().log.exploration, p = plan();
    const tiles = Object.entries(p.zones).map(([k, z]) => { const [r, c] = k.split(',').map(Number); return { r, c, fill: E.ZONES[z].color, label: E.ZONES[z].label }; });
    return { mode: 'overview', scouted: e.scouted, discovered: log ? log.discovered : W.FEATURES.map(f => f.id), base: base(), tiles };
  }
  function mountMap(onPick) {
    if (map) map.destroy();
    map = OI.createMap(root.querySelector('#map'), {
      getView: mapView, onPick: onPick || (() => {}),
      onHover: t => { const el = root.querySelector('#readout'); if (!el) return; if (!t) { el.textContent = 'Tap squares to paint them with the selected zone.'; return; } const z = plan().zones[W.key(t.r, t.c)]; el.innerHTML = `<span class="mono">Grid ${W.grid(t.r, t.c)}</span> · ${esc(W.terrain(t.r, t.c).name)}${z ? ' · ' + E.ZONES[z].name : ''}`; }
    });
    OI.ui.bindWorkspace(root);
    root.querySelector('#readout').textContent = 'Tap squares to paint them with the selected zone.';
  }

  // ---------- briefing ----------
  function renderBriefing() {
    const b = base(), log = st().log;
    root.innerHTML = header() + OI.ui.workspace(`
      <div class="radio"><span class="mono">RADIO · GHA Base</span><p>The settlement is a success, and more families are coming: 12 every year. In 10 years, 150 people will live here. Where will they live, farm and fish, and what will that do to the island?</p></div>
      <h2>A 10-year plan</h2>
      <p>The <strong>Biologist</strong> leads this mission, supported by the whole team. Your plan must feed everyone and keep the island alive: the reef, the forest, the turtles and the seabirds.</p>
      <h3>What you know already</h3>
      <ul class="near">
        <li>🏠 Your base at <span class="mono">Grid ${b.grid}</span>${log.exploration ? ' (Mission 1)' : ''}.</li>
        <li>🐢 Green turtles nest on the east beach at <span class="mono">Grid ${W.grid(6, 14)}</span>.</li>
        <li>🐦 Seabirds nest on the north cliffs at <span class="mono">Grid ${W.grid(1, 9)}</span>.</li>
        <li>🐟 The reef is full of fish, but fish can be caught faster than they breed.</li>
        <li>🌳 The forest holds the soil on the hills and gives timber.</li>
        ${log.water ? '<li>💧 Your water system from Mission 2 keeps running.</li>' : ''}
        ${log.power ? '<li>⚡ Your power system from Mission 4 lights the village.</li>' : ''}
      </ul>
      <p class="muted">Hands-on link: your observation walk (GooseChase) of the animals, plants, birds and weather.</p>
      <div class="actions"><button class="btn primary" id="next">Explore the food web</button></div>`);
    mountMap();
    root.querySelector('#next').addEventListener('click', () => go('web'));
  }

  // ---------- food web ----------
  function webDiagram() {
    const N = [
      ['sun', 'Sun', 300, 26], ['algae', 'Algae and seagrass', 150, 96], ['coral', 'Coral', 450, 96],
      ['parrot', 'Parrotfish (grazers)', 150, 166], ['small', 'Small reef fish', 450, 166],
      ['turtle', 'Turtles', 70, 236], ['grouper', 'Groupers and sharks', 300, 236], ['birds', 'Seabirds', 530, 236], ['people', 'People', 300, 306]
    ];
    const pos = Object.fromEntries(N.map(([id, , x, y]) => [id, { x, y }]));
    const E2 = [['sun', 'algae'], ['sun', 'coral'], ['algae', 'parrot'], ['algae', 'turtle'], ['coral', 'small'], ['parrot', 'grouper'], ['small', 'grouper'], ['small', 'birds'], ['grouper', 'people'], ['parrot', 'people']];
    return `<svg class="web" viewBox="0 0 600 330" role="img" aria-label="Reef food web: the sun feeds algae and coral; grazers and small fish eat them; groupers, sharks, seabirds and people eat the fish.">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="web-arrow"/></marker></defs>
      ${E2.map(([a, b]) => `<line x1="${pos[a].x}" y1="${pos[a].y + 12}" x2="${pos[b].x}" y2="${pos[b].y - 14}" class="web-edge" marker-end="url(#arr)"/>`).join('')}
      ${N.map(([id, label, x, y]) => `<g><rect x="${x - 78}" y="${y - 13}" width="156" height="26" rx="13" class="web-node ${id === 'people' ? 'people' : ''}"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="web-label">${label}</text></g>`).join('')}
    </svg>`;
  }
  function renderWeb() {
    if (map) { map.destroy(); map = null; }
    const s = ex();
    root.innerHTML = header() + `<div class="budget">
      <section><h2>Everything is connected</h2><p>Arrows show who eats whom: energy flows from the sun up to people. Change one part and the others feel it.</p><div class="web-wrap">${webDiagram()}</div></section>
      <section><h2>What happens next?</h2><p class="muted">Each answer is a chain of cause and effect. You will meet all of them in the 10-year test.</p>
        ${WEB.map((w, i) => `<div class="calc"><p><strong>${i + 1}. ${esc(w.q)}</strong></p>
          <div class="seg">${w.options.map((o, j) => `<label class="${s.web[i] === j ? 'on' : ''}"><input type="radio" name="w${i}" value="${j}" ${s.web[i] === j ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>
          <p class="calc-fb ${s.web[i] == null ? '' : s.web[i] === w.a ? 'ok' : 'no'}" id="wfb${i}">${s.web[i] == null ? '' : s.web[i] === w.a ? 'Correct. ' + esc(w.why) : 'Not quite. Think about what depends on what, then try again.'}</p></div>`).join('')}
      </section>
      <div class="actions"><button class="btn ghost" id="back">Back to briefing</button><button class="btn primary" id="next">Make the 10-year plan</button></div></div>`;
    WEB.forEach((w, i) => root.querySelectorAll(`input[name=w${i}]`).forEach(r => r.addEventListener('change', () => { s.web[i] = Number(r.value); save(); renderWeb(); })));
    root.querySelector('#back').addEventListener('click', () => go('briefing'));
    root.querySelector('#next').addEventListener('click', () => go('plan'));
  }

  // ---------- plan ----------
  function planPanel() {
    const p = plan(), sum = E.summary(p), s = ex(), pr = s.prediction || {};
    const farmFood = Object.entries(p.zones).filter(([, z]) => z === 'farm').reduce((a, [k]) => { const [r, c] = k.split(',').map(Number); return a + (W.code(r, c) === 'h' ? 15 : 25); }, 0);
    const radio = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<label class="${val === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${val === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
    return `
      <fieldset class="group"><legend>1 · Land use</legend>
        <p class="muted">Choose a zone, then tap squares on the map. Tap a square again to clear it.</p>
        <div class="brushes">${Object.entries(E.ZONES).map(([k, z]) => `<button type="button" class="brush ${brush === k ? 'on' : ''}" data-brush="${k}" style="--zone:${z.color}"><span class="swatch" aria-hidden="true">${z.label}</span>${z.name}</button>`).join('')}</div>
        <dl class="measures">
          <div><dt>Village squares (40 people each)</dt><dd class="mono">${sum.village} → room for ${sum.village * 40}</dd></div>
          <div><dt>Farm squares</dt><dd class="mono">${sum.farm} → feed about ${farmFood}</dd></div>
          <div><dt>Logging squares</dt><dd class="mono">${sum.logging}</dd></div>
          <div><dt>Protected squares</dt><dd class="mono">${sum.protect}</dd></div>
          <div><dt>People in year 10</dt><dd class="mono">150</dd></div>
        </dl>
        <small class="muted">Farms: grassland, forest or hills. Village: grows out from your base. Logging: forest only. Protected: anywhere on land.</small>
      </fieldset>
      <fieldset class="group"><legend>2 · Fishing</legend>
        <div class="ctl"><label for="boats"><span>Fishing boats</span><output class="mono" id="boats-out">${p.boats} boats</output></label><input type="range" id="boats" min="0" max="10" value="${p.boats}">
          <small class="muted">Each boat catches about 6 t a year. The Biologist estimates the reef can safely give about ${E.FISH_R * E.FISH_K / 4} t a year. 1 t of fish feeds 4 people for a year.</small></div>
        <label class="toggle"><input type="checkbox" id="reserve" ${p.reserve ? 'checked' : ''}><span><strong>Marine reserve</strong><small>No fishing on a third of the reef. Boats catch 20% less, but fish breed 30% faster.</small></span></label>
      </fieldset>
      <fieldset class="group"><legend>3 · Farming and waste</legend>
        <span class="field-l">Fertiliser</span>${radio('fert', [['none', 'None'], ['chemical', 'Chemical (+30% food)'], ['compost', 'Compost (+15%)']], p.fertiliser)}
        <span class="field-l">Waste</span>${radio('waste', [['sea', 'Dump in the sea'], ['burn', 'Burn it'], ['landfill', 'Landfill'], ['compost', 'Compost and recycle']], p.waste)}
        ${p.fertiliser === 'compost' && p.waste !== 'compost' ? '<p class="note">Compost fertiliser needs waste to be composted.</p>' : ''}
      </fieldset>
      <fieldset class="group"><legend>4 · Forest and wildlife</legend>
        <span class="field-l">Logging</span>${radio('logging', [['clear', 'Clear-cut'], ['select', 'Selective, with replanting']], p.logging)}
        <label class="toggle"><input type="checkbox" id="lightRules" ${p.lightRules ? 'checked' : ''}><span><strong>Turtle-friendly lights</strong><small>Low, shielded orange lights near the beach. Halves the harm to nesting turtles.</small></span></label>
      </fieldset>
      <form id="predict" class="predict"><h3>Predict before you test</h3>
        <fieldset><legend>Will there still be plenty of fish in year 10?</legend>${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="pfish" value="${v}" ${pr.fish === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <fieldset><legend>Will everyone be fed every year?</legend>${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="pfed" value="${v}" ${pr.fed === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Which living thing is most at risk from your plan?</span><select id="prisk"><option value="">Choose</option>${[['fish', 'Reef fish'], ['coral', 'Coral'], ['forest', 'Forest'], ['turtles', 'Turtles'], ['birds', 'Seabirds'], ['none', 'None of them']].map(([v, l]) => `<option value="${v}" ${pr.risk === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Our reason</span><textarea id="preason" rows="2" placeholder="We think… because…">${esc(pr.reason || '')}</textarea></label>
        <button class="btn primary" type="submit">Run 10 years</button>
      </form>`;
  }
  function renderPlan() {
    root.innerHTML = header() + OI.ui.workspace(planPanel());
    mountMap(paint); bindPlan();
  }
  function refreshPlan() {
    const y = window.scrollY;
    root.querySelector('#panel').innerHTML = planPanel(); bindPlan(); map.draw(); window.scrollTo({ top: y });
  }
  function paint(t) {
    const p = plan(), k = W.key(t.r, t.c), b = base(), el = root.querySelector('#readout');
    if (k === W.key(b.r, b.c)) { el.textContent = 'This is your base: it stays part of the village.'; return; }
    if (p.zones[k] === brush) { delete p.zones[k]; save(); return refreshPlan(); }
    if (!E.canZone(brush, t.r, t.c)) { el.textContent = `${E.ZONES[brush].name} cannot go on ${W.terrain(t.r, t.c).name.toLowerCase()}.`; return; }
    if (brush === 'village' && !W.neighbours(t.r, t.c).some(n => p.zones[W.key(n.r, n.c)] === 'village')) { el.textContent = 'The village grows out from your base: choose a square next to the village.'; return; }
    p.zones[k] = brush; save(); refreshPlan();
  }
  function bindPlan() {
    const p = plan(), s = ex();
    root.querySelectorAll('[data-brush]').forEach(b => b.addEventListener('click', () => { brush = b.dataset.brush; refreshPlan(); }));
    const boats = root.querySelector('#boats');
    boats.addEventListener('input', () => { root.querySelector('#boats-out').textContent = `${boats.value} boats`; });
    boats.addEventListener('change', () => { p.boats = Number(boats.value); save(); refreshPlan(); });
    ['reserve', 'lightRules'].forEach(id => root.querySelector('#' + id).addEventListener('change', e => { p[id] = e.target.checked; save(); refreshPlan(); }));
    [['fert', 'fertiliser'], ['waste', 'waste'], ['logging', 'logging']].forEach(([n, key]) => root.querySelectorAll(`input[name=${n}]`).forEach(r => r.addEventListener('change', () => { p[key] = r.value; save(); refreshPlan(); })));
    const keep = () => { const fd = new FormData(root.querySelector('#predict')); s.prediction = { fish: fd.get('pfish'), fed: fd.get('pfed'), risk: root.querySelector('#prisk').value, reason: root.querySelector('#preason').value.trim() }; save(); };
    root.querySelectorAll('#predict input, #predict textarea, #predict select').forEach(el => el.addEventListener('change', keep));
    root.querySelector('#predict').addEventListener('submit', e => { e.preventDefault(); keep(); s.pendingTest = true; save(); go('test'); });
  }

  // ---------- 10-year test ----------
  const SERIES = [
    { key: 'fed', title: 'People fed (%)', max: 100, unit: '%' },
    { key: 'fish', title: 'Reef fish (tonnes)', max: 200, unit: ' t' },
    { key: 'reef', title: 'Reef health (%)', max: 100, unit: '%' },
    { key: 'cover', title: 'Forest cover (%)', max: 100, unit: '%' },
    { key: 'turtles', title: 'Turtle nests', max: 80, unit: '' },
    { key: 'birds', title: 'Seabird pairs', max: 450, unit: '' }
  ];
  const START = { fed: null, fish: 160, reef: 95, cover: 100, turtles: 40, birds: 300 };
  function mini(series, res, upto) {
    const Wd = 300, H = 150, L = 34, R = 10, T = 26, B = 24, x0 = L, x1 = Wd - R, y0 = H - B;
    const X = y => x0 + (y / 10) * (x1 - x0), Y = v => y0 - (Math.min(v, series.max) / series.max) * (y0 - T);
    const pts = [];
    if (START[series.key] != null) pts.push([0, START[series.key]]);
    res.years.slice(0, upto).forEach(y => pts.push([y.y, y[series.key]]));
    const path = pts.map(([x, v], i) => `${i ? 'L' : 'M'}${X(x)},${Y(v)}`).join(' ');
    const lastP = pts[pts.length - 1];
    const area = pts.length > 1 ? `${path} L${X(lastP[0])},${y0} L${X(pts[0][0])},${y0} Z` : '';
    return `<figure class="mini"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${series.title} over 10 years">
      <text x="${x0}" y="14" class="ax-t">${series.title}</text>
      ${[0, series.max / 2, series.max].map(v => `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${x0 - 5}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${[0, 5, 10].map(y => `<text x="${X(y)}" y="${H - 6}" class="ax" text-anchor="${y === 0 ? 'start' : y === 10 ? 'end' : 'middle'}">${y ? 'Year ' + y : 'Now'}</text>`).join('')}
      ${pts.length > 1 ? `<path d="${area}" class="st-area"/><path d="${path}" class="st-line"/>` : ''}
      ${lastP ? `<circle cx="${X(lastP[0])}" cy="${Y(lastP[1])}" r="4" class="pt"/><text x="${Math.min(X(lastP[0]) + 6, x1 - 30)}" y="${Y(lastP[1]) - 7}" class="ax-v">${lastP[1]}${series.unit}</text>` : ''}
    </svg></figure>`;
  }
  function charts(res, upto) { return `<div class="minis">${SERIES.map(sr => mini(sr, res, upto)).join('')}</div>`; }
  function renderTest() {
    if (map) { map.destroy(); map = null; }
    const s = ex(), res = E.simulate(plan());
    shownYear = 0;
    root.innerHTML = header() + `<div class="workspace test-space">
      <div class="map-col chart-col"><div class="chart-frame" id="charts">${charts(res, 0)}</div></div>
      <aside class="panel" id="panel"><h2>10 years on the island</h2><div id="year"></div><div class="actions"><button class="btn ghost" id="skip">Skip to the result</button></div></aside></div>`;
    const yearBox = () => { const y = res.years[Math.max(0, shownYear - 1)]; root.querySelector('#year').innerHTML = shownYear ? `<div class="gauges"><div><span>Year</span><b class="mono">${y.y} / 10</b></div><div><span>People</span><b class="mono">${y.people}</b></div>
      <div><span>Food from farms</span><b class="mono">${y.farmFood} people</b></div><div><span>Fish caught</span><b class="mono">${y.catchT} t</b></div>
      <div class="${y.fed < 95 ? 'bad' : ''}"><span>People fed</span><b class="mono">${y.fed}%</b></div><div><span>Shipped in</span><b class="mono">${y.imports} credits</b></div></div>` : '<p class="muted">Year 0: 30 people.</p>'; };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = () => { stop(); shownYear = 10; root.querySelector('#charts').innerHTML = charts(res, 10); yearBox(); results(res); };
    root.querySelector('#skip').addEventListener('click', end);
    yearBox();
    if (reduce) return end();
    const tick = () => { shownYear += 1; root.querySelector('#charts').innerHTML = charts(res, shownYear); yearBox(); if (shownYear >= 10) return end(); timer = setTimeout(tick, 650); };
    timer = setTimeout(tick, 400);
  }
  function explain(res, p) {
    const l = res.last, lines = [];
    const sum = E.summary(p);
    lines.push(`Fishing: ${p.boats} boats × 6 t = up to ${p.boats * 6} t a year, against a safe yield of about ${res.msy} t. ${l.fish < 60 ? 'The fish were caught faster than they could breed, and the stock crashed.' : l.fish < 110 ? 'The stock shrank: the catch was more than the reef could replace.' : 'The stock stayed healthy.'}${p.reserve ? ' The marine reserve let fish breed faster.' : ''}`);
    lines.push(`Food: ${sum.farm} farm squares and the fish catch fed ${res.fedYears === 10 ? 'everyone every year' : `everyone in only ${res.fedYears} of 10 years`}. ${res.imports ? `The GHA shipped in food and timber worth ${res.imports} credits.` : 'Nothing had to be shipped in.'}`);
    lines.push(`Reef health ended at ${l.reef}%. ${l.reef < 75 ? 'Mud from cleared land, fertiliser or waste in the sea clouded the water.' : 'Clean water from the land kept the coral healthy.'}${p.waste === 'sea' ? ' Waste dumped in the sea harmed the reef and the turtles.' : ''}${p.fertiliser === 'chemical' ? ' Chemical fertiliser fed algae blooms in the lagoon.' : ''}`);
    lines.push(`Forest cover ended at ${l.cover}%.${p.logging === 'clear' && sum.logging ? ' Clear-cutting stripped the logging squares.' : ''}${sum.logging === 0 ? ' With no logging squares, timber for new houses had to be shipped in.' : ''}`);
    lines.push(`Turtles: ${l.turtles} nests (from 40). Seabirds: ${l.birds} pairs (from 300).`);
    if (res.housingShort) lines.push(`In ${res.housingShort} of 10 years there were not enough village squares: families lived crowded together.`);
    return lines;
  }
  function results(res) {
    stop();
    const s = ex(), p = plan(), pr = s.prediction || {}, l = res.last;
    if (s.pendingTest) { s.attempts.push({ total: res.total, fedYears: res.fedYears, fish: l.fish, reef: l.reef, cover: l.cover, turtles: l.turtles, birds: l.birds, plan: JSON.parse(JSON.stringify(p)) }); s.pendingTest = false; save(); }
    const plenty = l.fish >= 100, allFed = res.fedYears === 10;
    const drops = { fish: 1 - l.fish / 160, coral: 1 - l.reef / 95, forest: 1 - l.cover / 100, turtles: 1 - l.turtles / 40, birds: 1 - l.birds / 300 };
    const worst = Object.entries(drops).sort((a, b) => b[1] - a[1])[0];
    const riskName = { fish: 'reef fish', coral: 'coral', forest: 'forest', turtles: 'turtles', birds: 'seabirds', none: 'none of them' };
    const actualRisk = worst[1] > 0.1 ? worst[0] : 'none';
    const mark = (pv, ok) => !pv || pv === 'unsure' ? '<span class="verdict">Not predicted</span>' : ok ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>Year 10 report</h2>
      <div class="compare">
        <div><h3>Fish</h3><p>You predicted: <strong>${pr.fish === 'yes' ? 'plenty left' : pr.fish === 'no' ? 'not many left' : 'not sure'}</strong>.<br>Result: <strong>${l.fish} t</strong> (from 160 t).</p>${mark(pr.fish, (pr.fish === 'yes') === plenty)}</div>
        <div><h3>Food</h3><p>You predicted: <strong>${pr.fed === 'yes' ? 'everyone fed' : pr.fed === 'no' ? 'not always' : 'not sure'}</strong>.<br>Result: <strong>fed in ${res.fedYears} of 10 years</strong>.</p>${mark(pr.fed, (pr.fed === 'yes') === allFed)}</div>
      </div>
      <p>Most at risk: <strong>${riskName[actualRisk]}</strong>${pr.risk ? `. You predicted ${riskName[pr.risk]}.` : '.'}</p>
      <h3>The science</h3><ul class="science">${explain(res, p).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="score"><div class="score-total"><span class="mono big">${res.total}<small>/15</small></span><span>Ecosystem score</span></div>
        ${PILLARS.map(Pl => `<div class="pillar"><p class="label">${Pl.name} pillar</p><ul class="needs">${Pl.needs.map(k => `<li><div class="need-row"><strong>${NEEDS[k]}</strong>${pips(res.scores[k])}</div><p>${esc(note(k, res))}</p></li>`).join('')}</ul></div>`).join('')}</div>
      <h3>Talk about it</h3><ul class="prompts"><li>What happened there? Which change started a chain reaction?</li><li>What do you think will happen if we use fewer boats, or a marine reserve?</li><li>Who gains and who loses from your plan: people, fish, turtles, birds?</li></ul>
      ${s.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Change the plan</button><button class="btn primary" id="debrief">Debrief</button></div>`;
    root.querySelector('#retry').addEventListener('click', () => go('plan'));
    root.querySelector('#debrief').addEventListener('click', () => go('debrief'));
  }
  function note(k, res) {
    const l = res.last;
    if (k === 'food') return `Everyone fed in ${res.fedYears} of 10 years.`;
    if (k === 'economy') return res.imports ? `${res.imports} credits of food and timber shipped in.` : 'Nothing shipped in: the island supports itself.';
    if (k === 'reef') return `Reef health ${l.reef}%, ${l.fish} t of fish.`;
    if (k === 'forest') return `${l.cover}% of the forest still standing.`;
    return `${l.turtles} turtle nests, ${l.birds} seabird pairs.`;
  }
  function attemptsTable() {
    const a = ex().attempts, best = Math.max(...a.map(x => x.total));
    return `<div class="table-wrap"><table class="attempts"><caption>Plans tested</caption><thead><tr><th>#</th><th>Boats</th><th>Fed</th><th>Fish</th><th>Forest</th><th>Turtles</th><th>Score</th></tr></thead>
      <tbody>${a.map((x, i) => `<tr class="${x.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${x.plan.boats}</td><td class="mono">${x.fedYears}/10</td><td class="mono">${x.fish} t</td><td class="mono">${x.cover}%</td><td class="mono">${x.turtles}</td><td class="mono">${x.total}/15</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- debrief ----------
  const JOURNAL = [
    'Describe one chain of cause and effect from your 10 years.',
    'Why can catching too many fish hurt the coral, the birds and the people?',
    'How did your plan balance feeding people with protecting nature?',
    'Which part of your plan would be hardest to agree on in a real community? Why?',
    'What did your observation walk show you about the animals, plants, birds and weather where you are?',
    'What is one thing your own school or town could do to protect its ecosystem?'
  ];
  const CHOICE = [['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2], ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]];
  function reportText() {
    const s = ex(), p = plan(), sum = E.summary(p), last = s.attempts[s.attempts.length - 1];
    const lines = ['OPERATION ISLAND 2040 · MISSION 5 REPORT: PROTECT THE ECOSYSTEM', `Team: ${st().team.name || 'Unnamed team'}`, '',
      `Plan: ${sum.village} village, ${sum.farm} farm, ${sum.logging} logging and ${sum.protect} protected squares; ${p.boats} fishing boats${p.reserve ? ' with a marine reserve' : ''}; fertiliser: ${p.fertiliser}; waste: ${p.waste}; logging: ${p.logging === 'clear' ? 'clear-cut' : 'selective'}${p.lightRules ? '; turtle-friendly lights' : ''}`,
      last ? `Year 10: everyone fed in ${last.fedYears}/10 years, fish ${last.fish} t, reef ${last.reef}%, forest ${last.cover}%, turtles ${last.turtles} nests, seabirds ${last.birds} pairs, score ${last.total}/15` : '', '',
      'OBSERVATION WALK (HANDS-ON)', `Animals: ${s.debrief.oAnimals || '—'}`, `Plants: ${s.debrief.oPlants || '—'}`, `Birds: ${s.debrief.oBirds || '—'}`, `Weather: ${s.debrief.oWeather || '—'}`, '',
      'JOURNAL', ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(s.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION', ...CHOICE.map(([id, l]) => `${l}:\n${(s.debrief[id] || '').trim() || '—'}\n`)];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    if (map) { map.destroy(); map = null; }
    const s = ex(), last = s.attempts[s.attempts.length - 1];
    if (!last) return go('plan');
    const field = (id, label, rows) => `<label class="field"><span>${label}</span><textarea id="${id}" rows="${rows}">${esc(s.debrief[id] || '')}</textarea></label>`;
    root.innerHTML = header() + `<div class="debrief-2">
      <section class="panel"><h2>Hands-on link: observation walk</h2>
        <p>Go outside (with GooseChase if you are using it) and observe the behaviour of the animals, the plants, the birds and the weather. Record what you notice.</p>
        ${field('oAnimals', 'The animals', 2)}${field('oPlants', 'The plants', 2)}${field('oBirds', 'The birds', 2)}${field('oWeather', 'The weather', 2)}
        <p class="note">Which of the connections in the island's food web can you see where you are? How could people here live in a more sustainable way?</p>
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
    root.querySelectorAll('textarea').forEach(el => { if (el.id !== 'report-text') el.addEventListener('input', () => { s.debrief[el.id] = el.value; save(); }); });
    root.querySelector('#copy').addEventListener('click', () => {
      const txt = reportText(), status = root.querySelector('#copy-status'), ta = root.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied. Paste it into a document or email.'; }, fallback); } catch (err) { fallback(); }
    });
    root.querySelector('#done').addEventListener('click', () => {
      s.completed = true;
      st().log.eco = { score: last.total, fedYears: last.fedYears, fish: last.fish, reef: last.reef, cover: last.cover, turtles: last.turtles, birds: last.birds, zones: plan().zones, at: new Date().toISOString() };
      save(); location.hash = '';
    });
  }

  function render() {
    stop();
    const ph = ex().phase;
    if (ph === 'web') return renderWeb();
    if (ph === 'plan') return renderPlan();
    if (ph === 'test') return renderTest();
    if (ph === 'debrief') return renderDebrief();
    return renderBriefing();
  }
  OI.missions = OI.missions || {};
  OI.missions.eco = { mount(el) { root = el; render(); }, unmount() { stop(); if (map) { map.destroy(); map = null; } root = null; } };
})();
