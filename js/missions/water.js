/* Mission 2 — The Water Crisis.
 * Briefing → Water budget (maths) → Design and predict → 30-day test → Debrief
 */
(function () {
  const W = OI.world, M = OI.water, esc = OI.ui.esc, pips = OI.ui.pips;
  const PHASES = [
    { id: 'briefing', label: 'Briefing' },
    { id: 'budget', label: 'Water budget' },
    { id: 'design', label: 'Design and predict' },
    { id: 'test', label: '30-day test' },
    { id: 'debrief', label: 'Debrief' }
  ];
  const NEEDS = { enough: 'Enough water', safe: 'Safe to drink', hygiene: 'Hygiene', cost: 'Cost', environment: 'Environment' };
  const PILLARS = [
    { name: 'Society', needs: ['enough', 'safe', 'hygiene'] },
    { name: 'Economy', needs: ['cost'] },
    { name: 'Environment', needs: ['environment'] }
  ];
  const QUALITY = {
    safe: { label: 'Safe', text: 'Every source feeding the tank is clean.' },
    unknown: { label: 'Unknown', text: 'The spring water was never tested (no test kit), so nobody can say it is safe.' },
    germs: { label: 'Germs', text: 'Rain washes dirt and bird droppings off the roof into the tank. A first-flush diverter would stop that.' },
    cloudy: { label: 'Cloudy and germs', text: 'River water is muddy and carries germs. It mixes with everything else in the tank.' }
  };

  let root, map, timer = null, shownDay = 0;
  const st = () => OI.store.get();
  const wx = () => st().water;
  const save = () => OI.store.save();
  const ctx = () => M.context(st());
  const fmt = n => Math.round(n).toLocaleString('en-GB');

  function header() {
    const idx = PHASES.findIndex(p => p.id === wx().phase);
    return `<header class="mission-head"><div><p class="eyebrow">Mission 2 · Operation Island 2040</p><h1 class="display">The Water Crisis</h1></div>
      <ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol></header>`;
  }
  function go(phase) { wx().phase = phase; save(); render(); window.scrollTo({ top: 0 }); }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } }

  // ---------- map ----------
  function mapView() {
    const c = ctx(), e = st().exploration, d = wx().design;
    const lines = [], rings = [];
    if (c.spring) { rings.push({ r: c.spring.f.r, c: c.spring.f.c, color: '#5FB4E0' }); if (d.spring) lines.push({ a: c.spring.f, b: c.base, color: '#5FB4E0' }); }
    if (c.river) { rings.push({ r: c.river.f.r, c: c.river.f.c, color: '#9FC9D6' }); if (d.river) lines.push({ a: c.river.f, b: c.base, color: '#E9F4F2', dash: true }); }
    return { mode: c.fromMission1 ? 'overview-fog' : 'overview', scouted: e.scouted, discovered: c.fromMission1 ? st().log.exploration.discovered : W.FEATURES.map(f => f.id), base: c.base, lines, rings };
  }
  function mountMap() {
    if (map) map.destroy();
    map = OI.createMap(root.querySelector('#map'), {
      getView: mapView,
      onHover: t => { const el = root.querySelector('#readout'); if (el) el.innerHTML = t ? `<span class="mono">Grid ${W.grid(t.r, t.c)}</span> · ${esc(W.terrain(t.r, t.c).name)}` : 'Your base is marked with the yellow flag. Water sources your team found are circled.'; },
      onPick: () => {}
    });
    OI.ui.bindWorkspace(root);
    root.querySelector('#readout').textContent = 'Your base is marked with the yellow flag. Water sources your team found are circled.';
  }

  function sourcesList(c) {
    const rows = [];
    rows.push(`<li><strong>Rain</strong> on your shelter roofs (${M.BASE_ROOF} m² to start).</li>`);
    if (c.spring) rows.push(`<li><strong>Freshwater spring</strong>, ${c.spring.d <= 1 && W.dist(c.base, c.spring.f) === 0 ? 'right at the base' : W.metres(c.spring.d) + ' m away'}. ${c.springTested ? 'Tested safe by your Hydrologist.' : 'Never tested: you had no test kit.'}</li>`);
    else if (c.springTooFar) rows.push(`<li class="muted">Freshwater spring: found, but ${W.metres(c.springTooFar.d)} m away. Too far to pipe.</li>`);
    else rows.push('<li class="muted">No spring found near the base.</li>');
    if (c.river) rows.push(`<li><strong>${esc(c.river.f.name.replace(' water', ''))}</strong>, ${W.metres(c.river.d)} m away. Cloudy, needs treatment.</li>`);
    else rows.push('<li class="muted">No river or lake within 1 km of the base.</li>');
    rows.push('<li><strong>The sea</strong>: salty, but a solar still can turn it into pure water, slowly.</li>');
    return `<ul class="near">${rows.join('')}</ul>`;
  }

  // ---------- briefing ----------
  function renderBriefing() {
    const c = ctx(), w = wx();
    root.innerHTML = header() + OI.ui.workspace(`
      <div class="radio"><span class="mono">RADIO · GHA Base</span><p>Thirty settlers arrive at your base this week. They are counting on you for water: enough for drinking, cooking and washing, every day for their first 30 days. The weather service warns that the dry season is coming.</p></div>
      <h2>Your base: <span class="mono">Grid ${c.base.grid}</span></h2>
      ${c.fromMission1 ? `<p class="muted">From your Island Log (Mission 1).</p>` : `<p class="note">Your team has not finished Mission 1, so the GHA has chosen a base for you: the forest edge at Grid ${c.base.grid}. You know about every water source on the island.</p>`}
      <h3>Water your team knows about</h3>
      ${sourcesList(c)}
      <h3>Who leads?</h3>
      <p>The <strong>Hydrologist</strong> leads this mission and decides how to make the water safe. The <strong>Engineer</strong> designs the pipes and tanks. The others check the costs, the weather and the impact on the island.</p>
      <label class="toggle"><input type="checkbox" id="challenge" ${w.challenge ? 'checked' : ''}> <span><strong>Extra challenge:</strong> 15 more settlers arrive on day ${M.EXTRA.day}.</span></label>
      <div class="actions"><button class="btn primary" id="next">Work out the water budget</button></div>`);
    mountMap();
    root.querySelector('#challenge').addEventListener('change', ev => { w.challenge = ev.target.checked; save(); });
    root.querySelector('#next').addEventListener('click', () => go('budget'));
  }

  // ---------- water budget (maths) ----------
  function questions() {
    const L = wx().design.level, people = M.PEOPLE;
    return [
      { id: 'b1', q: `How many litres does the settlement need each day? (${people} people × ${L} L)`, a: people * L, work: `${people} × ${L} = ${fmt(people * L)} L per day` },
      { id: 'b2', q: 'How many litres for the whole 30 days?', a: people * L * 30, work: `${fmt(people * L)} × 30 = ${fmt(people * L * 30)} L` },
      { id: 'b3', q: `How much of that must be safe to drink each day? (${M.DRINK} L per person)`, a: people * M.DRINK, work: `${people} × ${M.DRINK} = ${people * M.DRINK} L. Only drinking water must be disinfected; washing water just needs to be clean.` },
      { id: 'b4', q: '1 mm of rain on 1 m² of roof gives 1 litre. Your 40 m² roof catches a 25 mm shower, and 80% reaches the tank. How many litres is that?', a: 800, work: '40 × 25 = 1,000 L of rain; 80% of 1,000 = 800 L' }
    ];
  }
  function renderBudget() {
    if (map) { map.destroy(); map = null; }
    const w = wx();
    root.innerHTML = header() + `<div class="budget">
      <section class="budget-levels"><h2>How much water does a person need?</h2>
        <p>Choose a daily amount per person. The questions below use your choice.</p>
        <div class="levels">${M.LEVELS.map(l => `<label class="level ${w.design.level === l.id ? 'on' : ''}"><input type="radio" name="level" value="${l.id}" ${w.design.level === l.id ? 'checked' : ''}><span class="mono big">${l.id} L</span><strong>${l.name}</strong><small>${l.note}</small></label>`).join('')}</div>
      </section>
      <section class="budget-qs"><h2>Calculate your water budget</h2>
        ${questions().map(q => `<div class="calc"><label for="${q.id}">${esc(q.q)}</label>
          <div class="calc-row"><input id="${q.id}" inputmode="decimal" value="${esc(w.answers[q.id] || '')}" placeholder="litres"><button class="btn small" data-check="${q.id}">Check</button></div>
          <p class="calc-fb" id="fb-${q.id}" aria-live="polite"></p>
          <details><summary>Show the working</summary><p class="mono">${esc(q.work)}</p></details></div>`).join('')}
      </section>
      <div class="actions"><button class="btn ghost" id="back">Back to briefing</button><button class="btn primary" id="next">Design the water system</button></div>
    </div>`;
    root.querySelectorAll('input[name=level]').forEach(r => r.addEventListener('change', () => { w.design.level = Number(r.value); save(); renderBudget(); }));
    questions().forEach(q => {
      const inp = root.querySelector('#' + q.id), fb = root.querySelector('#fb-' + q.id);
      const check = () => {
        const v = Number(String(inp.value).replace(/[ ,]/g, ''));
        w.answers[q.id] = inp.value; save();
        if (!inp.value.trim()) { fb.textContent = ''; return; }
        fb.className = 'calc-fb ' + (v === q.a ? 'ok' : 'no');
        fb.textContent = v === q.a ? 'Correct.' : `Not quite. Check your working and try again.`;
      };
      root.querySelector(`[data-check="${q.id}"]`).addEventListener('click', check);
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') check(); });
      if (w.answers[q.id]) check();
    });
    root.querySelector('#back').addEventListener('click', () => go('briefing'));
    root.querySelector('#next').addEventListener('click', () => go('design'));
  }

  // ---------- design and predict ----------
  function designPanel() {
    const c = ctx(), w = wx(), d = w.design, p = w.prediction || {};
    const cost = M.cost(d, c), over = cost.total > M.BUDGET;
    const preview = M.simulate(d, c, w.challenge);
    const q = QUALITY[preview.quality];
    const slider = (id, label, min, max, step, val, unit, hint) => `<div class="ctl"><label for="${id}"><span>${label}</span><output class="mono" id="${id}-out">${fmt(val)} ${unit}</output></label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<small class="muted">${hint}</small>` : ''}</div>`;
    const check = (id, label, on, disabled, hint) => `<label class="toggle ${disabled ? 'off' : ''}"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</span></label>`;
    return `
      <div class="load ${over ? 'over' : ''}" role="meter" aria-valuemin="0" aria-valuemax="${M.BUDGET}" aria-valuenow="${cost.total}" aria-label="Budget used">
        <span class="mono big">${cost.total} / ${M.BUDGET} credits</span><div class="meter"><i style="width:${Math.min(100, cost.total / M.BUDGET * 100)}%"></i></div>
        <span class="muted">${over ? `Over budget by ${cost.total - M.BUDGET} credits.` : `${M.BUDGET - cost.total} credits left`}</span>
        <details><summary>What you are paying for</summary><ul class="cost-list">${cost.items.map(([n, v]) => `<li><span>${esc(n)}</span><span class="mono">${v}</span></li>`).join('') || '<li>Nothing yet</li>'}</ul></details>
      </div>
      <fieldset class="group"><legend>1 · Collect</legend>
        ${slider('roof', 'Roof catchment area', 40, 300, 10, d.roof, 'm²', `${M.BASE_ROOF} m² of shelter roof is free. Extra roof and gutters: 1 credit per 10 m².`)}
        ${check('spring', 'Pipe the spring to the base', d.spring && !!c.spring, !c.spring, c.spring ? `${W.metres(c.spring.d)} m of ${c.bamboo ? 'bamboo pipe (your team found bamboo, so it costs half)' : 'pipe'}. 900 L/day after rain, less in dry weather.` : 'Your team did not find a spring within 1 km of the base.')}
        ${check('river', `Hand pump on the ${c.river ? esc(c.river.f.name.replace(' water', '').toLowerCase()) : 'river'}`, d.river && !!c.river, !c.river, c.river ? `Up to 800 L/day of cloudy water, ${W.metres(c.river.d)} m of hose.` : 'No river or lake within 1 km of the base.')}
        ${slider('still', 'Solar still (sea water to pure water)', 0, 20, 1, d.still, 'm²', '4 L per m² on a sunny day, 1 L when cloudy. 3 credits per m².')}
      </fieldset>
      <fieldset class="group"><legend>2 · Store</legend>
        ${slider('tanks', '1,000-litre tanks', 0, 20, 1, d.tanks, 'tanks', `8 credits each. Plus ${M.BASE_STORE} L of buckets and cans. Total storage: ${fmt(preview.capacity)} L.`)}
      </fieldset>
      <fieldset class="group"><legend>3 · Make it safe</legend>
        ${check('firstFlush', 'First-flush diverter', d.firstFlush, false, 'Sends the first, dirty rain off the roof away from the tank. 2 credits.')}
        ${check('filter', 'Sand and gravel filter (AquaQuest)', d.filter, false, 'Removes mud and most germs. Makes cloudy water clear. 10 credits.')}
        ${check('chlorine', 'Chlorine tablets', d.chlorine, false, c.tablets ? 'You packed purification tablets: enough for 10,000 L. Free.' : 'You did not pack tablets. A GHA supply drop costs 20 credits. Only works on clear water.')}
        ${slider('bottles', 'Solar disinfection bottles (SODIS)', 0, 200, 10, d.bottles, 'bottles', 'Clear bottles left in the sun for 6 hours. 1.5 L each per sunny day. Only works on clear water.')}
        ${check('boil', 'Boil the drinking water', d.boil, false, `Always works, but every 4 L needs about 1 kg of firewood from the forest.${c.pot ? ' You packed a cooking pot.' : ''}`)}
      </fieldset>
      <fieldset class="group"><legend>4 · Daily use</legend>
        <div class="seg">${M.LEVELS.map(l => `<label class="${d.level === l.id ? 'on' : ''}"><input type="radio" name="dlevel" value="${l.id}" ${d.level === l.id ? 'checked' : ''}> ${l.id} L <small>${l.name}</small></label>`).join('')}</div>
      </fieldset>
      <div class="quality q-${preview.quality}"><span class="label">Tank water</span><strong>${q.label}</strong><p>${q.text}</p></div>
      <form id="predict" class="predict">
        <h3>Predict before you test</h3>
        <fieldset><legend>Will the settlement run out of water in the 30 days?</legend>
          ${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="runout" value="${v}" ${p.runout === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>If yes, on which day? <span class="muted">(optional)</span></span><input id="pday" inputmode="numeric" value="${esc(p.day || '')}" placeholder="e.g. 18"></label>
        <fieldset><legend>Will the drinking water be safe every day?</legend>
          ${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="safe" value="${v}" ${p.safe === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Our reason</span><textarea id="preason" rows="2" placeholder="We think… because…">${esc(p.reason || '')}</textarea></label>
        <button class="btn primary" type="submit" ${over ? 'disabled' : ''}>Run the 30-day test</button>
        ${over ? '<p class="note">You are over budget. Remove something before testing.</p>' : ''}
      </form>`;
  }
  function renderDesign() {
    root.innerHTML = header() + OI.ui.workspace(designPanel());
    mountMap();
    bindDesign();
  }
  function refreshDesign() {
    const y = window.scrollY, active = document.activeElement && document.activeElement.id;
    root.querySelector('#panel').innerHTML = designPanel(); bindDesign(); map.draw();
    window.scrollTo({ top: y });
    if (active) { const el = root.querySelector('#' + active); if (el) el.focus(); }
  }
  function bindDesign() {
    const w = wx(), d = w.design;
    ['roof', 'still', 'tanks', 'bottles'].forEach(id => {
      const el = root.querySelector('#' + id);
      el.addEventListener('input', () => { root.querySelector('#' + id + '-out').textContent = `${fmt(el.value)} ${{ roof: 'm²', still: 'm²', tanks: 'tanks', bottles: 'bottles' }[id]}`; });
      el.addEventListener('change', () => { d[id] = Number(el.value); save(); refreshDesign(); });
    });
    ['spring', 'river', 'firstFlush', 'filter', 'chlorine', 'boil'].forEach(id => {
      const el = root.querySelector('#' + id);
      el.addEventListener('change', () => { d[id] = el.checked; save(); refreshDesign(); });
    });
    root.querySelectorAll('input[name=dlevel]').forEach(r => r.addEventListener('change', () => { d.level = Number(r.value); save(); refreshDesign(); }));
    const keep = () => {
      const f = root.querySelector('#predict'), fd = new FormData(f);
      w.prediction = { runout: fd.get('runout'), day: root.querySelector('#pday').value.trim(), safe: fd.get('safe'), reason: root.querySelector('#preason').value.trim() };
      save();
    };
    root.querySelectorAll('#predict input, #predict textarea').forEach(el => el.addEventListener('change', keep));
    root.querySelector('#predict').addEventListener('submit', ev => { ev.preventDefault(); keep(); w.pendingTest = true; save(); go('test'); });
  }

  // ---------- chart ----------
  function chart(res, upto) {
    const Wd = 640, H = 330, L = 52, R = 12, T = 18, rainH = 70, gap = 34, stH = 170, x0 = L, x1 = Wd - R;
    const bw = (x1 - x0) / M.DAYS, X = i => x0 + i * bw;
    const maxRain = 40, maxSt = Math.max(1000, Math.ceil(res.capacity / 1000) * 1000);
    const rainY = v => T + rainH - (v / maxRain) * rainH;
    const sTop = T + rainH + gap, sY = v => sTop + stH - (v / maxSt) * stH;
    const days = res.days.slice(0, upto);
    const area = days.length ? `M${X(0)},${sY(0)} ` + days.map((dd, i) => `L${X(i) + bw / 2},${sY(dd.stored)}`).join(' ') + ` L${X(days.length - 1) + bw / 2},${sY(0)} Z` : '';
    const line = days.map((dd, i) => `${i ? 'L' : 'M'}${X(i) + bw / 2},${sY(dd.stored)}`).join(' ');
    const stripY = sTop + stH + 10;
    const yt = [0, maxSt / 2, maxSt];
    return `<svg class="wchart" viewBox="0 0 ${Wd} ${H + 40}" role="img" aria-label="Rainfall and stored water over 30 days">
      <text x="${x0}" y="${T - 6}" class="ax-t">Rainfall (mm per day)</text>
      ${[0, 20, 40].map(v => `<line x1="${x0}" x2="${x1}" y1="${rainY(v)}" y2="${rainY(v)}" class="grid"/><text x="${x0 - 6}" y="${rainY(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${days.map((dd, i) => dd.rain ? `<rect x="${X(i) + 2}" y="${rainY(dd.rain)}" width="${bw - 4}" height="${rainY(0) - rainY(dd.rain)}" rx="2" class="rainbar"/>` : '').join('')}
      <text x="${x0}" y="${sTop - 8}" class="ax-t">Water stored (litres)</text>
      ${yt.map(v => `<line x1="${x0}" x2="${x1}" y1="${sY(v)}" y2="${sY(v)}" class="grid"/><text x="${x0 - 6}" y="${sY(v) + 4}" class="ax" text-anchor="end">${fmt(v)}</text>`).join('')}
      <line x1="${x0}" x2="${x1}" y1="${sY(res.capacity)}" y2="${sY(res.capacity)}" class="cap"/>
      <text x="${x1}" y="${sY(res.capacity) - 5}" class="ax" text-anchor="end">Storage full: ${fmt(res.capacity)} L</text>
      ${days.length ? `<path d="${area}" class="st-area"/><path d="${line}" class="st-line"/>` : ''}
      ${days.map((dd, i) => !dd.enough ? `<rect x="${X(i) + 1}" y="${stripY}" width="${bw - 2}" height="10" rx="2" class="short"/>` : !dd.safe ? `<rect x="${X(i) + 1}" y="${stripY}" width="${bw - 2}" height="10" rx="2" class="unsafe"/>` : `<rect x="${X(i) + 1}" y="${stripY + 3}" width="${bw - 2}" height="4" rx="2" class="okday"/>`).join('')}
      ${[1, 5, 10, 15, 20, 25, 30].map(dn => `<text x="${X(dn - 1) + bw / 2}" y="${stripY + 28}" class="ax" text-anchor="middle">${dn}</text>`).join('')}
      <text x="${(x0 + x1) / 2}" y="${stripY + 44}" class="ax" text-anchor="middle">Day</text>
      ${res.days.map((dd, i) => `<rect x="${X(i)}" y="${T}" width="${bw}" height="${stripY + 12 - T}" class="hit" data-day="${i}"/>`).join('')}
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${stripY + 12}" visibility="hidden"/>
    </svg>`;
  }
  function chartLegend() {
    return `<ul class="chart-key"><li><i class="k-short"></i>Not enough water</li><li><i class="k-unsafe"></i>Drinking water not safe</li><li><i class="k-ok"></i>Enough safe water</li></ul>`;
  }
  function bindChartHover(res) {
    const svg = root.querySelector('.wchart'), tip = root.querySelector('#tip');
    if (!svg || !tip) return;
    const cross = svg.querySelector('.cross');
    svg.querySelectorAll('.hit').forEach(h => {
      const show = () => {
        const i = Number(h.dataset.day); if (i >= shownDay) return;
        const dd = res.days[i], x = Number(h.getAttribute('x')) + Number(h.getAttribute('width')) / 2;
        cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
        tip.hidden = false;
        tip.innerHTML = `<strong>Day ${dd.day}</strong> · ${dd.rain ? dd.rain + ' mm rain' : 'dry and sunny'}<br>
          Collected: ${fmt(dd.inflow.rain + dd.inflow.spring + dd.inflow.river + dd.inflow.still)} L · Used: ${fmt(dd.supplied)} of ${fmt(dd.demand)} L<br>
          Stored at night: ${fmt(dd.stored)} L${dd.overflow ? ` · Overflow lost: ${fmt(dd.overflow)} L` : ''}<br>
          ${!dd.enough ? '⚠ Not enough water' : !dd.safe ? '⚠ Drinking water not safe' : '✔ Enough safe water'}`;
        const box = svg.getBoundingClientRect(), wrap = svg.parentElement.getBoundingClientRect();
        const px = (x / 640) * box.width + (box.left - wrap.left);
        tip.style.left = Math.min(Math.max(8, px - 120), wrap.width - 250) + 'px';
      };
      h.addEventListener('pointerenter', show); h.addEventListener('pointerdown', show);
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }

  // ---------- 30-day test ----------
  function gauges(res, i) {
    const dd = res.days[Math.max(0, i - 1)];
    const pct = Math.round(dd.stored / res.capacity * 100);
    return `<div class="tank-wrap"><div class="tank" aria-hidden="true"><i style="height:${pct}%"></i></div>
      <div class="gauges">
        <div><span>Day</span><b class="mono">${dd.day} / 30</b></div>
        <div><span>Weather</span><b>${dd.rain ? dd.rain + ' mm rain' : 'Dry, sunny'}</b></div>
        <div><span>People</span><b class="mono">${dd.people}</b></div>
        <div><span>Stored</span><b class="mono">${fmt(dd.stored)} L</b></div>
        <div class="${dd.enough ? '' : 'bad'}"><span>Today's water</span><b class="mono">${fmt(dd.supplied)} / ${fmt(dd.demand)} L</b></div>
        <div class="${dd.safe ? '' : 'warn'}"><span>Drinking water</span><b>${dd.safe ? 'Safe' : 'Not safe'}</b></div>
      </div></div>`;
  }
  function renderTest() {
    if (map) { map.destroy(); map = null; }
    const w = wx(), res = M.simulate(w.design, ctx(), w.challenge);
    shownDay = 0;
    root.innerHTML = header() + `<div class="workspace test-space">
      <div class="map-col chart-col"><div class="chart-frame" id="chart">${chart(res, 0)}<div class="tip" id="tip" hidden></div></div>${chartLegend()}</div>
      <aside class="panel" id="panel"><h2>30 days on the island</h2><p>${w.challenge ? `${M.PEOPLE} settlers, and ${M.EXTRA.people} more on day ${M.EXTRA.day}.` : `${M.PEOPLE} settlers`} using ${w.design.level} L each per day.</p><div id="gauges">${gauges(res, 1)}</div><div class="actions"><button class="btn ghost" id="skip">Skip to the result</button></div></aside></div>`;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = () => {
      shownDay += 1;
      root.querySelector('#chart').innerHTML = chart(res, shownDay) + '<div class="tip" id="tip" hidden></div>';
      const g = root.querySelector('#gauges'); if (g) g.innerHTML = gauges(res, shownDay);
      if (shownDay >= M.DAYS) return results(res);
      timer = setTimeout(step, 240);
    };
    root.querySelector('#skip').addEventListener('click', () => { stop(); shownDay = M.DAYS; root.querySelector('#chart').innerHTML = chart(res, M.DAYS) + '<div class="tip" id="tip" hidden></div>'; results(res); });
    if (reduce) { shownDay = M.DAYS; root.querySelector('#chart').innerHTML = chart(res, M.DAYS) + '<div class="tip" id="tip" hidden></div>'; return results(res); }
    timer = setTimeout(step, 300);
  }

  function explain(res, d, c) {
    const lines = [];
    const dryStart = res.days[8].stored, dryEnd = res.days[25].stored;
    lines.push(`Daily need: ${M.PEOPLE} people × ${d.level} L = ${fmt(M.PEOPLE * d.level)} L. Storage: ${M.BASE_STORE} L + ${d.tanks} × 1,000 L = ${fmt(res.capacity)} L.`);
    const sources = [];
    const sum = k => fmt(res.days.reduce((a, x) => a + x.inflow[k], 0));
    if (d.roof) sources.push(`roof ${sum('rain')} L`);
    if (d.spring && c.spring) sources.push(`spring ${sum('spring')} L`);
    if (d.river && c.river) sources.push(`pump ${sum('river')} L`);
    if (d.still) sources.push(`solar still ${sum('still')} L`);
    lines.push(`Water collected over 30 days: ${sources.join(', ')}.`);
    const lost = res.days.reduce((a, x) => a + x.overflow, 0);
    if (lost) lines.push(`${fmt(lost)} L overflowed and was lost on rainy days because the tanks were full. More storage would have saved it for the dry spell.`);
    lines.push(`The dry spell (days 10–26) brought only 2 mm of rain. Your stored water went from ${fmt(dryStart)} L on day 9 to ${fmt(dryEnd)} L on day 26.`);
    if (res.firstShort) lines.push(`The settlement first ran short on day ${res.firstShort}. It had enough water on ${res.daysEnough} of 30 days.`);
    lines.push(`Tank water: ${QUALITY[res.quality].label.toLowerCase()}. ${QUALITY[res.quality].text}`);
    if (res.quality === 'cloudy' && !d.filter && (d.chlorine || d.bottles)) lines.push('Chlorine and solar bottles do not work on cloudy water. The sand filter would have cleared it first.');
    if (res.quality !== 'safe') lines.push(`Drinking water was safe on ${res.daysSafe} of 30 days.${res.wood ? ` Boiling used about ${fmt(res.wood)} kg of firewood.` : ''}`);
    const dryDays = res.days.filter(x => x.supplied === 0).length;
    if (dryDays) lines.push(`On ${dryDays} day${dryDays > 1 ? 's' : ''} the tanks were completely empty, so there was no safe drinking water at all.`);
    return lines;
  }
  function scoreCard(res) {
    return `<div class="score"><div class="score-total"><span class="mono big">${res.total}<small>/15</small></span><span>System score</span></div>
      ${PILLARS.map(P => `<div class="pillar"><p class="label">${P.name} pillar</p><ul class="needs">${P.needs.map(k => `<li><div class="need-row"><strong>${NEEDS[k]}</strong>${pips(res.scores[k])}</div><p>${esc(note(k, res))}</p></li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  function note(k, res) {
    const d = wx().design;
    if (k === 'enough') return `Enough water on ${res.daysEnough} of 30 days.`;
    if (k === 'safe') return `Safe drinking water on ${res.daysSafe} of 30 days.`;
    if (k === 'hygiene') return d.level >= 15 ? `${d.level} L per person: enough for washing and hygiene.` : '7.5 L per person: too little for washing. Illness spreads faster.';
    if (k === 'cost') return `${res.cost} of ${M.BUDGET} credits.`;
    return res.wood ? `${fmt(res.wood)} kg of firewood cut for boiling.` : 'No trees cut for fuel.';
  }
  function results(res) {
    stop();
    const w = wx(), d = w.design, c = ctx(), p = w.prediction || {};
    if (w.pendingTest) {
      w.attempts.push({ total: res.total, daysEnough: res.daysEnough, daysSafe: res.daysSafe, cost: res.cost, wood: res.wood, design: Object.assign({}, d), challenge: !!w.challenge });
      w.pendingTest = false; save();
    }
    const ranOut = res.daysEnough < 30;
    const runOk = p.runout === 'unsure' || !p.runout ? null : (p.runout === 'yes') === ranOut;
    const safeOk = p.safe === 'unsure' || !p.safe ? null : (p.safe === 'yes') === (res.daysSafe === 30);
    const mark = ok => ok == null ? '<span class="verdict">Not predicted</span>' : ok ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>Water report</h2>
      <div class="compare">
        <div><h3>Running out</h3><p>You predicted: <strong>${p.runout === 'yes' ? `yes${p.day ? ', around day ' + esc(p.day) : ''}` : p.runout === 'no' ? 'no' : 'not sure'}</strong>.<br>Result: <strong>${ranOut ? `short on ${30 - res.daysEnough} days, first on day ${res.firstShort}` : 'never ran out'}</strong>.</p>${mark(runOk)}</div>
        <div><h3>Safe to drink</h3><p>You predicted: <strong>${p.safe === 'yes' ? 'safe every day' : p.safe === 'no' ? 'not always safe' : 'not sure'}</strong>.<br>Result: <strong>safe on ${res.daysSafe} of 30 days</strong>.</p>${mark(safeOk)}</div>
      </div>
      <h3>The science</h3>
      <ul class="science">${explain(res, d, c).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      ${scoreCard(res)}
      <h3>Talk about it</h3>
      <ul class="prompts"><li>What happened there? When did things start to go wrong?</li><li>What do you think will happen if we add more storage, or a filter?</li><li>Which choice made the biggest difference?</li></ul>
      ${w.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Change the design</button><button class="btn primary" id="debrief">Debrief</button></div>`;
    bindChartHover(res);
    root.querySelector('#retry').addEventListener('click', () => go('design'));
    root.querySelector('#debrief').addEventListener('click', () => go('debrief'));
  }
  function attemptsTable() {
    const a = wx().attempts, best = Math.max(...a.map(x => x.total));
    return `<div class="table-wrap"><table class="attempts"><caption>Designs tested</caption>
      <thead><tr><th>#</th><th>Enough</th><th>Safe</th><th>Cost</th><th>Score</th></tr></thead>
      <tbody>${a.map((x, i) => `<tr class="${x.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${x.daysEnough}/30</td><td class="mono">${x.daysSafe}/30</td><td class="mono">${x.cost}</td><td class="mono">${x.total}/15</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- debrief ----------
  const JOURNAL = [
    'Where did your water come from, and why did you choose those sources?',
    'What happened during the dry spell? How did your design cope?',
    'Why does drinking water need more treatment than washing water?',
    'How did what your team found in Mission 1 affect your choices today?',
    'If 100 people lived here, what would you change and why?',
    'How does this mission change the way you think about water at home?'
  ];
  const CHOICE = [['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2], ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]];
  function reportText() {
    const s = st(), w = wx(), last = w.attempts[w.attempts.length - 1], d = w.design;
    const lines = ['OPERATION ISLAND 2040 · MISSION 2 REPORT: THE WATER CRISIS', `Team: ${s.team.name || 'Unnamed team'}`, `Base: Grid ${ctx().base.grid}`, '',
      `Design: ${d.level} L per person per day; roof ${d.roof} m²; ${d.tanks} tanks${d.spring ? '; spring pipe' : ''}${d.river ? '; river pump' : ''}${d.still ? `; solar still ${d.still} m²` : ''}`,
      `Treatment: ${[d.firstFlush && 'first-flush diverter', d.filter && 'sand filter', d.chlorine && 'chlorine', d.bottles && `${d.bottles} SODIS bottles`, d.boil && 'boiling'].filter(Boolean).join(', ') || 'none'}`,
      last ? `Result: enough water ${last.daysEnough}/30 days, safe drinking water ${last.daysSafe}/30 days, ${last.cost} credits, score ${last.total}/15` : '', '',
      'AQUAQUEST FILTER (HANDS-ON)', `Clarity before: ${w.debrief.clearBefore || '—'} / 5 · after: ${w.debrief.clearAfter || '—'} / 5 · time for 500 mL: ${w.debrief.time || '—'} s`, `Layers: ${w.debrief.layers || '—'}`, '',
      'JOURNAL', ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(w.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION', ...CHOICE.map(([id, label]) => `${label}:\n${(w.debrief[id] || '').trim() || '—'}\n`)];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    if (map) { map.destroy(); map = null; }
    const w = wx(), last = w.attempts[w.attempts.length - 1];
    if (!last) return go('design');
    const field = (id, label, rows, ph) => `<label class="field"><span>${label}</span>${rows ? `<textarea id="${id}" rows="${rows}">${esc(w.debrief[id] || '')}</textarea>` : `<input id="${id}" value="${esc(w.debrief[id] || '')}" placeholder="${ph || ''}" inputmode="decimal">`}</label>`;
    root.innerHTML = header() + `<div class="debrief-2">
      <section class="panel"><h2>Hands-on link: your AquaQuest filter</h2>
        <p>Build a real filter from sand, gravel, charcoal and cloth, and pour muddy water through it. Record what happened, then compare it with the simulation.</p>
        <div class="row3">${field('clearBefore', 'Clarity before (1 = muddy, 5 = crystal clear)', 0, '1–5')}${field('clearAfter', 'Clarity after (1–5)', 0, '1–5')}${field('time', 'Seconds to filter 500 mL', 0, 'e.g. 90')}</div>
        ${field('layers', 'Your layers, from top to bottom', 2)}
        <p class="note">The simulated sand filter removes mud and most germs, but not all of them. Even if your filtered water looks clear, would you drink it? What else would you need to do?</p>
      </section>
      <section class="panel"><h2>Mission debrief</h2>
        ${attemptsTable()}
        <form class="journal-form"><h3>Journal entries</h3><p class="muted">Your teacher may choose which questions to answer.</p>
          ${JOURNAL.map((q, i) => field('q' + i, `${i + 1}. ${q}`, 3)).join('')}
          <h3>Choice board: 3-2-1 reflection</h3>
          ${CHOICE.map(([id, label, n]) => field(id, label, n + 1)).join('')}
        </form>
        <div class="actions"><button class="btn ghost" id="copy">Copy mission report</button><button class="btn primary" id="done">${w.completed ? 'Update the Island Log' : 'Save to the Island Log'}</button></div>
        <p class="muted" id="copy-status" aria-live="polite"></p>
        <textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea>
      </section></div>`;
    root.querySelectorAll('input, textarea').forEach(el => { if (el.id && el.id !== 'report-text') el.addEventListener('input', () => { w.debrief[el.id] = el.value; save(); }); });
    root.querySelector('#copy').addEventListener('click', () => {
      const txt = reportText(), status = root.querySelector('#copy-status'), ta = root.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied. Paste it into a document or email.'; }, fallback); } catch (err) { fallback(); }
    });
    root.querySelector('#done').addEventListener('click', () => {
      w.completed = true;
      st().log.water = { score: last.total, daysEnough: last.daysEnough, daysSafe: last.daysSafe, design: last.design, at: new Date().toISOString() };
      save(); location.hash = '';
    });
  }

  function render() {
    stop();
    const ph = wx().phase;
    if (ph === 'budget') return renderBudget();
    if (ph === 'design') return renderDesign();
    if (ph === 'test') return renderTest();
    if (ph === 'debrief') return renderDebrief();
    return renderBriefing();
  }

  OI.missions = OI.missions || {};
  OI.missions.water = {
    mount(el) { root = el; render(); },
    unmount() { stop(); if (map) { map.destroy(); map = null; } root = null; }
  };
})();
