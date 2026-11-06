/* Mission 1 — Explore the Island.
 * Briefing → Aerial survey → Ground expedition → Choose a base → Storm test → Debrief
 */
(function () {
  const W = OI.world, S = OI.storm;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const PHASES = [
    { id: 'briefing', label: 'Briefing' },
    { id: 'packing', label: 'Setting sail' },
    { id: 'aerial', label: 'Aerial survey' },
    { id: 'expedition', label: 'Ground expedition' },
    { id: 'base', label: 'Choose a base' },
    { id: 'storm', label: 'Storm test' },
    { id: 'debrief', label: 'Debrief' }
  ];
  const NEED_LABELS = { water: 'Water', food: 'Food', materials: 'Materials', access: 'Access', safety: 'Safety', environment: 'Environment' };
  // The three pillars of sustainability from the course: which need belongs where.
  const PILLARS = [
    { name: 'Environment', needs: ['water', 'food', 'environment'] },
    { name: 'Society', needs: ['safety', 'access'] },
    { name: 'Economy', needs: ['materials'] }
  ];
  const CAT_LABELS = { water: 'Water', food: 'Food', material: 'Materials', shelter: 'Shelter', danger: 'Dangers', clue: 'Evidence', wildlife: 'Wildlife', access: 'Access' };
  const REASONS = ['Close to fresh water', 'High ground', 'Near the landing beach', 'Flat land for building', 'Sheltered from wind', 'Near food', 'Beautiful view'];

  let root, map, stormTimer = null, stormT = null, selected = null, message = null;
  const st = () => OI.store.get();
  const ex = () => st().exploration;
  const save = () => OI.store.save();

  // ---------- time ----------
  const has = id => (ex().packed || []).includes(id);
  const totalHours = () => st().settings.hours + (has('rations') ? 2 : 0) + (has('torches') ? 2 : 0);
  const hoursLeft = () => Math.max(0, totalHours() - ex().hoursUsed);
  function clock(h) { const day = Math.floor(h / 8) + 1; const hh = 8 + (h % 8); return `Day ${day} · ${String(hh).padStart(2, '0')}:00`; }

  function radioCheck() {
    if (!has('radio')) return;
    const e = ex(), T = totalHours(), msgs = [
      { id: 'welcome', at: 0, from: 'GHA Base', text: `Welcome ashore, team. You have ${T} hours of daylight for the ground survey. Each survey takes one hour, so choose which expert to send where.` },
      { id: 'forming', at: Math.round(T * 0.4), from: 'GHA Weather Desk', text: 'Satellite images show a tropical storm forming 600 km to the east. It is moving west, toward the island.' },
      { id: 'warning', at: Math.round(T * 0.75), from: 'GHA Weather Desk', text: 'Storm warning: winds up to 130 km/h and 260 mm of rain expected tomorrow. Decide where your base will be before dark.' },
      { id: 'dark', at: T, from: 'GHA Base', text: 'Daylight is gone. Gather your evidence and choose a base site.' }
    ];
    msgs.forEach(m => { if (e.hoursUsed >= m.at && !e.radio.find(x => x.id === m.id)) e.radio.push({ id: m.id, from: m.from, text: m.text, h: Math.min(e.hoursUsed, T) }); });
  }

  // ---------- exploration rules ----------
  function scoutable() {
    const e = ex(), out = new Set();
    Object.keys(e.scouted).forEach(k => {
      const [r, c] = k.split(',').map(Number);
      W.neighbours(r, c).forEach(n => { const nk = W.key(n.r, n.c); if (W.isLand(n.r, n.c) && !e.scouted[nk]) out.add(nk); });
    });
    return out;
  }
  const canBuild = (r, c) => W.isLand(r, c) && !'wlV'.includes(W.code(r, c));
  function selectable() { return Object.keys(ex().scouted).filter(k => { const [r, c] = k.split(',').map(Number); return canBuild(r, c); }); }

  function survey(r, c, role) {
    const e = ex(), k = W.key(r, c);
    e.scouted[k] = e.scouted[k] || [];
    e.scouted[k].push(role);
    const found = [];
    W.featuresAt(r, c).forEach(f => { if (W.canSee(f, role) && !e.discovered.includes(f.id)) { e.discovered.push(f.id); found.push(f.id); } });
    e.journal.push({ r, c, role, h: e.hoursUsed, found });
    e.hoursUsed += 1;
    radioCheck();
    save();
    return e.journal[e.journal.length - 1];
  }

  function expertNote(f, role) {
    const n = f.expert && f.expert[role];
    if (n && role === 'hydrologist' && f.cat === 'water' && !has('testkit')) return 'It looks clear, but without a water test kit we cannot tell whether it is safe to drink.';
    return n;
  }

  function report(r, c, role) {
    const t = W.terrain(r, c), e = ex();
    const lines = [], measures = [];
    if (role === 'geologist') {
      measures.push(['Height above sea level', `${W.elev(r, c)} m`]);
      if (W.riverHeight(r, c) != null) measures.push(['Height above the river', `${W.riverHeight(r, c)} m`]);
      measures.push(['Ground', t.ground]);
    }
    if (role === 'meteorologist') {
      const wf = S.windFactor(r, c);
      measures.push(['Wind exposure', `${Math.round(wf.factor * 100)}% of open-sea wind`]);
      measures.push(['Shelter from the east', wf.shelter === 'hill' ? 'Higher hills' : wf.shelter === 'forest' ? 'Trees' : 'None']);
    }
    if (role === 'engineer') measures.push(['Building ground', t.build]);
    const here = W.featuresAt(r, c);
    const seen = here.filter(f => W.canSee(f, role) && !f.hidden);
    const water = here.filter(f => f.cat === 'water' && W.canSee(f, role));
    if (role === 'hydrologist') measures.push(['Drinking water here', !water.length ? 'None' : !has('testkit') ? 'Untested: no test kit' : water.map(f => f.water === 'safe' ? 'Safe' : f.water === 'treat' ? 'Needs treatment' : 'Unsafe').join(', ')]);
    const unseen = here.filter(f => !W.canSee(f, role) && !e.discovered.includes(f.id));
    const hintRoles = [...new Set(unseen.flatMap(f => f.roles === 'any' ? [] : f.roles.filter(x => x !== 'any')))];
    return {
      title: `${t.name} · Grid ${W.grid(r, c)}`,
      general: t.general,
      expert: role !== 'any' ? t[role] : null,
      waterNote: role === 'hydrologist' ? water.map(f => expertNote(f, 'hydrologist')).filter(Boolean) : [],
      measures,
      features: seen.map(f => ({ f, note: expertNote(f, role) })),
      hint: hintRoles.length ? `A ${hintRoles.map(x => W.role(x).name).join(' or ')} might notice something more here.` : null
    };
  }

  // ---------- rendering helpers ----------
  function stepper() {
    const idx = PHASES.findIndex(p => p.id === ex().phase);
    return `<ol class="stepper" aria-label="Mission stages">${PHASES.map((p, i) =>
      `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-l">${p.label}</span></li>`).join('')}</ol>`;
  }
  function header() {
    return `<header class="mission-head"><div><p class="eyebrow">Mission 1 · Operation Island 2040</p><h1 class="display">Explore the Island</h1></div>${stepper()}</header>`;
  }
  function pips(n) { return `<span class="pips" aria-label="${n} out of 3">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`; }
  function memberName(roleId) { const n = (st().team.members || {})[roleId]; return n ? esc(n) : ''; }
  function roleTag(roleId) {
    if (roleId === 'any') return '<span class="role-tag">Whole team</span>';
    const R = W.role(roleId);
    return `<span class="role-tag" style="--role:${R.color}">${R.icon} ${R.name}${memberName(roleId) ? ' · ' + memberName(roleId) : ''}</span>`;
  }

  function reportHTML(rep, roleId, h) {
    return `<article class="report">
      <div class="report-meta">${roleTag(roleId)}${h != null ? `<span class="mono">${clock(h)}</span>` : ''}</div>
      <h3>${esc(rep.title)}</h3>
      <p>${esc(rep.general)}</p>
      ${rep.expert ? `<p class="expert-say">${esc(rep.expert)}</p>` : ''}
      ${rep.measures.length ? `<dl class="measures">${rep.measures.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${rep.features.length ? `<ul class="finds">${rep.features.map(({ f, note }) => `<li><span class="find-icon" aria-hidden="true">${f.icon}</span><div><strong>${esc(f.name)}</strong> <span class="cat cat-${f.cat}">${CAT_LABELS[f.cat]}</span><br>${esc(f.text)}${note ? `<br><em>${esc(note)}</em>` : ''}</div></li>`).join('')}</ul>` : ''}
      ${rep.waterNote.length ? rep.waterNote.filter(n => !rep.features.some(x => x.note === n)).map(n => `<p class="expert-say">${esc(n)}</p>`).join('') : ''}
      ${rep.hint ? `<p class="hint">${esc(rep.hint)}</p>` : ''}
    </article>`;
  }

  function readout(t) {
    const el = root.querySelector('#readout');
    if (!el) return;
    if (!t) { el.textContent = 'Hover over or tap the map. Keyboard: focus the map, then use the arrow keys and Enter.'; return; }
    const known = ex().scouted[W.key(t.r, t.c)];
    const ter = W.terrain(t.r, t.c);
    el.innerHTML = `<span class="mono">Grid ${W.grid(t.r, t.c)}</span> · ${esc(ter.name)}${W.isLand(t.r, t.c) && ex().phase !== 'aerial' ? ` · ${known ? 'Surveyed' : 'Not yet surveyed'}` : ''}`;
  }

  function mapView() {
    const e = ex(), ph = e.phase;
    return {
      mode: ph === 'aerial' ? 'aerial' : ph === 'expedition' ? 'expedition' : ph === 'base' ? 'base' : 'overview-fog',
      scouted: e.scouted, discovered: e.discovered,
      scoutable: ph === 'expedition' && hoursLeft() > 0 ? scoutable() : null,
      selectable: ph === 'base' ? selectable() : null,
      pin: ph === 'aerial' || ph === 'debrief' ? e.firstPin : null,
      base: ph === 'base' ? selected : (ph === 'storm' || ph === 'debrief') ? e.base : null,
      stormT
    };
  }

  function workspace(panel) {
    return `<div class="workspace">
      <div class="map-col">
        <div class="map-frame"><canvas id="map" tabindex="0" aria-label="Map of the island. Use the arrow keys to move and Enter to choose a square."></canvas></div>
        <p class="readout" id="readout" aria-live="polite"></p>
      </div>
      <aside class="panel" id="panel">${panel}</aside>
    </div>`;
  }

  function mountMap(onPick) {
    if (map) map.destroy();
    map = OI.createMap(root.querySelector('#map'), { getView: mapView, onPick, onHover: readout });
    readout(null);
  }

  // ---------- phases ----------
  function render() {
    stopStorm();
    const ph = ex().phase;
    if (ph === 'briefing') return renderBriefing();
    if (ph === 'packing') return renderPacking();
    if (ph === 'aerial') return renderAerial();
    if (ph === 'expedition') return renderExpedition();
    if (ph === 'base') return renderBase();
    if (ph === 'storm') return renderStorm();
    if (ph === 'debrief') return renderDebrief();
  }
  function go(phase) { ex().phase = phase; save(); message = null; render(); window.scrollTo({ top: 0 }); }

  function renderBriefing() {
    if (map) { map.destroy(); map = null; }
    const s = st();
    root.innerHTML = `${header()}
    <div class="briefing">
      <article class="letter">
        <p class="letter-from mono">FROM: Global Humanitarian Alliance (GHA)<br>TO: Expedition Team<br>RE: Operation Island 2040</p>
        <h2>Mission briefing</h2>
        <p>Natural disasters are happening more often because of climate change. A new island has been found in the Pacific Ocean. It might be the right place to help people who have lost their homes.</p>
        <p>You are a special team of experts: scientists, engineers, tech minds and problem-solvers. The GHA has chosen <strong>you</strong> to go first.</p>
        <p><strong>Your task:</strong> explore the island, find water, food and safe places to live, watch out for dangers, and recommend where the first base should be built. Use evidence, not guesses. Future residents will depend on your decision.</p>
        <p class="sig">Good luck, experts. Be careful and use your skills to explore safely.</p>
      </article>
      <form class="setup" id="setup">
        <h2>Your expedition team</h2>
        <label class="field"><span>Team name</span><input id="team-name" maxlength="40" value="${esc(s.team.name)}" placeholder="e.g. The Curious Bunch"></label>
        <fieldset class="roles"><legend>Who plays each expert? <span class="muted">(optional)</span></legend>
          ${W.ROLES.map(R => `<label class="role-row" style="--role:${R.color}"><span class="role-badge" aria-hidden="true">${R.icon}</span><span class="role-txt"><strong>${R.name}</strong><small>${R.focus}</small></span><input id="m-${R.id}" maxlength="30" value="${esc(s.team.members[R.id] || '')}" placeholder="Name" aria-label="${R.name}'s name"></label>`).join('')}
        </fieldset>
        <label class="field"><span>Expedition length</span>
          <select id="hours">${[[12, 'Short: 12 survey hours (about 30 min)'], [20, 'Standard: 20 survey hours (about 45 min)'], [30, 'Long: 30 survey hours (about 60 min)']]
            .map(([v, l]) => `<option value="${v}" ${s.settings.hours === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <button class="btn primary" type="submit">Board the helicopter</button>
      </form>
    </div>`;
    root.querySelector('#setup').addEventListener('submit', ev => {
      ev.preventDefault();
      s.team.name = root.querySelector('#team-name').value.trim();
      W.ROLES.forEach(R => { s.team.members[R.id] = root.querySelector('#m-' + R.id).value.trim(); });
      if (ex().hoursUsed === 0) s.settings.hours = Number(root.querySelector('#hours').value);
      go('packing');
    });
  }

  // ----- setting sail: pack the helicopter -----
  function packingPanel() {
    const e = ex(), picked = e.packed || [];
    const kg = picked.reduce((a, id) => a + W.KIT.find(k => k.id === id).kg, 0);
    const over = kg > W.KIT_LIMIT;
    const covered = new Set(picked.map(id => W.KIT.find(k => k.id === id).need));
    const locked = e.hoursUsed > 0;
    return `
      <div class="pack-head">
        <div><h2>Setting sail: what will you take?</h2>
        <p>The helicopter can carry <strong>${W.KIT_LIMIT} kg</strong> of team equipment. Make a list of what you think is essential for survival, then pack it. Some choices will matter on the island.</p></div>
        <div class="load ${over ? 'over' : ''}" role="meter" aria-valuemin="0" aria-valuemax="${W.KIT_LIMIT}" aria-valuenow="${kg}" aria-label="Weight packed">
          <span class="mono big">${kg} / ${W.KIT_LIMIT} kg</span><div class="meter"><i style="width:${Math.min(100, (kg / W.KIT_LIMIT) * 100)}%"></i></div>
          <span class="muted">${over ? `Too heavy by ${kg - W.KIT_LIMIT} kg. Take something out.` : `${W.KIT_LIMIT - kg} kg left`}</span>
        </div>
      </div>
      ${locked ? '<p class="note">The expedition has started, so the kit can no longer change.</p>' : ''}
      <ul class="kit">${W.KIT.map(k => `<li><label class="kit-item ${picked.includes(k.id) ? 'on' : ''}">
        <input type="checkbox" data-kit="${k.id}" ${picked.includes(k.id) ? 'checked' : ''} ${locked ? 'disabled' : ''}>
        <span class="kit-name">${esc(k.name)}</span><span class="mono kit-kg">${k.kg} kg</span>
        <span class="kit-need">${k.need}</span></label></li>`).join('')}</ul>
      <div class="needs-check"><h3>Basic needs covered</h3>
        <ul>${W.NEEDS.map(n => `<li class="${covered.has(n) ? 'yes' : ''}">${covered.has(n) ? '✔' : '○'} ${n}</li>`).join('')}</ul>
        <p class="muted">Talk about it: do all people have the same needs? Which needs can the island meet, and which must you bring?</p></div>
      <div class="actions"><button class="btn ghost" id="back-brief">Back to briefing</button>
        <button class="btn primary" id="sail" ${over || !picked.length ? 'disabled' : ''}>Load the helicopter</button></div>`;
  }
  function renderPacking() {
    if (map) { map.destroy(); map = null; }
    root.innerHTML = header() + `<div class="packing">${packingPanel()}</div>`;
    bindPacking();
  }
  function bindPacking() {
    const e = ex();
    root.querySelectorAll('[data-kit]').forEach(cb => cb.addEventListener('change', () => {
      const list = (e.packed || []).filter(id => id !== cb.dataset.kit);
      if (cb.checked) list.push(cb.dataset.kit);
      e.packed = W.KIT.map(k => k.id).filter(id => list.includes(id)); save();
      const y = window.scrollY;
      root.querySelector('.packing').innerHTML = packingPanel(); bindPacking();
      window.scrollTo({ top: y });
      const again = root.querySelector(`[data-kit="${cb.dataset.kit}"]`); if (again) again.focus();
    }));
    root.querySelector('#back-brief').addEventListener('click', () => go('briefing'));
    root.querySelector('#sail').addEventListener('click', () => go('aerial'));
  }

  function renderAerial() {
    const e = ex();
    root.innerHTML = header() + workspace(`
      <h2>Meeting time: the aerial shot</h2>
      <p>We sent a helicopter to survey the island and take an aerial shot. From the air you can see the shape of the land, but not what is on it.</p>
      <p><strong>Have a meeting: which seems to be the best place to settle, and why?</strong></p>
      <ul class="prompts">
        <li>Where do you think there is fresh water?</li>
        <li>Where is the high ground? Where is it low and flat?</li>
        <li>What could be dangerous?</li>
      </ul>
      <h3>First impressions</h3>
      <p>Tap the map where you would build the base, based on this view only. You will compare it with your final choice later.</p>
      <p class="pin-status" id="pin-status">${e.firstPin ? `Pin placed at <span class="mono">Grid ${W.grid(e.firstPin.r, e.firstPin.c)}</span>.` : 'No pin placed yet.'}</p>
      <fieldset class="checks"><legend>Why there?</legend>${REASONS.map((x, i) => `<label><input type="checkbox" id="why-${i}" ${e.firstReasons.includes(x) ? 'checked' : ''}> ${x}</label>`).join('')}</fieldset>
      <div class="actions"><button class="btn ghost" id="back">Back to packing</button><button class="btn primary" id="land" ${e.firstPin ? '' : 'disabled'}>Land and start the expedition</button></div>
    `);
    mountMap(t => {
      if (!canBuild(t.r, t.c)) { root.querySelector('#pin-status').textContent = 'Choose a land square (not sea, river or crater).'; return; }
      e.firstPin = t; save(); map.draw();
      root.querySelector('#pin-status').innerHTML = `Pin placed at <span class="mono">Grid ${W.grid(t.r, t.c)}</span>.`;
      root.querySelector('#land').disabled = false;
    });
    REASONS.forEach((x, i) => root.querySelector('#why-' + i).addEventListener('change', ev => {
      e.firstReasons = e.firstReasons.filter(y => y !== x); if (ev.target.checked) e.firstReasons.push(x); save();
    }));
    root.querySelector('#back').addEventListener('click', () => go('packing'));
    root.querySelector('#land').addEventListener('click', () => { radioCheck(); save(); go('expedition'); });
  }

  function expeditionPanel() {
    const e = ex(), left = hoursLeft(), T = totalHours();
    const last = e.journal[e.journal.length - 1];
    let main;
    if (message) main = message;
    else if (last) main = reportHTML(report(last.r, last.c, last.role), last.role, last.h);
    else main = '<p class="muted">Choose an expert, then tap a square with a dashed yellow border next to the landing place.</p>';
    const latestRadio = e.radio[e.radio.length - 1];
    const counts = {};
    e.discovered.forEach(id => { const f = W.feature(id); if (f && !f.hidden) counts[f.cat] = (counts[f.cat] || 0) + 1; });
    return `
      <div class="clock"><div><span class="mono big">${clock(Math.min(e.hoursUsed, T))}</span><span class="muted">${left} survey hour${left === 1 ? '' : 's'} left</span></div>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${T}" aria-valuenow="${left}" aria-label="Survey hours left"><i style="width:${(left / T) * 100}%"></i></div></div>
      ${latestRadio ? `<div class="radio" role="status"><span class="mono">RADIO · ${esc(latestRadio.from)}</span><p>${esc(latestRadio.text)}</p></div>` : !has('radio') ? '<p class="note">No radio packed: the team cannot hear from GHA Base.</p>' : ''}
      <fieldset class="lead"><legend>Who leads the next survey?</legend>
        ${W.ROLES.map(R => `<button type="button" class="lead-btn" data-role="${R.id}" aria-pressed="${e.lead === R.id}" style="--role:${R.color}"><span aria-hidden="true">${R.icon}</span> ${R.name}${memberName(R.id) ? `<small>${memberName(R.id)}</small>` : ''}</button>`).join('')}
      </fieldset>
      <div class="latest" aria-live="polite">${main}</div>
      <div class="tally">${Object.keys(CAT_LABELS).filter(k => counts[k]).map(k => `<span class="cat cat-${k}">${CAT_LABELS[k]} ${counts[k]}</span>`).join('')}</div>
      <details class="journal"><summary>Field journal (${e.journal.length} entr${e.journal.length === 1 ? 'y' : 'ies'})</summary>
        ${e.journal.slice().reverse().map(j => reportHTML(report(j.r, j.c, j.role), j.role, j.h)).join('') || '<p class="muted">No surveys yet.</p>'}
      </details>
      <div class="actions"><button class="btn ${left ? 'ghost' : 'primary'}" id="to-base">${left ? 'Finish early and choose a base' : 'Choose a base site'}</button></div>`;
  }

  function renderExpedition() {
    root.innerHTML = header() + workspace(expeditionPanel());
    mountMap(pickExpedition);
    bindExpedition();
  }
  function refreshExpedition() { root.querySelector('#panel').innerHTML = expeditionPanel(); bindExpedition(); map.draw(); }
  function bindExpedition() {
    root.querySelectorAll('.lead-btn').forEach(b => b.addEventListener('click', () => { ex().lead = b.dataset.role; save(); message = null; refreshExpedition(); }));
    root.querySelector('#to-base').addEventListener('click', () => go('base'));
    const again = root.querySelector('#send-again');
    if (again) again.addEventListener('click', () => {
      const r = Number(again.dataset.r), c = Number(again.dataset.c);
      message = null; survey(r, c, ex().lead); refreshExpedition();
    });
  }
  function pickExpedition(t) {
    const e = ex(), k = W.key(t.r, t.c), lead = e.lead;
    if (!W.isLand(t.r, t.c)) { message = '<p class="note">Open water. Your boat stays at the landing place, so the survey continues on foot.</p>'; return refreshExpedition(); }
    const visits = e.scouted[k];
    if (visits) {
      const entries = e.journal.filter(j => j.r === t.r && j.c === t.c);
      const canSend = !visits.includes(lead) && hoursLeft() > 0;
      message = `${entries.length ? entries.slice().reverse().map(j => reportHTML(report(j.r, j.c, j.role), j.role, j.h)).join('') : reportHTML(report(t.r, t.c, 'any'), 'any', null)}
        ${canSend ? `<button class="btn" id="send-again" data-r="${t.r}" data-c="${t.c}">Send the ${W.role(lead).name} here (1 hour)</button>` : visits.includes(lead) ? `<p class="muted">The ${W.role(lead).name} has already surveyed this square.</p>` : ''}`;
      return refreshExpedition();
    }
    if (hoursLeft() <= 0) { message = '<p class="note">No survey hours left. Choose your base site from the squares you know.</p>'; return refreshExpedition(); }
    if (!scoutable().has(k)) { message = `<p class="note">Grid ${W.grid(t.r, t.c)} is too far away. Survey a square next to land you have already explored (dashed yellow border).</p>`; return refreshExpedition(); }
    message = null;
    survey(t.r, t.c, lead);
    refreshExpedition();
  }

  // ----- choose a base + predict -----
  function knownAbout(r, c) {
    const e = ex(), visits = e.scouted[W.key(r, c)] || [];
    const facts = [];
    facts.push(visits.includes('geologist')
      ? ['Height', `${W.elev(r, c)} m above sea level${W.riverHeight(r, c) != null ? `, ${W.riverHeight(r, c)} m above the river` : ''}`]
      : ['Height', 'Unknown: no Geologist surveyed this square']);
    const wf = S.windFactor(r, c);
    facts.push(visits.includes('meteorologist') ? ['Wind exposure', `${Math.round(wf.factor * 100)}% of open-sea wind`] : ['Wind exposure', 'Unknown: no Meteorologist surveyed this square']);
    facts.push(visits.includes('engineer') ? ['Building ground', W.terrain(r, c).build] : ['Building ground', 'Unknown: no Engineer surveyed this square']);
    const near = e.discovered.map(id => W.feature(id)).filter(f => f && W.dist({ r, c }, f) <= 3)
      .sort((a, b) => W.dist({ r, c }, a) - W.dist({ r, c }, b));
    return { facts, near };
  }

  function basePanel() {
    const e = ex();
    if (!selected) {
      return `<h2>Choose a base site</h2>
        <p>The storm arrives tomorrow. Tap a square your team has surveyed. A base cannot go in the river, the lake or the crater.</p>
        <p>Before you decide, look back at your evidence. Which expert reports matter most?</p>
        ${e.attempts.length ? attemptsTable() : ''}
        <div class="actions">${hoursLeft() > 0 ? '<button class="btn ghost" id="back-exp">Back to the expedition</button>' : ''}</div>`;
    }
    const { r, c } = selected;
    const k = knownAbout(r, c);
    const p = e.prediction || {};
    return `<h2>Site: <span class="mono">Grid ${W.grid(r, c)}</span></h2>
      <p class="muted">${esc(W.terrain(r, c).name)}. Tap another square to compare.</p>
      <h3>What your team knows</h3>
      <dl class="measures">${k.facts.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      ${k.near.length ? `<ul class="near">${k.near.map(f => `<li><span aria-hidden="true">${f.icon}</span> ${esc(f.name)} <span class="mono muted">${W.dist({ r, c }, f) === 0 ? 'on site' : W.metres(W.dist({ r, c }, f)) + ' m'}</span></li>`).join('')}</ul>` : '<p class="muted">You have not found anything within 750 m of this square.</p>'}
      <form id="predict" class="predict">
        <h3>Predict before you test</h3>
        <fieldset><legend>Will the base flood in the storm?</legend>
          ${[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => `<label><input type="radio" name="flood" value="${v}" ${p.flood === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <fieldset><legend>How strong will the wind be at the base?</legend>
          ${[['low', 'Under 70 km/h'], ['mid', '70–100 km/h'], ['high', 'Over 100 km/h']].map(([v, l]) => `<label><input type="radio" name="wind" value="${v}" ${p.wind === v ? 'checked' : ''} required> ${l}</label>`).join('')}</fieldset>
        <label class="field"><span>Our reason (use your evidence)</span><textarea id="reason" rows="3" placeholder="We think… because the Geologist found…">${esc(p.reason || '')}</textarea></label>
        <button class="btn primary" type="submit">Run the storm test</button>
      </form>`;
  }
  function renderBase() {
    selected = selected || null;
    root.innerHTML = header() + workspace(basePanel());
    mountMap(t => {
      if (!ex().scouted[W.key(t.r, t.c)]) { root.querySelector('#readout').textContent = `Grid ${W.grid(t.r, t.c)} has not been surveyed. You can only build where your team has been.`; return; }
      if (!canBuild(t.r, t.c)) { root.querySelector('#readout').textContent = 'You cannot build in the river, the lake or the crater.'; return; }
      selected = t; refreshBase();
    });
    bindBase();
  }
  function refreshBase() { root.querySelector('#panel').innerHTML = basePanel(); bindBase(); map.draw(); }
  function bindBase() {
    const b = root.querySelector('#back-exp'); if (b) b.addEventListener('click', () => go('expedition'));
    const f = root.querySelector('#predict');
    if (f) f.addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(f);
      ex().prediction = { flood: fd.get('flood'), wind: fd.get('wind'), reason: root.querySelector('#reason').value.trim() };
      ex().base = selected; ex().pendingTest = true; save(); go('storm');
    });
  }

  // ----- storm -----
  function stopStorm() { if (stormTimer) { cancelAnimationFrame(stormTimer); stormTimer = null; } if (map) map.animate(false); }
  function gauges(t, b) {
    const a = S.assess(b.r, b.c);
    const surge = a.surge.height * S.curve.surge(t);
    const river = S.curve.river(t);
    const wind = Math.round(a.wind * S.curve.wind(t));
    const depth = OI.storm.floodedAt(b.r, b.c, t);
    return `<div class="gauges">
      <div><span>Storm hour</span><b class="mono">${Math.floor(t)} / 24</b></div>
      <div><span>Rainfall so far</span><b class="mono">${Math.round(S.curve.rain(t))} mm</b></div>
      <div><span>River rise</span><b class="mono">${river.toFixed(1)} m</b></div>
      <div><span>Sea surge at base</span><b class="mono">${surge.toFixed(1)} m</b></div>
      <div><span>Wind at base</span><b class="mono">${wind} km/h</b></div>
      <div class="${depth > 0 ? 'bad' : ''}"><span>Water at base</span><b class="mono">${depth > 0 ? depth.toFixed(1) + ' m' : 'Dry'}</b></div>
    </div>`;
  }
  function renderStorm() {
    const e = ex(), b = e.base;
    stormT = 0;
    root.innerHTML = header() + workspace(`<h2>The storm arrives</h2><p>24 hours of tropical storm, from the east. Watch the water and the wind around your base at <span class="mono">Grid ${W.grid(b.r, b.c)}</span>.</p><div id="gauges">${gauges(0, b)}</div><div class="actions"><button class="btn ghost" id="skip">Skip to the result</button></div>`);
    mountMap(() => {});
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now(), dur = reduce ? 0 : 9000;
    map.animate(!reduce);
    const finish = () => { stopStorm(); stormT = 24; showResults(); };
    root.querySelector('#skip').addEventListener('click', finish);
    if (reduce) return finish();
    const tick = now => {
      stormT = Math.min(24, ((now - start) / dur) * 24);
      const g = root.querySelector('#gauges'); if (g) g.innerHTML = gauges(stormT, b);
      if (stormT >= 24) return finish();
      stormTimer = requestAnimationFrame(tick);
    };
    stormTimer = requestAnimationFrame(tick);
  }

  function explainLines(r, c, o) {
    const lines = [];
    if (o.surge.side) lines.push(`Storm surge on the ${o.surge.side} coast: ${o.surge.height} m${o.surge.mangrove ? ' (reduced by 1 m thanks to the mangroves)' : ''}. Ground height ${o.elev} m. ${o.surge.height > o.elev ? `${o.surge.height} − ${o.elev} = ${(o.surge.height - o.elev).toFixed(1)} m of sea water.` : 'The ground is higher than the surge, so the sea stayed out.'}`);
    if (o.riverHeight != null) lines.push(`The river rose ${S.STORM.riverRise} m. This spot is ${o.riverHeight} m above the river. ${S.STORM.riverRise > o.riverHeight ? `${S.STORM.riverRise} − ${o.riverHeight} = ${(S.STORM.riverRise - o.riverHeight).toFixed(1)} m of flood water.` : 'It stayed above the flood.'}`);
    lines.push(`Wind: open-sea wind ${S.STORM.windKmh} km/h × ${Math.round(o.windFactor.factor * 100)}% exposure = ${o.wind} km/h${o.windFactor.shelter ? ` (sheltered by ${o.windFactor.shelter === 'hill' ? 'higher hills' : 'trees'} to the east)` : ''}.`);
    if (o.landslide) lines.push(`${S.STORM.rainMm} mm of rain loosened the slope above. The landslide reached this square.`);
    if (o.volcano) lines.push(`The base is only ${W.metres(o.volcanoDist)} m from the crater. The storm did not wake the volcano, but this is a long-term risk.`);
    return lines;
  }

  function scoreCard(sc) {
    return `<div class="score"><div class="score-total"><span class="mono big">${sc.total}<small>/18</small></span><span>Site score</span></div>
      ${PILLARS.map(P => `<div class="pillar"><p class="label">${P.name} pillar</p><ul class="needs">${P.needs.map(k => `<li><div class="need-row"><strong>${NEED_LABELS[k]}</strong>${pips(sc.scores[k])}</div><p>${esc(sc.notes[k])}</p></li>`).join('')}</ul></div>`).join('')}</div>`;
  }

  function showResults() {
    const e = ex(), b = e.base, o = S.assess(b.r, b.c), sc = S.score(b.r, b.c, o);
    const p = e.prediction || {};
    const windCat = o.wind < 70 ? 'low' : o.wind <= 100 ? 'mid' : 'high';
    const windLbl = { low: 'under 70 km/h', mid: '70–100 km/h', high: 'over 100 km/h' };
    const floodOk = p.flood === 'unsure' ? null : (p.flood === 'yes') === !!o.flood;
    const windOk = p.wind === windCat;
    const missed = S.missedEvidence(b.r, b.c, e.discovered);
    if (e.pendingTest) {
      e.attempts.push({ r: b.r, c: b.c, total: sc.total, scores: sc.scores, flooded: !!o.flood, wind: o.wind, prediction: p });
      e.pendingTest = false;
      save();
    }
    const mark = ok => ok == null ? '<span class="verdict">Not predicted</span>' : ok ? '<span class="verdict good">Prediction correct</span>' : '<span class="verdict bad">Prediction wrong</span>';
    root.querySelector('#panel').innerHTML = `
      <h2>Storm report · <span class="mono">Grid ${W.grid(b.r, b.c)}</span></h2>
      <div class="compare">
        <div><h3>Flooding</h3><p>You predicted: <strong>${p.flood === 'yes' ? 'flood' : p.flood === 'no' ? 'no flood' : 'not sure'}</strong>.<br>Result: <strong>${o.flood ? `flooded ${o.flood.depth} m deep` : 'stayed dry'}</strong>.</p>${mark(floodOk)}</div>
        <div><h3>Wind</h3><p>You predicted: <strong>${windLbl[p.wind] || '—'}</strong>.<br>Result: <strong>${o.wind} km/h</strong>.</p>${mark(windOk)}</div>
      </div>
      <h3>The science</h3>
      <ul class="science">${explainLines(b.r, b.c, o).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      ${scoreCard(sc)}
      ${missed.length ? `<h3>Evidence you missed</h3><ul class="near">${missed.map(f => `<li><span aria-hidden="true">${f.icon}</span> <strong>${esc(f.name)}</strong> at <span class="mono">Grid ${W.grid(f.r, f.c)}</span>. ${f.roles === 'any' ? 'Anyone' : 'A ' + f.roles.filter(x => x !== 'any').map(x => W.role(x).name).join(' or ')} could have found it.</li>`).join('')}</ul>` : '<p class="good-note">Your team found all the key evidence for this site.</p>'}
      <h3>Talk about it</h3>
      <ul class="prompts"><li>What happened there? Was it what you expected?</li><li>Which piece of evidence would have changed your decision?</li><li>What would you do differently?</li></ul>
      ${e.attempts.length > 1 ? attemptsTable() : ''}
      <div class="actions"><button class="btn ghost" id="retry">Try a different site</button><button class="btn primary" id="debrief">Write the mission report</button></div>`;
    map.draw();
    root.querySelector('#retry').addEventListener('click', () => { selected = null; ex().prediction = null; go('base'); });
    root.querySelector('#debrief').addEventListener('click', () => go('debrief'));
  }

  function attemptsTable() {
    const e = ex();
    const best = Math.max(...e.attempts.map(a => a.total));
    return `<div class="table-wrap"><table class="attempts"><caption>Sites tested</caption>
      <thead><tr><th>#</th><th>Grid</th><th>Flooded</th><th>Wind</th><th>Score</th></tr></thead>
      <tbody>${e.attempts.map((a, i) => `<tr class="${a.total === best ? 'best' : ''}"><td>${i + 1}</td><td class="mono">${W.grid(a.r, a.c)}</td><td>${a.flooded ? 'Yes' : 'No'}</td><td class="mono">${a.wind} km/h</td><td class="mono">${a.total}/18</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ----- debrief -----
  const JOURNAL = [
    'What did you discover on the island? List three important things you saw, heard or found.',
    'What resources does the island have that could help people survive? (Think: water, food, shelter materials, energy.)',
    'What challenges or dangers did you notice on the island? How might these affect future people living here?',
    'How did your team decide where to place key locations, such as the base, water source and safe zones?',
    'What is one creative idea your team had while exploring or mapping the island?',
    'If you could build one thing right now to make the island safer or better, what would it be and why?',
    'How did your role as an expert (scientist, engineer, etc.) help your team today?',
    'What did you learn from working with your team during the exploration?',
    'What should be the next step in preparing the island for people to live on?',
    'How did this mission make you think differently about real-world challenges?'
  ];
  const CHOICE = [
    ['t1', '3 things you learnt', 3], ['t2', '2 things that surprised you or were new for you', 2],
    ['t3', '1 emotion you felt during the activity', 1], ['t4', '1 question you still have', 1]
  ];
  function reportText() {
    const s = st(), e = ex(), b = e.base;
    const last = e.attempts[e.attempts.length - 1];
    const finds = e.discovered.map(id => W.feature(id)).filter(f => f && !f.hidden);
    const lines = [
      'OPERATION ISLAND 2040 · MISSION 1 REPORT',
      `Team: ${s.team.name || 'Unnamed team'}`,
      ...W.ROLES.filter(R => s.team.members[R.id]).map(R => `${R.name}: ${s.team.members[R.id]}`),
      '',
      `Surveys completed: ${e.journal.length} of ${totalHours()} hours`,
      `Discoveries (${finds.length}): ${finds.map(f => f.name).join(', ')}`,
      '',
      e.firstPin ? `First impression from the helicopter: Grid ${W.grid(e.firstPin.r, e.firstPin.c)}${e.firstReasons.length ? ' (' + e.firstReasons.join(', ').toLowerCase() + ')' : ''}` : '',
      b ? `Recommended base: Grid ${W.grid(b.r, b.c)} (${W.terrain(b.r, b.c).name})` : '',
      last ? `Storm test: ${last.flooded ? 'flooded' : 'stayed dry'}, wind ${last.wind} km/h, site score ${last.total}/18` : '',
      e.attempts.length > 1 ? `Sites tested: ${e.attempts.map(a => `${W.grid(a.r, a.c)} (${a.total}/18)`).join(', ')}` : '',
      '',
      e.packed ? `Packed (${e.packed.reduce((a, id) => a + W.KIT.find(k => k.id === id).kg, 0)} kg): ${e.packed.map(id => W.KIT.find(k => k.id === id).name).join(', ')}` : '',
      '',
      'JOURNAL',
      ...JOURNAL.map((q, i) => `${i + 1}. ${q}\n${(e.debrief['q' + i] || '').trim() || '—'}\n`),
      'CHOICE BOARD: 3-2-1 REFLECTION',
      ...CHOICE.map(([id, label]) => `${label}:\n${(e.debrief[id] || '').trim() || '—'}\n`)
    ];
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function renderDebrief() {
    const e = ex(), b = e.base;
    if (!b) return go('base');
    const last = e.attempts[e.attempts.length - 1];
    root.innerHTML = header() + workspace(`
      <h2>Mission debrief</h2>
      <div class="compare">
        <div><h3>First impression</h3><p>${e.firstPin ? `<span class="mono">Grid ${W.grid(e.firstPin.r, e.firstPin.c)}</span> · ${S.score(e.firstPin.r, e.firstPin.c).total}/18` : '—'}</p><p class="muted">Dashed circle on the map</p></div>
        <div><h3>Final base</h3><p><span class="mono">Grid ${W.grid(b.r, b.c)}</span> · ${last ? last.total : S.score(b.r, b.c).total}/18</p><p class="muted">Yellow flag on the map</p></div>
      </div>
      <p>How did the evidence from the ground change your first idea from the helicopter?</p>
      ${e.attempts.length ? attemptsTable() : ''}
      ${e.packed ? `<h3>What you packed</h3><ul class="near">${W.KIT.filter(k => k.effect).map(k => `<li>${has(k.id) ? '✔' : '✘'} <strong>${esc(k.name)}</strong>: ${has(k.id) ? esc(k.effect) : 'not packed.'}</li>`).join('')}</ul>` : ''}
      <form id="journal" class="journal-form"><h3>Journal entries</h3>
        <p class="muted">Your teacher may choose which questions to answer.</p>
        ${JOURNAL.map((q, i) => `<label class="field"><span>${i + 1}. ${q}</span><textarea id="q${i}" rows="3">${esc(e.debrief['q' + i] || '')}</textarea></label>`).join('')}
        <h3>Choice board: 3-2-1 reflection</h3>
        ${CHOICE.map(([id, label, n]) => `<label class="field"><span>${label}</span><textarea id="${id}" rows="${n + 1}">${esc(e.debrief[id] || '')}</textarea></label>`).join('')}
      </form>
      <div class="actions">
        <button class="btn ghost" id="copy">Copy mission report</button>
        <button class="btn primary" id="done">${e.completed ? 'Update the Island Log' : 'Save to the Island Log'}</button>
      </div>
      <p class="muted" id="copy-status" aria-live="polite"></p>
      <textarea id="report-text" class="report-text" rows="8" readonly hidden></textarea>
    `);
    mountMap(() => {});
    JOURNAL.forEach((q, i) => root.querySelector('#q' + i).addEventListener('input', ev => { e.debrief['q' + i] = ev.target.value; save(); }));
    CHOICE.forEach(([id]) => root.querySelector('#' + id).addEventListener('input', ev => { e.debrief[id] = ev.target.value; save(); }));
    root.querySelector('#copy').addEventListener('click', () => {
      const txt = reportText(), status = root.querySelector('#copy-status'), ta = root.querySelector('#report-text');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Report copied. Paste it into a document or email.'; }, fallback); } catch (err) { fallback(); }
    });
    root.querySelector('#done').addEventListener('click', () => {
      const s = st();
      e.completed = true;
      s.log.exploration = {
        base: { r: b.r, c: b.c, grid: W.grid(b.r, b.c), terrain: W.terrain(b.r, b.c).name },
        score: last ? last.total : S.score(b.r, b.c).total,
        discovered: e.discovered.slice(), surveys: e.journal.length, at: new Date().toISOString()
      };
      save();
      location.hash = '';
    });
  }

  OI.missions = OI.missions || {};
  OI.missions.exploration = {
    mount(el) { root = el; selected = ex().phase === 'base' ? null : selected; render(); },
    unmount() { stopStorm(); if (map) { map.destroy(); map = null; } root = null; }
  };
})();
