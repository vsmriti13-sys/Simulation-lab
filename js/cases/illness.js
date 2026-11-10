/* Case File #1 — The Mystery Illness.
 * Stage 1 of the build: Introduction, Outbreak map, Water lab. Later stages are listed but locked.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // ---------- the village ----------
  const SOURCES = {
    spring: { name: 'Spring on the hill', short: 'Spring', pt: [150, 118], color: '#2F8FD0' },
    tank: { name: 'Rain tank', short: 'Rain tank', pt: null, color: '#2BA59A' },
    up: { name: 'River, above the bridge', short: 'River (above bridge)', pt: [584, 146], color: '#7A62C9' },
    down: { name: 'River, below the toilet block', short: 'River (below toilets)', pt: [650, 452], color: '#C2412D' }
  };
  const FAMILIES = [
    ['amani', 'Amani', 110, 230, 4, 0, 'spring', 'We carry water from the spring on the hill every morning. Everyone here is well.'],
    ['bose', 'Bose', 235, 195, 3, 0, 'spring', 'Spring water tastes cold and clean. No one has been sick.'],
    ['chen', 'Chen', 345, 245, 5, 0, 'spring', 'Five of us, all healthy. We use the spring.'],
    ['dlamini', 'Dlamini', 150, 330, 2, 0, 'spring', 'The path to the spring was muddy after the storm, but the water was clear. We are fine.'],
    ['eriksen', 'Eriksen', 280, 325, 4, 0, 'spring', 'No illness here. We fetch our water from the spring.'],
    ['fofana', 'Fofana', 410, 400, 3, 0, 'tank', 'Our youngest has a cough and a runny nose, but no stomach ache. We drink from our rain tank.'],
    ['garcia', 'Garcia', 260, 430, 4, 0, 'tank', 'Our rain tank filled up in the storm. We are all well.'],
    ['haddad', 'Haddad', 120, 450, 2, 0, 'tank', 'We use rainwater from the roof. No one is sick.'],
    ['ito', 'Ito', 340, 525, 5, 0, 'tank', 'All five of us are fine. Our rain tank has a lid.'],
    ['jensen', 'Jensen', 180, 555, 3, 0, 'tank', 'Rainwater from our tank. Nobody is ill.'],
    ['kowalski', 'Kowalski', 690, 100, 4, 0, 'up', 'We fill our buckets from the river above the bridge, where the rocks are. We are all fine.'],
    ['lima', 'Lima', 790, 175, 3, 0, 'up', 'River water, from up near the rocks. It has been a bit cloudy since the storm, but no one is sick.'],
    ['moreau', 'Moreau', 895, 110, 2, 0, 'up', 'We use the river above the bridge. We are healthy.'],
    ['nkosi', 'Nkosi', 745, 440, 5, 3, 'down', 'Three of us have stomach cramps, diarrhoea and fever. It started three days after the storm. We take water from the river near our house, below the bridge.'],
    ['okafor', 'Okafor', 865, 445, 4, 2, 'down', 'My husband and daughter are ill with stomach pains and diarrhoea. We drink river water from just below the toilet block.'],
    ['patel', 'Patel', 745, 548, 3, 3, 'down', 'All three of us are sick. The river water has been brown since the storm.'],
    ['quispe', 'Quispe', 860, 572, 4, 1, 'down', 'My son started with a fever and diarrhoea yesterday. We collect our water from the river, down here.'],
    ['rossi', 'Rossi', 945, 505, 2, 0, 'down', 'We take river water from below the bridge too, but my grandmother boils all our drinking water. We are both fine.']
  ].map(([id, name, x, y, people, sick, source, quote]) => ({ id, name, x, y, people, sick, source, quote }));
  const RIVER = 'M500,-20 C520,70 600,110 585,190 C570,260 520,300 575,360 C630,420 690,470 660,560 C645,600 640,630 640,660';

  function house(f, st) {
    const roof = { spring: '#B4512F', tank: '#2B7A8C', up: '#6B5AA8', down: '#8C6A3A' }[f.source];
    const v = st.visited[f.id], sel = st.sel === f.id;
    return `<g class="house ${sel ? 'sel' : ''}" data-house="${f.id}" transform="translate(${f.x},${f.y})" tabindex="0" role="button" aria-label="${f.name} family${v ? (f.sick ? `, ${f.sick} sick` : ', no one sick') : ''}">
      <ellipse cx="0" cy="20" rx="30" ry="7" fill="rgba(0,0,0,0.18)"/>
      <rect x="-22" y="-6" width="44" height="26" rx="2" fill="#F3E4C4" stroke="#6b5a40" stroke-width="1.5"/>
      <polygon points="-27,-5 0,-26 27,-5" fill="${roof}" stroke="#3a2e22" stroke-width="1.5"/>
      <rect x="-5" y="6" width="10" height="14" fill="#7A5634"/>
      ${f.source === 'tank' ? '<g transform="translate(30,4)"><rect x="-7" y="-10" width="14" height="22" rx="3" fill="#4FA8C9" stroke="#1E5F75" stroke-width="1.5"/><line x1="-7" y1="-4" x2="7" y2="-4" stroke="#1E5F75"/></g>' : ''}
      <text x="0" y="37" text-anchor="middle" class="vlabel">${f.name}</text>
      ${sel ? '<rect x="-34" y="-34" width="68" height="78" rx="8" fill="none" stroke="#F2B630" stroke-width="3"/>' : ''}
      ${v ? (f.sick ? `<g transform="translate(22,-26)"><circle r="12" fill="#C2412D" stroke="#fff" stroke-width="2"/><text y="5" text-anchor="middle" class="vbadge">${f.sick}</text></g>` : '<g transform="translate(22,-26)"><circle r="11" fill="#2C7A4B" stroke="#fff" stroke-width="2"/><text y="5" text-anchor="middle" class="vbadge">✓</text></g>') : ''}
    </g>`;
  }
  function village(st, opts) {
    const o = opts || {};
    const trees = [[60, 110], [80, 160], [400, 130], [430, 170], [460, 300], [60, 520], [470, 560], [940, 260], [980, 320], [700, 260], [760, 300], [880, 300], [420, 60], [300, 90]];
    const lines = o.sources ? FAMILIES.filter(f => f.source !== 'tank').map(f => { const p = SOURCES[f.source].pt; return `<line x1="${f.x}" y1="${f.y}" x2="${p[0]}" y2="${p[1]}" stroke="${SOURCES[f.source].color}" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.9"/>`; }).join('') : '';
    const flags = o.flags ? Object.entries(o.flags).map(([id, p]) => `<g class="flag ${o.taken.includes(id) ? 'taken' : ''}" data-sample="${id}" transform="translate(${p[0]},${p[1]})" tabindex="0" role="button" aria-label="Sample point: ${SOURCES[id].name}">
        <circle r="22" fill="rgba(255,255,255,0.75)" stroke="${o.taken.includes(id) ? '#2C7A4B' : '#F2B630'}" stroke-width="3"/>
        <path d="M-4,12 L-4,-14 L12,-8 L-4,-2" fill="${o.taken.includes(id) ? '#2C7A4B' : '#F2B630'}" stroke="#10262E" stroke-width="1.5"/>
        ${o.taken.includes(id) ? '<text x="0" y="40" text-anchor="middle" class="vlabel">Taken ✓</text>' : ''}</g>`).join('') : '';
    return `<svg class="village" viewBox="0 0 1000 620" role="img" aria-label="Map of the village with the spring, the river, the bridge and the toilet block">
      <defs>
        <linearGradient id="vgrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9C774"/><stop offset="1" stop-color="#8FB35E"/></linearGradient>
        <radialGradient id="vhill" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9DB067"/><stop offset="1" stop-color="#A9C774" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1000" height="620" fill="url(#vgrass)"/>
      <ellipse cx="190" cy="170" rx="260" ry="190" fill="url(#vhill)"/>
      ${[0, 1, 2].map(i => `<ellipse cx="170" cy="140" rx="${80 + i * 55}" ry="${55 + i * 40}" fill="none" stroke="rgba(70,90,40,0.25)" stroke-width="1.5"/>`).join('')}
      <g opacity="0.55">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="40" y="${470 + i * 12}" width="${80 + (i % 2) * 10}" height="6" rx="3" fill="#7E9A4E"/>`).join('')}</g>
      <path d="${RIVER}" fill="none" stroke="#6E8A5A" stroke-width="46" stroke-linecap="round"/>
      <path d="${RIVER}" fill="none" stroke="#4B9EC8" stroke-width="34" stroke-linecap="round"/>
      <path d="${RIVER}" fill="none" stroke="#8CC8E2" stroke-width="8" stroke-linecap="round" stroke-dasharray="18 26" opacity="0.7"/>
      <ellipse cx="640" cy="372" rx="56" ry="20" fill="#8A6A3C" opacity="0.55" transform="rotate(-18 640 372)"/>
      <path d="M575,360 C630,420 690,470 660,560" fill="none" stroke="#9C7B45" stroke-width="14" opacity="0.45"/>
      <g transform="translate(554,279)"><rect x="-48" y="-9" width="96" height="18" rx="3" fill="#8A6A44" stroke="#4d3a24" stroke-width="2"/>${[-36, -24, -12, 0, 12, 24, 36].map(x => `<line x1="${x}" y1="-9" x2="${x}" y2="9" stroke="#4d3a24"/>`).join('')}<text y="-16" text-anchor="middle" class="vlabel">Bridge</text></g>
      <g transform="translate(640,332)"><rect x="-26" y="-20" width="52" height="34" fill="#B89A72" stroke="#4d3a24" stroke-width="2"/><polygon points="-30,-19 0,-34 30,-19" fill="#7A5634" stroke="#4d3a24" stroke-width="2"/><rect x="-18" y="-10" width="14" height="24" fill="#5c432a"/><rect x="4" y="-10" width="14" height="24" fill="#5c432a"/><text y="-40" text-anchor="middle" class="vlabel">Toilet block</text></g>
      <g transform="translate(150,118)"><ellipse rx="26" ry="14" fill="#5FB4E0" stroke="#2A7FA8" stroke-width="2"/>${[[-30, -6], [26, -10], [-14, 14], [20, 12]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#8D8577"/>`).join('')}<text y="-22" text-anchor="middle" class="vlabel">Spring</text></g>
      ${trees.map(([x, y]) => `<g transform="translate(${x},${y})"><circle r="15" fill="#4C7F3E"/><circle cx="-5" cy="-5" r="8" fill="#6A9C52"/></g>`).join('')}
      <text x="600" y="30" class="vlabel" text-anchor="start">River ↓</text>
      ${lines}
      ${FAMILIES.map(f => house(f, st)).join('')}
      ${flags}
      <g transform="translate(940,40)"><path d="M0,-22 L9,8 L0,2 L-9,8 Z" fill="#10262E"/><text y="24" text-anchor="middle" class="vlabel">N</text></g>
    </svg>`;
  }

  // ---------- the water lab ----------
  const BOTTLES = {
    spring: { name: 'Spring', ntu: 1, ph: 7, ecoli: 0, tint: '#DCEFF8', bact: 0, mud: 3, algae: 0 },
    tank: { name: 'Rain tank (Garcia family)', ntu: 2, ph: 6, ecoli: 0, tint: '#E3F1F1', bact: 0, mud: 5, algae: 0 },
    up: { name: 'River, above the bridge', ntu: 8, ph: 7, ecoli: 12, tint: '#C9D8BD', bact: 6, mud: 18, algae: 5 },
    down: { name: 'River, below the toilet block', ntu: 45, ph: 8, ecoli: 160, tint: '#B39A6C', bact: 46, mud: 45, algae: 3 }
  };
  const SAMPLE_PTS = { spring: [150, 118], tank: [290, 434], up: [584, 146], down: [650, 452] };
  const PH_COL = { 4: '#E2553A', 5: '#EE8A35', 6: '#E9C445', 7: '#8CC152', 8: '#3FA7A0', 9: '#3E6FB6' };
  const TUBE_CM = 70;
  const discDepth = b => 300 / BOTTLES[b].ntu; // cm of water at which the disc disappears

  function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function colonies(b) {
    const n = BOTTLES[b].ecoli, r = rng(b.length * 97 + n), out = [];
    const gap = n > 40 ? 11 : 26;
    const place = quarter => { for (let k = 0; k < 400; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 140; const x = Math.cos(a) * d, y = Math.sin(a) * d; if (quarter === 'q' && !(x > 6 && y < -6)) continue; if (quarter === 'rest' && x > 0 && y < 0) continue; if (out.every(o => Math.hypot(o.x - x, o.y - y) > gap)) return { x, y }; } return { x: 0, y: 0 }; };
    if (n > 40) { for (let i = 0; i < 40; i++) out.push(Object.assign(place('q'), { t: 8 + r() * 8, s: 3.5 + r() * 2.5 })); for (let i = 40; i < n; i++) out.push(Object.assign(place('rest'), { t: 8 + r() * 8, s: 3.5 + r() * 2.5 })); }
    else for (let i = 0; i < n; i++) out.push(Object.assign(place('all'), { t: 8 + r() * 8, s: 7 + r() * 3 }));
    return out;
  }

  // ---------- glossary and handbook ----------
  const GLOSSARY = {
    'outbreak': 'A sudden rise in the number of people with the same illness, in one place, at the same time.',
    'contamination': 'When something harmful, such as germs, waste or chemicals, gets into water, food or soil.',
    'bacteria': 'Tiny living things, each made of one cell. Most are harmless, but some cause illness.',
    'hydrologist': 'A scientist who studies water: where it comes from, where it goes and whether it is safe.',
    'sample': 'A small amount of something, such as a bottle of water, taken to be tested.',
    'evidence': 'Facts or observations that help show whether an idea is true.',
    'hypothesis': 'A possible explanation that can be tested with evidence.',
    'diarrhoea': 'Loose, watery poo. A common sign of an illness caught from dirty water or food.',
    'upstream': 'Towards the place a river comes from.',
    'downstream': 'Towards the place a river flows to.',
    'latrine': 'A simple toilet, often a pit or a shed over a hole in the ground.',
    'turbidity': 'How cloudy water is. Measured in NTU: the higher the number, the cloudier the water.',
    'pH': 'A scale from 0 to 14 showing how acidic or alkaline something is. 7 is neutral.',
    'E. coli': 'A type of bacteria that lives in human and animal guts. Finding it in water means poo has got into the water.',
    'colony': 'A spot on a culture plate that has grown from one single bacterium.',
    'incubate': 'To keep something warm so that bacteria can grow.',
    'microscope': 'An instrument that magnifies tiny things so they can be seen.',
    'disinfection': 'Killing germs, for example by boiling, chlorine or sunlight.'
  };
  const HANDBOOK = [
    { id: 'illness', title: 'Illness from water', html: '<p>Some of the most common illnesses in the world spread through water that has been <strong>contaminated by human or animal waste</strong>. Germs in the waste get into drinking water, and people who drink it become ill, often with stomach cramps, diarrhoea and fever.</p><p>Storms and floods make this more likely, because flood water can wash waste from toilets and fields into rivers and wells.</p><p>Illness from water usually appears <strong>one to five days</strong> after drinking it.</p>' },
    { id: 'sources', title: 'Where water comes from', html: '<ul><li><strong>Springs</strong>: groundwater that has filtered slowly through rock. Often clean.</li><li><strong>Rain tanks</strong>: rain collected from roofs. Clean if the roof and tank are kept clean and covered.</li><li><strong>Rivers</strong>: carry everything that washes into them from the land upstream. Always treat river water before drinking it.</li></ul><p>A river carries pollution <strong>downstream</strong>. Water collected upstream of a pollution source is cleaner than water collected below it.</p>' },
    { id: 'turbidity', title: 'Turbidity tube', html: '<p>A turbidity tube measures how cloudy water is. Look down the tube at the black-and-white disc on the bottom while you slowly pour water in.</p><p><strong>Stop pouring the moment the disc disappears.</strong> Read the scale at the water level. The cloudier the water, the sooner the disc disappears and the higher the NTU.</p><p>Clear water does not mean safe water: germs are far too small to make water cloudy on their own.</p>' },
    { id: 'ph', title: 'pH strips', html: '<p>Dip a pH strip in the water, then compare the colour of the pad with the colour chart.</p><p>Drinking water is usually between pH 6.5 and 8.5. pH tells you whether water is acidic or alkaline. It does <strong>not</strong> tell you whether water contains germs.</p>' },
    { id: 'culture', title: 'Culture plates', html: '<p>To find bacteria, 100 mL of water is passed through a filter, and the filter is placed on a plate of jelly-like food (agar). The plate is <strong>incubated</strong> at 37 °C for 24 hours.</p><p>Each bacterium grows into a visible spot called a <strong>colony</strong>, so counting colonies tells you how many bacteria were in 100 mL.</p><p>Safe drinking water should have <strong>0 E. coli</strong> in 100 mL. Too many colonies to count? Count one quarter of the plate and multiply by 4.</p>' },
    { id: 'microscope', title: 'Microscopes', html: '<p>Start at low magnification (40×), then zoom in. Use the focus control until the edges look sharp.</p><p>At 1000× you can see bacteria. E. coli are tiny rod shapes, about 2 thousandths of a millimetre long. Scientists stain them with dye to make them easier to see.</p>' },
    { id: 'method', title: 'Thinking like a scientist', html: '<ol><li>Collect <strong>evidence</strong>: interviews, maps, tests.</li><li>Look for a <strong>pattern</strong>: what do the sick people have in common?</li><li>Make a <strong>hypothesis</strong>: a possible explanation.</li><li>Test it: does all the evidence fit? If not, change your hypothesis.</li></ol>' }
  ];

  // ---------- stage 1: introduction ----------
  const CASES_PER_DAY = [0, 0, 0, 2, 3, 1, 2, 1];
  function caseChart() {
    const W = 360, H = 200, L = 34, B = 34, T = 22, bw = (W - L - 10) / 8;
    const Y = v => H - B - (v / 4) * (H - B - T);
    return `<svg viewBox="0 0 ${W} ${H}" class="case-chart" role="img" aria-label="New cases each day since the storm: day 3, 2; day 4, 3; day 5, 1; day 6, 2; day 7, 1">
      <text x="${L}" y="14" class="ax-t">New cases each day</text>
      ${[0, 2, 4].map(v => `<line x1="${L}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${CASES_PER_DAY.map((v, i) => `${v ? `<rect x="${L + i * bw + 4}" y="${Y(v)}" width="${bw - 8}" height="${Y(0) - Y(v)}" rx="3" class="cbar"/><text x="${L + i * bw + bw / 2}" y="${Y(v) - 5}" class="ax-v" text-anchor="middle">${v}</text>` : ''}<text x="${L + i * bw + bw / 2}" y="${H - B + 16}" class="ax" text-anchor="middle">${i === 0 ? 'Storm' : 'Day ' + i}</text>`).join('')}
      <text x="${L + bw / 2}" y="${Y(0) - 10}" text-anchor="middle" font-size="20">⛈</text>
    </svg>`;
  }
  function renderIntro(api, el) {
    const S = api.S, q = { id: 'i1', text: 'In the nurse\'s message, what does "outbreak" mean?', options: ['A sudden rise in the number of people with the same illness', 'A storm that breaks out suddenly', 'A crack in a water pipe'], correct: 0, explain: 'Nine people with the same symptoms in one week is an outbreak.' };
    el.innerHTML = `<div class="intro-board">
      <article class="message">
        <div class="msg-head"><span class="msg-icon" aria-hidden="true">✉</span><div><strong>From: Nurse Amara, Island Clinic</strong><br><span class="muted">To: GHA Hydrologist · Subject: Urgent, people are getting sick</span></div></div>
        <p data-read>${api.gloss('Since the storm a week ago, nine people in the village have come to the clinic with stomach cramps, diarrhoea and fever. It is an outbreak, and there are new patients every day.')}</p>
        <p data-read>${api.gloss('I think it could be contamination in the drinking water, but the village uses several different water sources and I do not know which one is to blame.')}</p>
        <p data-read>${api.gloss('As the team\'s hydrologist, can you collect evidence, find the cause and stop it? Please hurry.')}</p>
      </article>
      <div class="intro-side">
        <div class="role-card"><span class="role-badge" aria-hidden="true">💧</span><div><span class="label">Your role</span><strong>Hydrologist</strong><small>Investigate the outbreak and find its cause.</small></div></div>
        <div class="chart-frame">${caseChart()}</div>
      </div>
    </div>
    <div class="stage-tasks">
      ${api.question(q)}
      <label class="field"><span data-read>Your first ideas: what could make people sick after a storm?</span><textarea id="ideas" rows="2" placeholder="We think…">${esc(S.data.ideas || '')}</textarea></label>
      <div class="actions">${api.answered(['i1']) ? '<button type="button" class="btn primary" id="to-map">Start the investigation</button>' : '<p class="muted">Answer the question to start the investigation.</p>'}</div>
    </div>`;
    el.querySelector('#ideas').addEventListener('input', e => { S.data.ideas = e.target.value; api.save(); });
    api.bindQuestions([q], () => { api.complete('intro'); api.stepDone('briefing'); });
    const b = el.querySelector('#to-map'); if (b) b.addEventListener('click', () => api.go('map'));
  }

  // ---------- stage 2: outbreak map ----------
  function tally(st, split) {
    const rows = split ? ['spring', 'tank', 'up', 'down'] : ['spring', 'tank', 'river'];
    const of = key => FAMILIES.filter(f => st.visited[f.id] && (key === 'river' ? (f.source === 'up' || f.source === 'down') : f.source === key));
    return `<div class="table-wrap" id="tally"><table class="tally-t"><caption>Evidence table</caption><thead><tr><th>Water source</th><th>Families</th><th>People</th><th>Sick</th></tr></thead><tbody>
      ${rows.map(k => { const fs = of(k); const sick = fs.reduce((a, f) => a + f.sick, 0), ppl = fs.reduce((a, f) => a + f.people, 0);
        return `<tr><td><i class="dot" style="background:${k === 'river' ? '#6B5AA8' : SOURCES[k].color}"></i>${k === 'river' ? 'River' : SOURCES[k].short}</td><td class="mono">${fs.length}</td><td class="mono">${ppl}</td><td class="mono ${sick ? 'sick' : ''}">${sick}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  }
  function renderMap(api, el) {
    const S = api.S, st = S.data.map = S.data.map || { visited: {}, sel: null, sources: false };
    const nVisited = Object.keys(st.visited).length;
    const f = FAMILIES.find(x => x.id === st.sel);
    const q1 = { id: 'm1', text: 'Which water source do all the sick families use?', options: ['The spring', 'Rain tanks', 'The river', 'Different sources'], correct: 2, explain: 'Every family with sick people collects water from the river.' };
    const q2 = { id: 'm2', text: 'Some river families are not sick. What is different about them? Choose all that apply.', options: ['They collect water above the bridge, upstream of the toilet block', 'They boil their drinking water', 'They have smaller families', 'They live near the forest'], correct: [0, 1], multi: true, explain: 'Families upstream of the toilet block, and the family that boils its water, stayed healthy.', hint: 'Look at where on the river each family collects water, and read the Rossi family\'s interview again.' };
    const qp = { id: 'p1', text: 'Prediction for the lab: which water sample will contain the most germs?', options: ['Spring', 'Rain tank', 'River above the bridge', 'River below the toilet block'] };
    const ready = nVisited >= 12;
    el.innerHTML = `<div class="lab-grid">
      <div class="scene">
        <div class="scene-bar"><span class="mono">Families interviewed: ${nVisited} / ${FAMILIES.length}</span>
          <button type="button" class="btn small ${st.sources ? 'primary' : 'ghost'}" id="src-toggle" aria-pressed="${st.sources}">${st.sources ? 'Hide water sources' : 'Show water sources'}</button></div>
        <div class="scene-frame">${village(st, { sources: st.sources })}</div>
        ${st.sources ? `<ul class="chart-key">${Object.entries(SOURCES).map(([, s]) => `<li><i style="background:${s.color}"></i>${s.name}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="scene-side">
        ${f ? `<article class="interview"><h3>The ${esc(f.name)} family</h3>
            <div class="people" aria-label="${f.people} people, ${f.sick} sick">${Array.from({ length: f.people }, (_, i) => `<span class="person ${i < f.sick ? 'ill' : ''}" aria-hidden="true"></span>`).join('')}</div>
            <p class="muted">${f.people} people · ${f.sick ? `<strong class="sick">${f.sick} sick</strong>` : 'no one sick'}</p>
            <blockquote data-read>${api.gloss(f.quote)}</blockquote>
            <p><span class="label">Water source</span> ${SOURCES[f.source].name}</p></article>`
          : `<p class="muted" data-read>Tap a house on the map to interview the family. Find out who is sick and where each family gets its water.</p>`}
        ${tally(st, api.answered(['m1']))}
      </div>
    </div>
    <div class="stage-tasks">
      <h2>Find the pattern</h2>
      ${ready || api.preview ? `${api.question(q1)}${api.answered(['m1']) || api.preview ? api.question(q2) : ''}
        ${api.answered(['m1', 'm2']) ? `<div class="cq"><p class="cq-text">${esc(qp.text)}</p><div class="cq-options">${qp.options.map((o, i) => `<label class="${S.data.predict === i ? 'on' : ''}"><input type="radio" name="pred" value="${i}" ${S.data.predict === i ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div></div>
          <div class="actions"><button type="button" class="btn primary" id="to-lab" ${S.data.predict == null ? 'disabled' : ''}>Go to the water lab</button></div>` : ''}`
        : `<p class="muted">Interview at least 12 families to start looking for a pattern (${12 - nVisited} more).</p>`}
    </div>`;
    el.querySelectorAll('[data-house]').forEach(h => {
      const pick = () => { st.sel = h.dataset.house; st.visited[st.sel] = true; api.save(); if (Object.keys(st.visited).length >= 12) api.stepDone('interview'); api.rerender(); };
      h.addEventListener('click', pick); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    el.querySelector('#src-toggle').addEventListener('click', () => { st.sources = !st.sources; api.save(); api.rerender(); });
    api.bindQuestions([q1, q2], () => { if (api.answered(['m1', 'm2'])) { api.stepDone('pattern'); } });
    el.querySelectorAll('input[name=pred]').forEach(r => r.addEventListener('change', () => { S.data.predict = Number(r.value); api.save(); api.complete('map'); api.rerender(); }));
    const b = el.querySelector('#to-lab'); if (b) b.addEventListener('click', () => api.go('lab'));
  }

  // ---------- stage 3: water lab ----------
  function bottleSVG(b, h) {
    const t = BOTTLES[b].tint;
    return `<svg viewBox="0 0 60 100" class="bottle-svg" aria-hidden="true"><rect x="22" y="2" width="16" height="10" rx="2" fill="#2B7A8C"/><path d="M18,12 h24 v8 q10,6 10,18 v52 q0,8 -8,8 h-28 q-8,0 -8,-8 v-52 q0,-12 10,-18 z" fill="rgba(255,255,255,0.65)" stroke="#4A636C" stroke-width="2"/>
      <path d="M10,${98 - h * 0.6} h40 v${h * 0.6 - 6} q0,6 -6,6 h-28 q-6,0 -6,-6 z" fill="${t}" stroke="none"/></svg>`;
  }
  function lab(api) {
    const S = api.S;
    S.data.lab = S.data.lab || { taken: [], at: 'collect', bottle: 'spring', tool: 'turbidity', results: {}, pour: 0, culture: {}, micro: { zoom: 40, focus: 20 } };
    const L = S.data.lab;
    Object.keys(BOTTLES).forEach(b => { L.results[b] = L.results[b] || {}; L.culture[b] = L.culture[b] || { plated: false, hours: 0, marked: [] }; });
    return L;
  }
  const required = L => Object.keys(BOTTLES).every(b => L.results[b].turbidity && L.results[b].ph && L.results[b].culture != null);

  // the 12 required tests, in a sensible order
  function todo(L) {
    const out = [];
    Object.keys(BOTTLES).forEach(b => { const r = L.results[b]; if (!r.turbidity) out.push([b, 'turbidity']); if (!r.ph) out.push([b, 'ph']); if (r.culture == null) out.push([b, 'culture']); });
    return out;
  }
  function notebook(L) {
    const go = (b, tool, label) => `<button type="button" class="btn small ghost nb-go" data-go="${b}|${tool}">${label}</button>`;
    const left = todo(L).length;
    return `<div class="nb-head"><span class="mono">${12 - left} of 12 tests done${left ? ` · ${left} to go` : ' · all done!'}</span>${left ? `<button type="button" class="btn small primary" id="next-test">Next test →</button>` : ''}</div>
      <div class="table-wrap"><table class="tally-t notebook"><caption>Lab notebook</caption><thead><tr><th>Sample</th><th>Turbidity</th><th>pH</th><th>E. coli per 100 mL</th><th>Microscope (1000×, extra)</th></tr></thead><tbody>
      ${Object.entries(BOTTLES).map(([b, B]) => { const r = L.results[b]; return `<tr class="${L.bottle === b ? 'cur' : ''}"><td>${esc(B.name)}</td>
        <td class="mono">${r.turbidity || go(b, 'turbidity', 'Test')}</td><td class="mono">${r.ph || go(b, 'ph', 'Test')}</td>
        <td class="mono ${r.culture > 0 ? 'sick' : ''}">${r.culture != null ? r.culture : go(b, 'culture', 'Test')}</td><td>${r.micro || go(b, 'micro', 'Look')}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  }

  function turbidityTool(L) {
    const b = L.bottle, hD = discDepth(b), h = L.pour;
    const top = 30, bottom = 430, X = 230, Wt = 70, y = cm => bottom - (cm / TUBE_CM) * (bottom - top);
    const op = Math.max(0, Math.min(1, (hD - h) / (0.35 * hD)));
    const marks = [70, 60, 50, 40, 30, 20, 15, 10, 6];
    return `<div class="tool turb">
      <svg viewBox="0 0 620 460" class="tool-svg" role="img" aria-label="Turbidity tube with ${h} centimetres of water">
        <rect x="${X}" y="${top}" width="${Wt}" height="${bottom - top}" rx="8" fill="rgba(255,255,255,0.55)" stroke="#4A636C" stroke-width="3"/>
        <rect id="turb-water" x="${X + 3}" y="${y(h)}" width="${Wt - 6}" height="${Math.max(0, bottom - y(h) - 3)}" fill="${BOTTLES[b].tint}" opacity="0.92"/>
        ${marks.map(cm => `<line x1="${X + Wt}" x2="${X + Wt + 14}" y1="${y(cm)}" y2="${y(cm)}" stroke="#4A636C" stroke-width="2"/><text x="${X + Wt + 20}" y="${y(cm) + 4}" class="ax">${cm} cm · ${Math.round(300 / cm)} NTU</text>`).join('')}
        <text x="${X - 10}" y="${top - 8}" class="ax-t">Side view</text>
        <g transform="translate(110,240)"><text y="-120" text-anchor="middle" class="ax-t">Looking down the tube</text>
          <circle r="85" fill="${BOTTLES[b].tint}" stroke="#4A636C" stroke-width="3"/>
          <g id="turb-disc" opacity="${op.toFixed(2)}"><path d="M0,0 L0,-55 A55,55 0 0,1 55,0 Z" fill="#10262E"/><path d="M0,0 L0,55 A55,55 0 0,1 -55,0 Z" fill="#10262E"/><path d="M0,0 L55,0 A55,55 0 0,1 0,55 Z" fill="#fff"/><path d="M0,0 L-55,0 A55,55 0 0,1 0,-55 Z" fill="#fff"/><circle r="55" fill="none" stroke="#10262E" stroke-width="2"/></g>
          <circle r="85" fill="${BOTTLES[b].tint}" opacity="${Math.min(0.85, h / hD * 0.6).toFixed(2)}"/></g>
      </svg>
      <div class="tool-controls">
        <label class="ctl" for="pour"><span>Water in the tube: <output class="mono" id="pour-out">${h} cm</output></span><input type="range" id="pour" min="0" max="${TUBE_CM}" step="0.5" value="${h}"></label>
        <div class="actions"><button type="button" class="btn small primary" id="disc-gone">${h >= TUBE_CM ? 'Tube full: disc still visible' : 'The disc has disappeared'}</button><button type="button" class="btn small ghost" id="empty">Empty the tube</button></div>
        <p class="calc-fb" id="turb-fb" aria-live="polite">${L.results[b].turbidity ? 'Recorded: ' + L.results[b].turbidity : 'Pour slowly and watch the disc. Stop when you can no longer see it.'}</p>
      </div></div>`;
  }
  function phTool(L) {
    const b = L.bottle, dipped = L.dipped === b, col = dipped ? PH_COL[BOTTLES[b].ph] : '#F4EFE4';
    return `<div class="tool ph">
      <svg viewBox="0 0 620 380" class="tool-svg" role="img" aria-label="pH strip and colour chart">
        <g transform="translate(120,40)">${bottleSVG(b, 70).replace('<svg', '<svg x="-60" y="120" width="120" height="200"')}</g>
        <g class="strip ${dipped ? 'dipped' : ''}" transform="translate(${dipped ? 300 : 120},${dipped ? 60 : 30})"><rect x="-8" y="0" width="16" height="170" rx="3" fill="#F7F7F2" stroke="#4A636C"/><rect x="-8" y="130" width="16" height="30" fill="${col}" stroke="#4A636C"/></g>
        <text x="300" y="250" class="ax-t">Match the pad with the chart</text>
      </svg>
      <div class="ph-chart">${Object.entries(PH_COL).map(([v, c]) => `<button type="button" class="ph-swatch" data-ph="${v}" style="--c:${c}" ${dipped ? '' : 'disabled'}><span></span>pH ${v}</button>`).join('')}</div>
      <div class="tool-controls"><div class="actions"><button type="button" class="btn small primary" id="dip">${dipped ? 'Dip again' : 'Dip the strip'}</button></div>
        <p class="calc-fb" id="ph-fb" aria-live="polite">${L.results[b].ph ? 'Recorded: ' + L.results[b].ph : dipped ? 'Which colour on the chart matches the pad best?' : 'Dip the strip in the sample.'}</p></div></div>`;
  }
  function cultureTool(L) {
    const b = L.bottle, c = L.culture[b], cols = colonies(b), n = cols.length;
    const many = n > 40;
    const grown = cols.map((o, i) => { const g = Math.max(0, Math.min(1, (c.hours - o.t) / 6)); if (g <= 0) return ''; const on = c.marked.includes(i), miss = c.showMissed && !on;
      return `<g class="colony ${on ? 'marked' : ''} ${miss ? 'missed' : ''}" data-col="${i}"><circle cx="${o.x}" cy="${o.y}" r="${many ? 9 : 17}" class="hit"/><circle cx="${o.x}" cy="${o.y}" r="${(o.s * g).toFixed(1)}" class="dot"/>${miss ? `<circle cx="${o.x}" cy="${o.y}" r="${o.s + 7}" class="miss-ring"/>` : ''}</g>`; }).join('');
    return `<div class="tool culture">
      <svg viewBox="-200 -200 400 400" class="tool-svg dish" role="img" aria-label="Culture plate after ${c.hours} hours">
        <circle r="185" fill="#E9E4D6" stroke="#4A636C" stroke-width="4"/><circle r="165" fill="${c.plated ? '#F3DFA2' : '#F7EBC4'}" stroke="#C9B27C" stroke-width="2"/>
        ${c.plated ? `<circle r="150" fill="none" stroke="rgba(120,100,60,0.25)" stroke-dasharray="3 5"/>` : ''}
        ${c.quarter ? '<line x1="0" y1="-165" x2="0" y2="165" stroke="#10262E" stroke-dasharray="6 4"/><line x1="-165" y1="0" x2="165" y2="0" stroke="#10262E" stroke-dasharray="6 4"/><path d="M0,0 L0,-165 A165,165 0 0,1 165,0 Z" fill="rgba(242,182,48,0.18)"/>' : ''}
        ${grown}
      </svg>
      <div class="tool-controls">
        ${!c.plated ? '<p>Pass 100 mL of the sample through a filter, then put the filter on the plate.</p><div class="actions"><button type="button" class="btn small primary" id="plate">Filter 100 mL onto the plate</button></div>'
          : `<label class="ctl" for="incubate"><span>Incubate at 37 °C: <output class="mono" id="inc-out">${c.hours} hours</output></span><input type="range" id="incubate" min="0" max="24" step="1" value="${c.hours}"></label>
            ${c.hours < 24 ? '<p class="muted">Slide to 24 hours to let the bacteria grow into colonies.</p>'
              : L.results[b].culture != null ? `<p class="calc-fb ok">Recorded: ${L.results[b].culture} E. coli per 100 mL.</p>`
              : n === 0 ? '<div class="actions"><button type="button" class="btn small primary" id="none-grew">No colonies grew</button></div>'
              : many ? (c.quarter ? `<label class="field"><span>Count the colonies in the highlighted quarter (${c.marked.length} tapped). Then estimate the whole plate.</span><input id="estimate" inputmode="numeric" placeholder="Whole plate"></label><div class="actions"><button type="button" class="btn small primary" id="est-check">Check estimate</button><button type="button" class="btn small ghost" id="count-for-me">Count the quarter for me</button></div>`
                : '<p>Too many colonies to count one by one!</p><div class="actions"><button type="button" class="btn small primary" id="quarter">Use the quarter method</button></div>')
              : `<p>The small white spots on the plate are the colonies. Tap each one to count it (it turns yellow). Colonies tapped: <strong class="mono">${c.marked.length}</strong></p><div class="actions"><button type="button" class="btn small primary" id="done-count">I have counted them all</button>${c.misses ? '<button type="button" class="btn small ghost" id="show-missed">Show me the ones I missed</button>' : ''}</div>`}`}
        <p class="calc-fb" id="cul-fb" aria-live="polite"></p>
      </div></div>`;
  }
  function microTool(L) {
    const m = L.micro;
    return `<div class="tool micro">
      <canvas id="scope" width="420" height="420" class="scope" aria-label="Microscope view at ${m.zoom} times"></canvas>
      <div class="tool-controls">
        <div class="seg">${[40, 400, 1000].map(z => `<label class="${m.zoom === z ? 'on' : ''}"><input type="radio" name="zoom" value="${z}" ${m.zoom === z ? 'checked' : ''}> ${z}×</label>`).join('')}</div>
        <label class="ctl" for="focus"><span>Focus</span><input type="range" id="focus" min="0" max="100" value="${m.focus}"></label>
        ${L.results[L.bottle].micro ? `<p class="calc-fb ok">Recorded: ${L.results[L.bottle].micro}</p>` : `<p class="muted">Zoom to 1000× and focus until the edges are sharp. What do you see?</p>
          <div class="seg">${['Many rod-shaped bacteria', 'A few rod-shaped bacteria', 'No bacteria'].map(o => `<label><input type="radio" name="saw" value="${o}"> ${o}</label>`).join('')}</div>
          <div class="actions"><button type="button" class="btn small" id="saw-check">Record</button></div>`}
        <p class="calc-fb" id="mic-fb" aria-live="polite"></p>
      </div></div>`;
  }
  function drawScope(canvas, b, m) {
    const ctx = canvas.getContext('2d'), W = canvas.width, R = W / 2, B = BOTTLES[b];
    const blur = Math.abs(m.focus - 62) / 7;
    const r = rng(b.length * 31 + m.zoom);
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#F4F1E6'; ctx.fillRect(0, 0, W, W);
    const scale = m.zoom === 40 ? 0.15 : m.zoom === 400 ? 0.5 : 1;
    const ghost = (draw) => { const n = blur > 0.5 ? 6 : 1; ctx.globalAlpha = n > 1 ? Math.max(0.12, 0.9 / n * 1.6) : 0.95; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.save(); ctx.translate(Math.cos(a) * blur * 1.6, Math.sin(a) * blur * 1.6); draw(); ctx.restore(); } ctx.globalAlpha = 1; };
    // mud particles
    for (let i = 0; i < B.mud * (m.zoom === 40 ? 3 : 1); i++) {
      const x = r() * W, y = r() * W, s = (6 + r() * 16) * scale + 1;
      ghost(() => { ctx.fillStyle = '#9C8462'; ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); ctx.fill(); });
    }
    // algae chains
    for (let i = 0; i < B.algae; i++) {
      const x = r() * W, y = r() * W, a = r() * 3;
      ghost(() => { ctx.fillStyle = '#5E9A48'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(a) * k * 14 * scale, y + Math.sin(a) * k * 14 * scale, 6 * scale + 1, 0, Math.PI * 2); ctx.fill(); } });
    }
    // bacteria: only visible at 1000×
    if (m.zoom === 1000) {
      for (let i = 0; i < B.bact; i++) {
        const x = 30 + r() * (W - 60), y = 30 + r() * (W - 60), a = r() * Math.PI;
        ghost(() => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#B04A8E'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-11, -4, 22, 8, 4); else ctx.rect(-11, -4, 22, 8); ctx.fill(); ctx.restore(); });
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#10262E'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#10262E'; ctx.font = '600 14px "IBM Plex Mono", monospace'; ctx.fillText(`${m.zoom}×`, 18, W - 18);
  }

  function renderLab(api, el) {
    const S = api.S, L = lab(api);
    if (L.at === 'collect') {
      const st = { visited: (S.data.map || {}).visited || {}, sel: null };
      el.innerHTML = `<div class="lab-grid">
        <div class="scene"><div class="scene-bar"><span class="mono">Samples collected: ${L.taken.length} / 4</span></div>
          <div class="scene-frame">${village(st, { flags: SAMPLE_PTS, taken: L.taken })}</div></div>
        <div class="scene-side"><h2>Collect water samples</h2><p data-read>${api.gloss('Tap each yellow flag to fill a sample bottle: the spring, a rain tank, the river above the bridge and the river below the toilet block.')}</p>
          <div class="shelf">${Object.keys(BOTTLES).map(b => `<div class="shelf-bottle ${L.taken.includes(b) ? 'full' : ''}">${bottleSVG(b, L.taken.includes(b) ? 70 : 0)}<span>${esc(BOTTLES[b].name)}</span></div>`).join('')}</div>
          <div class="actions"><button type="button" class="btn primary" id="to-bench" ${L.taken.length === 4 || api.preview ? '' : 'disabled'}>Take the samples to the lab</button></div></div>
      </div>`;
      el.querySelectorAll('[data-sample]').forEach(g => {
        const take = () => { if (!L.taken.includes(g.dataset.sample)) { L.taken.push(g.dataset.sample); api.save(); api.rerender(); } };
        g.addEventListener('click', take); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
      });
      el.querySelector('#to-bench').addEventListener('click', () => { if (api.preview) L.taken = ['spring', 'tank', 'up', 'down']; L.at = 'bench'; api.stepDone('collect'); api.save(); api.rerender(); });
      return;
    }
    const tools = { turbidity: 'Turbidity tube', ph: 'pH strip', culture: 'Culture plate', micro: 'Microscope' };
    const done = required(L);
    const qs = [
      { id: 'l1', text: 'Which sample had the most E. coli?', options: Object.values(BOTTLES).map(x => x.name), correct: 3, explain: 'The river below the toilet block had 160 E. coli in every 100 mL.' },
      { id: 'l2', text: 'The water from above the bridge looked fairly clear, but it still had some E. coli. What does that tell you?', options: ['Clear water can still carry germs', 'The culture test must be wrong', 'Germs only live in muddy water'], correct: 0, explain: 'Germs are too small to make water cloudy. River water always needs treating before drinking.' },
      { id: 'l3', text: 'Which tests can show whether water has germs in it? Choose all that apply.', options: ['Turbidity tube', 'pH strip', 'Culture plate', 'Microscope'], correct: [2, 3], multi: true, explain: 'Only the culture plate and the microscope detect bacteria. Turbidity and pH describe the water, not the germs in it.', hint: 'Which tests actually showed you the bacteria themselves?' }
    ];
    const predicted = S.data.predict != null ? ['Spring', 'Rain tank', 'River above the bridge', 'River below the toilet block'][S.data.predict] : null;
    el.innerHTML = `<div class="bench">
      <div class="bottles" role="tablist" aria-label="Samples">${Object.entries(BOTTLES).map(([b, B]) => { const r = L.results[b], n = ['turbidity', 'ph'].filter(k => r[k]).length + (r.culture != null ? 1 : 0);
        return `<button type="button" class="bottle-btn ${L.bottle === b ? 'on' : ''}" data-bottle="${b}" role="tab" aria-selected="${L.bottle === b}">${bottleSVG(b, 70)}<span>${esc(B.name)}</span><small class="mono">${n} / 3 tests</small></button>`; }).join('')}</div>
      <div class="tools" role="tablist" aria-label="Instruments">${Object.entries(tools).map(([k, n]) => `<button type="button" class="tool-tab ${L.tool === k ? 'on' : ''}" data-tool="${k}" id="tool-${k}" role="tab" aria-selected="${L.tool === k}">${n}${k === 'micro' ? ' <small>(extra)</small>' : ''}</button>`).join('')}</div>
      <div class="tool-wrap">${L.tool === 'turbidity' ? turbidityTool(L) : L.tool === 'ph' ? phTool(L) : L.tool === 'culture' ? cultureTool(L) : microTool(L)}</div>
      ${notebook(L)}
    </div>
    <div class="stage-tasks"><h2>What did you find?</h2>
      ${done || api.preview ? `${predicted ? `<p class="note">Your prediction: <strong>${esc(predicted)}</strong>. Compare it with your lab notebook.</p>` : ''}${qs.map(q => api.question(q)).join('')}
        ${api.answered(['l1', 'l2', 'l3']) ? '<div class="actions"><button type="button" class="btn primary" id="to-h1">Next: make a hypothesis</button></div>' : ''}`
        : `<p class="note">The questions unlock when all 12 tests are done: every sample with the turbidity tube, the pH strip and the culture plate (${todo(L).length} still to do). Tap <strong>Test</strong> in the notebook, or <strong>Next test</strong>. The microscope is an extra.</p>`}
    </div>`;
    el.querySelectorAll('[data-bottle]').forEach(btn => btn.addEventListener('click', () => { L.bottle = btn.dataset.bottle; L.pour = 0; L.dipped = null; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => { L.tool = btn.dataset.tool; api.save(); api.rerender(); }));
    // jump to a sample + instrument and bring the bench into view
    const jump = (bt, tool) => { L.bottle = bt; L.tool = tool; L.pour = 0; L.dipped = null; api.save(); api.rerender(); const bench = document.querySelector('.bench'); if (bench) bench.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    el.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => { const [bt, tool] = btn.dataset.go.split('|'); jump(bt, tool); }));
    const nt = el.querySelector('#next-test'); if (nt) nt.addEventListener('click', () => { const t = todo(L)[0]; if (t) jump(t[0], t[1]); });
    const b = L.bottle, R = L.results[b];
    const record = (k, v) => { R[k] = v; api.save(); if (required(L)) api.stepDone('tests'); };
    if (L.tool === 'turbidity') {
      const pour = el.querySelector('#pour'), hD = discDepth(b);
      pour.addEventListener('input', () => {
        L.pour = Number(pour.value);
        const top = 30, bottom = 430, y = cm => bottom - (cm / TUBE_CM) * (bottom - top), w = el.querySelector('#turb-water');
        w.setAttribute('y', y(L.pour)); w.setAttribute('height', Math.max(0, bottom - y(L.pour) - 3));
        el.querySelector('#turb-disc').setAttribute('opacity', Math.max(0, Math.min(1, (hD - L.pour) / (0.35 * hD))).toFixed(2));
        el.querySelector('#pour-out').textContent = L.pour + ' cm';
        el.querySelector('#disc-gone').textContent = L.pour >= TUBE_CM ? 'Tube full: disc still visible' : 'The disc has disappeared';
      });
      pour.addEventListener('change', () => api.save());
      el.querySelector('#empty').addEventListener('click', () => { L.pour = 0; api.save(); api.rerender(); });
      el.querySelector('#disc-gone').addEventListener('click', () => {
        const fb = el.querySelector('#turb-fb'), h = L.pour;
        if (h >= TUBE_CM && hD > TUBE_CM) { record('turbidity', 'under 5 NTU'); return api.rerender(); }
        const opacity = (hD - h) / (0.35 * hD);
        if (opacity > 0.15) { fb.className = 'calc-fb no'; fb.textContent = 'You can still see the disc. Keep pouring slowly.'; return; }
        if (h > hD * 1.3) { fb.className = 'calc-fb no'; fb.textContent = 'You poured past the point where the disc vanished. Move the slider back to find the exact point.'; return; }
        record('turbidity', `about ${BOTTLES[b].ntu} NTU`); api.rerender();
      });
    } else if (L.tool === 'ph') {
      el.querySelector('#dip').addEventListener('click', () => { L.dipped = b; api.save(); api.rerender(); });
      el.querySelectorAll('[data-ph]').forEach(s => s.addEventListener('click', () => {
        const fb = el.querySelector('#ph-fb');
        if (Number(s.dataset.ph) === BOTTLES[b].ph) { record('ph', 'pH ' + BOTTLES[b].ph); api.rerender(); }
        else { fb.className = 'calc-fb no'; fb.textContent = 'Look again: which chart colour is closest to the pad?'; }
      }));
    } else if (L.tool === 'culture') {
      const c = L.culture[b], cols = colonies(b);
      const plate = el.querySelector('#plate'); if (plate) plate.addEventListener('click', () => { c.plated = true; api.save(); api.rerender(); });
      const inc = el.querySelector('#incubate');
      if (inc) { inc.addEventListener('input', () => { el.querySelector('#inc-out').textContent = inc.value + ' hours'; }); inc.addEventListener('change', () => { c.hours = Number(inc.value); api.save(); api.rerender(); }); }
      el.querySelectorAll('.colony').forEach(cc => cc.addEventListener('click', () => {
        if (R.culture != null) return;
        const i = Number(cc.dataset.col);
        if (cols.length > 40 && !c.quarter) return;
        if (cols.length > 40 && !(cols[i].x > 0 && cols[i].y < 0)) return;
        c.marked = c.marked.includes(i) ? c.marked.filter(x => x !== i) : c.marked.concat(i); api.save(); api.rerender();
      }));
      const none = el.querySelector('#none-grew'); if (none) none.addEventListener('click', () => { record('culture', 0); api.rerender(); });
      const dc = el.querySelector('#done-count'); if (dc) dc.addEventListener('click', () => {
        const fb = el.querySelector('#cul-fb');
        if (c.marked.length === cols.length) { c.showMissed = false; record('culture', cols.length); api.rerender(); }
        else { const first = !c.misses; c.misses = (c.misses || 0) + 1; api.save(); if (first) api.rerender(); const f = el.querySelector('#cul-fb'); f.className = 'calc-fb no'; f.textContent = `Not yet: ${c.marked.length} tapped so far, and some colonies have not been tapped. Look carefully around the edge, or tap "Show me the ones I missed".`; }
      });
      const sm = el.querySelector('#show-missed'); if (sm) sm.addEventListener('click', () => { c.showMissed = true; api.save(); api.rerender(); });
      const qb = el.querySelector('#quarter'); if (qb) qb.addEventListener('click', () => { c.quarter = true; api.save(); api.rerender(); });
      const cfm = el.querySelector('#count-for-me'); if (cfm) cfm.addEventListener('click', () => { c.marked = cols.map((o, i) => (o.x > 0 && o.y < 0 ? i : -1)).filter(i => i >= 0); api.save(); api.rerender(); });
      const ec = el.querySelector('#est-check'); if (ec) ec.addEventListener('click', () => {
        const v = Number(el.querySelector('#estimate').value), fb = el.querySelector('#cul-fb');
        if (Math.abs(v - cols.length) <= 12) { record('culture', `about ${cols.length}`); c.marked = []; api.rerender(); }
        else { fb.className = 'calc-fb no'; fb.textContent = 'Count the colonies in the highlighted quarter, then multiply by 4.'; }
      });
    } else {
      const canvas = el.querySelector('#scope'), m = L.micro;
      const draw = () => drawScope(canvas, b, m);
      draw();
      el.querySelectorAll('input[name=zoom]').forEach(z => z.addEventListener('change', () => { m.zoom = Number(z.value); api.save(); api.rerender(); }));
      const fo = el.querySelector('#focus'); fo.addEventListener('input', () => { m.focus = Number(fo.value); draw(); }); fo.addEventListener('change', () => api.save());
      const sc = el.querySelector('#saw-check');
      if (sc) sc.addEventListener('click', () => {
        const pick = el.querySelector('input[name=saw]:checked'), fb = el.querySelector('#mic-fb');
        if (m.zoom !== 1000 || Math.abs(m.focus - 62) > 8) { fb.className = 'calc-fb no'; fb.textContent = 'Zoom to 1000× and get a sharp focus first.'; return; }
        if (!pick) { fb.className = 'calc-fb no'; fb.textContent = 'Choose what you see.'; return; }
        const truth = BOTTLES[b].bact > 20 ? 'Many rod-shaped bacteria' : BOTTLES[b].bact > 0 ? 'A few rod-shaped bacteria' : 'No bacteria';
        if (pick.value === truth) { record('micro', truth); api.rerender(); } else { fb.className = 'calc-fb no'; fb.textContent = 'Look again carefully. Bacteria are the small purple rods.'; }
      });
    }
    api.bindQuestions(qs, () => { if (api.answered(['l1', 'l2', 'l3'])) { api.stepDone('findings'); api.complete('lab'); } });
    const th = el.querySelector('#to-h1'); if (th) th.addEventListener('click', () => api.go('h1'));
  }

  // ---------- stage 4: hypothesis 1 ----------
  const EVIDENCE = [
    { id: 'e1', icon: '🗺️', text: 'All 9 sick people drink river water.', col: 'for' },
    { id: 'e2', icon: '🧫', text: 'The river below the toilet block had 160 E. coli per 100 mL.', col: 'for' },
    { id: 'e3', icon: '⛲', text: 'Every family that drinks spring water is healthy.', col: 'for' },
    { id: 'e4', icon: '🔥', text: 'The Rossi family boil their river water, and nobody there is sick.', col: 'for' },
    { id: 'e5', icon: '🌉', text: 'River families who collect water above the bridge are healthy.', col: 'for' },
    { id: 'e6', icon: '🛢️', text: 'The rain-tank sample had no E. coli.', col: 'for' },
    { id: 'e7', icon: '🧪', text: 'Every sample had a normal pH, between 6 and 8.', col: 'none' },
    { id: 'e8', icon: '🤧', text: 'A child in the Fofana family has a cough and a runny nose.', col: 'none' }
  ];
  const COLS = { for: 'Supports the hypothesis', against: 'Goes against it', none: 'Does not help decide' };
  function renderH1(api, el) {
    const S = api.S, st = S.data.h1 = S.data.h1 || { place: {}, pick: null };
    const q = { id: 'h1a', text: 'Your hypothesis: which water is making people sick?', options: ['Water from the spring', 'Water from the rain tanks', 'River water collected above the bridge', 'River water collected below the toilet block'], correct: 3, explain: 'Now test it: sort every piece of evidence.', hint: 'Look at your evidence table and lab notebook. Which water did all the sick families drink, and which sample had the most E. coli?' };
    const sorted = EVIDENCE.every(e => st.place[e.id]);
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('A hypothesis is a possible explanation. Choose the hypothesis that best fits your evidence so far, then test it against every piece of evidence.')}</p>${api.question(q)}</div>
      ${api.answered(['h1a']) ? `<div class="board">
        <p class="board-help" data-read>Hypothesis: river water below the toilet block is making people sick. Tap a card, then tap the column it belongs in.</p>
        <div class="cards">${EVIDENCE.filter(e => !st.place[e.id]).map(e => `<button type="button" class="ev-card ${st.pick === e.id ? 'picked' : ''}" data-ev="${e.id}"><span aria-hidden="true">${e.icon}</span>${esc(e.text)}</button>`).join('') || '<p class="muted">All cards sorted.</p>'}</div>
        <div class="columns">${Object.entries(COLS).map(([k, t]) => `<div class="ev-col" data-col="${k}" role="button" tabindex="0" aria-label="Put the card in: ${t}"><h3>${t}</h3>${EVIDENCE.filter(e => st.place[e.id] === k).map(e => `<button type="button" class="ev-card placed ${st.wrong && st.wrong.includes(e.id) ? 'wrong' : ''}" data-back="${e.id}"><span aria-hidden="true">${e.icon}</span>${esc(e.text)}</button>`).join('')}</div>`).join('')}</div>
        <div class="actions"><button type="button" class="btn primary" id="check-board" ${sorted && !api.answered(['h1b']) ? '' : 'disabled'}>Check my sorting</button></div>
        <p class="calc-fb ${api.answered(['h1b']) ? 'ok' : ''}" id="board-fb" aria-live="polite">${api.answered(['h1b']) ? 'Correct. Six pieces of evidence support the hypothesis, none go against it, and two do not help decide. A strong hypothesis!' : ''}</p>
      </div>
      ${api.answered(['h1b']) ? '<div class="actions"><button type="button" class="btn primary" id="to-h2">Next: why did it start after the storm?</button></div>' : ''}` : ''}`;
    api.bindQuestions([q], () => api.stepDone('choose'));
    el.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { st.pick = st.pick === b.dataset.ev ? null : b.dataset.ev; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-col]').forEach(c => { const put = () => { if (!st.pick) return; st.place[st.pick] = c.dataset.col; st.pick = null; st.wrong = null; api.save(); api.rerender(); }; c.addEventListener('click', e => { if (!e.target.closest('[data-back]')) put(); }); c.addEventListener('keydown', e => { if (e.key === 'Enter') put(); }); });
    el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { if (api.answered(['h1b'])) return; delete st.place[b.dataset.back]; st.wrong = null; api.save(); api.rerender(); }));
    const cb = el.querySelector('#check-board');
    if (cb) cb.addEventListener('click', () => {
      const wrong = EVIDENCE.filter(e => st.place[e.id] !== e.col).map(e => e.id), n = api.tries('h1b');
      if (!wrong.length) { api.award('h1b', n === 1); api.stepDone('sort'); api.complete('h1'); api.rerender(); }
      else { st.wrong = wrong; api.save(); api.rerender(); const fb = el.querySelector('#board-fb'); if (fb) { fb.className = 'calc-fb no'; fb.textContent = `${wrong.length} card${wrong.length > 1 ? 's are' : ' is'} in the wrong column (marked in red). Tap a card to take it back.`; } }
    });
    const nx = el.querySelector('#to-h2'); if (nx) nx.addEventListener('click', () => api.go('h2'));
  }

  // ---------- stage 5: hypothesis 2 ----------
  const DAYS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
  const TL = {
    rain: { name: 'Rainfall (mm)', vals: [0, 4, 180, 55, 8, 0, 0, 0, 0, 0], max: 200, color: '#2F8FD0' },
    level: { name: 'River level (m)', vals: [0.6, 0.7, 2.4, 1.9, 1.3, 1.0, 0.9, 0.8, 0.8, 0.7], max: 2.5, color: '#2B7A8C', line: 1.8, lineLabel: 'Toilet block floods' },
    ecoli: { name: 'E. coli below the toilet block (per 100 mL)', vals: [6, 5, 900, 700, 400, 260, 200, 170, 160, 150], max: 1000, color: '#8C6A3A' },
    cases: { name: 'New cases of illness', vals: [0, 0, 0, 0, 0, 2, 3, 1, 2, 1], max: 4, color: '#C2412D' }
  };
  const ONSET = { nkosi: 3, patel: 3, okafor: 4, quispe: 6 };
  function riverScene(day) {
    const i = DAYS.indexOf(day), lvl = TL.level.vals[i], ecol = TL.ecoli.vals[i];
    const w = 40 + lvl * 26, flood = lvl > 1.8, plume = Math.min(1, ecol / 700);
    const houses = [['kowalski', 120, 70, 'up'], ['lima', 200, 330, 'up'], ['nkosi', 640, 70, 'down'], ['okafor', 760, 330, 'down'], ['patel', 860, 70, 'down'], ['quispe', 930, 330, 'down'], ['rossi', 560, 340, 'down']];
    return `<svg viewBox="0 0 1000 400" class="river-scene" role="img" aria-label="River on day ${day}: river level ${lvl} m${flood ? ', toilet block flooded' : ''}">
      <rect width="1000" height="400" fill="${day === 0 ? '#8FA27C' : '#A6C273'}"/>
      ${day === 0 || day === 1 ? Array.from({ length: day === 0 ? 70 : 25 }, (_, k) => `<line x1="${(k * 137) % 1000}" y1="${(k * 53) % 400}" x2="${(k * 137) % 1000 - 8}" y2="${(k * 53) % 400 + 18}" stroke="rgba(230,240,250,0.8)" stroke-width="2"/>`).join('') : ''}
      ${flood ? `<ellipse cx="420" cy="160" rx="120" ry="70" fill="#4B9EC8" opacity="0.55"/>` : ''}
      <rect x="0" y="${200 - w / 2}" width="1000" height="${w}" fill="#4B9EC8"/>
      <rect x="0" y="${200 - w / 2}" width="1000" height="6" fill="#6E8A5A" opacity="0.6"/><rect x="0" y="${200 + w / 2 - 6}" width="1000" height="6" fill="#6E8A5A" opacity="0.6"/>
      ${plume > 0.05 ? `<path d="M420,${200 - w * 0.2} C560,${200 - w * 0.35} 760,${200 + w * 0.1} 1000,${200 - w * 0.05} L1000,${200 + w * 0.35} C760,${200 + w * 0.4} 560,${200 + w * 0.15} 420,${200 + w * 0.15} Z" fill="#7A5634" opacity="${(0.25 + plume * 0.55).toFixed(2)}"/>` : ''}
      <g transform="translate(300,200)"><rect x="-14" y="${-w / 2 - 14}" width="28" height="${w + 28}" fill="#8A6A44" stroke="#4d3a24" stroke-width="2"/><text y="${-w / 2 - 22}" text-anchor="middle" class="vlabel">Bridge</text></g>
      <g transform="translate(420,${118 - (flood ? 0 : 0)})"><rect x="-26" y="-18" width="52" height="32" fill="#B89A72" stroke="#4d3a24" stroke-width="2"/><polygon points="-30,-17 0,-32 30,-17" fill="#7A5634" stroke="#4d3a24" stroke-width="2"/><text y="-40" text-anchor="middle" class="vlabel">Toilet block${flood ? ': flooded!' : ''}</text></g>
      <text x="20" y="${200 + 5}" class="vlabel">Upstream →</text><text x="980" y="${200 + 5}" text-anchor="end" class="vlabel">→ Downstream</text>
      ${houses.map(([id, x, y, side]) => { const f = FAMILIES.find(q => q.id === id), ill = ONSET[id] != null && day >= ONSET[id];
        return `<g transform="translate(${x},${y})"><rect x="-20" y="-8" width="40" height="24" fill="#F3E4C4" stroke="#6b5a40" stroke-width="1.5"/><polygon points="-24,-7 0,-26 24,-7" fill="${side === 'up' ? '#6B5AA8' : '#8C6A3A'}" stroke="#3a2e22"/><text y="34" text-anchor="middle" class="vlabel">${f.name}</text>${ill ? `<g transform="translate(20,-24)"><circle r="11" fill="#C2412D" stroke="#fff" stroke-width="2"/><text y="5" text-anchor="middle" class="vbadge">${f.sick}</text></g>` : ''}</g>`; }).join('')}
      <g transform="translate(870,30)"><rect x="-70" y="-18" width="140" height="34" rx="8" fill="#10262E"/><text y="5" text-anchor="middle" fill="#fff" font-weight="700" font-size="16">${day === 0 ? 'Day 0: STORM' : day < 0 ? `${-day} day${day < -1 ? 's' : ''} before` : `Day ${day}`}</text></g>
    </svg>`;
  }
  function timeline(day, show) {
    const W = 760, L = 70, R = 14, rowH = 70, gap = 18, keys = Object.keys(TL).filter(k => show[k]);
    const H = keys.length * (rowH + gap) + 36, x0 = L, x1 = W - R, X = i => x0 + (i + 0.5) * ((x1 - x0) / DAYS.length), bw = (x1 - x0) / DAYS.length;
    const di = DAYS.indexOf(day);
    return `<svg viewBox="0 0 ${W} ${H}" class="timeline-svg" role="img" aria-label="Timeline of rainfall, river level, E. coli and illness">
      <rect x="${X(di) - bw / 2}" y="0" width="${bw}" height="${H - 24}" class="tl-cur"/>
      ${keys.map((k, r) => { const s = TL[k], top = 8 + r * (rowH + gap), Y = v => top + rowH - (v / s.max) * rowH;
        return `<text x="${x0}" y="${top - 1}" class="ax-t">${esc(s.name)}</text>
          <line x1="${x0}" x2="${x1}" y1="${top + rowH}" y2="${top + rowH}" class="grid"/>
          <text x="${x0 - 6}" y="${top + 12}" class="ax" text-anchor="end">${s.max}</text><text x="${x0 - 6}" y="${top + rowH}" class="ax" text-anchor="end">0</text>
          ${s.line ? `<line x1="${x0}" x2="${x1}" y1="${Y(s.line)}" y2="${Y(s.line)}" class="tl-line"/><text x="${x1}" y="${Y(s.line) - 4}" class="ax" text-anchor="end">${s.lineLabel}</text>` : ''}
          ${k === 'level' ? `<path d="${s.vals.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${s.vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${s.color}"/>`).join('')}`
            : s.vals.map((v, i) => v ? `<rect x="${X(i) - bw * 0.3}" y="${Y(v)}" width="${bw * 0.6}" height="${top + rowH - Y(v)}" rx="3" fill="${s.color}"/>` : '').join('')}
          <text x="${X(di)}" y="${Math.max(top + 10, Y(s.vals[di]) - 6)}" class="ax-v" text-anchor="middle">${s.vals[di]}</text>`; }).join('')}
      ${DAYS.map((d, i) => `<text x="${X(i)}" y="${H - 6}" class="ax" text-anchor="middle">${d === 0 ? 'Storm' : d}</text>`).join('')}
    </svg>`;
  }
  const EVENTS = ['Heavy rain falls during the storm', 'The river rises and floods the toilet block', 'Waste washes into the river and flows downstream', 'Families below the toilet block drink the river water', 'Two or three days later, people fall ill'];
  function renderH2(api, el) {
    const S = api.S, st = S.data.h2 = S.data.h2 || { day: -2, show: { rain: true, level: true, ecoli: false, cases: true }, order: [2, 4, 0, 3, 1] };
    const qa = { id: 'h2b', text: 'Why did people fall ill two or three days after the storm, not on the same day?', options: ['Germs need time to multiply in the body before people feel ill', 'The water only became dirty three days later', 'People only drank river water three days later'], correct: 0, explain: 'This delay is called the incubation period. The E. coli peak came on day 0, the illness from day 3.' };
    const qb = { id: 'h2c', text: 'Why were the families above the bridge not affected?', options: ['A river carries waste downstream, not upstream', 'They drank less water', 'The bridge filters the water'], correct: 0, explain: 'Their water is collected upstream of the toilet block, so the waste never reaches it.' };
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('You know which water is to blame. But the village used the river before the storm and nobody was ill. Move through the days and find out what changed.')}</p></div>
      <div class="scene-frame">${riverScene(st.day)}</div>
      <div class="day-ctl"><label class="ctl" for="day"><span>Day: <output class="mono" id="day-out">${st.day === 0 ? 'Storm (day 0)' : st.day}</output></span><input type="range" id="day" min="-2" max="7" step="1" value="${st.day}"></label>
        <div class="seg">${Object.entries(TL).map(([k, s]) => `<label class="${st.show[k] ? 'on' : ''}"><input type="checkbox" data-layer="${k}" ${st.show[k] ? 'checked' : ''}> ${esc(s.name.split(' (')[0])}</label>`).join('')}</div></div>
      <div class="chart-frame tl-frame">${timeline(st.day, st.show)}</div>
      <div class="stage-tasks"><h2>Put the events in order</h2><p class="muted">Use the arrows to move each event. Start with what happened first.</p>
        <ol class="order">${st.order.map((ev, i) => `<li class="${api.answered(['h2a']) ? 'ok' : ''}"><span class="order-n mono">${i + 1}</span><span>${esc(EVENTS[ev])}</span>${api.answered(['h2a']) ? '' : `<span class="order-btns"><button type="button" class="btn small ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button type="button" class="btn small ghost" data-down="${i}" ${i === st.order.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></span>`}</li>`).join('')}</ol>
        ${api.answered(['h2a']) ? '<p class="calc-fb ok">Correct. That chain of events explains the outbreak.</p>' : '<div class="actions"><button type="button" class="btn" id="check-order">Check the order</button></div><p class="calc-fb" id="order-fb" aria-live="polite"></p>'}
        ${api.answered(['h2a']) || api.preview ? api.question(qa) : ''}${api.answered(['h2a', 'h2b']) ? api.question(qb) : ''}
        ${api.answered(['h2a', 'h2b', 'h2c']) ? '<div class="actions"><button type="button" class="btn primary" id="to-plant">Design the treatment plant</button></div>' : ''}
      </div>`;
    const day = el.querySelector('#day');
    day.addEventListener('input', () => { st.day = Number(day.value); el.querySelector('.scene-frame').innerHTML = riverScene(st.day); el.querySelector('.tl-frame').innerHTML = timeline(st.day, st.show); el.querySelector('#day-out').textContent = st.day === 0 ? 'Storm (day 0)' : st.day; });
    day.addEventListener('change', () => { api.save(); if (st.day >= 5) api.stepDone('timeline'); });
    el.querySelectorAll('[data-layer]').forEach(c => c.addEventListener('change', () => { st.show[c.dataset.layer] = c.checked; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.up); [st.order[i - 1], st.order[i]] = [st.order[i], st.order[i - 1]]; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.down); [st.order[i + 1], st.order[i]] = [st.order[i], st.order[i + 1]]; api.save(); api.rerender(); }));
    const co = el.querySelector('#check-order');
    if (co) co.addEventListener('click', () => {
      const n = api.tries('h2a'), right = st.order.filter((ev, i) => ev === i).length;
      if (right === EVENTS.length) { api.award('h2a', n === 1); api.stepDone('order'); api.rerender(); }
      else { const fb = el.querySelector('#order-fb'); fb.className = 'calc-fb no'; fb.textContent = `${right} of ${EVENTS.length} events are in the right place. Use the day slider to check what happened first.`; }
    });
    api.bindQuestions([qa, qb], () => { if (api.answered(['h2a', 'h2b', 'h2c'])) api.complete('h2'); });
    const tp = el.querySelector('#to-plant'); if (tp) tp.addEventListener('click', () => api.go('plant'));
  }

  // ---------- stage 6: treatment plant ----------
  const UNITS = {
    screen: { name: 'Screen', icon: '▦', does: 'Catches leaves, sticks and rubbish.' },
    settle: { name: 'Settling tank', icon: '◫', does: 'Water rests so mud sinks to the bottom.' },
    sand: { name: 'Sand filter', icon: '▤', does: 'Sand and gravel trap tiny particles and most germs.' },
    chlorine: { name: 'Chlorine dosing', icon: '✚', does: 'Chlorine kills the germs that are left.' },
    store: { name: 'Covered storage tank', icon: '▣', does: 'Keeps clean water safe until it is used.' },
    pond: { name: 'Open pond', icon: '◯', does: 'Stores water in the open, where birds and animals can reach it.' },
    fert: { name: 'Fertiliser tank', icon: '✿', does: 'Adds plant food to the water.' }
  };
  const ORDER = ['screen', 'settle', 'sand', 'chlorine', 'store'];
  function plantRun(st) {
    // turbidity (NTU) and E. coli after each stage, then chlorine kill and residual
    const steps = [{ ntu: 45, ec: 160 }, { ntu: 40, ec: 160 }, { ntu: 15, ec: 90 }, { ntu: 2, ec: 12 }];
    const C = st.dose, T = st.time, ntu = 2;
    const k = 0.6 / (1 + ntu / 5);
    const ec = 12 * Math.exp(-k * C * T / 10);
    const residual = Math.max(0, C - 0.5 - 0.01 * T);
    const after = Math.round(ec * 10) / 10 < 0.5 ? 0 : Math.round(ec);
    steps.push({ ntu: 2, ec: after }, { ntu: 2, ec: after });
    return { steps, residual: Math.round(residual * 100) / 100, safe: after === 0, taste: residual > 1.5, protect: residual >= 0.2 };
  }
  function plantScene(st, run) {
    const slots = ORDER.map((_, i) => 140 + i * 160);
    const colorAt = i => { if (!run) return '#4B9EC8'; const n = run.steps[i + 1] ? run.steps[i + 1].ntu : 2; return n > 30 ? '#8C7350' : n > 10 ? '#7E9E9A' : '#5FB4E0'; };
    return `<svg viewBox="0 0 1000 380" class="plant" role="img" aria-label="Water treatment plant with ${st.slots.filter(Boolean).length} of 5 stages placed">
      <rect width="1000" height="380" fill="#E7EEEA"/>
      <rect x="0" y="290" width="1000" height="90" fill="#C9B27C"/>
      <path d="M0,150 C30,140 50,160 60,150" stroke="#4B9EC8" stroke-width="40" fill="none"/>
      <text x="10" y="60" class="ax-t">River water in ↓</text>
      <line x1="40" y1="200" x2="960" y2="200" stroke="#7A8B8F" stroke-width="14"/>
      <line x1="40" y1="200" x2="960" y2="200" stroke="${run ? '#5FB4E0' : '#9FB3B8'}" stroke-width="6" ${run ? 'class="flow"' : ''}/>
      ${slots.map((x, i) => { const u = st.slots[i] && UNITS[st.slots[i]], wrong = st.wrongSlots && st.wrongSlots.includes(i);
        const r = run && run.steps[i + 1];
        return `<g transform="translate(${x},200)" class="slot ${st.pickU && !u ? 'ready' : ''}" data-slot="${i}" role="button" tabindex="0" aria-label="Stage ${i + 1}${u ? ': ' + u.name : ', empty'}">
          <rect x="-62" y="-110" width="124" height="170" rx="10" fill="${u ? '#fff' : 'rgba(255,255,255,0.4)'}" stroke="${wrong ? '#C2412D' : u ? '#10262E' : '#7A8B8F'}" stroke-width="${wrong ? 4 : 2.5}" ${u ? '' : 'stroke-dasharray="8 6"'}/>
          ${u ? unitArt(st.slots[i], colorAt(i)) : `<text y="-20" text-anchor="middle" class="ax">Stage ${i + 1}</text><text y="0" text-anchor="middle" class="ax">Tap a card,</text><text y="16" text-anchor="middle" class="ax">then here</text>`}
          ${u ? `<text y="78" text-anchor="middle" class="ax-t">${u.name}</text>` : ''}
          ${r ? `<g transform="translate(0,${118})"><rect x="-62" y="-14" width="124" height="44" rx="6" fill="#10262E"/><text y="2" text-anchor="middle" fill="#fff" font-size="12">${r.ntu} NTU</text><text y="20" text-anchor="middle" fill="${r.ec ? '#F5A08E' : '#9BE3B0'}" font-size="12" font-weight="700">${r.ec} E. coli</text></g>` : ''}
        </g>`; }).join('')}
      <g transform="translate(965,200)"><rect x="-6" y="-40" width="12" height="40" fill="#7A8B8F"/><path d="M-6,-40 h30 v10 h-24 z" fill="#7A8B8F"/><text x="-4" y="-50" text-anchor="end" class="ax-t">To homes</text>${run ? `<circle cx="18" cy="-18" r="5" fill="#5FB4E0" class="drip"/>` : ''}</g>
    </svg>`;
  }
  function unitArt(id, water) {
    switch (id) {
      case 'screen': return `<rect x="-40" y="-80" width="80" height="120" fill="${water}" opacity="0.6"/>${[-30, -15, 0, 15, 30].map(x => `<line x1="${x}" y1="-80" x2="${x}" y2="40" stroke="#4A636C" stroke-width="3"/>`).join('')}<text y="-88" text-anchor="middle" font-size="14">🍂</text>`;
      case 'settle': return `<rect x="-50" y="-70" width="100" height="110" fill="${water}" opacity="0.7"/><rect x="-50" y="20" width="100" height="20" fill="#8C7350"/>`;
      case 'sand': return `<rect x="-50" y="-80" width="100" height="40" fill="${water}" opacity="0.7"/><rect x="-50" y="-40" width="100" height="45" fill="#E3CF9B"/><rect x="-50" y="5" width="100" height="35" fill="#9C9384"/>${Array.from({ length: 14 }, (_, k) => `<circle cx="${-44 + (k * 7) % 90}" cy="${12 + (k * 11) % 24}" r="4" fill="#7A7062"/>`).join('')}`;
      case 'chlorine': return `<rect x="-50" y="-60" width="100" height="100" fill="${water}" opacity="0.7"/><rect x="-20" y="-100" width="40" height="34" rx="6" fill="#F2B630" stroke="#10262E"/><text y="-78" text-anchor="middle" font-size="12" font-weight="700">Cl</text><line x1="0" y1="-66" x2="0" y2="-40" stroke="#F2B630" stroke-width="4" stroke-dasharray="4 4"/>`;
      case 'store': return `<rect x="-50" y="-70" width="100" height="110" rx="6" fill="${water}" opacity="0.8"/><rect x="-56" y="-82" width="112" height="14" rx="4" fill="#4A636C"/>`;
      case 'pond': return `<ellipse cx="0" cy="0" rx="52" ry="30" fill="${water}" opacity="0.7"/><text y="-40" text-anchor="middle" font-size="18">🐦</text>`;
      default: return `<rect x="-50" y="-60" width="100" height="100" fill="#8CC152" opacity="0.6"/><text y="0" text-anchor="middle" font-size="22">✿</text>`;
    }
  }
  function renderPlant(api, el) {
    const S = api.S, st = S.data.plant = S.data.plant || { slots: [null, null, null, null, null], pickU: null, dose: 1, time: 10, runs: 0 };
    const placedAll = st.slots.every(Boolean), built = api.answered(['t0']);
    const run = st.ran ? plantRun(st) : null;
    const qa = { id: 't1', text: 'Why must the water be filtered before the chlorine is added?', options: ['Mud and particles can hide germs from the chlorine', 'Chlorine makes the sand dirty', 'It does not matter what order they go in'], correct: 0, explain: 'Germs hide inside and behind particles, so chlorine works much better in clear water.' };
    const qb = { id: 't2', text: 'Why leave a little chlorine in the water when it leaves the plant?', options: ['It keeps killing germs that get in on the way to people\'s homes', 'It makes the water taste better', 'It makes the water warmer'], correct: 0, explain: 'This "residual" chlorine protects the water in the pipes and buckets. About 0.2 to 1 mg per litre is enough.' };
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Design a treatment plant that turns river water into safe drinking water. Put the right stages in the right order, then set the chlorine for disinfection.')}</p></div>
      <div class="scene-frame plant-frame">${plantScene(st, run)}</div>
      ${!built ? `<div class="unit-cards">${Object.entries(UNITS).filter(([k]) => !st.slots.includes(k)).map(([k, u]) => `<button type="button" class="unit-card ${st.pickU === k ? 'picked' : ''}" data-unit="${k}"><span class="unit-ic" aria-hidden="true">${u.icon}</span><strong>${u.name}</strong><small>${u.does}</small></button>`).join('')}</div>
        <div class="actions"><button type="button" class="btn primary" id="check-plant" ${placedAll ? '' : 'disabled'}>Check my design</button><button type="button" class="btn ghost" id="clear-plant">Clear</button></div>
        <p class="calc-fb" id="plant-fb" aria-live="polite">${st.wrongSlots ? 'Stages with a red outline are not right yet. Tap a stage to take it out.' : ''}</p>`
        : `<div class="dose">
          <label class="ctl" for="dose"><span>Chlorine dose: <output class="mono" id="dose-out">${st.dose} mg/L</output></span><input type="range" id="dose" min="0" max="5" step="0.5" value="${st.dose}"></label>
          <label class="ctl" for="ctime"><span>Contact time before the water leaves: <output class="mono" id="ctime-out">${st.time} min</output></span><input type="range" id="ctime" min="0" max="60" step="5" value="${st.time}"></label>
          <p class="muted">Tip: chlorine needs both strength and time. Germs die faster with a higher dose or a longer contact time, but too much chlorine makes the water taste bad. Aim for 0.2 to 1 mg/L left in the water.</p>
          <div class="actions"><button type="button" class="btn primary" id="run">Run the plant</button></div>
          ${run ? `<div class="gauges">
            <div class="${run.safe ? '' : 'bad'}"><span>E. coli at the tap</span><b class="mono">${run.steps[5].ec} per 100 mL</b></div>
            <div class="${run.taste ? 'warn' : ''}"><span>Chlorine left in the water</span><b class="mono">${run.residual} mg/L</b></div>
            <div class="${run.safe && !run.taste && run.protect ? '' : 'warn'}"><span>Verdict</span><b>${!run.safe ? 'Not safe yet' : run.taste ? 'Safe, but tastes too strong' : !run.protect ? 'Safe now, but no protection in the pipes' : 'Safe and protected'}</b></div></div>` : ''}
        </div>`}
      <div class="stage-tasks">${built && api.answered(['t3']) ? api.question(qa) : ''}${api.answered(['t1']) || api.preview ? api.question(qb) : ''}
        ${api.answered(['t1', 't2', 't3']) ? '<div class="actions"><button type="button" class="btn primary" id="to-summary">Write the case summary</button></div>' : ''}</div>`;
    el.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => { st.pickU = st.pickU === b.dataset.unit ? null : b.dataset.unit; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-slot]').forEach(g => {
      const act = () => { if (built) return; const i = Number(g.dataset.slot); if (st.slots[i]) { st.slots[i] = null; } else if (st.pickU) { st.slots[i] = st.pickU; st.pickU = null; } st.wrongSlots = null; api.save(); api.rerender(); };
      g.addEventListener('click', act); g.addEventListener('keydown', e => { if (e.key === 'Enter') act(); });
    });
    const cl = el.querySelector('#clear-plant'); if (cl) cl.addEventListener('click', () => { st.slots = [null, null, null, null, null]; st.wrongSlots = null; api.save(); api.rerender(); });
    const cp = el.querySelector('#check-plant');
    if (cp) cp.addEventListener('click', () => {
      const n = api.tries('t0'), wrong = st.slots.map((u, i) => (u === ORDER[i] ? -1 : i)).filter(i => i >= 0);
      if (!wrong.length) { st.wrongSlots = null; api.award('t0', n === 1); api.stepDone('build'); api.rerender(); }
      else { st.wrongSlots = wrong; api.save(); api.rerender(); }
    });
    const dose = el.querySelector('#dose'), ct = el.querySelector('#ctime');
    if (dose) {
      dose.addEventListener('input', () => { el.querySelector('#dose-out').textContent = dose.value + ' mg/L'; });
      ct.addEventListener('input', () => { el.querySelector('#ctime-out').textContent = ct.value + ' min'; });
      el.querySelector('#run').addEventListener('click', () => {
        st.dose = Number(dose.value); st.time = Number(ct.value); st.ran = true; st.runs += 1; api.save();
        const r = plantRun(st);
        if (r.safe && !r.taste && r.protect) { api.award('t3', st.runs <= 2); api.stepDone('dose'); }
        api.rerender();
      });
    }
    api.bindQuestions([qa, qb], () => { if (api.answered(['t1', 't2', 't3'])) api.complete('plant'); });
    const ts = el.querySelector('#to-summary'); if (ts) ts.addEventListener('click', () => api.go('summary'));
  }

  // ---------- stage 7: case summary ----------
  const RECS = [
    ['Move the toilet block away from the river, above flood level', true],
    ['Boil or treat all river water until the treatment plant is built', true],
    ['Use the spring and the rain tanks for drinking water for now', true],
    ['Test the water every week', true],
    ['Close the spring', false],
    ['Stop washing hands to save water', false]
  ];
  function reportText(api) {
    const S = api.S, L = S.data.lab || { results: {} }, p = S.data.plant || {};
    const visited = Object.keys(((S.data.map || {}).visited) || {}).length;
    const team = OI.store.get().team || {}, name = (team.members || {}).hydrologist || 'the team Hydrologist';
    const recs = (S.data.recs || []).map(i => RECS[i][0]);
    return ['OPERATION ISLAND 2040 · CASE FILE #1: THE MYSTERY ILLNESS', `Case report by ${name}${team.name ? ` (${team.name})` : ''}`, '',
      'THE PROBLEM', 'After the storm, nine villagers fell ill with stomach cramps, diarrhoea and fever.', '',
      'EVIDENCE',
      `- Interviewed ${visited} of 18 families: every sick family drinks river water collected below the toilet block. Families upstream, using the spring or rain tanks, or boiling their water stayed healthy.`,
      `- Lab tests (E. coli per 100 mL): spring ${L.results.spring ? L.results.spring.culture : '—'}, rain tank ${L.results.tank ? L.results.tank.culture : '—'}, river above the bridge ${L.results.up ? L.results.up.culture : '—'}, river below the toilet block ${L.results.down ? L.results.down.culture : '—'}.`,
      '- Timeline: the storm flooded the toilet block on day 0; E. coli in the river peaked; illness followed from day 3.', '',
      'CONCLUSION', 'Flood water from the storm washed waste from the toilet block into the river. Families who drank river water downstream caught a waterborne illness.', '',
      'TREATMENT PLANT', `Screen → settling tank → sand filter → chlorine (${p.dose || '—'} mg/L, ${p.time || '—'} min) → covered storage.`, '',
      'RECOMMENDATIONS', ...(recs.length ? recs.map(r => '- ' + r) : ['—']), '',
      'MESSAGE TO THE VILLAGE', (S.data.message || '').trim() || '—'].join('\n');
  }
  function renderSummary(api, el) {
    const S = api.S, chosen = S.data.recs || [];
    const right = RECS.map((r, i) => (r[1] ? i : -1)).filter(i => i >= 0);
    const ok = api.answered(['s1']);
    const total = Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0);
    el.innerHTML = `<div class="report">
      <div class="report-head"><span class="stamp ${ok ? 'closed' : ''}">${ok ? 'Case closed' : 'Draft'}</span><div><p class="eyebrow">Case report</p><h2>The Mystery Illness</h2></div></div>
      <div class="report-grid">
        <section><h3>The problem</h3><p>Nine villagers fell ill with stomach cramps, diarrhoea and fever after the storm.</p></section>
        <section><h3>The cause</h3><p data-read>${api.gloss('The storm flooded the toilet block. Waste washed into the river and flowed downstream, contaminating the water that families below the toilet block drank. E. coli in that water caused the outbreak.')}</p></section>
        <section><h3>The evidence</h3><ul><li>All sick families drink river water from below the toilet block.</li><li>160 E. coli per 100 mL below the toilet block; none in the spring or rain tank.</li><li>Families upstream, or who boil their water, stayed healthy.</li><li>Illness began 3 days after the flood: the incubation period.</li></ul></section>
        <section><h3>The fix</h3><p>Screen → settling tank → sand filter → chlorine${S.data.plant ? ` (${S.data.plant.dose} mg/L for ${S.data.plant.time} min)` : ''} → covered storage.</p></section>
      </div>
      <h3>Your recommendations</h3><p class="muted">Choose every recommendation that would protect the village.</p>
      <div class="cq-options">${RECS.map((r, i) => `<label class="${chosen.includes(i) ? 'on' : ''}"><input type="checkbox" data-rec="${i}" ${chosen.includes(i) ? 'checked' : ''} ${ok ? 'disabled' : ''}> ${esc(r[0])}</label>`).join('')}</div>
      ${ok ? '<p class="calc-fb ok">Good recommendations: they fix the cause, protect people now and check the water in the future.</p>' : '<div class="actions"><button type="button" class="btn" id="check-recs">Check recommendations</button></div><p class="calc-fb" id="recs-fb" aria-live="polite"></p>'}
      <label class="field"><span>Message to the village: explain what happened and what people should do, in words everyone can understand.</span><textarea id="message" rows="4">${esc(S.data.message || '')}</textarea></label>
      ${ok ? `<div class="final"><span class="mono big">${total} / ${CASE.stages.reduce((a, s) => a + (s.points || 0), 0)}</span><span>Final score. Well done, Hydrologist!</span></div>` : ''}
      <div class="actions"><button type="button" class="btn ghost" id="copy-report">Copy case report</button>${ok ? '<a class="btn primary" href="#">Back to Mission Control</a>' : ''}</div>
      <p class="muted" id="copy-status" aria-live="polite"></p><textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea>
    </div>`;
    el.querySelectorAll('[data-rec]').forEach(c => c.addEventListener('change', () => { const i = Number(c.dataset.rec); S.data.recs = c.checked ? chosen.concat(i) : chosen.filter(x => x !== i); api.save(); api.rerender(); }));
    el.querySelector('#message').addEventListener('input', e => { S.data.message = e.target.value; api.save(); });
    const cr = el.querySelector('#check-recs');
    if (cr) cr.addEventListener('click', () => {
      const n = api.tries('s1'), pick = (S.data.recs || []).slice().sort().join(',');
      if (pick === right.join(',')) { api.award('s1', n === 1); api.stepDone('recs'); api.complete('summary'); OI.store.get().log.case1 = { score: Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), at: new Date().toISOString() }; api.save(); api.rerender(); }
      else { const fb = el.querySelector('#recs-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Not quite. Choose only the actions that would really protect people. Is anything missing, or harmful?'; }
    });
    el.querySelector('#copy-report').addEventListener('click', () => {
      const txt = reportText(api), status = el.querySelector('#copy-status'), ta = el.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied.'; }, fallback); } catch (e) { fallback(); }
    });
  }

  const CASE = {
    id: 'illness', number: 1, title: 'The Mystery Illness',
    glossary: GLOSSARY, handbook: HANDBOOK,
    stages: [
      { id: 'intro', title: 'Introduction', color: '#E8613C', points: 2, steps: [{ id: 'briefing', title: 'The nurse\'s message' }], render: renderIntro,
        coach: [{ sel: '#case-stage .term', text: 'Words in orange are in the glossary. Tap one to see what it means.' }, { sel: '#read-btn', text: 'Tap here to have the case read aloud.' }, { sel: '#tab-handbook', text: 'The Handbook explains the science. Open it whenever you need help.' }, { sel: '.cq', text: 'Answer this question to start the investigation.' }] },
      { id: 'map', title: 'Outbreak map', color: '#F0A33A', points: 4, steps: [{ id: 'interview', title: 'Interview the families' }, { id: 'pattern', title: 'Find the pattern' }], render: renderMap,
        coach: [{ sel: '[data-house="nkosi"]', text: 'Tap a house to interview the family. Start with the Nkosi family.' }, { sel: '#src-toggle', text: 'Show where each family collects its water.' }, { sel: '#tally', text: 'Your evidence table fills in as you interview more families.' }] },
      { id: 'lab', title: 'Water lab', color: '#D9B92E', points: 6, steps: [{ id: 'collect', title: 'Collect samples' }, { id: 'tests', title: 'Test the water' }, { id: 'findings', title: 'What did you find?' }], render: renderLab,
        coach: [{ sel: '[data-sample="down"]', text: 'Tap a yellow flag to collect a water sample.' }, { sel: '.bottle-btn', text: 'Choose which sample to test.' }, { sel: '#tool-turbidity', text: 'Choose an instrument. Each one tests something different.' }] },
      { id: 'h1', title: 'Hypothesis 1', color: '#8CC152', points: 4, steps: [{ id: 'choose', title: 'Choose a hypothesis' }, { id: 'sort', title: 'Test it with evidence' }], render: renderH1,
        coach: [{ sel: '.cq', text: 'Choose the hypothesis that best fits your evidence.' }, { sel: '.ev-card', text: 'Tap a card, then tap the column it belongs in.' }] },
      { id: 'h2', title: 'Hypothesis 2', color: '#3FB6A8', points: 6, steps: [{ id: 'timeline', title: 'Explore the timeline' }, { id: 'order', title: 'Order the events' }], render: renderH2,
        coach: [{ sel: '#day', text: 'Drag the slider to move through the days. Watch the river and the toilet block.' }, { sel: '.day-ctl .seg', text: 'Turn the timeline layers on and off.' }, { sel: '.order', text: 'Put the events in the order they happened.' }] },
      { id: 'plant', title: 'Treatment plant', color: '#4FA3E0', points: 8, steps: [{ id: 'build', title: 'Build the plant' }, { id: 'dose', title: 'Set the chlorine' }], render: renderPlant,
        coach: [{ sel: '.unit-card', text: 'Tap a stage card, then tap an empty slot in the plant. Not every card belongs!' }, { sel: '[data-slot="0"]', text: 'Water flows from left to right. What should happen first?' }] },
      { id: 'summary', title: 'Case summary', color: '#9B8BE0', points: 2, steps: [{ id: 'recs', title: 'Recommendations' }], render: renderSummary,
        coach: [{ sel: '.report-grid', text: 'Your case report is built from your own evidence.' }, { sel: '[data-rec="0"]', text: 'Choose the recommendations that would protect the village.' }] }
    ]
  };

  OI.cases = OI.cases || {};
  OI.cases.illness = {
    def: CASE,
    mount(el) { this.inst = OI.caseKit.mount(el, CASE); },
    unmount() { if (this.inst) this.inst.unmount(); }
  };
})();
