/* Mission 4 — Power the Island ("It's dark!").
 * Briefing → Energy audit (maths) → Design and predict → 7-day test → Debrief
 */
(function () {
  const W = OI.world, P = OI.power, esc = OI.ui.esc, pips = OI.ui.pips;
  const PHASES = [{ id: 'briefing', label: 'Briefing' }, { id: 'audit', label: 'Energy audit' }, { id: 'design', label: 'Design and predict' }, { id: 'test', label: '7-day test' }, { id: 'debrief', label: 'Debrief' }];
  const NEEDS = { lights: 'Lights at night', fridge: 'Vaccine fridge', services: 'Other services', cost: 'Cost', environment: 'Environment' };
  const PILLARS = [{ name: 'Society', needs: ['lights', 'fridge', 'services'] }, { name: 'Economy', needs: ['cost'] }, { name: 'Environment', needs: ['environment'] }];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let root, map, timer = null, shown = 0;
  const st = () => OI.store.get();
  const px = () => st().power;
  const save = () => OI.store.save();
  const ctx = () => P.context(st());
  const fmt = n => Math.round(n).toLocaleString('en-GB');
  const kwh = wh => (wh / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 });
  function go(phase) { px().phase = phase; save(); render(); window.scrollTo({ top: 0 }); }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } }
  function header() {
    const idx = PHASES.findIndex(p => p.id === px().phase);
    return `<header class="mission-head"><div><p class="eyebrow">Mission 4 · Operation Island 2040</p><h1 class="display">Power the Island</h1></div>
      <ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol></header>`;
  }
  const dailyUse = d => P.APPLIANCES.filter(a => d.on[a.id]).reduce((s, a) => s + P.dailyWh(a, d), 0);
  function nearestHill(base) {
    let best = null;
    for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) if (W.code(r, c) === 'h') { const d = W.dist(base, { r, c }); if (!best || d < best.d) best = { r, c, d }; }
    return best;
  }

  // ---------- map ----------
  function mountMap() {
    if (map) map.destroy();
    const c = ctx(), e = st().exploration, d = px().design, hill = nearestHill(c.base);
    map = OI.createMap(root.querySelector('#map'), {
      getView: () => ({ mode: c.fromMission1 ? 'overview-fog' : 'overview', scouted: e.scouted, discovered: c.fromMission1 ? st().log.exploration.discovered : [], base: c.base,
        lines: d.turbines && d.hill && hill ? [{ a: c.base, b: hill, color: '#F2B630' }] : [], rings: hill && d.turbines && d.hill ? [{ r: hill.r, c: hill.c, color: '#F2B630' }] : [] }),
      onHover: t => { const el = root.querySelector('#readout'); if (el) el.innerHTML = t ? `<span class="mono">Grid ${W.grid(t.r, t.c)}</span> · ${esc(W.terrain(t.r, t.c).name)}` : 'Your base is marked with the yellow flag.'; },
      onPick: () => {}
    });
    OI.ui.bindWorkspace(root);
    root.querySelector('#readout').textContent = 'Your base is marked with the yellow flag.';
  }

  // ---------- briefing ----------
  function renderBriefing() {
    const c = ctx();
    root.innerHTML = header() + OI.ui.workspace(`
      <div class="radio"><span class="mono">RADIO · Clinic</span><p>It's dark! The settlers' first night was spent in total darkness. The nurse has vaccines that must stay cold in a fridge, day and night. Can you power the settlement?</p></div>
      <h2>Your base: <span class="mono">Grid ${c.base.grid}</span></h2>
      ${c.fromMission1 ? '' : `<p class="note">Your team has not finished Mission 1, so the GHA has chosen the forest edge at Grid ${c.base.grid}.</p>`}
      <dl class="measures">
        <div><dt>Sunshine</dt><dd>About 12 hours of daylight</dd></div>
        <div><dt>Wind exposure at the base</dt><dd class="mono">${Math.round(c.exposure * 100)}% of open-sea wind</dd></div>
        <div><dt>Wind exposure on the hill ridge</dt><dd class="mono">${Math.round(c.hillExposure * 100)}%</dd></div>
      </dl>
      <p class="muted">Your Meteorologist measured the wind exposure in Mission 1. Sheltered bases get much less wind.</p>
      <h3>Your energy sources</h3>
      <ul class="near">
        <li>☀️ <strong>Solar panels</strong> make electricity from sunlight. Nothing at night, little under thick cloud.</li>
        <li>🌬️ <strong>Wind turbines</strong> work day and night when it is windy, but stop in calm weather and shut down in storms.</li>
        <li>🔋 <strong>Batteries</strong> store spare energy for the night and for grey days.</li>
        <li>🛢️ <strong>A diesel generator</strong> works any time, but burns fuel and releases CO₂.</li>
      </ul>
      <p>The <strong>Engineer</strong> leads, with the <strong>Meteorologist</strong> forecasting sun and wind.</p>
      <div class="actions"><button class="btn primary" id="next">Do the energy audit</button></div>`);
    mountMap();
    root.querySelector('#next').addEventListener('click', () => go('audit'));
  }

  // ---------- energy audit ----------
  function questions() {
    const d = px().design, total = dailyUse(d);
    return [
      { id: 'a1', q: 'One LED bulb uses 5 W. How many watt-hours (Wh) does it use in 5 hours?', a: 25, work: '5 W × 5 h = 25 Wh' },
      { id: 'a2', q: 'The vaccine fridge uses 60 W, all day and all night. How many Wh per day?', a: 1440, work: '60 W × 24 h = 1,440 Wh' },
      { id: 'a3', q: `Your settlement uses ${fmt(total)} Wh per day. How many kilowatt-hours (kWh) is that? (1 kWh = 1,000 Wh)`, a: total / 1000, tol: 0.051, work: `${fmt(total)} ÷ 1,000 = ${kwh(total)} kWh` },
      { id: 'a4', q: 'A 300 W solar panel gets the equivalent of 5 hours of full sun on a clear day. How many Wh does it make?', a: 1500, work: '300 W × 5 h = 1,500 Wh (1.5 kWh)' }
    ];
  }
  function auditTable() {
    const d = px().design;
    return `<div class="table-wrap"><table class="audit"><thead><tr><th>Use it?</th><th>Appliance</th><th>Power</th><th>Hours a day</th><th>Energy a day</th></tr></thead><tbody>
      ${P.APPLIANCES.map(a => {
        const hrs = a.hours.reduce((s, [f, t]) => s + (t - f), 0);
        return `<tr class="${d.on[a.id] ? '' : 'off'}"><td><input type="checkbox" data-app="${a.id}" ${d.on[a.id] ? 'checked' : ''} ${a.fixed ? 'disabled' : ''} aria-label="Use ${esc(a.name)}"></td>
          <td>${esc(a.name)} <span class="cat">${a.need ? 'Need' : 'Want'}</span></td><td class="mono">${fmt(P.applianceWatts(a, d))} W</td><td class="mono">${hrs} h</td><td class="mono">${fmt(P.dailyWh(a, d))} Wh</td></tr>`;
      }).join('')}
      </tbody><tfoot><tr><td colspan="4"><strong>Total each day</strong></td><td class="mono"><strong>${fmt(dailyUse(d))} Wh</strong></td></tr></tfoot></table></div>`;
  }
  function renderAudit() {
    if (map) { map.destroy(); map = null; }
    const s = px(), d = s.design;
    root.innerHTML = header() + `<div class="budget">
      <section><h2>What needs electricity?</h2>
        <p>Choose what the settlement will use. Needs keep people safe and healthy; wants make life comfortable. Lights and the vaccine fridge are not optional.</p>
        <div class="seg">${Object.entries(P.BULBS).map(([k, b]) => `<label class="${d.bulbs === k ? 'on' : ''}"><input type="radio" name="bulbs" value="${k}" ${d.bulbs === k ? 'checked' : ''}> ${b.name} <small>${b.watts} W each, same brightness</small></label>`).join('')}</div>
        <div id="audit-table">${auditTable()}</div>
      </section>
      <section class="budget-qs"><h2>Calculate the energy</h2>
        <p class="muted">Power is measured in watts (W). Energy is power × time, measured in watt-hours (Wh).</p>
        <div id="qs"></div>
      </section>
      <div class="actions"><button class="btn ghost" id="back">Back to briefing</button><button class="btn primary" id="next">Design the power system</button></div></div>`;
    const drawQs = () => {
      root.querySelector('#qs').innerHTML = questions().map(q => `<div class="calc"><label for="${q.id}">${esc(q.q)}</label>
        <div class="calc-row"><input id="${q.id}" inputmode="decimal" value="${esc(s.answers[q.id] || '')}"><button class="btn small" data-check="${q.id}">Check</button></div>
        <p class="calc-fb" id="fb-${q.id}" aria-live="polite"></p><details><summary>Show the working</summary><p class="mono">${esc(q.work)}</p></details></div>`).join('');
      questions().forEach(q => {
        const inp = root.querySelector('#' + q.id), fb = root.querySelector('#fb-' + q.id);
        const check = () => {
          s.answers[q.id] = inp.value; save();
          if (!inp.value.trim()) { fb.textContent = ''; return; }
          const v = Number(String(inp.value).replace(/[ ,]/g, ''));
          const ok = Math.abs(v - q.a) <= (q.tol || 0.001);
          fb.className = 'calc-fb ' + (ok ? 'ok' : 'no'); fb.textContent = ok ? 'Correct.' : 'Not quite. Check your working and try again.';
        };
        root.querySelector(`[data-check="${q.id}"]`).addEventListener('click', check);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        if (s.answers[q.id]) check();
      });
    };
    const bindTable = () => root.querySelectorAll('[data-app]').forEach(cb => cb.addEventListener('change', () => { d.on[cb.dataset.app] = cb.checked; save(); root.querySelector('#audit-table').innerHTML = auditTable(); bindTable(); drawQs(); }));
    root.querySelectorAll('input[name=bulbs]').forEach(r => r.addEventListener('change', () => { d.bulbs = r.value; save(); renderAudit(); }));
    bindTable(); drawQs();
    root.querySelector('#back').addEventListener('click', () => go('briefing'));
    root.querySelector('#next').addEventListener('click', () => go('design'));
  }

  // ---------- design and predict ----------
  function designPanel() {
    const s = px(), d = s.design, c = ctx(), p = s.prediction || {};
    const cost = P.cost(d), over = cost.total > P.BUDGET, use = dailyUse(d);
    const night = P.APPLIANCES.filter(a => d.on[a.id]).reduce((sum, a) => { let w = 0; for (let h = 0; h < 24; h++) if ((h >= 18 || h < 6) && a.hours.some(([f, t]) => h >= f && h < t)) w += P.applianceWatts(a, d); return sum + w; }, 0);
    const slider = (id, label, min, max, val, unit, hint) => `<div class="ctl"><label for="${id}"><span>${label}</span><output class="mono" id="${id}-out">${val} ${unit}</output></label><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${val}">${hint ? `<small class="muted">${hint}</small>` : ''}</div>`;
    return `
      <div class="load ${over ? 'over' : ''}" role="meter" aria-valuemin="0" aria-valuemax="${P.BUDGET}" aria-valuenow="${cost.total}" aria-label="Budget used">
        <span class="mono big">${cost.total} / ${P.BUDGET} credits</span><div class="meter"><i style="width:${Math.min(100, cost.total / P.BUDGET * 100)}%"></i></div>
        <span class="muted">${over ? `Over budget by ${cost.total - P.BUDGET} credits.` : `${P.BUDGET - cost.total} credits left. Diesel fuel is paid for later.`}</span>
        <details><summary>What you are paying for</summary><ul class="cost-list">${cost.items.map(([n, v]) => `<li><span>${esc(n)}</span><span class="mono">${v}</span></li>`).join('') || '<li>Nothing yet</li>'}</ul></details>
      </div>
      <dl class="measures">
        <div><dt>Energy used each day</dt><dd class="mono">${kwh(use)} kWh</dd></div>
        <div><dt>Used between 18:00 and 06:00</dt><dd class="mono">${kwh(night)} kWh</dd></div>
        <div><dt>Battery storage</dt><dd class="mono">${kwh(d.batteries * P.BATTERY_WH)} kWh</dd></div>
      </dl>
      <p class="muted">Change what the settlement uses in the <button type="button" class="linkish" id="to-audit">energy audit</button>.</p>
      <fieldset class="group"><legend>1 · Generate</legend>
        ${slider('panels', 'Solar panels (300 W each)', 0, 12, d.panels, 'panels', `8 credits each. About ${kwh(d.panels * 1500)} kWh on a clear day.`)}
        ${slider('turbines', 'Wind turbines (1 kW each)', 0, 4, d.turbines, 'turbines', '22 credits each. Full power at 12 m/s, nothing below 3 m/s, shut down above 25 m/s.')}
        <label class="toggle ${d.turbines ? '' : 'off'}"><input type="checkbox" id="hill" ${d.hill ? 'checked' : ''} ${d.turbines ? '' : 'disabled'}><span><strong>Put the turbines on the hill ridge</strong><small>Wind exposure ${Math.round(c.hillExposure * 100)}% instead of ${Math.round(c.exposure * 100)}% at the base. The cable costs 8 credits.</small></span></label>
      </fieldset>
      <fieldset class="group"><legend>2 · Store</legend>
        ${slider('batteries', 'Batteries (2.4 kWh each)', 0, 6, d.batteries, 'batteries', '15 credits each. They lose 10% of the energy put into them.')}
      </fieldset>
      <fieldset class="group"><legend>3 · Backup</legend>
        <label class="toggle"><input type="checkbox" id="generator" ${d.generator ? 'checked' : ''}><span><strong>Diesel generator (3 kW)</strong><small>15 credits. Starts when the batteries run out. Burns 0.4 L of diesel per kWh (0.5 credits per litre) and releases 2.7 kg of CO₂ per litre.</small></span></label>
      </fieldset>
      <div class="weather-row" aria-label="Weather forecast">${P.WEATHER.map((w, i) => `<div><span class="mono">${DAYS[i]}</span><span>${w.wind > 20 ? '⛈️' : w.cloud > 0.6 ? '☁️' : '☀️'}</span><small>${esc(w.name)}</small></div>`).join('')}</div>
      <form id="predict" class="predict">
        <h3>Predict before you test</h3>
        <fieldset><legend>Will the lights come on every evening?</legend>${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="plights" value="${v}" ${p.lights === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <fieldset><legend>Will the vaccine fridge ever lose power?</legend>${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="pfridge" value="${v}" ${p.fridge === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Which day will be hardest for the system?</span><select id="pday"><option value="">Choose a day</option>${DAYS.map((dn, i) => `<option value="${i}" ${String(p.day) === String(i) ? 'selected' : ''}>${dn} · ${esc(P.WEATHER[i].name)}</option>`).join('')}</select></label>
        <label class="field"><span>Our reason</span><textarea id="preason" rows="2" placeholder="We think… because…">${esc(p.reason || '')}</textarea></label>
        <button class="btn primary" type="submit" ${over ? 'disabled' : ''}>Run the 7-day test</button>
        ${over ? '<p class="note">You are over budget. Remove something before testing.</p>' : ''}
      </form>`;
  }
  function renderDesign() {
    root.innerHTML = header() + OI.ui.workspace(designPanel());
    mountMap(); bindDesign();
  }
  function refreshDesign() {
    const y = window.scrollY, active = document.activeElement && document.activeElement.id;
    root.querySelector('#panel').innerHTML = designPanel(); bindDesign(); mountMap(); window.scrollTo({ top: y });
    if (active) { const el = root.querySelector('#' + active); if (el) el.focus(); }
  }
  function bindDesign() {
    const s = px(), d = s.design;
    ['panels', 'turbines', 'batteries'].forEach(id => {
      const el = root.querySelector('#' + id);
      el.addEventListener('input', () => { root.querySelector('#' + id + '-out').textContent = `${el.value} ${id}`; });
      el.addEventListener('change', () => { d[id] = Number(el.value); if (!d.turbines) d.hill = false; save(); refreshDesign(); });
    });
    ['hill', 'generator'].forEach(id => root.querySelector('#' + id).addEventListener('change', e => { d[id] = e.target.checked; save(); refreshDesign(); }));
    root.querySelector('#to-audit').addEventListener('click', () => go('audit'));
    const keep = () => { const fd = new FormData(root.querySelector('#predict')); s.prediction = { lights: fd.get('plights'), fridge: fd.get('pfridge'), day: root.querySelector('#pday').value, reason: root.querySelector('#preason').value.trim() }; save(); };
    root.querySelectorAll('#predict input, #predict textarea, #predict select').forEach(el => el.addEventListener('change', keep));
    root.querySelector('#predict').addEventListener('submit', e => { e.preventDefault(); keep(); s.pendingTest = true; save(); go('test'); });
  }

  // ---------- chart ----------
  function chart(res, upto) {
    const Wd = 680, L = 52, R = 12, T = 30, aH = 150, gap = 40, bH = 90, x0 = L, x1 = Wd - R;
    const bw = (x1 - x0) / P.HOURS, X = t => x0 + t * bw;
    const hrs = res.hours.slice(0, upto);
    const maxP = Math.max(1000, Math.ceil(Math.max(...res.hours.map(h => Math.max(h.solar + h.wind, h.demand))) / 1000) * 1000);
    const pY = v => T + aH - (v / maxP) * aH;
    const bTop = T + aH + gap, bY = v => bTop + bH - (v / 100) * bH;
    const stripY = bTop + bH + 10;
    const area = (fn, base) => hrs.length ? `M${X(0)},${pY(base ? base(hrs[0]) : 0)} ` + hrs.map((h, i) => `L${X(i) + bw / 2},${pY(fn(h))}`).join(' ') + ` L${X(hrs.length - 1) + bw / 2},${pY(base ? base(hrs[hrs.length - 1]) : 0)} ` + (base ? hrs.slice().reverse().map((h, j) => `L${X(hrs.length - 1 - j) + bw / 2},${pY(base(h))}`).join(' ') : '') + ' Z' : '';
    const solarArea = area(h => h.solar);
    const windArea = area(h => h.solar + h.wind, h => h.solar);
    const demandLine = hrs.map((h, i) => `${i ? 'L' : 'M'}${X(i)},${pY(h.demand)} L${X(i + 1)},${pY(h.demand)}`).join(' ');
    const battLine = hrs.map((h, i) => `${i ? 'L' : 'M'}${X(i) + bw / 2},${bY(h.pct)}`).join(' ');
    const battArea = hrs.length ? `M${X(0)},${bY(0)} ` + hrs.map((h, i) => `L${X(i) + bw / 2},${bY(h.pct)}`).join(' ') + ` L${X(hrs.length - 1) + bw / 2},${bY(0)} Z` : '';
    return `<svg class="wchart pchart" viewBox="0 0 ${Wd} ${stripY + 50}" role="img" aria-label="Power produced, power used and battery charge over 7 days">
      ${P.WEATHER.map((w, i) => `<rect x="${X(i * 24)}" y="${T}" width="${bw * 24}" height="${stripY + 12 - T}" class="${i % 2 ? 'dayband' : 'dayband alt'}"/>
        <text x="${X(i * 24) + bw * 12}" y="${T - 16}" class="ax" text-anchor="middle">${DAYS[i]} ${w.wind > 20 ? '⛈' : w.cloud > 0.6 ? '☁' : '☀'}</text>`).join('')}
      <text x="${x0}" y="${T - 2}" class="ax-t">Power (W)</text>
      ${[0, maxP / 2, maxP].map(v => `<line x1="${x0}" x2="${x1}" y1="${pY(v)}" y2="${pY(v)}" class="grid"/><text x="${x0 - 6}" y="${pY(v) + 4}" class="ax" text-anchor="end">${fmt(v)}</text>`).join('')}
      ${hrs.length ? `<path d="${solarArea}" class="solar"/><path d="${windArea}" class="windp"/><path d="${demandLine}" class="demand"/>` : ''}
      <text x="${x0}" y="${bTop - 8}" class="ax-t">Battery charge (%)</text>
      ${[0, 50, 100].map(v => `<line x1="${x0}" x2="${x1}" y1="${bY(v)}" y2="${bY(v)}" class="grid"/><text x="${x0 - 6}" y="${bY(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${hrs.length && res.cap ? `<path d="${battArea}" class="batt-area"/><path d="${battLine}" class="batt-line"/>` : ''}
      ${!res.cap ? `<text x="${(x0 + x1) / 2}" y="${bY(50)}" class="ax" text-anchor="middle">No batteries</text>` : ''}
      ${hrs.map((h, i) => h.fridgeOff ? `<rect x="${X(i)}" y="${stripY}" width="${Math.max(1, bw)}" height="10" class="short"/>` : h.blackout ? `<rect x="${X(i)}" y="${stripY}" width="${Math.max(1, bw)}" height="10" class="unsafe"/>` : '').join('')}
      ${hrs.length ? `<rect x="${x0}" y="${stripY + 4}" width="${X(hrs.length) - x0}" height="2" class="okday"/>` : ''}
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(dn => `<line x1="${X(dn * 24)}" x2="${X(dn * 24)}" y1="${T}" y2="${stripY + 12}" class="grid"/>`).join('')}
      <text x="${(x0 + x1) / 2}" y="${stripY + 34}" class="ax" text-anchor="middle">Lights come on 18:00–23:00 · each column is one day</text>
      ${res.hours.map((h, i) => `<rect x="${X(i)}" y="${T}" width="${bw}" height="${stripY + 12 - T}" class="hit" data-h="${i}"/>`).join('')}
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${stripY + 12}" visibility="hidden"/>
    </svg>`;
  }
  const legend = () => `<ul class="chart-key"><li><i class="k-solar"></i>Solar</li><li><i class="k-wind"></i>Wind</li><li><i class="k-demand"></i>Power used</li><li><i class="k-batt"></i>Battery</li><li><i class="k-unsafe"></i>Some power cut</li><li><i class="k-short"></i>Fridge off</li></ul>`;
  function bindHover(res) {
    const svg = root.querySelector('.pchart'), tip = root.querySelector('#tip');
    if (!svg || !tip) return;
    const cross = svg.querySelector('.cross');
    svg.querySelectorAll('.hit').forEach(r => {
      const show = () => {
        const i = Number(r.dataset.h); if (i >= shown) return;
        const h = res.hours[i], x = Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2;
        cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
        tip.hidden = false;
        tip.innerHTML = `<strong>${DAYS[h.day]} ${String(h.h).padStart(2, '0')}:00</strong> · ${esc(P.WEATHER[h.day].name)}<br>Solar ${fmt(h.solar)} W · Wind ${fmt(h.wind)} W (${h.windSpeed} m/s)${h.gen ? ` · Diesel ${fmt(h.gen)} W` : ''}<br>Used ${fmt(h.demand)} W · Battery ${h.pct}%<br>${h.fridgeOff ? '⚠ Fridge off' : h.blackout ? '⚠ Some power cut' : '✔ Everything on'}`;
        const box = svg.getBoundingClientRect(), wrap = svg.parentElement.getBoundingClientRect();
        tip.style.left = Math.min(Math.max(8, (x / 680) * box.width + (box.left - wrap.left) - 120), wrap.width - 250) + 'px';
      };
      r.addEventListener('pointerenter', show); r.addEventListener('pointerdown', show);
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }

  // ---------- 7-day test ----------
  function gauges(res, i) {
    const h = res.hours[Math.max(0, i - 1)];
    return `<div class="tank-wrap"><div class="tank batt" aria-hidden="true"><i style="height:${h.pct}%"></i></div>
      <div class="gauges">
        <div><span>Time</span><b class="mono">${DAYS[h.day]} ${String(h.h).padStart(2, '0')}:00</b></div>
        <div><span>Weather</span><b>${esc(P.WEATHER[h.day].name)}</b></div>
        <div><span>Solar</span><b class="mono">${fmt(h.solar)} W</b></div>
        <div><span>Wind</span><b class="mono">${fmt(h.wind)} W</b></div>
        <div><span>Battery</span><b class="mono">${res.cap ? h.pct + '%' : 'None'}</b></div>
        <div class="${h.fridgeOff ? 'bad' : h.blackout ? 'warn' : ''}"><span>Settlement</span><b>${h.fridgeOff ? 'Fridge off!' : h.blackout ? 'Power cut' : h.h >= 18 && h.h < 23 ? 'Lights on' : 'All on'}</b></div>
      </div></div>`;
  }
  function renderTest() {
    if (map) { map.destroy(); map = null; }
    const s = px(), res = P.simulate(s.design, ctx());
    shown = 0;
    root.innerHTML = header() + `<div class="workspace test-space">
      <div class="map-col chart-col"><div class="chart-frame" id="chart">${chart(res, 0)}<div class="tip" id="tip" hidden></div></div>${legend()}</div>
      <aside class="panel" id="panel"><h2>7 days on the island</h2><p>Every hour: what the sun and wind make, what the settlement uses, and what is left in the batteries.</p><div id="gauges">${gauges(res, 1)}</div><div class="actions"><button class="btn ghost" id="skip">Skip to the result</button></div></aside></div>`;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = () => { stop(); shown = P.HOURS; root.querySelector('#chart').innerHTML = chart(res, P.HOURS) + '<div class="tip" id="tip" hidden></div>'; results(res); };
    root.querySelector('#skip').addEventListener('click', end);
    if (reduce) return end();
    const tick = () => {
      shown = Math.min(P.HOURS, shown + 3);
      root.querySelector('#chart').innerHTML = chart(res, shown) + '<div class="tip" id="tip" hidden></div>';
      const g = root.querySelector('#gauges'); if (g) g.innerHTML = gauges(res, shown);
      if (shown >= P.HOURS) return end();
      timer = setTimeout(tick, 110);
    };
    timer = setTimeout(tick, 300);
  }
  function explain(res, d) {
    const c = ctx(), lines = [];
    lines.push(`The settlement used ${kwh(res.demandWh)} kWh in 7 days (${kwh(res.demandWh / 7)} kWh a day).`);
    lines.push(`Produced: solar ${kwh(res.solarWh)} kWh, wind ${kwh(res.windWh)} kWh${res.genWh ? `, diesel ${kwh(res.genWh)} kWh` : ''}.${res.wasted > 500 ? ` ${kwh(res.wasted)} kWh was wasted because the batteries were already full.` : ''}`);
    const storm = res.hours.filter(h => h.day === 3), grey = res.hours.filter(h => h.day === 4);
    lines.push(`Thursday's storm and Friday's grey, still day were the hardest: solar made only ${kwh(storm.reduce((s, h) => s + h.solar, 0) + grey.reduce((s, h) => s + h.solar, 0))} kWh over those two days.`);
    if (d.turbines) {
      const exp = d.hill ? c.hillExposure : c.exposure;
      const stormHrs = res.hours.filter(h => h.day === 3), off = stormHrs.filter(h => h.windSpeed > 25).length;
      const peak = Math.max(...stormHrs.map(h => h.windSpeed));
      lines.push(`Wind: in the storm your turbines felt up to ${peak} m/s (${Math.round(exp * 100)}% of the wind at sea). ${off ? `They shut down for ${off} hours to protect themselves, because the wind was above 25 m/s.` : peak >= 12 ? 'They ran at full power without needing to shut down.' : 'Even in the storm, the sheltered site kept them slow.'} On calm days they made almost nothing.`);
    }
    if (d.bulbs === 'old') lines.push('Old-style bulbs use 40 W each for the same light as a 5 W LED: eight times the energy, mostly wasted as heat.');
    if (d.on.kettle) lines.push('The electric kettle uses 2,000 W, more than six solar panels make at midday. Cooking on a fire or a solar cooker would save it.');
    if (d.on.fans) lines.push(`The fans run all night, using ${kwh(P.dailyWh(P.APPLIANCES.find(a => a.id === 'fans'), d))} kWh from the batteries every night.`);
    if (res.cap) lines.push(`Batteries: ${kwh(res.cap)} kWh of storage. Night-time use had to come from here.`);
    if (res.worstFridgeGap) lines.push(`The vaccine fridge lost power for up to ${res.worstFridgeGap} hours in a row. Vaccines spoil after about 4 hours without cooling.`);
    if (res.fuel) lines.push(`The generator burned ${res.fuel} L of diesel: ${res.co2} kg of CO₂ in one week, and the fuel has to be shipped to the island.`);
    return lines;
  }
  function note(k, res, d) {
    if (k === 'lights') return `Lights on for ${res.lit} of ${res.litOf} evening hours.`;
    if (k === 'fridge') return res.worstFridgeGap ? `Lost power for up to ${res.worstFridgeGap} hours in a row.` : 'Powered every hour of the week.';
    if (k === 'services') { const names = { radio: 'radio', phones: 'phone charging', pump: 'water pump', laptops: 'school laptops' }; return res.services.length ? `Reliable: ${res.services.map(x => names[x]).join(', ')}.` : 'No other service ran reliably.'; }
    if (k === 'cost') return `${res.equipment} credits of equipment${res.fuelCost ? ` + ${res.fuelCost} credits of diesel` : ''}.`;
    return res.fuel ? `${res.fuel} L of diesel burned: ${res.co2} kg of CO₂.` : 'All renewable: no fuel burned.';
  }
  function results(res) {
    stop();
    const s = px(), d = s.design, p = s.prediction || {};
    if (s.pendingTest) {
      s.attempts.push({ total: res.total, lit: res.lit, litOf: res.litOf, fridgeGap: res.worstFridgeGap, fuel: res.fuel, cost: res.equipment, design: JSON.parse(JSON.stringify(d)) });
      s.pendingTest = false; save();
    }
    const allLit = res.lit === res.litOf, fridgeLost = res.worstFridgeGap > 0;
    // hardest day = the biggest gap between energy used and energy made
    const gap = [0, 1, 2, 3, 4, 5, 6].map(dn => res.hours.filter(h => h.day === dn).reduce((a, h) => a + h.demand - h.solar - h.wind, 0));
    const hardest = gap.indexOf(Math.max(...gap));
    const mark = (pr, ok) => !pr || pr === 'unsure' ? '<span class="verdict">Not predicted</span>' : ok ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>Energy report</h2>
      <div class="compare">
        <div><h3>Lights</h3><p>You predicted: <strong>${p.lights === 'yes' ? 'on every evening' : p.lights === 'no' ? 'not every evening' : 'not sure'}</strong>.<br>Result: <strong>${allLit ? 'on every evening' : `off for ${res.litOf - res.lit} evening hours`}</strong>.</p>${mark(p.lights, (p.lights === 'yes') === allLit)}</div>
        <div><h3>Vaccine fridge</h3><p>You predicted: <strong>${p.fridge === 'yes' ? 'loses power' : p.fridge === 'no' ? 'never loses power' : 'not sure'}</strong>.<br>Result: <strong>${fridgeLost ? `off for up to ${res.worstFridgeGap} h` : 'always on'}</strong>.</p>${mark(p.fridge, (p.fridge === 'yes') === fridgeLost)}</div>
      </div>
      <p>Hardest day: <strong>${DAYS[hardest]} (${esc(P.WEATHER[hardest].name.toLowerCase())})</strong>, when the settlement used ${kwh(Math.max(0, gap[hardest]))} kWh more than it made. ${p.day !== undefined && p.day !== '' && p.day !== null ? `You predicted ${DAYS[Number(p.day)]}.` : ''}</p>
      <h3>The science</h3>
      <ul class="science">${explain(res, d).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="score"><div class="score-total"><span class="mono big">${res.total}<small>/15</small></span><span>Power score</span></div>
        ${PILLARS.map(Pl => `<div class="pillar"><p class="label">${Pl.name} pillar</p><ul class="needs">${Pl.needs.map(k => `<li><div class="need-row"><strong>${NEEDS[k]}</strong>${pips(res.scores[k])}</div><p>${esc(note(k, res, d))}</p></li>`).join('')}</ul></div>`).join('')}</div>
      <h3>Talk about it</h3>
      <ul class="prompts"><li>What happened there? When did the batteries run low, and why then?</li><li>What do you think will happen if we swap one panel for a battery?</li><li>Which appliances are needs, and which are wants?</li></ul>
      ${s.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Change the design</button><button class="btn primary" id="debrief">Debrief</button></div>`;
    bindHover(res);
    root.querySelector('#retry').addEventListener('click', () => go('design'));
    root.querySelector('#debrief').addEventListener('click', () => go('debrief'));
  }
  function attemptsTable() {
    const a = px().attempts, best = Math.max(...a.map(x => x.total));
    return `<div class="table-wrap"><table class="attempts"><caption>Designs tested</caption><thead><tr><th>#</th><th>Panels · turbines · batteries</th><th>Lights</th><th>Diesel</th><th>Score</th></tr></thead>
      <tbody>${a.map((x, i) => `<tr class="${x.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${x.design.panels} · ${x.design.turbines}${x.design.hill ? ' (hill)' : ''} · ${x.design.batteries}</td><td class="mono">${x.lit}/${x.litOf}</td><td class="mono">${x.fuel} L</td><td class="mono">${x.total}/15</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- debrief ----------
  const JOURNAL = [
    'What is the difference between power (W) and energy (Wh)? Use an example from today.',
    'Why did your system need batteries, even with plenty of solar panels?',
    'Which appliances did you decide were needs, and which were wants? Why?',
    'Why might a turbine on the hill make more electricity than one at the base?',
    'Was the diesel generator worth it? Think about cost, reliability and the environment.',
    'What could the settlers do to use less energy?'
  ];
  const CHOICE = [['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2], ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]];
  function reportText() {
    const s = px(), d = s.design, last = s.attempts[s.attempts.length - 1];
    const lines = ['OPERATION ISLAND 2040 · MISSION 4 REPORT: POWER THE ISLAND', `Team: ${st().team.name || 'Unnamed team'}`, `Base: Grid ${ctx().base.grid}`, '',
      `Daily use: ${kwh(dailyUse(d))} kWh with ${P.BULBS[d.bulbs].name.toLowerCase()}${d.on.kettle ? ', electric kettle' : ''}${d.on.fans ? ', fans' : ''}`,
      `System: ${d.panels} solar panels, ${d.turbines} wind turbines${d.turbines && d.hill ? ' on the hill' : ''}, ${d.batteries} batteries${d.generator ? ', diesel generator' : ''}`,
      last ? `Result: lights ${last.lit}/${last.litOf} evening hours, fridge ${last.fridgeGap ? `off up to ${last.fridgeGap} h` : 'always on'}, diesel ${last.fuel} L, score ${last.total}/15` : '', '',
      'LAVA LAMP (HANDS-ON)', `What we used: ${s.debrief.lUsed || '—'}`, `What happened: ${s.debrief.lSaw || '—'}`, `Why the blobs rise and fall: ${s.debrief.lWhy || '—'}`, `Lava-lamp maths answer: ${s.debrief.lMaths || '—'} hours`, '',
      'JOURNAL', ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(s.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION', ...CHOICE.map(([id, l]) => `${l}:\n${(s.debrief[id] || '').trim() || '—'}\n`)];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    if (map) { map.destroy(); map = null; }
    const s = px(), last = s.attempts[s.attempts.length - 1];
    if (!last) return go('design');
    const field = (id, label, rows, ph) => `<label class="field"><span>${label}</span>${rows ? `<textarea id="${id}" rows="${rows}">${esc(s.debrief[id] || '')}</textarea>` : `<input id="${id}" value="${esc(s.debrief[id] || '')}" placeholder="${ph || ''}" inputmode="decimal">`}</label>`;
    root.innerHTML = header() + `<div class="debrief-2">
      <section class="panel"><h2>Hands-on link: "It's dark!" Make a lava lamp</h2>
        <p>Fill a bottle with oil and a little water with food colouring, then drop in an effervescent tablet. Watch, then record.</p>
        ${field('lUsed', 'What did you use?', 2)}${field('lSaw', 'What happened?', 2)}${field('lWhy', 'Why do the coloured blobs rise and then sink?', 2)}
        <details><summary>Hint for the teacher</summary><p>Water is denser than oil, so it sinks. The tablet makes carbon dioxide gas; bubbles stick to the water blobs and carry them up. At the top the gas escapes and the blobs sink again.</p></details>
        <div class="calc"><label for="lMaths">A real lava lamp uses a 40 W bulb to heat the wax. Left on for 5 hours, how many hours could one 5 W LED light run on the same energy?</label>
          <div class="calc-row"><input id="lMaths" inputmode="decimal" value="${esc(s.debrief.lMaths || '')}"><button class="btn small" id="lCheck">Check</button></div>
          <p class="calc-fb" id="fb-lMaths" aria-live="polite"></p><details><summary>Show the working</summary><p class="mono">40 W × 5 h = 200 Wh; 200 Wh ÷ 5 W = 40 hours</p></details></div>
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
    root.querySelectorAll('input, textarea').forEach(el => { if (el.id && el.id !== 'report-text') el.addEventListener('input', () => { s.debrief[el.id] = el.value; save(); }); });
    root.querySelector('#lCheck').addEventListener('click', () => {
      const v = Number(String(root.querySelector('#lMaths').value).replace(/[ ,]/g, '')), fb = root.querySelector('#fb-lMaths');
      fb.className = 'calc-fb ' + (v === 40 ? 'ok' : 'no'); fb.textContent = v === 40 ? 'Correct: one lava lamp uses as much energy as eight LED lights.' : 'Not quite. Work out the lava lamp\'s energy first.';
    });
    root.querySelector('#copy').addEventListener('click', () => {
      const txt = reportText(), status = root.querySelector('#copy-status'), ta = root.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied. Paste it into a document or email.'; }, fallback); } catch (err) { fallback(); }
    });
    root.querySelector('#done').addEventListener('click', () => {
      s.completed = true;
      st().log.power = { score: last.total, lit: last.lit, litOf: last.litOf, fridgeGap: last.fridgeGap, fuel: last.fuel, design: last.design, at: new Date().toISOString() };
      save(); location.hash = '';
    });
  }

  function render() {
    stop();
    const ph = px().phase;
    if (ph === 'audit') return renderAudit();
    if (ph === 'design') return renderDesign();
    if (ph === 'test') return renderTest();
    if (ph === 'debrief') return renderDebrief();
    return renderBriefing();
  }
  OI.missions = OI.missions || {};
  OI.missions.power = { mount(el) { root = el; render(); }, unmount() { stop(); if (map) { map.destroy(); map = null; } root = null; } };
})();
