/* Case File #4 — The Night the Fridge Went Warm
 * Energy: the clinic's solar-powered vaccine fridge loses power after midnight.
 * Three causes: using too much (old bulbs on all night, a torn fridge seal), making too little
 * (dust, a tree's shade) and storing too little (an old battery). Learners are the Meteorologist.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const hh = t => String(((t % 24) + 24) % 24).padStart(2, '0') + ':00';

  // ---------- the clinic's energy model (one step = one hour) ----------
  const SUN = [0.05, 0.2, 0.4, 0.6, 0.75, 0.85, 0.85, 0.75, 0.6, 0.4, 0.2, 0.05]; // share of full panel power, 06:00 to 17:00
  const FRIDGE_W = { old: 60, seal: 40, new: 20 };
  const COST = { led: 10, seal: 5, newfridge: 40, trim: 5, clean: 2, panels: 30, battery: 45, wind: 35 };
  const BUDGET = 70;
  function cost(d) { return (d.led ? COST.led : 0) + (d.fridge === 'seal' ? COST.seal : d.fridge === 'new' ? COST.newfridge : 0) + (d.trim ? COST.trim : 0) + (d.clean ? COST.clean : 0) + (d.panels ? COST.panels : 0) + (d.battery ? COST.battery : 0) + (d.wind ? COST.wind : 0); }
  // 72 hours from 18:00 tonight. Forecast: a storm brings two cloudy, windy days, then sun.
  function weatherAt(i, sunnyOnly) { const day = Math.floor((i + 18) / 24); return { cloudy: !sunnyOnly && (day === 1 || day === 2), windy: !sunnyOnly && i >= 12 && i < 60 }; }
  function simulate(d, sunnyOnly) {
    const cap = d.battery ? 4000 : 2000, peak = (d.panels ? 6 : 4) * 250;
    let B = sunnyOnly ? 1600 : cap, T = 5; const out = [];
    for (let i = 0; i < 72; i++) {
      const t = (18 + i) % 24, w = weatherAt(i, sunnyOnly);
      let gen = 0;
      if (t >= 6 && t < 18) gen = peak * SUN[t - 6] * (w.cloudy ? 0.35 : 1) * (d.clean ? 1 : 0.8) * (!d.trim && t >= 13 ? 0.4 : 1);
      if (d.wind) gen += w.windy ? 60 : 10;
      const night = t >= 18 || t < 6;
      const load = FRIDGE_W[d.fridge] + (night ? (d.led ? 24 : 160) : 0) + (t >= 10 && t < 18 ? 40 : 0) + (t >= 8 && t < 16 ? 50 : 0) + (t === 7 || t === 13 ? 250 : 0) + 5;
      let on = true;
      if (gen >= load) B = Math.min(cap, B + gen - load);
      else if (B >= load - gen) B -= load - gen;
      else { B = 0; on = false; }
      T = on ? Math.max(5, T - 1.5) : T + 0.8;
      out.push({ i, t, cloudy: w.cloudy, windy: w.windy, gen: Math.round(gen), load, B: Math.round(B), cap, on, T: +T.toFixed(1) });
    }
    return out;
  }
  const OLD = { led: false, fridge: 'old', trim: false, clean: false, panels: false, battery: false, wind: false };

  // ---------- glossary and handbook ----------
  const GLOSSARY = {
    'meteorologist': 'A scientist who studies the weather: sun, cloud, wind and rain.',
    'vaccine': 'A medicine that trains the body to fight a disease. Most vaccines must be kept between 2 °C and 8 °C.',
    'cold chain': 'Keeping vaccines cold all the way from the factory to the patient. One warm night can spoil them.',
    'power': 'How fast something uses (or makes) energy, measured in watts (W).',
    'energy': 'The ability to make things happen. Electrical energy is measured in watt-hours (Wh).',
    'watt': 'The unit of power. A 40 W bulb uses energy twice as fast as a 20 W bulb.',
    'watt-hours': 'The unit of energy: power × time. A 40 W bulb left on for 10 hours uses 400 Wh.',
    'solar panel': 'A panel that turns sunlight into electricity. Less light means less power.',
    'battery': 'A store of electrical energy, charged in the day and used at night.',
    'capacity': 'How much energy a battery can hold, in watt-hours. Old batteries hold less than their label says.',
    'energy audit': 'A survey of everything that uses energy in a building, to find where it goes.',
    'LED': 'A modern kind of light bulb that gives the same light for a fraction of the energy.',
    'efficiency': 'Getting the same job done using less energy.',
    'renewable': 'Energy from sources that do not run out, such as the sun and the wind.',
    'wind turbine': 'A machine with blades that turns the energy of the wind into electricity.',
    'fair test': 'An experiment where you change only one thing and keep everything else the same.'
  };
  const HANDBOOK = [
    { id: 'pe', title: 'Power and energy', html: '<p><strong>Power</strong> (watts, W) is how fast energy is used. <strong>Energy</strong> (watt-hours, Wh) is how much is used in total.</p><p><strong>Energy = power × time.</strong> A 1000 W kettle used for half an hour uses 1000 × 0.5 = 500 Wh. A 40 W bulb left on for 12 hours uses 480 Wh, almost as much!</p>' },
    { id: 'solar', title: 'Solar panels', html: '<p>A solar panel makes most power at midday, in full sun. Cloud, shade and dust all reduce the light reaching it, so it makes less power.</p><p>Even shade on part of a panel can cut its power a lot.</p>' },
    { id: 'battery', title: 'Batteries', html: '<p>The battery stores energy from the day for use at night. Its <strong>capacity</strong> is how many watt-hours it holds.</p><p>Batteries wear out: after many years a battery may hold only half of what its label says. To measure it fairly, charge it fully, run a known load (for example a 100 W lamp) and time how long it lasts. <strong>Capacity = watts × hours.</strong></p>' },
    { id: 'audit', title: 'Energy audit', html: '<p>List every appliance, its power and how many hours a day it is on. Multiply to find the energy each one uses. Then you know where the energy goes, and what to fix first.</p>' },
    { id: 'save', title: 'Saving energy first', html: '<p>Engineers say: <strong>the cheapest energy is the energy you do not use.</strong> Efficient bulbs, good fridge seals and switching things off often cost far less than new panels or batteries.</p>' },
    { id: 'weather', title: 'Weather and renewables', html: '<p>The meteorologist reads the forecast. Sunny days give plenty of solar power; cloudy days give much less. Storms are often windy, so a wind turbine can help when the sun cannot.</p><p>A good system is designed for the worst days in the forecast, not the best.</p>' }
  ];

  // ---------- stage 1: introduction ----------
  function tempChart() {
    const rows = simulate(OLD, true), W = 380, H = 200, L = 34, B = 30, T = 22;
    const X = i => L + (i / 71) * (W - L - 10), Y = v => H - B - (v / 14) * (H - B - T);
    return `<svg viewBox="0 0 ${W} ${H}" class="case-chart" role="img" aria-label="Vaccine fridge temperature over the last three nights: it rises above 8 °C after midnight every night">
      <text x="${L}" y="12" class="ax-t">Fridge temperature (°C), last 3 days</text>
      <rect x="${L}" y="${Y(8)}" width="${W - L - 10}" height="${Y(2) - Y(8)}" fill="#2C7A4B" opacity="0.12"/><text x="${W - 12}" y="${Y(8) + 12}" class="ax" text-anchor="end">safe 2–8 °C</text>
      ${[0, 8, 14].map(v => `<line x1="${L}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      <polyline points="${rows.map(r => `${X(r.i)},${Y(r.T)}`).join(' ')}" fill="none" stroke="#C2412D" stroke-width="2.5"/>
      ${[6, 30, 54].map(i => `<text x="${X(i)}" y="${H - 10}" class="ax" text-anchor="middle">night ${(i - 6) / 24 + 1}</text>`).join('')}
    </svg>`;
  }
  function renderIntro(api, el) {
    const q = { id: 'i1', text: 'The vaccines must stay between 2 °C and 8 °C. What does the chart show?', options: ['The fridge gets too warm in the second half of every night, then cools down in the morning', 'The fridge is too warm all the time', 'The fridge is fine'], correct: 0, explain: 'The problem happens at the same time every night. That is an important clue.' };
    el.innerHTML = `<div class="intro-board">
      <article class="message">
        <div class="msg-head"><span class="msg-icon" aria-hidden="true">✉</span><div><strong>From: Nurse Amara, Island Clinic</strong><br><span class="muted">To: GHA Meteorologist · Subject: Our vaccines are at risk!</span></div></div>
        <p data-read>${api.gloss('Our solar panels and battery power the clinic, including the vaccine fridge. For the last three nights, the fridge alarm has gone off after midnight. The vaccines got too warm.')}</p>
        <p data-read>${api.gloss('If this goes on, we will have to throw the vaccines away, and the children cannot be protected. A storm is coming, with two cloudy days.')}</p>
        <p data-read>${api.gloss('You know the sun and the wind better than anyone. Please find out why the power fails, and help us fix it before the storm.')}</p>
      </article>
      <div class="intro-side">
        <div class="role-card"><span class="role-badge" aria-hidden="true">🌤️</span><div><span class="label">Your role</span><strong>Meteorologist</strong><small>Follow the energy from the sun to the fridge, and plan for the storm.</small></div></div>
        <div class="chart-frame">${tempChart()}</div>
      </div></div>
      <div class="stage-tasks">${api.question(q)}
        <label class="field"><span data-read>Your first ideas: why might the power fail at night?</span><textarea id="ideas" rows="2" placeholder="We think…">${esc(api.S.data.ideas || '')}</textarea></label>
        <div class="actions">${api.answered(['i1']) ? '<button type="button" class="btn primary" id="next">Do an energy audit of the clinic</button>' : '<p class="muted">Answer the question to start.</p>'}</div></div>`;
    el.querySelector('#ideas').addEventListener('input', e => { api.S.data.ideas = e.target.value; api.save(); });
    api.bindQuestions([q], () => { api.complete('intro'); api.stepDone('briefing'); });
    const n = el.querySelector('#next'); if (n) n.addEventListener('click', () => api.go('audit'));
  }

  // ---------- stage 2: energy audit ----------
  const APPS = [
    { id: 'fridge', name: 'Vaccine fridge', w: 60, h: 24, wh: 1440, x: 215, y: 330, icon: '🧊', text: 'The vaccine fridge uses 60 W on average (its motor switches on and off) and runs 24 hours a day.' },
    { id: 'lights', name: 'Lights (4 bulbs)', w: 160, h: 12, wh: 1920, x: 440, y: 255, icon: '💡', text: 'Four old 40 W bulbs, so 160 W together. They stay on all night, from 18:00 to 06:00 (12 hours), for safety.' },
    { id: 'fan', name: 'Ceiling fan', w: 40, h: 8, wh: 320, x: 560, y: 245, icon: '🌀', text: 'The ceiling fan uses 40 W and runs for 8 hours in the hot afternoon.' },
    { id: 'computer', name: 'Computer', w: 50, h: 8, wh: 400, x: 590, y: 400, icon: '💻', text: 'The computer uses 50 W and is on for 8 hours of clinic time.' },
    { id: 'kettle', name: 'Kettle', w: 1000, h: 0.5, wh: 500, x: 360, y: 395, icon: '🫖', text: 'The kettle uses 1000 W, but only for half an hour a day (0.5 h) in total.' },
    { id: 'radio', name: 'Radio', w: 5, h: 24, wh: 120, x: 690, y: 330, icon: '📻', text: 'The emergency radio uses 5 W and is always on (24 hours).' }
  ];
  const CLUES = [
    { id: 'seal', x: 275, y: 430, icon: '🩹', title: 'Fridge door seal', text: 'The rubber seal on the fridge door is torn. Warm air leaks in, so the motor has to run longer.' },
    { id: 'panels', x: 330, y: 130, icon: '🟫', title: 'Solar panels', text: 'Four 250 W panels on the roof. They are covered in dust: nobody has cleaned them for a year.' },
    { id: 'tree', x: 820, y: 120, icon: '🌳', title: 'Breadfruit tree', text: 'The tree has grown tall. From about 1 pm its shadow falls across the panels.' },
    { id: 'battery', x: 470, y: 475, icon: '🔋', title: 'Battery', text: 'The label says 4000 Wh. It is 8 years old. Does it still hold that much?' }
  ];
  function clinicScene(st) {
    const found = st.found;
    const spot = (s, label) => `<g class="spot ${found[s.id] ? 'found' : ''} ${st.sel === s.id ? 'sel' : ''}" data-spot="${s.id}" transform="translate(${s.x},${s.y})" tabindex="0" role="button" aria-label="Inspect: ${esc(label)}"><circle r="22" class="spot-ring"/><circle r="16" fill="${found[s.id] ? '#2C7A4B' : '#F2B630'}" stroke="#10262E" stroke-width="2"/><text y="6" text-anchor="middle" font-size="16">${found[s.id] ? '✓' : '🔍'}</text></g>`;
    return `<svg viewBox="0 0 1000 560" class="site clinic" role="img" aria-label="Cutaway drawing of the clinic at night, with solar panels on the roof and a tall tree beside it">
      <defs><linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2C4A"/><stop offset="1" stop-color="#3B4F6E"/></linearGradient></defs>
      <rect width="1000" height="560" fill="url(#nsky)"/>
      ${[[60, 40], [180, 80], [640, 30], [720, 90], [930, 60], [500, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff" opacity="0.8"/>`).join('')}
      <circle cx="110" cy="90" r="26" fill="#F3EBC8"/><circle cx="122" cy="82" r="24" fill="url(#nsky)"/>
      <rect y="500" width="1000" height="60" fill="#3E5A34"/>
      <g transform="translate(860,500)"><rect x="-14" y="-230" width="28" height="230" fill="#5B4330"/><ellipse cx="-30" cy="-270" rx="120" ry="90" fill="#2E5A2A"/><ellipse cx="40" cy="-300" rx="90" ry="70" fill="#36682F"/><text y="40" text-anchor="middle" class="vlabel" style="fill:#fff;stroke:none">Breadfruit tree</text></g>
      <rect x="150" y="200" width="620" height="300" fill="#F5E9CF" stroke="#10262E" stroke-width="4"/>
      <polygon points="130,205 790,205 770,160 150,160" fill="#8C6A3A" stroke="#10262E" stroke-width="3"/>
      ${[0, 1, 2, 3].map(k => `<g transform="translate(${190 + k * 140},120)"><rect width="120" height="42" fill="#27476E" stroke="#C8D4E0" stroke-width="2"/>${[30, 60, 90].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="42" stroke="#C8D4E0" stroke-width="1"/>`).join('')}<line x1="0" y1="21" x2="120" y2="21" stroke="#C8D4E0" stroke-width="1"/>${[[14, 8], [44, 30], [78, 12], [100, 32], [62, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#B8A07A" opacity="0.8"/>`).join('')}</g>`).join('')}
      <polygon points="610,120 750,120 760,162 600,162" fill="#000" opacity="0.35"/>
      <g transform="translate(180,250)"><rect width="90" height="220" rx="6" fill="#E9F0F2" stroke="#4A636C" stroke-width="3"/><line x1="0" y1="80" x2="90" y2="80" stroke="#4A636C" stroke-width="2"/><text x="45" y="45" text-anchor="middle" font-size="26">❄</text><text x="45" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#10262E">VACCINES</text><line x1="90" y1="90" x2="90" y2="210" stroke="#C2412D" stroke-width="5" stroke-dasharray="10 6"/><rect x="20" y="150" width="50" height="22" rx="3" fill="#10262E"/><text x="45" y="166" text-anchor="middle" font-size="13" fill="#F2B630" font-family="monospace">9.6°C</text></g>
      ${[330, 410, 490, 570].map(x => `<g transform="translate(${x},200)"><line x1="0" y1="0" x2="0" y2="30" stroke="#10262E" stroke-width="2"/><circle cy="42" r="13" fill="#FFE9A0" stroke="#B48A2A" stroke-width="2"/><circle cy="42" r="34" fill="#FFE9A0" opacity="0.25"/></g>`).join('')}
      <g transform="translate(640,212)"><line x1="0" y1="-12" x2="0" y2="8" stroke="#10262E" stroke-width="3"/><ellipse cx="0" cy="10" rx="56" ry="6" fill="#7A8C93"/><circle cy="10" r="7" fill="#10262E"/></g>
      <g transform="translate(540,410)"><rect x="-40" y="0" width="190" height="14" fill="#8C6A3A"/><rect x="-30" y="14" width="10" height="76" fill="#8C6A3A"/><rect x="130" y="14" width="10" height="76" fill="#8C6A3A"/><rect x="20" y="-56" width="80" height="52" rx="4" fill="#10262E"/><rect x="26" y="-50" width="68" height="40" fill="#5B8FB0"/><rect x="50" y="-4" width="20" height="4" fill="#10262E"/></g>
      <g transform="translate(330,410)"><rect x="-40" y="0" width="120" height="14" fill="#8C6A3A"/><rect x="-30" y="14" width="10" height="76" fill="#8C6A3A"/><rect x="60" y="14" width="10" height="76" fill="#8C6A3A"/><path d="M0,0 L4,-36 L36,-36 L40,0 Z" fill="#C24E4E" stroke="#10262E" stroke-width="2"/><path d="M40,-28 q14,4 4,22" fill="none" stroke="#10262E" stroke-width="3"/></g>
      <g transform="translate(700,290)"><rect x="-30" y="30" width="70" height="8" fill="#8C6A3A"/><rect x="-24" y="2" width="56" height="28" rx="4" fill="#3E7F6E" stroke="#10262E" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="#10262E"/><line x1="-14" y1="2" x2="-22" y2="-16" stroke="#10262E" stroke-width="2"/></g>
      <g transform="translate(420,440)"><rect width="110" height="56" rx="6" fill="#2F3B40" stroke="#10262E" stroke-width="2"/><rect x="18" y="-8" width="14" height="8" fill="#B03A28"/><rect x="78" y="-8" width="14" height="8" fill="#10262E"/><text x="55" y="34" text-anchor="middle" font-size="14" fill="#F2B630" font-weight="700">4000 Wh</text></g>
      <path d="M300,162 C300,180 470,180 470,440" fill="none" stroke="#10262E" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
      <g transform="translate(905,40)"><rect x="-75" y="-24" width="150" height="40" rx="8" fill="rgba(16,38,46,0.8)"/><text y="4" text-anchor="middle" font-size="20" fill="#F2B630" font-family="monospace" font-weight="700">01:00</text></g>
      ${APPS.map(a => spot(a, a.name)).join('')}${CLUES.map(c => spot(c, c.title)).join('')}
    </svg>`;
  }
  function renderAudit(api, el) {
    const S = api.S, st = S.data.audit = S.data.audit || { found: {}, sel: null, vals: {} };
    const apps = APPS.filter(a => st.found[a.id]), allApps = apps.length === APPS.length, nClues = CLUES.filter(c => st.found[c.id]).length;
    const sel = APPS.find(a => a.id === st.sel) || CLUES.find(c => c.id === st.sel);
    const tableOk = api.answered(['a1']);
    const q = { id: 'a2', text: 'Which uses the most energy in a day?', options: ['The kettle, because it has the most power', 'The lights, because they are on for 12 hours every night', 'The radio, because it is always on'], correct: 1, explain: 'The kettle has the most power (1000 W) but runs for only half an hour. The lights use 1920 Wh a day, more than anything else, and all of it at night, from the battery.' };
    el.innerHTML = `<div class="lab-grid">
      <div class="scene"><div class="scene-bar"><span class="mono">Appliances: ${apps.length} / ${APPS.length} · Clues: ${nClues} / ${CLUES.length}</span><span class="muted">Tap the 🔍 markers.</span></div>
        <div class="scene-frame">${clinicScene(st)}</div></div>
      <div class="scene-side">
        ${sel ? `<article class="interview"><h3><span aria-hidden="true">${sel.icon}</span> ${esc(sel.name || sel.title)}</h3><p data-read>${api.gloss(sel.text)}</p></article>` : `<p class="muted" data-read>${api.gloss('It is 1 am at the clinic. Tap the magnifying glasses to inspect every appliance and look for clues about the panels and the battery.')}</p>`}
        ${CLUES.some(c => st.found[c.id]) ? `<div class="table-wrap"><table class="tally-t"><caption>Clues</caption><tbody>${CLUES.filter(c => st.found[c.id]).map(c => `<tr><td><span aria-hidden="true">${c.icon}</span> ${esc(c.title)}</td><td>${esc(c.text)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </div></div>
      <div class="stage-tasks"><h2>Where does the energy go?</h2>
        <p data-read>${api.gloss('Energy = power × time. Work out the watt-hours each appliance uses in a day.')}</p>
        <div class="table-wrap"><table class="tally-t notebook audit-t"><caption>Energy audit</caption><thead><tr><th>Appliance</th><th>Power (W)</th><th>Hours a day</th><th>Energy (Wh a day)</th></tr></thead><tbody>
          ${APPS.map(a => st.found[a.id] ? `<tr><td><span aria-hidden="true">${a.icon}</span> ${esc(a.name)}</td><td class="mono">${a.w}</td><td class="mono">${a.h}</td><td>${tableOk ? `<strong class="mono">${a.wh}</strong>` : `<input class="wh-in" data-wh="${a.id}" inputmode="decimal" value="${esc(st.vals[a.id] || '')}" aria-label="Energy for ${esc(a.name)}">`}</td></tr>` : `<tr><td class="muted">? Find it in the clinic</td><td>—</td><td>—</td><td>—</td></tr>`).join('')}
          ${tableOk ? `<tr><th colspan="3">Total</th><th class="mono">4700 Wh</th></tr>` : ''}
        </tbody></table></div>
        ${tableOk ? '<p class="calc-fb ok">All correct!</p>' : allApps ? '<div class="actions"><button type="button" class="btn primary" id="check-audit">Check my audit</button></div><p class="calc-fb" id="audit-fb" aria-live="polite"></p>' : `<p class="note">Find all ${APPS.length} appliances to fill in the table (${APPS.length - apps.length} more).</p>`}
        ${tableOk ? api.question(q) : ''}
        ${api.answered(['a1', 'a2']) ? (nClues === CLUES.length ? '<div class="actions"><button type="button" class="btn primary" id="next">Go to the energy lab</button></div>' : `<p class="note">Find all ${CLUES.length} clues before you leave (${CLUES.length - nClues} more): look at the fridge door, the roof, the tree and the battery.</p>`) : ''}</div>`;
    el.querySelectorAll('[data-spot]').forEach(g => { const pick = () => { st.sel = g.dataset.spot; st.found[st.sel] = true; api.save(); api.rerender(); }; g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); });
    el.querySelectorAll('.wh-in').forEach(inp => inp.addEventListener('input', () => { st.vals[inp.dataset.wh] = inp.value; api.save(); }));
    const ca = el.querySelector('#check-audit');
    if (ca) ca.addEventListener('click', () => {
      const wrong = APPS.filter(a => Number(String(st.vals[a.id] || '').replace(',', '.')) !== a.wh), n = api.tries('a1');
      el.querySelectorAll('.wh-in').forEach(inp => inp.classList.toggle('bad', wrong.some(a => a.id === inp.dataset.wh)));
      if (!wrong.length) { api.award('a1', n === 1); api.stepDone('audit'); api.rerender(); }
      else { const fb = el.querySelector('#audit-fb'); fb.className = 'calc-fb no'; fb.textContent = `${wrong.length} answer${wrong.length > 1 ? 's are' : ' is'} not right yet (marked in red). Multiply the power by the hours. Example: 40 W × 8 h = 320 Wh.`; }
    });
    api.bindQuestions([q], () => { api.stepDone('most'); if (CLUES.every(c => st.found[c.id])) api.complete('audit'); });
    if (api.answered(['a1', 'a2']) && CLUES.every(c => st.found[c.id])) api.complete('audit');
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('lab'));
  }

  // ---------- stage 3: energy lab ----------
  const PANEL_TESTS = [['sun-clean-none', 'Sunny, clean, no shade'], ['sun-dusty-none', 'Sunny, dusty, no shade'], ['sun-clean-tree', 'Sunny, clean, in the tree\'s shade'], ['cloud-clean-none', 'Cloudy, clean, no shade']];
  const panelW = p => Math.round(240 * (p.sky === 'cloud' ? 0.35 : 1) * (p.dust === 'dusty' ? 0.8 : 1) * (p.shade === 'tree' ? 0.4 : 1));
  const BATT = { old: { name: 'The clinic\'s old battery', hours: 20, label: 4000 }, spare: { name: 'A brand-new battery (same label)', hours: 40, label: 4000 } };
  function panelSVG(p, reading) {
    const ang = -120 + (reading / 300) * 240, sunny = p.sky !== 'cloud';
    return `<svg viewBox="0 0 600 320" class="tool-svg" role="img" aria-label="Solar panel test: ${reading} watts">
      <rect width="600" height="320" fill="${sunny ? '#BFE0F0' : '#AEB8BF'}" rx="10"/>
      ${sunny ? '<circle cx="90" cy="70" r="40" fill="#F7C948"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${90 + Math.cos(a * Math.PI / 180) * 50}" y1="${70 + Math.sin(a * Math.PI / 180) * 50}" x2="${90 + Math.cos(a * Math.PI / 180) * 64}" y2="${70 + Math.sin(a * Math.PI / 180) * 64}" stroke="#F7C948" stroke-width="5" stroke-linecap="round"/>`).join('')
        : [[90, 70], [170, 55], [260, 80]].map(([x, y]) => `<g transform="translate(${x},${y})"><ellipse rx="60" ry="26" fill="#E3E8EA"/><ellipse cx="-30" cy="6" rx="36" ry="20" fill="#D3DADD"/><ellipse cx="34" cy="8" rx="34" ry="18" fill="#D3DADD"/></g>`).join('')}
      <rect y="270" width="600" height="50" fill="#6E9A3A"/>
      <g transform="translate(220,230) skewX(-20)"><rect width="200" height="80" fill="#27476E" stroke="#C8D4E0" stroke-width="3" transform="translate(0,-80)"/>
        ${p.dust === 'dusty' ? Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 37) % 196 + 2}" cy="${-78 + (i * 23) % 76}" r="${2 + (i % 3)}" fill="#B8A07A" opacity="0.85"/>`).join('') : ''}
        ${p.shade === 'tree' ? '<rect x="80" y="-80" width="120" height="80" fill="#000" opacity="0.45"/>' : ''}</g>
      <rect x="300" y="230" width="10" height="45" fill="#4A636C"/>
      ${p.shade === 'tree' ? '<g transform="translate(470,270)"><rect x="-10" y="-150" width="20" height="150" fill="#5B4330"/><ellipse cx="-20" cy="-170" rx="80" ry="60" fill="#2E5A2A"/></g>' : ''}
      <g transform="translate(500,110)"><circle r="80" fill="#fff" stroke="#10262E" stroke-width="4"/>
        ${[0, 100, 200, 300].map(v => { const a = (-120 + v / 300 * 240 - 90) * Math.PI / 180; return `<text x="${Math.cos(a) * 60}" y="${Math.sin(a) * 60 + 5}" text-anchor="middle" font-size="13" fill="#4A636C">${v}</text>`; }).join('')}
        <line x1="0" y1="0" x2="0" y2="-66" stroke="#C2412D" stroke-width="4" stroke-linecap="round" transform="rotate(${ang})"/><circle r="7" fill="#10262E"/>
        <text y="44" text-anchor="middle" font-size="22" font-weight="700" fill="#10262E" font-family="monospace">${reading} W</text></g>
      <path d="M310,250 C380,250 420,190 440,190" fill="none" stroke="#10262E" stroke-width="3"/>
    </svg>`;
  }
  function battSVG(kind, hours, lit) {
    const full = BATT[kind].hours, left = Math.max(0, 1 - hours / full);
    return `<svg viewBox="0 0 600 300" class="tool-svg" role="img" aria-label="Battery test: ${hours} hours, ${Math.round(left * 100)}% left">
      <rect width="600" height="300" fill="#E8EEF0" rx="10"/>
      <g transform="translate(70,70)"><rect width="200" height="150" rx="10" fill="#2F3B40" stroke="#10262E" stroke-width="3"/><rect x="40" y="-14" width="30" height="14" fill="#B03A28"/><rect x="130" y="-14" width="30" height="14" fill="#10262E"/>
        <rect x="14" y="${14 + (1 - left) * 122}" width="172" height="${left * 122}" rx="4" fill="${left > 0.25 ? '#4CAF6A' : '#E2553A'}"/>
        <text x="100" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">${Math.round(left * 100)}%</text><text x="100" y="140" text-anchor="middle" font-size="12" fill="#F2B630">label: 4000 Wh</text></g>
      <path d="M270,120 C330,120 340,90 400,90" fill="none" stroke="#10262E" stroke-width="3"/>
      <g transform="translate(440,90)"><circle r="${lit ? 60 : 0}" fill="#FFE9A0" opacity="0.4"/><circle r="28" fill="${lit ? '#FFE07A' : '#D8D8D0'}" stroke="#8C6A3A" stroke-width="3"/><rect x="-14" y="26" width="28" height="22" fill="#7A8C93"/><text y="78" text-anchor="middle" font-size="14" font-weight="700" fill="#10262E">100 W lamp</text></g>
      <g transform="translate(440,230)"><rect x="-80" y="-24" width="160" height="44" rx="8" fill="#10262E"/><text y="6" text-anchor="middle" font-size="20" fill="#F2B630" font-family="monospace" font-weight="700">${hours} h</text></g>
    </svg>`;
  }
  function renderLab(api, el) {
    const S = api.S, L = S.data.lab = S.data.lab || { tool: 'panel', p: { sky: 'sun', dust: 'clean', shade: 'none' }, reading: 0, batt: 'old', bh: 0, ran: null, results: { panel: {}, batt: {} } };
    const pkey = `${L.p.sky}-${L.p.dust}-${L.p.shade}`;
    const todo = [...PANEL_TESTS.filter(([k]) => L.results.panel[k] == null).map(([k]) => ['panel', k]), ...Object.keys(BATT).filter(k => L.results.batt[k] == null).map(k => ['batt', k])];
    const done = !todo.length;
    let tool;
    if (L.tool === 'panel') {
      const seg = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<label class="${val === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${val === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
      const needed = PANEL_TESTS.some(([k]) => k === pkey);
      tool = `<div class="tool"><div class="tool-frame" id="panel-frame">${panelSVG(L.p, L.measured === pkey ? panelW(L.p) : 0)}</div>
        <div class="tool-controls"><p data-read>${api.gloss('Test one 250 W solar panel at midday. Change one thing at a time (a fair test), measure, and record the power.')}</p>
          ${seg('sky', [['sun', '☀️ Sunny'], ['cloud', '☁️ Cloudy']], L.p.sky)}${seg('dust', [['clean', 'Clean panel'], ['dusty', 'Dusty panel']], L.p.dust)}${seg('shade', [['none', 'No shade'], ['tree', 'Tree shade']], L.p.shade)}
          <div class="actions"><button type="button" class="btn small primary" id="measure">Measure</button>${L.measured === pkey && needed && L.results.panel[pkey] == null ? '<button type="button" class="btn small" id="rec-panel">Record in notebook</button>' : ''}</div>
          <p class="calc-fb ${L.results.panel[pkey] != null ? 'ok' : ''}" id="panel-fb" aria-live="polite">${L.results.panel[pkey] != null ? `Recorded: ${L.results.panel[pkey]} W.` : needed ? '' : 'This mix is not one of the four tests in the notebook. Try changing just one thing from "sunny, clean, no shade".'}</p></div></div>`;
    } else {
      const R = L.results.batt[L.batt], ran = L.ran === L.batt;
      tool = `<div class="tool"><div class="tool-frame" id="batt-frame">${battSVG(L.batt, ran ? BATT[L.batt].hours : 0, false)}</div>
        <div class="tool-controls"><p data-read>${api.gloss('Measure the real capacity of a battery. Charge it fully, then run a 100 W lamp until the battery is empty, and time it. Capacity = watts × hours.')}</p>
          <div class="seg">${Object.entries(BATT).map(([k, b]) => `<label class="${L.batt === k ? 'on' : ''}"><input type="radio" name="batt" value="${k}" ${L.batt === k ? 'checked' : ''}> ${esc(b.name)}</label>`).join('')}</div>
          <div class="actions"><button type="button" class="btn small primary" id="run-batt">Charge, then run the lamp</button></div>
          ${R != null ? `<p class="calc-fb ok">Recorded: ${R} Wh.</p>` : ran ? `<label class="field"><span>The lamp ran for ${BATT[L.batt].hours} hours. Capacity (Wh) = 100 W × ${BATT[L.batt].hours} h =</span><input id="cap" inputmode="numeric"></label><div class="actions"><button type="button" class="btn small" id="rec-batt">Check and record</button></div><p class="calc-fb" id="batt-fb" aria-live="polite"></p>` : ''}</div></div>`;
    }
    const qs = [
      { id: 'l1', text: 'By how much did the dust reduce the panel\'s power?', options: ['About 20% (240 W down to 192 W)', 'About 60%', 'It made no difference'], correct: 0, explain: 'A quick clean gives back a fifth of the power, for almost nothing.' },
      { id: 'l2', text: 'On a sunny day, what cut the power the most?', options: ['The dust', 'The tree\'s shade', 'Nothing: sunny days are always fine'], correct: 1, explain: 'The shade cut it to 96 W, a drop of 60%. And it happens every afternoon.' },
      { id: 'l3', text: 'The old battery\'s label says 4000 Wh. What did your fair test show?', options: ['It now holds only about 2000 Wh, half of its label', 'It holds 4000 Wh, as the label says', 'It holds more than the label'], correct: 0, explain: 'The new battery lasted 40 hours (4000 Wh), the old one only 20 hours (2000 Wh). Old batteries wear out.' }
    ];
    el.innerHTML = `<div class="bench">
      <div class="nb-head"><span class="mono">${6 - todo.length} of 6 tests done${todo.length ? ` · ${todo.length} to go` : ' · all done!'}</span>${todo.length ? '<button type="button" class="btn small primary" id="next-test">Next test →</button>' : ''}</div>
      <div class="tools" role="tablist">${[['panel', 'Solar panel meter'], ['batt', 'Battery test']].map(([k, n]) => `<button type="button" class="tool-tab ${L.tool === k ? 'on' : ''}" data-tool="${k}" id="tool-${k}" role="tab" aria-selected="${L.tool === k}">${n}</button>`).join('')}</div>
      <div class="tool-wrap">${tool}</div>
      <div class="table-wrap"><table class="tally-t notebook"><caption>Lab notebook</caption><tbody>
        ${PANEL_TESTS.map(([k, l]) => `<tr><th>Panel: ${esc(l)}</th><td class="mono">${L.results.panel[k] != null ? L.results.panel[k] + ' W' : '—'}</td></tr>`).join('')}
        ${Object.entries(BATT).map(([k, b]) => `<tr><th>Battery: ${esc(b.name)}</th><td class="mono">${L.results.batt[k] != null ? L.results.batt[k] + ' Wh' : '—'}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="stage-tasks"><h2>What did you find?</h2>${done ? qs.map(q => api.question(q)).join('') + (api.answered(['l1', 'l2', 'l3']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Work out the night budget</button></div>' : '') : '<p class="note">Finish all 6 tests to unlock the questions. Tap <strong>Next test</strong>.</p>'}</div>`;
    el.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { L.tool = b.dataset.tool; api.save(); api.rerender(); }));
    const nt = el.querySelector('#next-test');
    if (nt) nt.addEventListener('click', () => { const [tl, k] = todo[0]; L.tool = tl; if (tl === 'panel') { const [sky, dust, shade] = k.split('-'); L.p = { sky, dust, shade }; L.measured = null; } else { L.batt = k; L.ran = null; } api.save(); api.rerender(); el.querySelector('.bench').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (L.tool === 'panel') {
      el.querySelectorAll('input[name=sky], input[name=dust], input[name=shade]').forEach(r => r.addEventListener('change', () => { L.p[r.name] = r.value; L.measured = null; api.save(); api.rerender(); }));
      el.querySelector('#measure').addEventListener('click', () => {
        const target = panelW(L.p), frame = el.querySelector('#panel-frame'); el.querySelector('#measure').disabled = true; let v = 0;
        const step = () => { v = reduce ? target : Math.min(target, v + Math.max(4, target / 12)); frame.innerHTML = panelSVG(L.p, Math.round(v)); if (v < target) setTimeout(step, 40); else { L.measured = pkey; api.save(); api.rerender(); } };
        step();
      });
      const rp = el.querySelector('#rec-panel'); if (rp) rp.addEventListener('click', () => { L.results.panel[pkey] = panelW(L.p); api.save(); api.rerender(); });
    } else {
      el.querySelectorAll('input[name=batt]').forEach(r => r.addEventListener('change', () => { L.batt = r.value; L.ran = null; api.save(); api.rerender(); }));
      el.querySelector('#run-batt').addEventListener('click', () => {
        const frame = el.querySelector('#batt-frame'), full = BATT[L.batt].hours; el.querySelector('#run-batt').disabled = true; let h = 0;
        const step = () => { h = reduce ? full : h + 1; frame.innerHTML = battSVG(L.batt, h, h < full); if (h < full) setTimeout(step, 90); else { L.ran = L.batt; api.save(); api.rerender(); } };
        step();
      });
      const rb = el.querySelector('#rec-batt');
      if (rb) rb.addEventListener('click', () => {
        const v = Number(el.querySelector('#cap').value), right = 100 * BATT[L.batt].hours;
        if (v === right) { L.results.batt[L.batt] = right; api.save(); api.rerender(); }
        else { const fb = el.querySelector('#batt-fb'); fb.className = 'calc-fb no'; fb.textContent = `Not quite. Multiply 100 W by ${BATT[L.batt].hours} hours.`; }
      });
    }
    api.bindQuestions(qs, () => { if (api.answered(['l1', 'l2', 'l3'])) { api.stepDone('tests'); api.complete('lab'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('budget'));
  }

  // ---------- stage 4: the night budget ----------
  const NIGHT_W = 60 + 160 + 5, START_WH = 1600;
  function nightSVG(h) {
    const left = Math.max(0, START_WH - NIGHT_W * h), frac = left / 2000, off = left <= 0, t = 18 + h;
    const a = ((t % 12) / 12) * 360;
    return `<svg viewBox="0 0 640 300" class="tool-svg" role="img" aria-label="At ${hh(t)} the battery has ${Math.round(left)} Wh left">
      <rect width="640" height="300" rx="12" fill="#1B2C4A"/>
      <g transform="translate(110,150)"><circle r="80" fill="#F5F0E1" stroke="#10262E" stroke-width="4"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-70" x2="0" y2="-62" stroke="#10262E" stroke-width="3" transform="rotate(${i * 30})"/>`).join('')}
        <line x1="0" y1="0" x2="0" y2="-48" stroke="#10262E" stroke-width="6" stroke-linecap="round" transform="rotate(${a})"/><circle r="6" fill="#10262E"/><text y="112" text-anchor="middle" font-size="22" fill="#F2B630" font-family="monospace" font-weight="700">${hh(t)}</text></g>
      <g transform="translate(250,60)"><rect width="140" height="180" rx="10" fill="#2F3B40" stroke="#fff" stroke-width="3"/><rect x="45" y="-14" width="50" height="14" fill="#fff"/>
        <rect x="12" y="${12 + (1 - frac) * 156}" width="116" height="${frac * 156}" rx="4" fill="${frac > 0.2 ? '#4CAF6A' : '#E2553A'}"/>
        <text x="70" y="100" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${Math.round(left)} Wh</text></g>
      <g transform="translate(520,150)"><rect x="-55" y="-90" width="110" height="180" rx="8" fill="${off ? '#7A8C93' : '#E9F0F2'}" stroke="#fff" stroke-width="3"/><text y="-30" text-anchor="middle" font-size="34">${off ? '⚠️' : '❄'}</text>
        <text y="30" text-anchor="middle" font-size="16" font-weight="700" fill="${off ? '#fff' : '#10262E'}">${off ? 'POWER OFF' : 'Fridge on'}</text></g>
    </svg>`;
  }
  function renderBudget(api, el) {
    const S = api.S, st = S.data.budget = S.data.budget || { h: 0, val: '' };
    const okCalc = api.answered(['b1']);
    const qs = [
      { id: 'b2', text: 'Move the night clock. When does the battery run out?', options: ['At about 9 pm', 'At about 1 am', 'It lasts all night'], correct: 1, explain: '1600 Wh ÷ 225 W = about 7 hours after 6 pm: about 1 am. Exactly when the fridge alarm started!' },
      { id: 'b3', text: 'Which hypothesis explains the warm nights?', options: ['The fridge is broken', 'The clinic uses more energy at night than the battery can store, so it runs empty after midnight', 'Someone switches the fridge off at night', 'The nights are too hot'], correct: 1, explain: 'Energy in, energy stored and energy out do not balance. Next, sort the evidence to see what is making the gap.' }
    ];
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('On a sunny day the panels make 3600 Wh. The daytime appliances use 2000 Wh, so only 1600 Wh is left to charge the battery. At night, everything runs on the battery.')}</p></div>
      <div class="lab-grid">
        <div class="scene"><div class="scene-frame">${nightSVG(st.h)}</div>
          <label class="ctl" for="night-h"><span>Night clock: <output class="mono" id="nh-out">${hh(18 + st.h)}</output></span><input type="range" id="night-h" min="0" max="12" step="1" value="${st.h}"></label></div>
        <div class="scene-side">
          <h3>Energy used at night (18:00 to 06:00, 12 hours)</h3>
          <div class="table-wrap"><table class="tally-t"><tbody>
            <tr><td>🧊 Fridge</td><td class="mono">60 W × 12 h</td><td class="mono">${okCalc ? '720 Wh' : '?'}</td></tr>
            <tr><td>💡 Lights</td><td class="mono">160 W × 12 h</td><td class="mono">${okCalc ? '1920 Wh' : '?'}</td></tr>
            <tr><td>📻 Radio</td><td class="mono">5 W × 12 h</td><td class="mono">${okCalc ? '60 Wh' : '?'}</td></tr>
          </tbody></table></div>
          ${okCalc ? '<p class="calc-fb ok">Total night use: 2700 Wh. The battery starts the night with only 1600 Wh (and can never hold more than 2000 Wh).</p>' : `<label class="field"><span>Total energy used in one night (Wh)</span><input id="night-total" inputmode="numeric" value="${esc(st.val)}"></label><div class="actions"><button type="button" class="btn primary" id="check-night">Check</button></div><p class="calc-fb" id="night-fb" aria-live="polite"></p>`}
          <div class="calc-box">Battery left = 1600 Wh − 225 W × hours since 18:00</div>
        </div></div>
      <div class="stage-tasks">${okCalc ? qs.map((q, i) => (i === 0 || api.answered([qs[i - 1].id])) ? api.question(q) : '').join('') : ''}${api.answered(['b1', 'b2', 'b3']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Sort the evidence</button></div>' : ''}</div>`;
    const sl = el.querySelector('#night-h');
    sl.addEventListener('input', () => { st.h = Number(sl.value); el.querySelector('.scene-frame').innerHTML = nightSVG(st.h); el.querySelector('#nh-out').textContent = hh(18 + st.h); });
    sl.addEventListener('change', () => { st.h = Number(sl.value); api.save(); });
    const ni = el.querySelector('#night-total'); if (ni) ni.addEventListener('input', () => { st.val = ni.value; api.save(); });
    const cn = el.querySelector('#check-night');
    if (cn) cn.addEventListener('click', () => {
      const n = api.tries('b1');
      if (Number(el.querySelector('#night-total').value) === 2700) { api.award('b1', n === 1); api.stepDone('night'); api.rerender(); }
      else { const fb = el.querySelector('#night-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Not yet. Work out each row (watts × 12 hours), then add them up.'; }
    });
    api.bindQuestions(qs, () => { if (api.answered(['b2', 'b3'])) { api.stepDone('hypothesis'); api.complete('budget'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('evidence'));
  }

  // ---------- stage 5: evidence ----------
  const CARDS = [
    { id: 'c1', icon: '💡', text: 'Four old 40 W bulbs stay on all night: 1920 Wh, more than anything else.', col: 'use' },
    { id: 'c2', icon: '🩹', text: 'The fridge door seal is torn, so the motor runs longer: 60 W instead of 40 W.', col: 'use' },
    { id: 'c3', icon: '🌳', text: 'The tree shades the panels every afternoon: 240 W drops to 96 W.', col: 'make' },
    { id: 'c4', icon: '🟫', text: 'Dust on the panels cuts their power by 20%.', col: 'make' },
    { id: 'c5', icon: '🔋', text: 'The 8-year-old battery holds only 2000 Wh, half of its 4000 Wh label.', col: 'store' },
    { id: 'c6', icon: '🌡️', text: 'The fridge thermostat was tested: it works correctly.', col: 'no' },
    { id: 'c7', icon: '🔌', text: 'An electrician checked the wiring: no faults.', col: 'no' }
  ];
  const ECOLS = { use: 'Using too much energy', make: 'Making too little', store: 'Storing too little', no: 'Not the cause' };
  function renderEvidence(api, el) {
    const S = api.S, st = S.data.ev = S.data.ev || { place: {}, pick: null };
    const all = CARDS.every(c => st.place[c.id]);
    const q = { id: 'e2', text: 'Engineers say "save energy first". Why?', options: ['Saving energy is usually much cheaper than making or storing more', 'Panels and batteries do not work', 'It is the law'], correct: 0, explain: 'LED bulbs cost a few credits and save more energy each night than a whole new battery could hold.' };
    el.innerHTML = `<div class="board"><p class="board-help" data-read>Sort the evidence. Is each card about using too much energy, making too little, storing too little, or not the cause at all? Tap a card, then a column.</p>
      <div class="cards">${CARDS.filter(c => !st.place[c.id]).map(c => `<button type="button" class="ev-card ${st.pick === c.id ? 'picked' : ''}" data-ev="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('') || '<p class="muted">All cards sorted.</p>'}</div>
      <div class="columns four">${Object.entries(ECOLS).map(([k, t]) => `<div class="ev-col" data-col="${k}" role="button" tabindex="0"><h3>${t}</h3>${CARDS.filter(c => st.place[c.id] === k).map(c => `<button type="button" class="ev-card placed ${st.wrong && st.wrong.includes(c.id) ? 'wrong' : ''}" data-back="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('')}</div>`).join('')}</div>
      <div class="actions"><button type="button" class="btn primary" id="check-board" ${all && !api.answered(['e1']) ? '' : 'disabled'}>Check my sorting</button></div>
      <p class="calc-fb ${api.answered(['e1']) ? 'ok' : ''}" id="board-fb" aria-live="polite">${api.answered(['e1']) ? 'Correct. Three problems add up: too much use at night, too little made, and too little stored.' : ''}</p></div>
      <div class="stage-tasks">${api.answered(['e1']) ? api.question(q) : ''}${api.answered(['e1', 'e2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Design for the storm</button></div>' : ''}</div>`;
    el.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { st.pick = st.pick === b.dataset.ev ? null : b.dataset.ev; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-col]').forEach(c => c.addEventListener('click', e => { if (e.target.closest('[data-back]') || !st.pick) return; st.place[st.pick] = c.dataset.col; st.pick = null; st.wrong = null; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { if (api.answered(['e1'])) return; delete st.place[b.dataset.back]; st.wrong = null; api.save(); api.rerender(); }));
    const cb = el.querySelector('#check-board');
    if (cb) cb.addEventListener('click', () => {
      const wrong = CARDS.filter(c => st.place[c.id] !== c.col).map(c => c.id), n = api.tries('e1');
      if (!wrong.length) { api.award('e1', n === 1); api.stepDone('sort'); api.rerender(); }
      else { st.wrong = wrong; api.save(); api.rerender(); const fb = el.querySelector('#board-fb'); fb.className = 'calc-fb no'; fb.textContent = `${wrong.length} card${wrong.length > 1 ? 's are' : ' is'} in the wrong column (marked in red).`; }
    });
    api.bindQuestions([q], () => { api.stepDone('first'); api.complete('evidence'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('design'));
  }

  // ---------- stage 6: design for the storm ----------
  function stormChart(rows, upto, key, title, max, goal, goodLow) {
    const W = 640, H = 170, L = 40, R = 12, T = 26, B = 24, X = i => L + (i / 72) * (W - L - R), Y = v => H - B - (Math.min(v, max) / max) * (H - B - T);
    const shown = rows.slice(0, upto), last = shown[shown.length - 1];
    const path = shown.map((r, k) => `${k ? 'L' : 'M'}${X(r.i + 1)},${Y(r[key])}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" class="storm-chart" role="img" aria-label="${title}">
      <text x="${L}" y="15" class="ax-t">${title}</text>
      ${[0, 1, 2].map(n => `<rect x="${X(n * 24)}" y="${T}" width="${X(12) - X(0)}" height="${H - B - T}" fill="#1B2C4A" opacity="0.08"/>`).join('')}
      ${[0, max / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 5}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${goal != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="#C2412D" stroke-dasharray="5 4"/><text x="${L + 4}" y="${Y(goal) - 4}" class="ax">${goodLow ? 'limit ' : ''}${goal}</text>` : ''}
      ${shown.length ? `<path d="${path}" class="st-line"/>` : ''}
      ${shown.filter(r => !r.on).map(r => `<rect x="${X(r.i)}" y="${H - B - 6}" width="${X(1) - X(0)}" height="6" fill="#C2412D"/>`).join('')}
      ${last ? `<circle cx="${X(last.i + 1)}" cy="${Y(last[key])}" r="4" class="pt"/>` : ''}
      ${[0, 24, 48, 72].map(i => `<text x="${X(i)}" y="${H - 6}" class="ax" text-anchor="${i === 0 ? 'start' : i === 72 ? 'end' : 'middle'}">${['18:00 tonight', 'day 1', 'day 2', 'day 3'][i / 24]}</text>`).join('')}
    </svg>`;
  }
  function forecastStrip() {
    return `<div class="forecast">${['Tonight', 'Day 1', 'Day 2', 'Day 3'].map((d, k) => `<div><b>${d}</b><span aria-hidden="true">${['🌙', '☁️💨', '☁️💨', '☀️'][k]}</span><small>${['Clear', 'Cloudy, windy', 'Cloudy, windy', 'Sunny'][k]}</small></div>`).join('')}</div>`;
  }
  function renderDesign(api, el) {
    const S = api.S, d = S.data.design = S.data.design || Object.assign({}, OLD, { runs: 0, shown: 0 });
    const rows = simulate(d), c = cost(d), over = c > BUDGET, shown = d.shown || 0;
    const off = rows.filter(r => !r.on).length, maxT = Math.max(...rows.map(r => r.T)), ok = off === 0;
    const tick = (id, l, small, on) => `<label class="toggle"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span><strong>${l}</strong>${small ? `<small>${small}</small>` : ''}</span></label>`;
    const q = { id: 'd2', text: 'Why did the LED bulbs matter so much?', options: ['At night all the energy comes from the battery, and the old bulbs used most of it', 'LEDs charge the battery', 'LEDs make the panels work better'], correct: 0, explain: 'The night load dropped from 225 W to under 90 W, so the same battery lasts more than twice as long.' };
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Plan the fixes before the storm. Goal: the vaccine fridge must have power every hour for the next 72 hours, through two cloudy days. Budget: 70 credits.')}</p>${forecastStrip()}</div>
      <div class="lab-grid">
        <div class="scene"><div class="chart-frame" id="storm-charts">${stormChart(rows, shown, 'B', 'Battery (Wh)', 4000, null)}${stormChart(rows, shown, 'T', 'Fridge temperature (°C)', 30, 8, true)}</div>
          <p class="muted">Shaded bands are nights. A red mark under a chart means the power was off that hour.</p></div>
        <div class="scene-side">
          <div class="load ${over ? 'over' : ''}"><span class="mono big">${c} / ${BUDGET} credits</span><div class="meter"><i style="width:${Math.min(100, c / BUDGET * 100)}%"></i></div></div>
          <span class="field-l">Use less</span>
          ${tick('led', 'LED bulbs instead of old bulbs (10)', '160 W of lights becomes 24 W.', d.led)}
          <div class="seg">${[['old', 'Fridge as it is (0)'], ['seal', 'New door seal (5)'], ['new', 'New solar fridge (40)']].map(([v, l]) => `<label class="${d.fridge === v ? 'on' : ''}"><input type="radio" name="fridge" value="${v}" ${d.fridge === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          <span class="field-l">Make more</span>
          ${tick('clean', 'Clean the panels every week (2)', '', d.clean)}${tick('trim', 'Trim the tree (5)', 'No more afternoon shade.', d.trim)}${tick('panels', 'Add 2 more panels (30)', '', d.panels)}${tick('wind', 'Small wind turbine (35)', '60 W when windy, 10 W when calm.', d.wind)}
          <span class="field-l">Store more</span>
          ${tick('battery', 'New battery, 4000 Wh (45)', '', d.battery)}
          <div class="actions"><button type="button" class="btn primary" id="run" ${over ? 'disabled' : ''}>Run the 72 hours</button></div>
          ${over ? '<p class="note">Over budget. Remove something.</p>' : ''}
          ${shown === 72 ? `<div class="gauges"><div class="${off ? 'bad' : ''}"><span>Hours without power</span><b class="mono">${off}</b></div><div class="${maxT > 8 ? 'bad' : ''}"><span>Warmest fridge</span><b class="mono">${maxT} °C</b></div><div><span>Credits used</span><b class="mono">${c}</b></div><div class="${ok ? '' : 'warn'}"><span>Verdict</span><b>${ok ? 'Vaccines safe!' : 'Not there yet'}</b></div></div>` : ''}
        </div></div>
      <div class="stage-tasks">${api.answered(['d1']) ? api.question(q) : ''}${api.answered(['d1', 'd2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Write the case summary</button></div>' : ''}</div>`;
    const changed = () => { d.shown = 0; api.save(); api.rerender(); };
    ['led', 'clean', 'trim', 'panels', 'wind', 'battery'].forEach(id => el.querySelector('#' + id).addEventListener('change', e => { d[id] = e.target.checked; changed(); }));
    el.querySelectorAll('input[name=fridge]').forEach(r => r.addEventListener('change', () => { d.fridge = r.value; changed(); }));
    el.querySelector('#run').addEventListener('click', () => {
      el.querySelector('#run').disabled = true; d.runs += 1; d.shown = 0;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, box = el.querySelector('#storm-charts');
      const step = () => { d.shown = reduce ? 72 : Math.min(72, d.shown + 3); box.innerHTML = stormChart(rows, d.shown, 'B', 'Battery (Wh)', 4000, null) + stormChart(rows, d.shown, 'T', 'Fridge temperature (°C)', 30, 8, true); if (d.shown < 72) setTimeout(step, 70); else { if (ok) { api.award('d1', d.runs <= 2); api.stepDone('plan'); } api.save(); api.rerender(); } };
      step();
    });
    api.bindQuestions([q], () => { api.stepDone('why'); api.complete('design'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('summary'));
  }

  // ---------- stage 7: summary ----------
  const RECS = [['Swap the old bulbs for LED bulbs', true], ['Repair the fridge door seal (or buy an efficient fridge)', true], ['Clean the panels every week and keep the tree trimmed', true], ['Add generation or storage for cloudy, stormy weeks (panels, a wind turbine or a new battery)', true], ['Switch the fridge off at night to save energy', false], ['Ignore the forecast: sunny days are what matters', false]];
  function renderSummary(api, el) {
    const S = api.S, chosen = S.data.recs || [], ok = api.answered(['s2']), d = S.data.design || OLD;
    const right = RECS.map((r, i) => (r[1] ? i : -1)).filter(i => i >= 0);
    const total = Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), max = CASE.stages.reduce((a, s) => a + (s.points || 0), 0);
    const plan = [d.led && 'LED bulbs', d.fridge === 'seal' && 'new fridge seal', d.fridge === 'new' && 'new solar fridge', d.clean && 'weekly panel cleaning', d.trim && 'tree trimmed', d.panels && '2 more panels', d.wind && 'wind turbine', d.battery && 'new battery'].filter(Boolean).join(', ') || '—';
    const report = () => ['OPERATION ISLAND 2040 · CASE FILE #4: THE NIGHT THE FRIDGE WENT WARM', '', 'THE PROBLEM', 'The clinic\'s vaccine fridge lost power after midnight three nights in a row, and the vaccines got warmer than 8 °C.', '',
      'EVIDENCE', '- Energy audit: the clinic uses 4700 Wh a day. The old lights use 1920 Wh, all of it at night.', '- Night budget: 2700 Wh used at night, but the battery starts the night with only 1600 Wh, so it runs empty at about 1 am.', '- Panel tests: 240 W clean, 192 W dusty, 96 W in the tree\'s shade, 84 W under cloud.', '- Battery test: the old battery holds 2000 Wh, half of its 4000 Wh label.', '',
      'CONCLUSION', 'Three problems add up: too much energy used at night, too little made (dust and shade) and too little stored (a worn-out battery). The fridge thermostat and wiring are fine.', '',
      'PLAN FOR THE STORM', `${plan} (${cost(d)} credits)`, '',
      'RECOMMENDATIONS', ...((S.data.recs || []).map(i => '- ' + RECS[i][0])), '', 'MESSAGE TO NURSE AMARA', (S.data.message || '').trim() || '—'].join('\n');
    el.innerHTML = `<div class="report">
      <div class="report-head"><span class="stamp ${ok ? 'closed' : ''}">${ok ? 'Case closed' : 'Draft'}</span><div><p class="eyebrow">Meteorologist's report</p><h2>The Night the Fridge Went Warm</h2></div></div>
      <div class="report-grid">
        <section><h3>The problem</h3><p>The vaccine fridge lost power after midnight, three nights in a row.</p></section>
        <section><h3>The cause</h3><p data-read>${api.gloss('The battery ran empty at about 1 am. Too much energy was used at night, too little was made, and the old battery stored too little.')}</p></section>
        <section><h3>The evidence</h3><ul><li>Old lights: 1920 Wh a night.</li><li>Night use 2700 Wh; battery starts with 1600 Wh.</li><li>Shade: 240 W → 96 W. Dust: −20%.</li><li>Old battery: 2000 Wh, not 4000.</li></ul></section>
        <section><h3>Plan for the storm</h3><p>${esc(plan)}</p></section>
      </div>
      <h3>Recommendations</h3>
      <div class="cq-options">${RECS.map((r, i) => `<label class="${chosen.includes(i) ? 'on' : ''}"><input type="checkbox" data-rec="${i}" ${chosen.includes(i) ? 'checked' : ''} ${ok ? 'disabled' : ''}> ${esc(r[0])}</label>`).join('')}</div>
      ${ok ? '<p class="calc-fb ok">These four actions tackle all three problems: use less, make more, store more.</p>' : '<div class="actions"><button type="button" class="btn" id="check-recs">Check recommendations</button></div><p class="calc-fb" id="recs-fb" aria-live="polite"></p>'}
      <label class="field"><span>Message to Nurse Amara: explain why the power failed and how your plan keeps the vaccines cold</span><textarea id="message" rows="4">${esc(S.data.message || '')}</textarea></label>
      ${ok ? `<div class="final"><span class="mono big">${total} / ${max}</span><span>Final score. Well done, Meteorologist!</span></div>` : ''}
      <div class="actions"><button type="button" class="btn ghost" id="copy-report">Copy the report</button>${ok ? '<a class="btn primary" href="#cases">Back to Case Files</a>' : ''}</div>
      <p class="muted" id="copy-status" aria-live="polite"></p><textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea></div>`;
    el.querySelectorAll('[data-rec]').forEach(cb => cb.addEventListener('change', () => { const i = Number(cb.dataset.rec); S.data.recs = cb.checked ? chosen.concat(i) : chosen.filter(x => x !== i); api.save(); api.rerender(); }));
    el.querySelector('#message').addEventListener('input', e => { S.data.message = e.target.value; api.save(); });
    const cr = el.querySelector('#check-recs');
    if (cr) cr.addEventListener('click', () => {
      const n = api.tries('s2');
      if ((S.data.recs || []).slice().sort().join(',') === right.join(',')) { api.award('s2', n === 1); api.stepDone('recs'); api.complete('summary'); OI.store.get().log.case4 = { score: Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), at: new Date().toISOString() }; api.save(); api.rerender(); }
      else { const fb = el.querySelector('#recs-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Not quite. Which actions help you use less, make more and store more? Is anything harmful?'; }
    });
    el.querySelector('#copy-report').addEventListener('click', () => {
      const txt = report(), status = el.querySelector('#copy-status'), ta = el.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied.'; }, fallback); } catch (e) { fallback(); }
    });
  }

  const CASE = {
    id: 'fridge', number: 4, title: 'The Night the Fridge Went Warm', glossary: GLOSSARY, handbook: HANDBOOK,
    stages: [
      { id: 'intro', title: 'Introduction', color: '#E8613C', points: 2, steps: [{ id: 'briefing', title: 'The nurse\'s message' }], render: renderIntro,
        coach: [{ sel: '#case-stage .term', text: 'Orange words are in the glossary. Tap one.' }, { sel: '.case-chart', text: 'When does the fridge get too warm?' }, { sel: '.cq', text: 'Answer the question to start.' }] },
      { id: 'audit', title: 'Energy audit', color: '#F0A33A', points: 4, steps: [{ id: 'audit', title: 'Fill in the audit' }, { id: 'most', title: 'Biggest user' }], render: renderAudit,
        coach: [{ sel: '[data-spot="fridge"]', text: 'Tap a magnifying glass to inspect an appliance.' }, { sel: '.audit-t', text: 'Each appliance you find appears here. Work out its energy: watts × hours.' }] },
      { id: 'lab', title: 'Energy lab', color: '#D9B92E', points: 6, steps: [{ id: 'tests', title: 'Panel and battery tests' }], render: renderLab,
        coach: [{ sel: '#tool-panel', text: 'Two experiments: a solar panel meter and a battery test.' }, { sel: '#next-test', text: 'Next test takes you through all six.' }] },
      { id: 'budget', title: 'Night budget', color: '#8CC152', points: 6, steps: [{ id: 'night', title: 'Energy used at night' }, { id: 'hypothesis', title: 'Choose a hypothesis' }], render: renderBudget,
        coach: [{ sel: '#night-h', text: 'Slide the night clock and watch the battery.' }, { sel: '#night-total', text: 'Add up the energy used in one night.' }] },
      { id: 'evidence', title: 'Test the evidence', color: '#3FB6A8', points: 4, steps: [{ id: 'sort', title: 'Sort the evidence' }, { id: 'first', title: 'Save energy first' }], render: renderEvidence,
        coach: [{ sel: '.ev-card', text: 'Tap a card, then the column it belongs in.' }] },
      { id: 'design', title: 'Storm plan', color: '#4FA3E0', points: 4, steps: [{ id: 'plan', title: 'Plan for 72 hours' }, { id: 'why', title: 'Why LEDs?' }], render: renderDesign,
        coach: [{ sel: '.forecast', text: 'Read the forecast first: two cloudy, windy days are coming.' }, { sel: '#run', text: 'Choose your fixes, then run the 72 hours.' }] },
      { id: 'summary', title: 'Case summary', color: '#9B8BE0', points: 2, steps: [{ id: 'recs', title: 'Recommendations' }], render: renderSummary,
        coach: [{ sel: '[data-rec="0"]', text: 'Choose the actions that will keep the vaccines cold.' }] }
    ]
  };
  OI.cases = OI.cases || {};
  OI.cases.fridge = { def: CASE, simulate, cost, mount(el) { this.inst = OI.caseKit.mount(el, CASE); }, unmount() { if (this.inst) this.inst.unmount(); } };
})();
