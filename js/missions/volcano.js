/* Mission 6 — The Volcano Wakes.
 * Briefing → Monitoring (10 days, alert levels) → Hazard map and plan → Eruption → Debrief
 */
(function () {
  const W = OI.world, V = OI.volcano, esc = OI.ui.esc, pips = OI.ui.pips;
  const PHASES = [{ id: 'briefing', label: 'Briefing' }, { id: 'monitor', label: 'Monitoring' }, { id: 'plan', label: 'Hazard map and plan' }, { id: 'eruption', label: 'Eruption' }, { id: 'debrief', label: 'Debrief' }];
  const NEEDS = { safety: 'People safe', homes: 'Homes', map: 'Hazard map', timing: 'Evacuation timing', land: 'Water and crops' };
  const PILLARS = [{ name: 'Society', needs: ['safety', 'homes', 'map'] }, { name: 'Economy', needs: ['timing'] }, { name: 'Environment', needs: ['land'] }];
  const HZ = {
    flow: { name: 'Burning gas flow', fill: 'rgba(52, 40, 38, 0.82)' },
    lava: { name: 'Lava', fill: 'rgba(232, 84, 24, 0.85)' },
    lahar: { name: 'Mudflow', fill: 'rgba(122, 86, 48, 0.8)' },
    ash: { name: 'Heavy ash (10 cm or more)', fill: 'rgba(120, 120, 120, 0.75)' }
  };
  const LEVEL_COL = { green: 'var(--good)', yellow: '#D4B000', orange: 'var(--warn)', red: 'var(--bad)' };

  let root, map, timer = null, mode = 'danger', eruptT = null;
  const st = () => OI.store.get();
  const vx = () => st().volcano;
  const save = () => OI.store.save();
  const ctx = () => V.context(st());
  function go(phase) { vx().phase = phase; save(); render(); window.scrollTo({ top: 0 }); }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } if (map) map.animate(false); }
  function header() {
    const idx = PHASES.findIndex(p => p.id === vx().phase);
    return `<header class="mission-head"><div><p class="eyebrow">Mission 6 · Operation Island 2040</p><h1 class="display">The Volcano Wakes</h1></div>
      <ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol></header>`;
  }

  // ---------- map ----------
  function homeTiles(c) { return c.homes.map(k => { const [r, cc] = k.split(',').map(Number); return { r, c: cc, fill: 'rgba(255,255,255,0.08)', label: 'H' }; }); }
  function mapView() {
    const s = vx(), c = ctx(), e = st().exploration, log = st().log.exploration;
    const view = { mode: 'overview', scouted: e.scouted, discovered: log ? log.discovered : W.FEATURES.map(f => f.id), base: c.base, tiles: [], rings: [] };
    const ph = s.phase;
    if (ph === 'eruption' && eruptT != null) {
      const H = V.hazards();
      Object.entries(H.ash).forEach(([k, cm]) => { const vis = Math.min(1, eruptT / 22); if (cm * vis >= 1) { const [r, cc] = k.split(',').map(Number); view.tiles.push({ r, c: cc, fill: `rgba(125,125,125,${Math.min(0.75, 0.15 + cm * vis / 25)})` }); } });
      Object.entries(H.tiles).forEach(([k, t]) => {
        const [r, cc] = k.split(',').map(Number);
        const show = type => (type === 'flow' && eruptT >= 2 + t.order.flow * 2) || (type === 'lava' && eruptT >= 6 + t.order.lava * 1.5) || (type === 'lahar' && eruptT >= 26 + (t.order.lahar - 5) * 1.2);
        ['ash', 'lahar', 'lava', 'flow'].forEach(type => { if (type !== 'ash' && t.types.includes(type) && show(type)) view.tiles.push({ r, c: cc, fill: HZ[type].fill }); });
      });
      view.tiles.push(...homeTiles(c));
      Object.keys(s.painted).forEach(k => { const [r, cc] = k.split(',').map(Number); view.rings.push({ r, c: cc, color: '#FFFFFF' }); });
    } else {
      view.tiles.push(...homeTiles(c));
      Object.keys(s.painted).forEach(k => { const [r, cc] = k.split(',').map(Number); view.tiles.push({ r, c: cc, fill: 'rgba(200, 50, 40, 0.5)', label: '!' }); });
    }
    if (s.assembly) { const [r, cc] = s.assembly.split(',').map(Number); view.rings.push({ r, c: cc, color: '#F2B630' }); }
    view.mode = 'overview';
    view.stormT = null;
    return view;
  }
  function mountMap(onPick) {
    if (map) map.destroy();
    map = OI.createMap(root.querySelector('#map'), {
      getView: mapView, onPick: onPick || (() => {}),
      onHover: t => {
        const el = root.querySelector('#readout'); if (!el) return;
        if (!t) { el.textContent = 'H = homes. The yellow flag is your base.'; return; }
        const k = W.key(t.r, t.c), H = V.hazards();
        const extra = vx().phase === 'eruption' && eruptT >= 34 ? (H.tiles[k] ? ' · ' + H.tiles[k].types.map(x => HZ[x].name).join(', ') : '') + (H.ash[k] ? ` · ash ${H.ash[k]} cm` : '') : '';
        el.innerHTML = `<span class="mono">Grid ${W.grid(t.r, t.c)}</span> · ${esc(W.terrain(t.r, t.c).name)} · ${W.elev(t.r, t.c)} m${extra}`;
      }
    });
    OI.ui.bindWorkspace(root);
    root.querySelector('#readout').textContent = 'H = homes. The yellow flag is your base.';
  }

  // ---------- briefing ----------
  function renderBriefing() {
    const c = ctx(), found = st().log.exploration && st().log.exploration.discovered.includes('vents');
    root.innerHTML = header() + OI.ui.workspace(`
      <div class="radio"><span class="mono">RADIO · GHA Volcano Desk</span><p>${found ? 'On day one of Operation Island, your Geologist found steam vents and sulphur crystals near the crater.' : 'Steam vents and sulphur crystals near the crater show that the volcano is active.'} Now the instruments are showing changes. The volcano may be waking up.</p></div>
      <h2>Your job</h2>
      <ol class="cycle">
        <li><strong>Monitor</strong> the volcano for 10 days and set the alert level each day.</li>
        <li><strong>Map the dangers</strong> on the island and choose a safe assembly point.</li>
        <li><strong>Protect</strong> homes, water and food with a 30-credit budget.</li>
      </ol>
      <p>The <strong>Geologist</strong> leads. The <strong>Meteorologist</strong> knows which way the wind blows the ash, the <strong>Hydrologist</strong> knows where water and mud will flow, and the <strong>Engineer</strong> protects the buildings.</p>
      <p class="note">Evacuating too late puts lives at risk. Evacuating too early means weeks away from farms, school and work. Volcanologists face this choice for real.</p>
      <p class="muted">${c.homes.length} home square${c.homes.length > 1 ? 's' : ''} (H) ${st().log.eco ? 'from your Mission 5 plan' : 'at your base'}.</p>
      <div class="actions"><button class="btn primary" id="next">Start monitoring</button></div>`);
    mountMap();
    root.querySelector('#next').addEventListener('click', () => go('monitor'));
  }

  // ---------- monitoring ----------
  const SERIES = [
    { key: 'quakes', title: 'Earthquakes per day', max: 120 },
    { key: 'swell', title: 'Ground swelling (mm)', max: 50 },
    { key: 'gas', title: 'Sulphur gas (tonnes per day)', max: 1400 }
  ];
  function mini(sr, upto) {
    const Wd = 300, H = 150, L = 40, R = 12, T = 26, B = 24, x0 = L, x1 = Wd - R, y0 = H - B;
    const X = d => x0 + ((d - 1) / 9) * (x1 - x0), Y = v => y0 - (v / sr.max) * (y0 - T);
    const vals = V.DATA[sr.key].slice(0, upto);
    const path = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1)},${Y(v)}`).join(' ');
    const last = vals.length ? vals[vals.length - 1] : null;
    return `<figure class="mini"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${sr.title}, days 1 to ${upto}">
      <text x="${x0}" y="14" class="ax-t">${sr.title}</text>
      ${[0, sr.max / 2, sr.max].map(v => `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${x0 - 5}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${[1, 5, 10].map(d => `<text x="${X(d)}" y="${H - 6}" class="ax" text-anchor="${d === 1 ? 'start' : d === 10 ? 'end' : 'middle'}">Day ${d}</text>`).join('')}
      ${vals.length > 1 ? `<path d="${path} L${X(vals.length)},${y0} L${X(1)},${y0} Z" class="st-area"/><path d="${path}" class="st-line"/>` : ''}
      ${vals.map((v, i) => `<circle cx="${X(i + 1)}" cy="${Y(v)}" r="3" class="pt"/>`).join('')}
      ${last != null ? `<text x="${Math.min(X(vals.length) + 6, x1 - 34)}" y="${Y(last) - 8}" class="ax-v">${last}</text>` : ''}
    </svg></figure>`;
  }
  function renderMonitor() {
    if (map) { map.destroy(); map = null; }
    const s = vx(), day = Math.max(1, s.day);
    const evac = s.alerts.indexOf('red');
    root.innerHTML = header() + `<div class="workspace test-space">
      <div class="map-col chart-col"><div class="chart-frame"><div class="minis three">${SERIES.map(sr => mini(sr, day)).join('')}</div></div>
        <div class="alert-strip" aria-label="Alert levels so far">${Array.from({ length: V.DAYS }, (_, i) => `<span class="${s.alerts[i] ? 'set' : ''}" style="--lv:${s.alerts[i] ? LEVEL_COL[s.alerts[i]] : 'var(--chip)'}" title="Day ${i + 1}: ${s.alerts[i] || 'not set'}">${i + 1}</span>`).join('')}</div></div>
      <aside class="panel" id="panel">
        <h2>Day ${day} of 10</h2>
        <div class="radio"><span class="mono">GEOLOGIST'S REPORT · DAY ${day}</span><p>${esc(V.NOTES[day - 1])}</p></div>
        <dl class="measures"><div><dt>Earthquakes today</dt><dd class="mono">${V.DATA.quakes[day - 1]}</dd></div><div><dt>Ground swelling</dt><dd class="mono">${V.DATA.swell[day - 1]} mm</dd></div><div><dt>Sulphur gas</dt><dd class="mono">${V.DATA.gas[day - 1]} t/day</dd></div></dl>
        ${evac >= 0 && evac < day - 1 ? `<p class="note">Everyone was evacuated on day ${evac + 1}. The team keeps watching the instruments from a safe distance.</p>` : `
        <fieldset class="group"><legend>Alert level for today</legend>
          <div class="levels-v">${V.LEVELS.map(l => `<label class="lv ${s.alerts[day - 1] === l.id ? 'on' : ''}" style="--lv:${LEVEL_COL[l.id]}"><input type="radio" name="lv" value="${l.id}" ${s.alerts[day - 1] === l.id ? 'checked' : ''}><b>${l.name}</b><small>${l.text}</small></label>`).join('')}</div>
        </fieldset>`}
        <div class="actions">${day > 1 ? '<button class="btn ghost" id="prev">Previous day</button>' : ''}
          <button class="btn primary" id="nextday" ${s.alerts[day - 1] ? '' : 'disabled'}>${day < V.DAYS ? 'Next day' : 'Make the hazard map'}</button></div>
        <p class="muted">Talk about it: which signal worries you most? What would make you say "evacuate"?</p>
      </aside></div>`;
    root.querySelectorAll('input[name=lv]').forEach(r => r.addEventListener('change', () => {
      s.alerts[day - 1] = r.value;
      // once evacuated, everyone stays out
      // changing a day clears the days after it; once evacuated, everyone stays out
      for (let i = day; i < V.DAYS; i++) s.alerts[i] = r.value === 'red' ? 'red' : null;
      save(); renderMonitor();
    }));
    const prev = root.querySelector('#prev'); if (prev) prev.addEventListener('click', () => { s.day = day - 1; save(); renderMonitor(); });
    root.querySelector('#nextday').addEventListener('click', () => {
      if (day < V.DAYS) { s.day = day + 1; if (!s.alerts[day] && s.alerts[day - 1] === 'red') s.alerts[day] = 'red'; save(); renderMonitor(); }
      else go('plan');
    });
  }

  // ---------- hazard map and plan ----------
  function planPanel() {
    const s = vx(), pr = s.prediction || {};
    const spent = Object.keys(V.PROTECT).filter(k => s.protect[k]).reduce((a, k) => a + V.PROTECT[k].cost, 0);
    const evac = s.alerts.indexOf('red');
    return `
      <p class="note">${evac >= 0 ? `You ordered the evacuation on day ${evac + 1}.` : 'You did not order an evacuation. People are still at home when the volcano erupts.'} <button type="button" class="linkish" id="to-monitor">Change the alert levels</button></p>
      <fieldset class="group"><legend>1 · Map the dangers</legend>
        <div class="brushes">
          <button type="button" class="brush ${mode === 'danger' ? 'on' : ''}" data-mode="danger" style="--zone:rgba(200,50,40,0.7)"><span class="swatch">!</span>Danger zone</button>
          <button type="button" class="brush ${mode === 'assembly' ? 'on' : ''}" data-mode="assembly" style="--zone:#F2B630"><span class="swatch">A</span>Assembly point</button>
        </div>
        <p class="muted">Paint every square you think lava, burning gas flows, mudflows or heavy ash could reach. Tap again to clear. Think: which way is downhill? Which way does the wind blow?</p>
        <dl class="measures"><div><dt>Danger squares painted</dt><dd class="mono">${Object.keys(s.painted).length}</dd></div><div><dt>Assembly point</dt><dd class="mono">${s.assembly ? 'Grid ' + W.grid(...s.assembly.split(',').map(Number)) : 'Not chosen'}</dd></div></dl>
        <p class="muted">Tip: hover over or tap squares to see their height. Your Meteorologist found in Mission 1 that the strong winds come from the east.</p>
      </fieldset>
      <fieldset class="group"><legend>2 · Protect (${spent} / ${V.BUDGET} credits)</legend>
        ${Object.entries(V.PROTECT).map(([k, p]) => `<label class="toggle ${!s.protect[k] && spent + p.cost > V.BUDGET ? 'off' : ''}"><input type="checkbox" data-protect="${k}" ${s.protect[k] ? 'checked' : ''} ${!s.protect[k] && spent + p.cost > V.BUDGET ? 'disabled' : ''}><span><strong>${p.name} · ${p.cost} credits</strong><small>${p.text}</small></span></label>`).join('')}
      </fieldset>
      <form id="predict" class="predict"><h3>Predict before the eruption</h3>
        <fieldset><legend>Will lava reach any homes?</legend>${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="plava" value="${v}" ${pr.lava === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <fieldset><legend>Which side of the island will get the most ash?</legend>${[['north', 'North'], ['east', 'East'], ['south', 'South'], ['west', 'West']].map(([v, l]) => `<label><input type="radio" name="pash" value="${v}" ${pr.ash === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Our reason</span><textarea id="preason" rows="2" placeholder="We think… because…">${esc(pr.reason || '')}</textarea></label>
        <button class="btn primary" type="submit" ${s.assembly ? '' : 'disabled'}>Watch the eruption</button>
        ${s.assembly ? '' : '<p class="muted">Choose an assembly point first.</p>'}
      </form>`;
  }
  function renderPlan() {
    root.innerHTML = header() + OI.ui.workspace(planPanel());
    mountMap(paint); bindPlan();
  }
  function refreshPlan() { const y = window.scrollY; root.querySelector('#panel').innerHTML = planPanel(); bindPlan(); map.draw(); window.scrollTo({ top: y }); }
  function paint(t) {
    const s = vx(), k = W.key(t.r, t.c);
    if (!W.isLand(t.r, t.c)) { root.querySelector('#readout').textContent = 'That is the sea. Paint land squares.'; return; }
    if (mode === 'assembly') s.assembly = k;
    else if (s.painted[k]) delete s.painted[k]; else s.painted[k] = 1;
    save(); refreshPlan();
  }
  function bindPlan() {
    const s = vx();
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; refreshPlan(); }));
    root.querySelectorAll('[data-protect]').forEach(cb => cb.addEventListener('change', () => { s.protect[cb.dataset.protect] = cb.checked; save(); refreshPlan(); }));
    root.querySelector('#to-monitor').addEventListener('click', () => { s.day = 1; save(); go('monitor'); });
    const keep = () => { const fd = new FormData(root.querySelector('#predict')); s.prediction = { lava: fd.get('plava'), ash: fd.get('pash'), reason: root.querySelector('#preason').value.trim() }; save(); };
    root.querySelectorAll('#predict input, #predict textarea').forEach(el => el.addEventListener('change', keep));
    root.querySelector('#predict').addEventListener('submit', e => { e.preventDefault(); keep(); s.pendingTest = true; save(); go('eruption'); });
  }

  // ---------- eruption ----------
  const EVENTS = [
    [0, 'Day 11, 03:00. With a deep boom, the volcano erupts.'],
    [2, 'Burning clouds of gas and rock race down the slopes near the crater.'],
    [6, 'Lava pours out and runs downhill, into the river valley.'],
    [12, 'The trade winds blow the ash cloud west. Ash falls like grey snow.'],
    [24, 'Day 12. Heavy rain mixes with the ash.'],
    [26, 'Mudflows (lahars) race down the river valley, faster than people can run.'],
    [36, 'Day 14. The eruption calms down. Time to count the damage.']
  ];
  function renderEruption() {
    const s = vx(), c = ctx(), res = V.evaluate(s, c);
    eruptT = 0;
    root.innerHTML = header() + OI.ui.workspace(`<h2>The eruption</h2><ol class="events" id="events"></ol>
      <ul class="chart-key">${Object.values(HZ).map(h => `<li><i style="background:${h.fill}"></i>${h.name}</li>`).join('')}<li><i class="k-ring"></i>Your danger zones</li></ul>
      <div class="actions"><button class="btn ghost" id="skip">Skip to the result</button></div>`);
    mountMap();
    const ev = () => { root.querySelector('#events').innerHTML = EVENTS.filter(([t]) => eruptT >= t).map(([, txt]) => `<li>${esc(txt)}</li>`).join(''); };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = () => { stop(); eruptT = 40; map.draw(); ev(); results(res); };
    root.querySelector('#skip').addEventListener('click', end);
    if (reduce) return end();
    const tick = () => { eruptT += 1; map.draw(); ev(); if (eruptT >= 40) return end(); timer = setTimeout(tick, 230); };
    ev(); timer = setTimeout(tick, 400);
  }
  function explain(res, s, c) {
    const H = V.hazards(), lines = [];
    lines.push(`Monitoring: earthquakes rose from 3 to 120 a day, the ground swelled 48 mm and sulphur gas rose 17 times. ${res.evacDay ? `You evacuated on day ${res.evacDay}, ${res.daysAway} day${res.daysAway > 1 ? 's' : ''} before the eruption.` : 'Nobody was evacuated.'}`);
    lines.push('Lava ran downhill from the crater into the river valley and on to the sea, the lowest path it could find.');
    lines.push('The trade winds blow from the east, so the ash fell on the west of the island: up to 40 cm near the crater, a few centimetres in the west valley, almost none in the east.');
    lines.push('Rain turned the ash into mudflows that followed the river, covering the same low land that floods in storms (Mission 1).');
    if (res.homesHit.length) lines.push(`${res.homesHit.length} home square${res.homesHit.length > 1 ? 's were' : ' was'} destroyed (${res.homesHit.map(k => 'Grid ' + W.grid(...k.split(',').map(Number))).join(', ')}).`);
    if (res.roofsLost.length) lines.push(`Heavy ash collapsed the roofs of ${res.roofsLost.length} home square${res.roofsLost.length > 1 ? 's' : ''}.`);
    else if (res.homesAsh.length && s.protect.roofs) lines.push('Steep roofs shed the heavy ash and stayed up.');
    if (res.baseAsh >= 0.5) lines.push(`${res.baseAsh} cm of ash fell on your base. ${s.protect.covers ? 'The tank covers kept the drinking water clean.' : 'Ash got into the open water tanks.'}`);
    if (res.farmsLost.length) lines.push(`${res.farmsLost.length} farm square${res.farmsLost.length > 1 ? 's were' : ' was'} buried. ${s.protect.seeds ? 'Stored seeds and food mean you can replant.' : 'Without stored seeds and food, there will be a hungry year.'}`);
    lines.push(`Your hazard map: you painted ${res.painted} squares; ${res.hit} of them were really hit, out of ${res.truth} dangerous squares (${res.accuracy}% match).`);
    if (s.assembly) lines.push(`Assembly point at Grid ${W.grid(...s.assembly.split(',').map(Number))}: ${res.assemblySafe ? 'safe' : 'in danger'}.`);
    void H; void c;
    return lines;
  }
  function note(k, res, s) {
    if (k === 'safety') return res.evacDay ? (res.assemblySafe ? 'Everyone evacuated in time to a safe assembly point.' : 'Evacuated, but the assembly point was in danger.') : res.settlementInDanger ? 'People were at home when danger reached the settlement.' : 'No one was hurt, but no one was evacuated either. You were lucky.';
    if (k === 'homes') return res.homesHit.length + res.roofsLost.length === 0 ? 'No homes lost.' : `${res.homesHit.length} destroyed, ${res.roofsLost.length} roofs collapsed under ash.`;
    if (k === 'map') return `${res.accuracy}% match between your map and the real danger zones.`;
    if (k === 'timing') return res.evacDay ? `People were away from home for ${res.daysAway} day${res.daysAway > 1 ? 's' : ''} before the eruption.` : 'No time lost, but no evacuation.';
    return `${res.waterBad ? 'Ash got into the drinking water. ' : 'Drinking water stayed clean. '}${res.farmsLost.length ? (s.protect.seeds ? 'Crops lost, but seeds were stored.' : 'Crops lost.') : 'Crops safe.'}`;
  }
  function results(res) {
    const s = vx(), c = ctx(), pr = s.prediction || {};
    if (s.pendingTest) { s.attempts.push({ total: res.total, evacDay: res.evacDay, accuracy: res.accuracy, homesHit: res.homesHit.length }); s.pendingTest = false; save(); }
    const lavaHomes = c.homes.some(k => { const t = V.hazards().tiles[k]; return t && t.types.includes('lava'); });
    const mark = (pv, ok) => !pv || pv === 'unsure' ? '<span class="verdict">Not predicted</span>' : ok ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>After the eruption</h2>
      <div class="compare">
        <div><h3>Lava</h3><p>You predicted: <strong>${pr.lava === 'yes' ? 'reaches homes' : pr.lava === 'no' ? 'misses homes' : 'not sure'}</strong>.<br>Result: <strong>${lavaHomes ? 'reached homes' : 'missed all homes'}</strong>.</p>${mark(pr.lava, (pr.lava === 'yes') === lavaHomes)}</div>
        <div><h3>Ash</h3><p>You predicted: <strong>${pr.ash || '—'}</strong>.<br>Result: <strong>west</strong>.</p>${mark(pr.ash, pr.ash === 'west')}</div>
      </div>
      <ul class="chart-key">${Object.values(HZ).map(h => `<li><i style="background:${h.fill}"></i>${h.name}</li>`).join('')}<li><i class="k-ring"></i>Your danger zones</li></ul>
      <h3>The science</h3><ul class="science">${explain(res, s, c).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="score"><div class="score-total"><span class="mono big">${res.total}<small>/15</small></span><span>Volcano score</span></div>
        ${PILLARS.map(Pl => `<div class="pillar"><p class="label">${Pl.name} pillar</p><ul class="needs">${Pl.needs.map(k => `<li><div class="need-row"><strong>${NEEDS[k]}</strong>${pips(res.scores[k])}</div><p>${esc(note(k, res, s))}</p></li>`).join('')}</ul></div>`).join('')}</div>
      <h3>Talk about it</h3><ul class="prompts"><li>What happened there? Which danger surprised you?</li><li>What do you think would have happened if you had evacuated a day later?</li><li>What have you seen other teams trying?</li></ul>
      ${s.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Change the plan</button><button class="btn primary" id="debrief">Debrief</button></div>`;
    root.querySelector('#retry').addEventListener('click', () => { eruptT = null; go('plan'); });
    root.querySelector('#debrief').addEventListener('click', () => { eruptT = null; go('debrief'); });
  }
  function attemptsTable() {
    const a = vx().attempts, best = Math.max(...a.map(x => x.total));
    return `<div class="table-wrap"><table class="attempts"><caption>Plans tested</caption><thead><tr><th>#</th><th>Evacuated</th><th>Map match</th><th>Homes lost</th><th>Score</th></tr></thead>
      <tbody>${a.map((x, i) => `<tr class="${x.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${x.evacDay ? 'Day ' + x.evacDay : 'No'}</td><td class="mono">${x.accuracy}%</td><td class="mono">${x.homesHit}</td><td class="mono">${x.total}/15</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- debrief ----------
  const JOURNAL = [
    'Which monitoring signal convinced you to raise the alert level? Why?',
    'Why is it so hard to decide when to evacuate?',
    'How did you work out where the lava and ash would go?',
    'What did your orange volcano show about how lava flows?',
    'How did your volcano-safe building protect the people inside?',
    'Looking back at all six missions, how would you change your first choice of base?'
  ];
  const CHOICE = [['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2], ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]];
  function reportText() {
    const s = vx(), last = s.attempts[s.attempts.length - 1];
    const lines = ['OPERATION ISLAND 2040 · MISSION 6 REPORT: THE VOLCANO WAKES', `Team: ${st().team.name || 'Unnamed team'}`, '',
      `Alert levels: ${s.alerts.map((a, i) => `day ${i + 1} ${a || '-'}`).join(', ')}`,
      `Protection: ${Object.keys(V.PROTECT).filter(k => s.protect[k]).map(k => V.PROTECT[k].name.toLowerCase()).join(', ') || 'none'}`,
      last ? `Result: ${last.evacDay ? 'evacuated on day ' + last.evacDay : 'no evacuation'}, hazard map ${last.accuracy}% match, ${last.homesHit} home squares destroyed, score ${last.total}/15` : '', '',
      'ORANGE VOLCANO (HANDS-ON)', `Recipe: ${s.debrief.vRecipe || '—'}`, `What happened: ${s.debrief.vSaw || '—'}`, `Which way the "lava" flowed: ${s.debrief.vFlow || '—'}`, '',
      'VOLCANO-SAFE BUILDING (STICKS AND MARSHMALLOWS)', `${s.debrief.vBuild || '—'}`, '',
      'JOURNAL', ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(s.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION', ...CHOICE.map(([id, l]) => `${l}:\n${(s.debrief[id] || '').trim() || '—'}\n`)];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    if (map) { map.destroy(); map = null; }
    const s = vx(), last = s.attempts[s.attempts.length - 1];
    if (!last) return go('plan');
    const field = (id, label, rows) => `<label class="field"><span>${label}</span><textarea id="${id}" rows="${rows}">${esc(s.debrief[id] || '')}</textarea></label>`;
    root.innerHTML = header() + `<div class="debrief-2">
      <section class="panel"><h2>Hands-on link: the orange volcano</h2>
        <p>Hollow out an orange, add baking soda and food colouring, then pour in vinegar. Tilt the "volcano" and watch where the foam goes.</p>
        ${field('vRecipe', 'What did you use, and how much?', 2)}${field('vSaw', 'What happened?', 2)}${field('vFlow', 'Which way did the "lava" flow? Why?', 2)}
        <details><summary>Hint for the teacher</summary><p>Vinegar (an acid) reacts with baking soda (a base) to make carbon dioxide gas, which foams up and out. The foam always runs downhill and along grooves, just like the simulated lava followed the river valley.</p></details>
        <h2>Hands-on link: save yourselves!</h2>
        <p>Design a building that can protect people from the volcano, using sticks and marshmallows. Use what you learnt in Mission 3.</p>
        ${field('vBuild', 'Describe your design. How does it protect against ash, falling rocks and shaking?', 3)}
        <p class="muted">Augmented reality: try the volcano AR experience from the course link, and find a safe place.</p>
      </section>
      <section class="panel"><h2>Mission debrief</h2>
        ${attemptsTable()}
        <form class="journal-form"><h3>Journal entries</h3><p class="muted">Your teacher may choose which questions to answer.</p>
          ${JOURNAL.map((q, i) => field('q' + i, `${i + 1}. ${q}`, 3)).join('')}
          <h3>Choice board: 3-2-1 reflection</h3>${CHOICE.map(([id, l, n]) => field(id, l, n + 1)).join('')}
        </form>
        <div class="actions"><button class="btn ghost" id="copy">Copy mission report</button><button class="btn primary" id="done">${s.completed ? 'Update the Island Log' : 'Complete Operation Island'}</button></div>
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
      st().log.volcano = { score: last.total, evacDay: last.evacDay, accuracy: last.accuracy, homesHit: last.homesHit, at: new Date().toISOString() };
      save(); location.hash = '';
    });
  }

  function render() {
    stop();
    const ph = vx().phase;
    if (ph !== 'eruption') eruptT = null;
    if (ph === 'monitor') return renderMonitor();
    if (ph === 'plan') return renderPlan();
    if (ph === 'eruption') return renderEruption();
    if (ph === 'debrief') return renderDebrief();
    return renderBriefing();
  }
  OI.missions = OI.missions || {};
  OI.missions.volcano = { mount(el) { root = el; render(); }, unmount() { stop(); if (map) { map.destroy(); map = null; } root = null; } };
})();
