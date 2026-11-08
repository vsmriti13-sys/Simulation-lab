/* Case File #3 — Where Did the Fish Go?
 * Ecosystems: a trophic cascade. Too many parrotfish caught (fewer grazers) plus fertiliser
 * running off new farms means algae smother the coral, and the reef supports fewer fish.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  // ---------- the three survey sites ----------
  const SITES = {
    A: { name: 'Site A: the far north reef', short: 'Site A (far reef)', note: 'Far from the village and the farms. Hardly anyone fishes here.', coral: 15, algae: 3, parrot: 9, grouper: 3, small: 14, nitrate: 0, water: ['#2E9BC8', '#0E5E86'] },
    B: { name: 'Site B: the fishing grounds', short: 'Site B (fishing grounds)', note: 'Where most of the 8 village boats fish every day. No farms nearby.', coral: 6, algae: 14, parrot: 2, grouper: 0, small: 6, nitrate: 1, water: ['#2E92BE', '#0F587E'] },
    C: { name: 'Site C: the river mouth', short: 'Site C (river mouth)', note: 'Where the river from the new farms flows into the sea.', coral: 5, algae: 15, parrot: 6, grouper: 1, small: 8, nitrate: 10, water: ['#5C9E8A', '#245C52'] }
  };
  function quadratGrid(site) {
    const S = SITES[site], cells = Array(25).fill('sand'), r = rng(site.charCodeAt(0) * 13);
    const order = [...Array(25).keys()].sort(() => r() - 0.5);
    order.slice(0, S.coral).forEach(i => { cells[i] = 'coral'; });
    order.slice(S.coral, S.coral + S.algae).forEach(i => { cells[i] = 'algae'; });
    return cells;
  }
  function fishPlaces(site) {
    const S = SITES[site], r = rng(site.charCodeAt(0) * 31), out = [];
    // fish never overlap, so every parrotfish can be seen and tapped
    const RX = { parrot: 44, grouper: 58, small: 16 }, RY = { parrot: 18, grouper: 22, small: 9 };
    const add = (kind, n) => { for (let i = 0; i < n; i++) {
      let f;
      for (let t = 0; t < 400; t++) {
        f = { kind, x: 70 + r() * 860, y: 95 + r() * 220, flip: r() > 0.5, s: 0.85 + r() * 0.3, d: (r() * 3).toFixed(2) };
        if (f.x < 330 && f.y < 120) continue; // keep clear of the site label
        if (out.every(o => ((f.x - o.x) / ((RX[kind] * f.s + RX[o.kind] * o.s) + 8)) ** 2 + ((f.y - o.y) / ((RY[kind] * f.s + RY[o.kind] * o.s) + 8)) ** 2 >= 1)) break;
      }
      out.push(f);
    } };
    add('grouper', S.grouper); add('parrot', S.parrot); add('small', S.small);
    return out;
  }
  function fish(f, i, marked) {
    const tr = `translate(${f.x},${f.y}) scale(${f.flip ? -f.s : f.s},${f.s})`;
    if (f.kind === 'parrot') return `<g class="fish parrot ${marked ? 'marked' : ''}" data-fish="${i}" transform="${tr}" style="animation-delay:-${f.d}s"><ellipse rx="26" ry="13" fill="#2BA59A" stroke="#13564F" stroke-width="2"/><path d="M24,0 l16,-12 l0,24 z" fill="#3E7FC0" stroke="#13564F" stroke-width="2"/><path d="M-26,-2 l-8,4 l8,4" fill="#F2B630"/><circle cx="-16" cy="-4" r="3" fill="#10262E"/><path d="M-4,-12 q8,-8 16,0" fill="#E35D8A"/>${marked ? '<circle r="30" fill="none" stroke="#F2B630" stroke-width="4"/>' : ''}</g>`;
    if (f.kind === 'grouper') return `<g class="fish" transform="${tr}"><ellipse rx="38" ry="18" fill="#8C6A3A" stroke="#4d3a24" stroke-width="2"/><path d="M36,0 l18,-14 l0,28 z" fill="#7A5634"/>${[[-10, -6], [6, 4], [-2, 8], [14, -6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#5c432a"/>`).join('')}<circle cx="-24" cy="-5" r="3.5" fill="#10262E"/></g>`;
    return `<g class="fish" transform="${tr} scale(0.5)"><ellipse rx="20" ry="9" fill="#F2C94C" stroke="#9C7B20" stroke-width="2"/><path d="M18,0 l12,-9 l0,18 z" fill="#F2C94C"/><circle cx="-12" cy="-2" r="2.5" fill="#10262E"/></g>`;
  }
  function reefScene(site, st) {
    const S = SITES[site], r = rng(site.charCodeAt(0) * 7), marked = (st.marked || {})[site] || [];
    const healthy = S.coral / 25, weedy = S.algae / 25;
    const corals = Array.from({ length: Math.round(4 + healthy * 16) }, () => ({ x: 40 + r() * 920, y: 380 + r() * 70, k: Math.floor(r() * 3), c: ['#E86A8E', '#F29A4A', '#B26FD1', '#E9C445'][Math.floor(r() * 4)] }));
    const weeds = Array.from({ length: Math.round(weedy * 26) }, () => ({ x: 30 + r() * 940, y: 390 + r() * 70 }));
    return `<svg viewBox="0 0 1000 500" class="reef" role="img" aria-label="${esc(S.name)}: ${S.coral * 4}% coral, ${S.algae * 4}% algae">
      <defs><linearGradient id="w-${site}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.water[0]}"/><stop offset="1" stop-color="${S.water[1]}"/></linearGradient></defs>
      <rect width="1000" height="500" fill="url(#w-${site})"/>
      ${[120, 380, 640, 860].map(x => `<polygon points="${x},0 ${x + 60},0 ${x - 80},380 ${x - 160},380" fill="rgba(255,255,255,0.07)"/>`).join('')}
      ${site === 'C' ? '<rect width="1000" height="500" fill="#7FA04A" opacity="0.18"/>' + Array.from({ length: 60 }, () => `<circle cx="${r() * 1000}" cy="${r() * 420}" r="${1 + r() * 2}" fill="rgba(200,230,150,0.5)"/>`).join('') : ''}
      <path d="M0,400 C200,370 400,420 600,390 C800,365 900,410 1000,395 L1000,500 L0,500 Z" fill="#D9C79A"/>
      ${corals.map(c => c.k === 0 ? `<g transform="translate(${c.x},${c.y})">${[-20, -8, 4, 16].map((dx, i) => `<path d="M0,0 Q${dx},-30 ${dx * 1.6},-${45 + i * 6}" stroke="${c.c}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</g>`
        : c.k === 1 ? `<g transform="translate(${c.x},${c.y})"><ellipse rx="34" ry="22" fill="${c.c}"/><path d="M-26,-6 q12,-10 24,0 t24,0 M-24,6 q12,-10 24,0 t24,0" stroke="rgba(0,0,0,0.25)" fill="none" stroke-width="2"/></g>`
        : `<g transform="translate(${c.x},${c.y})"><path d="M0,0 C-30,-50 30,-60 0,-90 C40,-60 50,-30 0,0" fill="${c.c}" opacity="0.85"/></g>`).join('')}
      ${weeds.map(w => `<g transform="translate(${w.x},${w.y})"><path d="M0,0 C-10,-20 10,-30 -4,-50 M6,0 C16,-18 -2,-34 12,-46" stroke="#5E8C2E" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="-4" rx="22" ry="10" fill="#6E9A3A" opacity="0.85"/></g>`).join('')}
      <g transform="translate(470,410)"><rect x="-55" y="-10" width="110" height="60" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="8 5"/><text y="70" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Quadrat</text></g>
      ${fishPlaces(site).map((f, i) => [f, i]).sort((a, b) => (a[0].kind === 'parrot') - (b[0].kind === 'parrot')).map(([f, i]) => fish(f, i, marked.includes(i))).join('')}
      <g transform="translate(20,30)"><rect width="270" height="34" rx="8" fill="rgba(16,38,46,0.75)"/><text x="12" y="23" fill="#fff" font-size="16" font-weight="700">${esc(S.name)}</text></g>
    </svg>`;
  }

  // ---------- the grazer tank ----------
  function tank(fishN, nut) {
    let A = 20; const days = [A];
    for (let d = 1; d <= 30; d++) { const grow = 0.06 * (1 + 2 * nut), graze = 0.025 * fishN; A = Math.max(0, Math.min(100, A + grow * A * (1 - A / 100) - graze * A)); days.push(A); }
    return days.map(v => Math.round(v));
  }
  function tankSVG(fishN, nut, algae) {
    const r = rng(7);
    return `<svg viewBox="0 0 600 340" class="tank-svg" role="img" aria-label="Aquarium with ${fishN} parrotfish and ${nut ? 'high' : 'low'} nutrients: ${algae}% algae">
      <rect x="20" y="20" width="560" height="300" rx="10" fill="${nut ? '#6FA88E' : '#7CC3D8'}" stroke="#4A636C" stroke-width="5"/>
      <rect x="25" y="270" width="550" height="45" fill="#D9C79A"/>
      <path d="M80,300 C120,200 220,190 300,230 C380,190 480,210 520,300 Z" fill="#9C9384"/>
      ${Array.from({ length: Math.round(algae / 3) }, () => { const x = 90 + r() * 420, y = 225 + r() * 70; return `<g transform="translate(${x},${y})"><path d="M0,0 C-6,-14 6,-20 -2,-30" stroke="#4E7F22" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse rx="14" ry="6" fill="#5E8C2E"/></g>`; }).join('')}
      ${Array.from({ length: fishN }, (_, i) => fish({ kind: 'parrot', x: 100 + i * 75, y: 80 + (i % 2) * 60, flip: i % 2, s: 1, d: i }, 0, false).replace('data-fish="0"', '')).join('')}
      <text x="40" y="50" font-size="16" font-weight="700" fill="#10262E">${algae}% algae</text>
    </svg>`;
  }
  const NITRATE = { 0: '#FBEFF4', 1: '#F6D3E2', 2: '#EFAAC9', 5: '#DB6FA2', 10: '#A8326E' };

  // ---------- reef rescue model (years) ----------
  function rescue(d) {
    let P = 25, A = 56, C = 24, F = 10;
    const N = ({ chemical: 1, compost: 0.3 })[d.fert] * (d.trees ? 0.4 : 1), E = d.boats * (1 - d.reserve);
    const out = [];
    for (let y = 1; y <= 10; y++) {
      const parrotCatch = d.ban ? 0 : 0.05 * E * P;
      P = Math.max(1, Math.min(100, P + 0.45 * P * (1 - P / 100) + 6 * d.reserve - parrotCatch));
      const grow = 0.12 + 0.35 * N, graze = 0.009 * P;
      A = Math.min(95, Math.max(3, A + 100 * grow * (A / 100) * (1 - A / 100) - graze * A));
      C = Math.min(80, Math.max(2, C + 0.22 * C * (1 - (C + A) / 100) - (A > 35 ? 0.006 * (A - 35) * C : 0)));
      const K = 100 * (0.35 + 0.65 * C / 60), fishCatch = 0.055 * E * F;
      F = Math.max(1, F + 0.4 * F * (1 - F / K) + 25 * d.reserve * (F / 100) * (1 - F / K) - fishCatch);
      out.push({ y, parrot: Math.round(P), algae: Math.round(A), coral: Math.round(C), fish: Math.round(F), kg: Math.round(fishCatch * 3 + parrotCatch) });
    }
    return out;
  }

  // ---------- glossary and handbook ----------
  const GLOSSARY = {
    'biologist': 'A scientist who studies living things and how they depend on each other.',
    'ecosystem': 'All the living things in a place, and the non-living things they depend on, such as water, light and rock.',
    'coral': 'Tiny animals that build reefs out of limestone. They need clear, sunny water.',
    'algae': 'Simple plant-like living things. Some algae are food for fish, but too much smothers coral.',
    'parrotfish': 'A colourful reef fish that grazes algae off rocks and coral with its beak-like teeth.',
    'grazer': 'An animal that eats plants or algae, keeping them short.',
    'predator': 'An animal that hunts and eats other animals.',
    'food web': 'A diagram of who eats whom in an ecosystem, made of many linked food chains.',
    'producer': 'A living thing that makes its own food from sunlight, such as algae.',
    'consumer': 'A living thing that gets energy by eating other living things.',
    'quadrat': 'A square frame used to count what lives in one small area, so different places can be compared fairly.',
    'nutrients': 'Substances that living things need to grow. Fertiliser is full of them.',
    'runoff': 'Rainwater that flows over the land into rivers and the sea, carrying soil and fertiliser with it.',
    'nitrate': 'A nutrient found in fertiliser. High levels in seawater make algae grow fast.',
    'trophic cascade': 'A chain reaction in a food web: a change to one animal affects the next, and the next.',
    'marine reserve': 'An area of sea where fishing is not allowed, so fish can grow and breed.',
    'spillover': 'When fish multiply inside a reserve and swim out into the areas where people fish.'
  };
  const HANDBOOK = [
    { id: 'reefs', title: 'Coral reefs', html: '<p>Coral reefs are built by tiny animals. Coral needs <strong>clear, sunny water</strong> because helpful algae living inside it make food from sunlight.</p><p>Reefs are home to about a quarter of all sea life, and they protect coasts from waves.</p>' },
    { id: 'web', title: 'Food webs', html: '<p>Energy flows from the sun to <strong>producers</strong> (algae, plankton) and then to <strong>consumers</strong> that eat them.</p><p>Arrows in a food web point from the thing that is eaten to the thing that eats it: algae → parrotfish means "algae is eaten by parrotfish".</p><p>Change one part and the others feel it. That is a <strong>trophic cascade</strong>.</p>' },
    { id: 'quadrat', title: 'Quadrat surveys', html: '<p>A quadrat is a square frame laid on the sea floor. Ours has a 5 × 5 grid: 25 small squares.</p><p>Count the squares that are mostly coral, and the squares that are mostly algae. Each square is 4% of the quadrat, so <strong>% cover = number of squares × 4</strong>.</p><p>Using the same quadrat at every site makes the comparison fair.</p>' },
    { id: 'nutrients', title: 'Nutrients and algae', html: '<p>Fertiliser helps crops grow, but when it rains, some of it washes into rivers and the sea (<strong>runoff</strong>). There it feeds algae.</p><p>Fast-growing algae can smother coral and cloud the water. Trees and plants along a riverbank catch much of the runoff before it reaches the sea.</p>' },
    { id: 'fishing', title: 'Overfishing', html: '<p>Fish can only be caught as fast as they can breed. Catch more than that, and there are fewer fish every year.</p><p>Catching grazers like parrotfish also harms the reef, because nothing keeps the algae down.</p>' },
    { id: 'reserves', title: 'Marine reserves', html: '<p>In a <strong>marine reserve</strong> no fishing is allowed. Fish grow bigger and have more young.</p><p>Many of them swim out into nearby fishing areas (<strong>spillover</strong>), so after a few years fishers often catch more, not less.</p>' }
  ];

  // ---------- stage 1: introduction ----------
  const CATCH = [30, 30, 29, 30, 28, 29, 27, 27, 26, 25, 24, 24, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 13, 12];
  function catchChart() {
    const W = 380, H = 200, L = 34, B = 30, T = 20, X = i => L + (i + 0.5) * ((W - L - 10) / 24), Y = v => H - B - (v / 35) * (H - B - T);
    return `<svg viewBox="0 0 ${W} ${H}" class="case-chart" role="img" aria-label="Fish caught per boat each day over 24 months: from 30 kg down to 12 kg">
      <text x="${L}" y="12" class="ax-t">Fish caught (kg per day), last 24 months</text>
      ${[0, 15, 30].map(v => `<line x1="${L}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      <polyline points="${CATCH.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="#C2412D" stroke-width="2.5"/>
      <circle cx="${X(23)}" cy="${Y(12)}" r="4" fill="#C2412D"/><text x="${X(23) - 4}" y="${Y(12) - 8}" class="ax-v" text-anchor="end">12 kg</text>
      ${[0, 12, 23].map(i => `<text x="${X(i)}" y="${H - 10}" class="ax" text-anchor="middle">${i === 0 ? '2 years ago' : i === 12 ? '1 year ago' : 'Now'}</text>`).join('')}
    </svg>`;
  }
  function renderIntro(api, el) {
    const q = { id: 'i1', text: 'The fishers think sharks are eating all the fish. What should a biologist do first?', options: ['Collect evidence before deciding what the cause is', 'Agree with the fishers and hunt the sharks', 'Tell the fishers to stop fishing for ever'], correct: 0, explain: 'A good scientist tests ideas against evidence before acting.' };
    el.innerHTML = `<div class="intro-board">
      <article class="message">
        <div class="msg-head"><span class="msg-icon" aria-hidden="true">✉</span><div><strong>From: Captain Leilani, Island Fishers' Group</strong><br><span class="muted">To: GHA Biologist · Subject: Where have all the fish gone?</span></div></div>
        <p data-read>${api.gloss('Two years ago each boat caught about 30 kg of fish a day. Now we are lucky to catch 12 kg. Families are worried about food and money.')}</p>
        <p data-read>${api.gloss('Parts of the reef near the village look grey and green, not colourful like before. Some fishers say sharks are eating all the fish and want to hunt them.')}</p>
        <p data-read>${api.gloss('You are the team biologist. Can you find out what is happening to our ecosystem, and how we can bring the fish back?')}</p>
      </article>
      <div class="intro-side">
        <div class="role-card"><span class="role-badge" aria-hidden="true">🌿</span><div><span class="label">Your role</span><strong>Biologist</strong><small>Survey the reef, find the cause and plan a rescue.</small></div></div>
        <div class="chart-frame">${catchChart()}</div>
      </div></div>
      <div class="stage-tasks">${api.question(q)}
        <label class="field"><span data-read>Your first ideas: why might there be fewer fish?</span><textarea id="ideas" rows="2" placeholder="We think…">${esc(api.S.data.ideas || '')}</textarea></label>
        <div class="actions">${api.answered(['i1']) ? '<button type="button" class="btn primary" id="next">Dive and survey the reef</button>' : '<p class="muted">Answer the question to start.</p>'}</div></div>`;
    el.querySelector('#ideas').addEventListener('input', e => { api.S.data.ideas = e.target.value; api.save(); });
    api.bindQuestions([q], () => { api.complete('intro'); api.stepDone('briefing'); });
    const n = el.querySelector('#next'); if (n) n.addEventListener('click', () => api.go('survey'));
  }

  // ---------- stage 2: reef survey ----------
  function surveyTodo(st) {
    const out = [];
    Object.keys(SITES).forEach(s => { const r = st.results[s] || {}; if (r.coral == null) out.push([s, 'quadrat']); if (r.parrot == null) out.push([s, 'fish']); });
    return out;
  }
  function renderSurvey(api, el) {
    const S = api.S, st = S.data.survey = S.data.survey || { site: 'A', mode: 'quadrat', results: {}, marked: {} };
    const site = st.site, R = st.results[site] = st.results[site] || {}, todo = surveyTodo(st);
    const grid = quadratGrid(site);
    const q = { id: 's1', text: 'What do Sites B and C have in common, compared with Site A?', options: ['Much more algae and much less coral', 'More parrotfish', 'Clearer water'], correct: 0, explain: 'Algae has taken over at both sites, but for different reasons. Site B has very few parrotfish; Site C has green, cloudy water.' };
    el.innerHTML = `<div class="bench">
      <div class="nb-head"><span class="mono">${6 - todo.length} of 6 counts done${todo.length ? ` · ${todo.length} to go` : ' · all done!'}</span>${todo.length ? '<button type="button" class="btn small primary" id="next-test">Next count →</button>' : ''}</div>
      <div class="tools" role="tablist">${Object.entries(SITES).map(([k, s]) => `<button type="button" class="tool-tab ${site === k ? 'on' : ''}" data-site="${k}" role="tab" aria-selected="${site === k}">${esc(s.short)}</button>`).join('')}</div>
      <p class="muted" data-read>${esc(SITES[site].note)}</p>
      <div class="scene-frame reef-frame">${reefScene(site, st)}</div>
      <div class="seg">${[['quadrat', 'Quadrat: coral and algae'], ['fish', 'Count the parrotfish']].map(([k, l]) => `<label class="${st.mode === k ? 'on' : ''}"><input type="radio" name="mode" value="${k}" ${st.mode === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      ${st.mode === 'quadrat' ? `<div class="tool"><div class="quadrat" role="img" aria-label="Quadrat grid of 25 squares">${grid.map(c => `<span class="qc ${c}"></span>`).join('')}</div>
        <div class="tool-controls"><p data-read>${api.gloss('This is the quadrat, close up. Count the squares that are mostly coral (pink, orange, purple) and the squares that are mostly algae (green). Each square is 4%.')}</p>
          ${R.coral != null ? `<p class="calc-fb ok">Recorded: coral ${R.coral * 4}%, algae ${R.algae * 4}%.</p>` : `<label class="field"><span>Coral squares</span><input id="q-coral" inputmode="numeric"></label><label class="field"><span>Algae squares</span><input id="q-algae" inputmode="numeric"></label>
          <div class="actions"><button type="button" class="btn small primary" id="rec-q">Check and record</button></div><p class="calc-fb" id="q-fb" aria-live="polite"></p>`}</div></div>`
        : `<div class="tool-controls"><p data-read>Tap every parrotfish in the picture above to count it: the blue-green fish with a beak and a yellow-orange face. Do not count the brown groupers or the small yellow fish.</p>
          ${R.parrot != null ? `<p class="calc-fb ok">Recorded: ${R.parrot} parrotfish.</p>` : `<p><strong class="mono">${((st.marked || {})[site] || []).length}</strong> parrotfish tapped.</p><div class="actions"><button type="button" class="btn small primary" id="rec-fish">I have counted them all</button></div><p class="calc-fb" id="fish-fb" aria-live="polite"></p>`}</div>`}
      <div class="table-wrap"><table class="tally-t notebook"><caption>Survey notebook</caption><thead><tr><th>Site</th><th>Coral cover</th><th>Algae cover</th><th>Parrotfish</th></tr></thead><tbody>
        ${Object.entries(SITES).map(([k, s]) => { const r = st.results[k] || {}; return `<tr class="${site === k ? 'cur' : ''}"><td>${esc(s.short)}</td><td class="mono">${r.coral != null ? r.coral * 4 + '%' : '—'}</td><td class="mono">${r.algae != null ? r.algae * 4 + '%' : '—'}</td><td class="mono">${r.parrot != null ? r.parrot : '—'}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="stage-tasks"><h2>Compare the sites</h2>${todo.length ? '<p class="note">Finish the quadrat and parrotfish counts at all three sites to unlock the question. Tap <strong>Next count</strong>.</p>' : api.question(q) + (api.answered(['s1']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Go to the reef lab</button></div>' : '')}</div>`;
    el.querySelectorAll('[data-site]').forEach(b => b.addEventListener('click', () => { st.site = b.dataset.site; api.save(); api.rerender(); }));
    el.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', () => { st.mode = r.value; api.save(); api.rerender(); }));
    const nt = el.querySelector('#next-test'); if (nt) nt.addEventListener('click', () => { const [s, m] = todo[0]; st.site = s; st.mode = m; api.save(); api.rerender(); el.querySelector('.bench').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    const rq = el.querySelector('#rec-q');
    if (rq) rq.addEventListener('click', () => {
      const c = Number(el.querySelector('#q-coral').value), a = Number(el.querySelector('#q-algae').value), fb = el.querySelector('#q-fb');
      if (c === SITES[site].coral && a === SITES[site].algae) { R.coral = c; R.algae = a; api.save(); api.rerender(); }
      else { fb.className = 'calc-fb no'; fb.textContent = `Count again carefully.${c !== SITES[site].coral ? ' Coral is not right yet.' : ''}${a !== SITES[site].algae ? ' Algae is not right yet.' : ''}`; }
    });
    if (st.mode === 'fish' && R.parrot == null) {
      el.querySelectorAll('.fish.parrot').forEach(g => g.addEventListener('click', () => {
        const i = Number(g.dataset.fish); st.marked[site] = st.marked[site] || [];
        st.marked[site] = st.marked[site].includes(i) ? st.marked[site].filter(x => x !== i) : st.marked[site].concat(i); api.save(); api.rerender();
      }));
      el.querySelector('#rec-fish').addEventListener('click', () => {
        const n = (st.marked[site] || []).length, fb = el.querySelector('#fish-fb');
        if (n === SITES[site].parrot) { R.parrot = n; api.save(); api.rerender(); } else { fb.className = 'calc-fb no'; fb.textContent = `Not yet: you have tapped ${n}. Look carefully all over the picture.`; }
      });
    }
    api.bindQuestions([q], () => { api.stepDone('count'); api.complete('survey'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('lab'));
  }

  // ---------- stage 3: reef lab ----------
  const RUNS = [[0, 0], [6, 0], [0, 1], [6, 1]];
  function renderLab(api, el) {
    const S = api.S, L = S.data.lab = S.data.lab || { tool: 'nitrate', site: 'A', dipped: null, fish: 0, nut: 0, results: { nitrate: {}, tank: {} } };
    const todo = [...Object.keys(SITES).filter(s => L.results.nitrate[s] == null).map(s => ['nitrate', s]), ...RUNS.filter(([f, n]) => L.results.tank[f + '-' + n] == null).map(([f, n]) => ['tank', f + '-' + n])];
    const done = !todo.length;
    let tool;
    if (L.tool === 'nitrate') {
      const dipped = L.dipped === L.site, col = dipped ? NITRATE[SITES[L.site].nitrate] : '#FFFFFF';
      tool = `<div class="tool"><svg viewBox="0 0 400 300" class="tool-svg" role="img" aria-label="Nitrate test tube"><rect x="170" y="30" width="60" height="230" rx="28" fill="rgba(255,255,255,0.6)" stroke="#4A636C" stroke-width="3"/><rect x="174" y="${dipped ? 90 : 200}" width="52" height="${dipped ? 166 : 56}" rx="24" fill="${dipped ? col : '#E8F1F3'}" style="transition:all 0.6s"/><text x="200" y="290" text-anchor="middle" class="ax-t">${esc(SITES[L.site].short)}</text></svg>
        <div class="tool-controls"><p data-read>${api.gloss('Add the nitrate tablet to the sample and wait for the colour. Then match it with the chart. More nitrate means a darker pink.')}</p>
          <div class="seg">${Object.entries(SITES).map(([k, s]) => `<label class="${L.site === k ? 'on' : ''}"><input type="radio" name="nsite" value="${k}" ${L.site === k ? 'checked' : ''}> ${esc(s.short)}</label>`).join('')}</div>
          <div class="actions"><button type="button" class="btn small primary" id="dip">${dipped ? 'Test again' : 'Add the tablet'}</button></div>
          <div class="ph-chart">${Object.entries(NITRATE).map(([v, c]) => `<button type="button" class="ph-swatch" data-nit="${v}" style="--c:${c}" ${dipped && L.results.nitrate[L.site] == null ? '' : 'disabled'}><span></span>${v} mg/L</button>`).join('')}</div>
          <p class="calc-fb" id="nit-fb" aria-live="polite">${L.results.nitrate[L.site] != null ? 'Recorded: ' + L.results.nitrate[L.site] + ' mg/L' : ''}</p></div></div>`;
    } else {
      const days = tank(L.fish, L.nut), key = L.fish + '-' + L.nut;
      tool = `<div class="tool"><div class="tool-frame" id="tank-frame">${tankSVG(L.fish, L.nut, L.ran === key ? days[30] : 20)}</div>
        <div class="tool-controls"><p data-read>${api.gloss('A test aquarium with a rock covered in a little algae. Choose how many parrotfish to add and how many nutrients are in the water, then watch for 30 days.')}</p>
          <div class="seg">${[0, 6].map(f => `<label class="${L.fish === f ? 'on' : ''}"><input type="radio" name="tfish" value="${f}" ${L.fish === f ? 'checked' : ''}> ${f} parrotfish</label>`).join('')}</div>
          <div class="seg">${[[0, 'Low nutrients'], [1, 'High nutrients (fertiliser)']].map(([v, l]) => `<label class="${L.nut === v ? 'on' : ''}"><input type="radio" name="tnut" value="${v}" ${L.nut === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          <div class="actions"><button type="button" class="btn small primary" id="run-tank">Watch 30 days</button></div>
          <p class="calc-fb" id="tank-fb" aria-live="polite">${L.results.tank[key] != null ? `Recorded: ${L.results.tank[key]}% algae after 30 days.` : ''}</p></div></div>`;
    }
    const qs = [
      { id: 'l1', text: 'Which site had the most nitrate?', options: ['Site A (far reef)', 'Site B (fishing grounds)', 'Site C (river mouth)'], correct: 2, explain: '10 mg/L at the river mouth, washed down from the new farms.' },
      { id: 'l2', text: 'In the tank, what happened to the algae when there were no parrotfish?', options: ['It spread', 'It disappeared', 'It stayed the same'], correct: 0, explain: 'Without grazers, nothing keeps the algae down.' },
      { id: 'l3', text: 'Which tank had the most algae after 30 days?', options: ['6 parrotfish, low nutrients', '0 parrotfish, low nutrients', '0 parrotfish, high nutrients'], correct: 2, explain: 'Fertiliser makes algae grow faster, and with no grazers it covered almost everything. Both causes together are worst.' }
    ];
    el.innerHTML = `<div class="bench">
      <div class="nb-head"><span class="mono">${7 - todo.length} of 7 tests done${todo.length ? ` · ${todo.length} to go` : ' · all done!'}</span>${todo.length ? '<button type="button" class="btn small primary" id="next-test">Next test →</button>' : ''}</div>
      <div class="tools" role="tablist">${[['nitrate', 'Nitrate test'], ['tank', 'Grazer tank']].map(([k, n]) => `<button type="button" class="tool-tab ${L.tool === k ? 'on' : ''}" data-tool="${k}" id="tool-${k}" role="tab" aria-selected="${L.tool === k}">${n}</button>`).join('')}</div>
      <div class="tool-wrap">${tool}</div>
      <div class="table-wrap"><table class="tally-t notebook"><caption>Lab notebook</caption><tbody>
        <tr><th>Nitrate (mg/L)</th>${Object.entries(SITES).map(([k, s]) => `<td>${esc(s.short)}: <strong class="mono">${L.results.nitrate[k] != null ? L.results.nitrate[k] : '—'}</strong></td>`).join('')}<td></td></tr>
        <tr><th>Algae after 30 days</th>${RUNS.map(([f, n]) => `<td>${f} fish, ${n ? 'high' : 'low'} nutrients: <strong class="mono">${L.results.tank[f + '-' + n] != null ? L.results.tank[f + '-' + n] + '%' : '—'}</strong></td>`).join('')}</tr>
      </tbody></table></div></div>
      <div class="stage-tasks"><h2>What did you find?</h2>${done ? qs.map(q => api.question(q)).join('') + (api.answered(['l1', 'l2', 'l3']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Build the food web</button></div>' : '') : '<p class="note">Finish all 7 tests to unlock the questions. Tap <strong>Next test</strong>.</p>'}</div>`;
    el.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { L.tool = b.dataset.tool; api.save(); api.rerender(); }));
    const nt = el.querySelector('#next-test'); if (nt) nt.addEventListener('click', () => { const [tl, v] = todo[0]; L.tool = tl; if (tl === 'nitrate') { L.site = v; L.dipped = null; } else { const [f, n] = v.split('-').map(Number); L.fish = f; L.nut = n; L.ran = null; } api.save(); api.rerender(); el.querySelector('.bench').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    if (L.tool === 'nitrate') {
      el.querySelectorAll('input[name=nsite]').forEach(r => r.addEventListener('change', () => { L.site = r.value; L.dipped = null; api.save(); api.rerender(); }));
      el.querySelector('#dip').addEventListener('click', () => { L.dipped = L.site; api.save(); api.rerender(); });
      el.querySelectorAll('[data-nit]').forEach(b => b.addEventListener('click', () => {
        if (Number(b.dataset.nit) === SITES[L.site].nitrate) { L.results.nitrate[L.site] = SITES[L.site].nitrate; api.save(); api.rerender(); }
        else { const fb = el.querySelector('#nit-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Look again: which chart colour matches the tube best?'; }
      }));
    } else {
      el.querySelectorAll('input[name=tfish]').forEach(r => r.addEventListener('change', () => { L.fish = Number(r.value); L.ran = null; api.save(); api.rerender(); }));
      el.querySelectorAll('input[name=tnut]').forEach(r => r.addEventListener('change', () => { L.nut = Number(r.value); L.ran = null; api.save(); api.rerender(); }));
      el.querySelector('#run-tank').addEventListener('click', () => {
        const days = tank(L.fish, L.nut), key = L.fish + '-' + L.nut, frame = el.querySelector('#tank-frame'), btn = el.querySelector('#run-tank');
        btn.disabled = true; let d = 0;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const step = () => { d = reduce ? 30 : d + 1; frame.innerHTML = tankSVG(L.fish, L.nut, days[d]).replace('% algae</text>', `% algae · day ${d}</text>`); if (d < 30) setTimeout(step, 70); else { L.ran = key; L.results.tank[key] = days[30]; api.save(); api.rerender(); } };
        step();
      });
    }
    api.bindQuestions(qs, () => { if (api.answered(['l1', 'l2', 'l3'])) { api.stepDone('tests'); api.complete('lab'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('web'));
  }

  // ---------- stage 4: food web ----------
  const NODES = { sun: ['☀️ Sun', 300, 40], algae: ['Algae', 140, 140], plankton: ['Plankton', 460, 140], coral: ['Coral', 600, 240], parrot: ['Parrotfish', 140, 250], small: ['Small fish', 400, 250], grouper: ['Groupers', 270, 360], shark: ['Sharks', 120, 460], people: ['People', 430, 460] };
  const GIVEN = ['sun>algae', 'sun>plankton', 'plankton>coral'];
  const WANT = ['algae>parrot', 'plankton>small', 'small>grouper', 'parrot>grouper', 'grouper>shark', 'grouper>people', 'parrot>people'];
  function webSVG(st) {
    const arrow = (k, cls) => { const [a, b] = k.split('>'), A = NODES[a], B = NODES[b]; const dx = B[1] - A[1], dy = B[2] - A[2], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const xy = `x1="${A[1] + ux * 44}" y1="${A[2] + uy * 22}" x2="${B[1] - ux * 48}" y2="${B[2] - uy * 26}"`;
      return `<g class="web-arrow-line ${cls}" data-arrow="${k}"><line ${xy} class="hit"/><line ${xy} marker-end="url(#ah)"/></g>`; };
    return `<svg viewBox="0 0 700 510" class="foodweb" role="img" aria-label="Reef food web builder">
      <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4A636C"/></marker></defs>
      <rect width="700" height="510" fill="#DDEFF4" rx="12"/>
      ${GIVEN.map(k => arrow(k, 'given')).join('')}
      ${st.arrows.map(k => arrow(k, st.wrong && st.wrong.includes(k) ? 'wrong' : 'mine')).join('')}
      ${Object.entries(NODES).map(([id, [label, x, y]]) => `<g class="web-node2 ${st.from === id ? 'from' : ''}" data-node="${id}" transform="translate(${x},${y})" role="button" tabindex="0" aria-label="${label}"><rect x="-58" y="-22" width="116" height="44" rx="22"/><text y="6" text-anchor="middle">${label}</text></g>`).join('')}
    </svg>`;
  }
  function renderWeb(api, el) {
    const S = api.S, st = S.data.web = S.data.web || { arrows: [], from: null };
    const done = api.answered(['w0']);
    const qs = [
      { id: 'w1', text: 'Follow your food web: if people catch most of the parrotfish, what happens to the algae, and then to the coral?', options: ['Algae spreads, and the coral is smothered', 'Algae disappears, and the coral grows', 'Nothing changes'], correct: 0, explain: 'A trophic cascade: fewer grazers, more algae, less coral, and less coral means fewer homes for fish.' },
      { id: 'w2', text: 'Which hypothesis fits all your evidence so far?', options: ['Sharks have eaten the fish', 'The sea has become too warm', 'Too many parrotfish are caught, and fertiliser from the farms feeds the algae', 'Only the fertiliser is to blame'], correct: 2, explain: 'Site B (no farms, few parrotfish) and Site C (high nitrate) both lost their coral. Two causes. Next, test it against all the evidence.' }
    ];
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Build the reef food web. An arrow goes from the food to the animal that eats it, showing which way the energy flows. Tap the food first, then the animal that eats it. Three arrows are already drawn.')}</p></div>
      <div class="lab-grid"><div class="scene"><div class="scene-frame">${webSVG(st)}</div></div>
        <div class="scene-side"><p class="mono">${st.arrows.length} arrows drawn · ${WANT.length} needed</p>
          ${st.from ? `<p class="note">${esc(NODES[st.from][0])} is eaten by… tap the animal that eats it.</p>` : '<p class="muted">Tap an arrow to remove it.</p>'}
          ${done ? '<p class="calc-fb ok">Your food web is correct!</p>' : `<div class="actions"><button type="button" class="btn primary" id="check-web" ${st.arrows.length ? '' : 'disabled'}>Check my food web</button><button type="button" class="btn ghost" id="clear-web">Clear</button></div><p class="calc-fb" id="web-fb" aria-live="polite"></p>`}</div></div>
      <div class="stage-tasks">${done ? qs.map((q, i) => (i === 0 || api.answered([qs[i - 1].id])) ? api.question(q) : '').join('') : ''}${api.answered(['w1', 'w2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Test the hypothesis</button></div>' : ''}</div>`;
    el.querySelectorAll('[data-node]').forEach(g => { const tap = () => {
      if (done) return; const id = g.dataset.node;
      if (!st.from) st.from = id; else if (st.from === id) st.from = null;
      else { const k = st.from + '>' + id, rev = id + '>' + st.from; if (!st.arrows.includes(k) && !GIVEN.includes(k) && !GIVEN.includes(rev)) st.arrows = st.arrows.filter(x => x !== rev).concat(k); st.from = null; st.wrong = null; }
      api.save(); api.rerender(); }; g.addEventListener('click', tap); g.addEventListener('keydown', e => { if (e.key === 'Enter') tap(); }); });
    el.querySelectorAll('[data-arrow]').forEach(a => a.addEventListener('click', () => { if (done || GIVEN.includes(a.dataset.arrow)) return; st.arrows = st.arrows.filter(x => x !== a.dataset.arrow); st.wrong = null; api.save(); api.rerender(); }));
    const cw = el.querySelector('#clear-web'); if (cw) cw.addEventListener('click', () => { st.arrows = []; st.from = null; st.wrong = null; api.save(); api.rerender(); });
    const ck = el.querySelector('#check-web');
    if (ck) ck.addEventListener('click', () => {
      const n = api.tries('w0'), wrong = st.arrows.filter(k => !WANT.includes(k)), missing = WANT.filter(k => !st.arrows.includes(k));
      if (!wrong.length && !missing.length) { api.award('w0', n === 1); api.stepDone('build'); api.rerender(); }
      else { st.wrong = wrong; api.save(); api.rerender(); const fb = el.querySelector('#web-fb'); fb.className = 'calc-fb no'; fb.textContent = `${wrong.length ? `${wrong.length} arrow${wrong.length > 1 ? 's are' : ' is'} wrong (red). ` : ''}${missing.length ? `${missing.length} arrow${missing.length > 1 ? 's are' : ' is'} still missing. ` : ''}Remember: from the food to the eater.`; }
    });
    api.bindQuestions(qs, () => { if (api.answered(['w1', 'w2'])) { api.stepDone('hypothesis'); api.complete('web'); } });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('evidence'));
  }

  // ---------- stage 5: evidence ----------
  const CARDS = [
    { id: 'c1', icon: '🎣', text: 'Site B, the fishing grounds, has only 2 parrotfish and 56% algae, but no farms nearby.', col: 'fish' },
    { id: 'c2', icon: '🛶', text: 'Last year a market buyer started paying well for parrotfish, and the village boats went from 3 to 8.', col: 'fish' },
    { id: 'c3', icon: '🧪', text: 'Site C, at the river mouth, has 10 mg/L of nitrate and green, cloudy water.', col: 'fert' },
    { id: 'c4', icon: '🌾', text: 'The new farms upstream started using chemical fertiliser 14 months ago.', col: 'fert' },
    { id: 'c5', icon: '🌡️', text: 'The water is 28 °C, normal for the season. No coral bleaching was seen.', col: 'rule' },
    { id: 'c6', icon: '🦈', text: 'Divers saw only 2 sharks all year. Sharks are rare here.', col: 'rule' },
    { id: 'c7', icon: '🪸', text: 'Site A, far from the farms and the boats, is still healthy and colourful.', col: 'rule' }
  ];
  const ECOLS = { fish: 'Overfishing of grazers', fert: 'Fertiliser runoff', rule: 'Rules out other explanations' };
  function renderEvidence(api, el) {
    const S = api.S, st = S.data.ev = S.data.ev || { place: {}, pick: null };
    const all = CARDS.every(c => st.place[c.id]);
    const q = { id: 'e2', text: 'Why was surveying Site A so useful?', options: ['It shows what the reef looks like without fishing pressure or fertiliser, so we can compare', 'It has the most fish to catch', 'It is closest to the village'], correct: 0, explain: 'Site A works like a control in an experiment.' };
    el.innerHTML = `<div class="board"><p class="board-help" data-read>Sort the evidence. Which cause does each card support, and which cards rule out other ideas? Tap a card, then a column.</p>
      <div class="cards">${CARDS.filter(c => !st.place[c.id]).map(c => `<button type="button" class="ev-card ${st.pick === c.id ? 'picked' : ''}" data-ev="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('') || '<p class="muted">All cards sorted.</p>'}</div>
      <div class="columns">${Object.entries(ECOLS).map(([k, t]) => `<div class="ev-col" data-col="${k}" role="button" tabindex="0"><h3>${t}</h3>${CARDS.filter(c => st.place[c.id] === k).map(c => `<button type="button" class="ev-card placed ${st.wrong && st.wrong.includes(c.id) ? 'wrong' : ''}" data-back="${c.id}"><span aria-hidden="true">${c.icon}</span>${esc(c.text)}</button>`).join('')}</div>`).join('')}</div>
      <div class="actions"><button type="button" class="btn primary" id="check-board" ${all && !api.answered(['e1']) ? '' : 'disabled'}>Check my sorting</button></div>
      <p class="calc-fb ${api.answered(['e1']) ? 'ok' : ''}" id="board-fb" aria-live="polite">${api.answered(['e1']) ? 'Correct. Two causes, and the sharks and the temperature are ruled out.' : ''}</p></div>
      <div class="stage-tasks">${api.answered(['e1']) ? api.question(q) : ''}${api.answered(['e1', 'e2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Plan the reef rescue</button></div>' : ''}</div>`;
    el.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { st.pick = st.pick === b.dataset.ev ? null : b.dataset.ev; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-col]').forEach(c => c.addEventListener('click', e => { if (e.target.closest('[data-back]') || !st.pick) return; st.place[st.pick] = c.dataset.col; st.pick = null; st.wrong = null; api.save(); api.rerender(); }));
    el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { if (api.answered(['e1'])) return; delete st.place[b.dataset.back]; st.wrong = null; api.save(); api.rerender(); }));
    const cb = el.querySelector('#check-board');
    if (cb) cb.addEventListener('click', () => {
      const wrong = CARDS.filter(c => st.place[c.id] !== c.col).map(c => c.id), n = api.tries('e1');
      if (!wrong.length) { api.award('e1', n === 1); api.stepDone('sort'); api.rerender(); }
      else { st.wrong = wrong; api.save(); api.rerender(); const fb = el.querySelector('#board-fb'); fb.className = 'calc-fb no'; fb.textContent = `${wrong.length} card${wrong.length > 1 ? 's are' : ' is'} in the wrong column (marked in red).`; }
    });
    api.bindQuestions([q], () => { api.stepDone('control'); api.complete('evidence'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('plan'));
  }

  // ---------- stage 6: reef rescue plan ----------
  const SERIES = [['coral', 'Coral cover (%)', 100, 24], ['algae', 'Algae cover (%)', 100, 56], ['parrot', 'Parrotfish (index)', 100, 25], ['kg', 'Catch (kg per boat per day)', 40, 12]];
  function mini([key, title, max, start], rows, upto, goal) {
    const W = 300, H = 140, L = 32, R = 12, T = 24, B = 22, X = y => L + (y / 10) * (W - L - R), Y = v => H - B - (Math.min(v, max) / max) * (H - B - T);
    const pts = [[0, start], ...rows.slice(0, upto).map(r => [r.y, r[key]])], last = pts[pts.length - 1];
    const path = pts.map(([x, v], i) => `${i ? 'L' : 'M'}${X(x)},${Y(v)}`).join(' ');
    return `<figure class="mini"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
      <text x="${L}" y="14" class="ax-t">${title}</text>
      ${[0, max / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 5}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('')}
      ${goal != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="#2C7A4B" stroke-dasharray="5 4"/><text x="${L + 4}" y="${Y(goal) - 4}" class="ax">goal ${goal}</text>` : ''}
      <path d="${path} L${X(last[0])},${Y(0)} L${X(0)},${Y(0)} Z" class="st-area"/><path d="${path}" class="st-line"/>
      <circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" class="pt"/><text x="${Math.min(X(last[0]) + 6, W - 40)}" y="${Y(last[1]) - 7}" class="ax-v">${last[1]}</text>
      ${[0, 5, 10].map(y => `<text x="${X(y)}" y="${H - 5}" class="ax" text-anchor="${y === 0 ? 'start' : y === 10 ? 'end' : 'middle'}">${y ? 'Year ' + y : 'Now'}</text>`).join('')}
    </svg></figure>`;
  }
  function renderPlan(api, el) {
    const S = api.S, d = S.data.plan = S.data.plan || { boats: 8, reserve: 0, ban: false, fert: 'chemical', trees: false, runs: 0 };
    const rows = rescue(d), last = rows[9], shown = d.shown || 0;
    const ok = last.coral >= 50 && last.kg >= 20;
    const radio = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<label class="${String(val) === String(v) ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${String(val) === String(v) ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
    const q = { id: 'p2', text: 'How can a marine reserve, where nobody may fish, end up giving the fishers a bigger catch?', options: ['Fish grow and breed inside it, then swim out into the fishing areas', 'Fishers catch more by fishing inside it', 'It does not: reserves always reduce the catch'], correct: 0, explain: 'This is called spillover. It takes a few years, so patience pays.' };
    el.innerHTML = `<div class="stage-tasks"><p data-read>${api.gloss('Plan the reef rescue for the next 10 years. The goal: at least 50% coral cover and at least 20 kg of fish per boat per day in year 10. Fishing is how families earn a living, so every boat you remove costs jobs.')}</p></div>
      <div class="lab-grid">
        <div class="scene"><div class="chart-frame"><div class="minis">${SERIES.map(sr => mini(sr, rows, shown, sr[0] === 'coral' ? 50 : sr[0] === 'kg' ? 20 : null)).join('')}</div></div></div>
        <div class="scene-side">
          <div class="ctl"><label for="boats"><span>Fishing boats</span><output class="mono" id="boats-out">${d.boats} boats · ${d.boats * 2} fishers' jobs</output></label><input type="range" id="boats" min="2" max="10" value="${d.boats}"></div>
          <span class="field-l">Marine reserve (no fishing)</span>${radio('reserve', [[0, 'None'], [0.3, '30% of the reef'], [0.5, 'Half the reef']], d.reserve)}
          <label class="toggle"><input type="checkbox" id="ban" ${d.ban ? 'checked' : ''}><span><strong>Ban catching parrotfish</strong><small>Protects the grazers, but the fishers lose that part of their catch.</small></span></label>
          <span class="field-l">Farm fertiliser</span>${radio('fert', [['chemical', 'Chemical'], ['compost', 'Switch to compost']], d.fert)}
          <label class="toggle"><input type="checkbox" id="trees" ${d.trees ? 'checked' : ''}><span><strong>Plant trees along the river</strong><small>Roots and leaves catch runoff before it reaches the sea.</small></span></label>
          <div class="actions"><button type="button" class="btn primary" id="run">Run 10 years</button></div>
          ${shown === 10 ? `<div class="gauges"><div class="${last.coral >= 50 ? '' : 'bad'}"><span>Coral in year 10</span><b class="mono">${last.coral}%</b></div><div class="${last.kg >= 20 ? '' : 'bad'}"><span>Catch in year 10</span><b class="mono">${last.kg} kg/day</b></div><div><span>Fishers' jobs</span><b class="mono">${d.boats * 2}</b></div><div class="${ok ? '' : 'warn'}"><span>Verdict</span><b>${ok ? 'Reef and fishers saved!' : 'Not there yet'}</b></div></div>` : ''}
        </div></div>
      <div class="stage-tasks">${api.answered(['p1']) ? api.question(q) : ''}${api.answered(['p1', 'p2']) ? '<div class="actions"><button type="button" class="btn primary" id="next">Write the case summary</button></div>' : ''}</div>`;
    const b = el.querySelector('#boats');
    b.addEventListener('input', () => { el.querySelector('#boats-out').textContent = `${b.value} boats · ${b.value * 2} fishers' jobs`; });
    b.addEventListener('change', () => { d.boats = Number(b.value); d.shown = 0; api.save(); api.rerender(); });
    el.querySelectorAll('input[name=reserve]').forEach(r => r.addEventListener('change', () => { d.reserve = Number(r.value); d.shown = 0; api.save(); api.rerender(); }));
    el.querySelectorAll('input[name=fert]').forEach(r => r.addEventListener('change', () => { d.fert = r.value; d.shown = 0; api.save(); api.rerender(); }));
    ['ban', 'trees'].forEach(id => el.querySelector('#' + id).addEventListener('change', e => { d[id] = e.target.checked; d.shown = 0; api.save(); api.rerender(); }));
    el.querySelector('#run').addEventListener('click', () => {
      el.querySelector('#run').disabled = true; d.runs += 1; d.shown = 0;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const step = () => { d.shown = reduce ? 10 : d.shown + 1; el.querySelector('.minis').innerHTML = SERIES.map(sr => mini(sr, rows, d.shown, sr[0] === 'coral' ? 50 : sr[0] === 'kg' ? 20 : null)).join(''); if (d.shown < 10) setTimeout(step, 260); else { if (ok) { api.award('p1', d.runs <= 2); api.stepDone('plan'); } api.save(); api.rerender(); } };
      step();
    });
    api.bindQuestions([q], () => { api.stepDone('spill'); api.complete('plan'); });
    const nx = el.querySelector('#next'); if (nx) nx.addEventListener('click', () => api.go('summary'));
  }

  // ---------- stage 7: summary ----------
  const RECS = [['Create a marine reserve where nobody fishes', true], ['Protect parrotfish and other grazers', true], ['Switch the farms from chemical fertiliser to compost', true], ['Plant trees along the river to catch runoff', true], ['Hunt the sharks', false], ['Catch as many fish as possible now, before they are gone', false]];
  function renderSummary(api, el) {
    const S = api.S, chosen = S.data.recs || [], ok = api.answered(['s2']), d = S.data.plan || {};
    const right = RECS.map((r, i) => (r[1] ? i : -1)).filter(i => i >= 0);
    const total = Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), max = CASE.stages.reduce((a, s) => a + (s.points || 0), 0);
    const report = () => ['OPERATION ISLAND 2040 · CASE FILE #3: WHERE DID THE FISH GO?', '', 'THE PROBLEM', 'The fishers\' catch fell from 30 kg to 12 kg per boat per day, and the reef near the village turned grey and green.', '',
      'EVIDENCE', '- Quadrats: Site A 60% coral, 12% algae; Site B 24% coral, 56% algae; Site C 20% coral, 60% algae.', '- Parrotfish: Site A 9, Site B 2, Site C 6. Nitrate: Site A 0, Site B 1, Site C 10 mg/L.', '- Grazer tank: without parrotfish, algae spread; with fertiliser too, it covered almost everything.', '',
      'CONCLUSION', 'A trophic cascade with two causes: too many parrotfish were caught, and fertiliser runoff fed the algae. The algae smothered the coral, and a weaker reef supports fewer fish. Sharks and water temperature were ruled out.', '',
      'RESCUE PLAN', `${d.boats || '—'} boats; ${d.reserve ? Math.round(d.reserve * 100) + '% marine reserve' : 'no reserve'}; ${d.ban ? 'parrotfish ban; ' : ''}${d.fert === 'compost' ? 'compost instead of chemical fertiliser; ' : ''}${d.trees ? 'trees along the river' : ''}`, '',
      'RECOMMENDATIONS', ...((S.data.recs || []).map(i => '- ' + RECS[i][0])), '', 'MESSAGE TO THE FISHERS', (S.data.message || '').trim() || '—'].join('\n');
    el.innerHTML = `<div class="report">
      <div class="report-head"><span class="stamp ${ok ? 'closed' : ''}">${ok ? 'Case closed' : 'Draft'}</span><div><p class="eyebrow">Biologist's report</p><h2>Where Did the Fish Go?</h2></div></div>
      <div class="report-grid">
        <section><h3>The problem</h3><p>The catch fell from 30 to 12 kg a day, and the reef turned grey and green.</p></section>
        <section><h3>The cause</h3><p data-read>${api.gloss('A trophic cascade with two causes. Too many parrotfish were caught, so nothing grazed the algae; and fertiliser runoff fed it. Algae smothered the coral, and the reef could support fewer fish.')}</p></section>
        <section><h3>The evidence</h3><ul><li>Site A (no pressure): 60% coral, 9 parrotfish.</li><li>Site B (fishing): 2 parrotfish, 56% algae.</li><li>Site C (farms): 10 mg/L nitrate, 60% algae.</li><li>Sharks rare, water temperature normal.</li></ul></section>
        <section><h3>The rescue plan</h3><p>${d.boats || '—'} boats · ${d.reserve ? Math.round(d.reserve * 100) + '% reserve' : 'no reserve'}${d.ban ? ' · parrotfish ban' : ''}${d.fert === 'compost' ? ' · compost' : ''}${d.trees ? ' · river trees' : ''}</p></section>
      </div>
      <h3>Recommendations</h3>
      <div class="cq-options">${RECS.map((r, i) => `<label class="${chosen.includes(i) ? 'on' : ''}"><input type="checkbox" data-rec="${i}" ${chosen.includes(i) ? 'checked' : ''} ${ok ? 'disabled' : ''}> ${esc(r[0])}</label>`).join('')}</div>
      ${ok ? '<p class="calc-fb ok">These four actions tackle both causes and help the fish come back.</p>' : '<div class="actions"><button type="button" class="btn" id="check-recs">Check recommendations</button></div><p class="calc-fb" id="recs-fb" aria-live="polite"></p>'}
      <label class="field"><span>Message to the fishers: explain why the fish disappeared and what will bring them back</span><textarea id="message" rows="4">${esc(S.data.message || '')}</textarea></label>
      ${ok ? `<div class="final"><span class="mono big">${total} / ${max}</span><span>Final score. Well done, Biologist!</span></div>` : ''}
      <div class="actions"><button type="button" class="btn ghost" id="copy-report">Copy the report</button>${ok ? '<a class="btn primary" href="#cases">Back to Case Files</a>' : ''}</div>
      <p class="muted" id="copy-status" aria-live="polite"></p><textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea></div>`;
    el.querySelectorAll('[data-rec]').forEach(c => c.addEventListener('change', () => { const i = Number(c.dataset.rec); S.data.recs = c.checked ? chosen.concat(i) : chosen.filter(x => x !== i); api.save(); api.rerender(); }));
    el.querySelector('#message').addEventListener('input', e => { S.data.message = e.target.value; api.save(); });
    const cr = el.querySelector('#check-recs');
    if (cr) cr.addEventListener('click', () => {
      const n = api.tries('s2');
      if ((S.data.recs || []).slice().sort().join(',') === right.join(',')) { api.award('s2', n === 1); api.stepDone('recs'); api.complete('summary'); OI.store.get().log.case3 = { score: Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0), at: new Date().toISOString() }; api.save(); api.rerender(); }
      else { const fb = el.querySelector('#recs-fb'); fb.className = 'calc-fb no'; fb.textContent = 'Not quite. Which actions deal with both causes? Is anything harmful or missing?'; }
    });
    el.querySelector('#copy-report').addEventListener('click', () => {
      const txt = report(), status = el.querySelector('#copy-status'), ta = el.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied.'; }, fallback); } catch (e) { fallback(); }
    });
  }

  const CASE = {
    id: 'reef', number: 3, title: 'Where Did the Fish Go?', glossary: GLOSSARY, handbook: HANDBOOK,
    stages: [
      { id: 'intro', title: 'Introduction', color: '#E8613C', points: 2, steps: [{ id: 'briefing', title: 'The fishers\' message' }], render: renderIntro,
        coach: [{ sel: '#case-stage .term', text: 'Orange words are in the glossary. Tap one.' }, { sel: '.case-chart', text: 'Look at how the catch has changed over two years.' }, { sel: '.cq', text: 'Answer the question to start.' }] },
      { id: 'survey', title: 'Reef survey', color: '#F0A33A', points: 2, steps: [{ id: 'count', title: 'Count at three sites' }], render: renderSurvey,
        coach: [{ sel: '.quadrat', text: 'Count the coral and algae squares in the quadrat.' }, { sel: '#next-test', text: 'Tap Next count to move through all the counts.' }] },
      { id: 'lab', title: 'Reef lab', color: '#D9B92E', points: 6, steps: [{ id: 'tests', title: 'Nitrate and grazer tank' }], render: renderLab,
        coach: [{ sel: '#tool-nitrate', text: 'Two experiments: a nitrate test and a grazer tank.' }, { sel: '#next-test', text: 'Next test takes you through all seven.' }] },
      { id: 'web', title: 'Food web', color: '#8CC152', points: 6, steps: [{ id: 'build', title: 'Build the food web' }, { id: 'hypothesis', title: 'Choose a hypothesis' }], render: renderWeb,
        coach: [{ sel: '[data-node="algae"]', text: 'Tap the food first (algae)…' }, { sel: '[data-node="parrot"]', text: '…then the animal that eats it (parrotfish).' }] },
      { id: 'evidence', title: 'Test the evidence', color: '#3FB6A8', points: 4, steps: [{ id: 'sort', title: 'Sort the evidence' }, { id: 'control', title: 'Site A' }], render: renderEvidence,
        coach: [{ sel: '.ev-card', text: 'Tap a card, then the column it belongs in.' }] },
      { id: 'plan', title: 'Reef rescue', color: '#4FA3E0', points: 4, steps: [{ id: 'plan', title: 'Plan 10 years' }, { id: 'spill', title: 'Spillover' }], render: renderPlan,
        coach: [{ sel: '.scene-side', text: 'Choose your rescue plan. Remember the fishers\' jobs.' }, { sel: '#run', text: 'Run 10 years and watch the reef.' }] },
      { id: 'summary', title: 'Case summary', color: '#9B8BE0', points: 2, steps: [{ id: 'recs', title: 'Recommendations' }], render: renderSummary,
        coach: [{ sel: '[data-rec="0"]', text: 'Choose the actions that will bring the fish back.' }] }
    ]
  };
  OI.cases = OI.cases || {};
  OI.cases.reef = { def: CASE, rescue, tank, mount(el) { this.inst = OI.caseKit.mount(el, CASE); }, unmount() { if (this.inst) this.inst.unmount(); } };
})();
