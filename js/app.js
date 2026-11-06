/* Operation Island — Mission Control hub, facilitator guide and router. */
(function () {
  const W = OI.world;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // The week: each mission builds on the island the team has already explored.
  const MISSIONS = [
    { id: 'explore', n: 1, title: 'Explore the Island', status: 'open', day: 'Day 1',
      subjects: ['Geography', 'Science', 'Maths', 'Language'],
      blurb: 'Survey the island with five experts, collect evidence, choose a base site and test it against a tropical storm.',
      physical: ['Paper map of the island', 'Observation walk (GooseChase)', 'Journal entries'] },
    { id: 'water', n: 2, title: 'The Water Crisis', status: 'soon', day: 'Day 2',
      subjects: ['Chemistry', 'Biology', 'Maths', 'Sustainability'],
      blurb: 'Collect rainwater, filter and disinfect it, and plan storage for your base. What happens in a drought, or when more people arrive?',
      physical: ['AquaQuest water filtration'] },
    { id: 'build', n: 3, title: 'Build to Survive', status: 'soon', day: 'Day 3',
      subjects: ['Physics', 'Engineering', 'Maths', 'Art'],
      blurb: 'Design shelters for your base and test them on a virtual shake table and in storm winds. Then build the real one.',
      physical: ['Marshmallow-and-stick earthquake towers', 'Tinkercad shelter design'] },
    { id: 'power', n: 4, title: 'Power the Island', status: 'soon', day: 'Day 4',
      subjects: ['Physics', 'Maths', 'Technology', 'Economics'],
      blurb: '"It\'s dark!" Balance solar panels, wind turbines and batteries through a day and a night.',
      physical: ['Lava lamp build'] },
    { id: 'ecosystem', n: 5, title: 'Protect the Ecosystem', status: 'soon', day: 'Day 4',
      subjects: ['Biology', 'Geography', 'Environmental science'],
      blurb: 'Your settlement grows. Decide on land use, farming and waste, and see what it does to the turtles, reef and forest.',
      physical: ['Observation activity: animals, plants, birds, weather'] },
    { id: 'volcano', n: 6, title: 'The Volcano Wakes', status: 'soon', day: 'Day 5',
      subjects: ['Earth science', 'Engineering', 'Geography'],
      blurb: 'The steam vents your Geologist found grow stronger. Map lava and ash hazard zones and protect the community.',
      physical: ['Orange volcano (baking soda and vinegar)', 'Volcano-safe building challenge', 'Augmented reality'] }
  ];

  function hub() {
    const s = OI.store.get(), log = s.log.exploration, e = s.exploration;
    const started = e.phase !== 'briefing' || e.hoursUsed > 0;
    const finds = log ? log.discovered.map(id => W.feature(id)).filter(f => f && !f.hidden) : [];
    return `
    <section class="hub-hero">
      <div class="hero-text">
        <p class="eyebrow">Global Humanitarian Alliance · Mission Control</p>
        <h1 class="display hero-title">Operation Island 2040</h1>
        <p class="lede">A new island has been found in the Pacific Ocean. Your team of experts goes first: explore it, test it and design a sustainable future for the people who will live there.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#explore">${e.completed ? 'Revisit Mission 1' : started ? 'Continue Mission 1' : 'Start Mission 1'}</a>
          <a class="btn ghost" href="#guide">Facilitator guide</a>
        </div>
      </div>
      <div class="hero-map"><canvas id="hub-map" aria-label="Map of the island"></canvas></div>
    </section>

    <section class="island-log" aria-labelledby="log-h">
      <h2 id="log-h">Island Log</h2>
      ${log ? `<div class="log-grid">
          <div><span class="label">Team</span><strong>${esc(s.team.name || 'Unnamed team')}</strong></div>
          <div><span class="label">Base site</span><strong class="mono">Grid ${log.base.grid}</strong><small>${esc(log.base.terrain)}</small></div>
          <div><span class="label">Storm test</span><strong class="mono">${log.score}/18</strong></div>
          <div><span class="label">Discoveries</span><strong class="mono">${finds.length}</strong><small>${finds.slice(0, 6).map(f => f.icon).join(' ')}</small></div>
        </div>
        <p class="muted">The next missions will build on this base and on what your experts found.</p>`
        : `<p class="muted">Nothing recorded yet. When your team finishes Mission 1, its base site and discoveries are saved here and carried into the next missions.</p>`}
    </section>

    <section aria-labelledby="missions-h">
      <h2 id="missions-h">Missions</h2>
      <ol class="missions">
        ${MISSIONS.map(m => `<li class="mission-card ${m.status}">
          <div class="mc-top"><span class="mc-n mono">M${m.n}</span><span class="mc-day">${m.day}</span>
            <span class="status ${m.status}">${m.status === 'open' ? (e.completed && m.id === 'explore' ? 'Complete' : 'Ready') : 'In design'}</span></div>
          <h3>${m.title}</h3>
          <p>${m.blurb}</p>
          <p class="subjects">${m.subjects.join(' · ')}</p>
          <p class="hands-on"><span class="label">Hands-on link</span> ${m.physical.join('; ')}</p>
          ${m.status === 'open' ? `<a class="btn small" href="#${m.id}">Open mission</a>` : ''}
        </li>`).join('')}
      </ol>
    </section>

    <section class="reset-zone">
      <h2>Start again</h2>
      <p class="muted">Progress is saved in this browser only. Before a new group starts, clear it here.</p>
      <div class="actions">
        <button class="btn ghost" id="reset-m1">Reset Mission 1</button>
        <button class="btn ghost danger" id="reset-all">Reset everything</button>
      </div>
      <p id="reset-confirm" class="confirm" hidden></p>
    </section>`;
  }

  function guide() {
    return `
    <article class="guide">
      <p class="eyebrow">For teachers and trainers</p>
      <h1 class="display">Facilitator guide</h1>
      <p class="lede">Operation Island is a simulation layer for a week-long STEAM project. Learners take on the Mantle of the Expert: they are the GHA's scientists and engineers, and their decisions have consequences. Each mission pairs with a hands-on activity.</p>

      <h2>How a mission runs</h2>
      <ol class="cycle">
        <li><strong>Explore.</strong> Understand the problem and gather evidence.</li>
        <li><strong>Predict.</strong> Commit to what you think will happen, with reasons.</li>
        <li><strong>Experiment.</strong> Run the simulation and watch the consequences.</li>
        <li><strong>Improve.</strong> Change the design and test again.</li>
        <li><strong>Connect.</strong> Build or do the real thing, then compare it with the simulation.</li>
      </ol>

      <h2>Mission 1: Explore the Island (60–75 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">10 min</td><td>Read the GHA letter. Teams of five pick their expert roles.</td><td>Stay in role: you are the GHA mission coordinator.</td></tr>
          <tr><td>Aerial survey</td><td class="mono">5 min</td><td>Teams study the island from the helicopter and pin a first-impression base site.</td><td>Ask: "What do you notice? What do you think is down there?"</td></tr>
          <tr><td>Ground expedition</td><td class="mono">20–30 min</td><td>Each survey costs one hour. Teams choose which expert to send to which square. Experts notice different things.</td><td>Read out radio messages. Ask each expert to report to the team.</td></tr>
          <tr><td>Choose a base</td><td class="mono">5–10 min</td><td>Teams review their evidence, choose a site and predict flooding and wind.</td><td>Insist on a reason based on evidence.</td></tr>
          <tr><td>Storm test</td><td class="mono">5–10 min</td><td>A 24-hour tropical storm hits the island. Teams see the result and the maths behind it, and may test another site.</td><td>Use the "What" questions below.</td></tr>
          <tr><td>Debrief</td><td class="mono">10–15 min</td><td>Compare first impressions with the final choice. Write journal entries. Save to the Island Log.</td><td>Link to the paper map and GooseChase observation walk.</td></tr>
        </tbody>
      </table></div>

      <h2>The science model</h2>
      <p>The rules are deliberately simple and visible, so learners can reason with them and check the maths:</p>
      <ul>
        <li><strong>Scale:</strong> one map square is 250 m × 250 m. The island is 4 km across.</li>
        <li><strong>Storm surge:</strong> the sea rises 2.6 m on the east coast, 2.0 m on the south, 1.5 m on the north and 0.8 m on the sheltered west. Mangroves next to a square absorb 1 m. Land lower than the surge floods.</li>
        <li><strong>River flood:</strong> 260 mm of rain in 24 hours raises the river by 2.8 m. Land beside the river that is less than 2.8 m above it floods. A square can be high above the sea and still flood from the river.</li>
        <li><strong>Wind:</strong> 130 km/h from the east × exposure. Beaches 100%, hills 115%, grassland 85%, forest 55%. Higher hills to the east cut it by 30%. Shelters are damaged above 85 km/h and destroyed above 110 km/h.</li>
        <li><strong>Landslide:</strong> heavy rain brings down the slope at the landslide scar onto the squares just below it.</li>
        <li><strong>Site score:</strong> 0–3 for each of water, food, materials, access, safety and environment (18 in total). The environment score is the sustainability check: mangroves, forest, turtles and seabirds count.</li>
      </ul>
      <p>There is no single right answer. The forest near the hidden spring scores well but means clearing trees. The hills are dry but windy. The valley has water and rich soil but floods. Good teams argue for their trade-off.</p>

      <h2>"What" questions</h2>
      <ul class="prompts two-col">
        <li>What happened there?</li><li>What did you try?</li><li>What have you changed?</li>
        <li>What ideas haven't you tried yet?</li><li>What have you seen other teams trying?</li>
        <li>What do you notice about ___?</li><li>What do you think will happen if we ___?</li>
      </ul>

      <h2>The week</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Day</th><th>Simulation mission</th><th>Hands-on activities from the course</th></tr></thead>
        <tbody>${MISSIONS.map(m => `<tr><td>${m.day}</td><td>M${m.n} · ${m.title}${m.status === 'open' ? '' : ' <span class="muted">(in design)</span>'}</td><td>${m.physical.join('; ')}</td></tr>`).join('')}
          <tr><td>Day 5</td><td>Reflection</td><td>Choice board (3-2-1), STEAM principles checklist, "Which part was engaging for you?"</td></tr>
        </tbody>
      </table></div>

      <h2>Practical notes</h2>
      <ul>
        <li>Best with one laptop or tablet per team of five. It also works on a projector with the whole class as one team.</li>
        <li>Progress saves in the browser on that device. Use "Reset everything" on Mission Control between groups.</li>
        <li>No accounts, no data collected, and no internet needed once the page has loaded.</li>
      </ul>
      <p><a class="btn ghost" href="#">Back to Mission Control</a></p>
    </article>`;
  }

  let current = null;
  function route() {
    const view = location.hash.replace('#', '');
    const main = document.getElementById('app');
    if (current && current.unmount) current.unmount();
    current = null;
    document.querySelectorAll('.topnav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + view || (view === '' && a.getAttribute('href') === '#') ? 'page' : 'false'));
    if (view === 'explore') { current = OI.missions.exploration; current.mount(main); }
    else if (view === 'guide') { main.innerHTML = guide(); }
    else { main.innerHTML = hub(); mountHub(main); }
    const team = OI.store.get().team.name;
    document.getElementById('team-chip').textContent = team ? 'Team: ' + team : '';
    window.scrollTo({ top: 0 });
  }

  function mountHub(main) {
    const hubMap = OI.createMap(main.querySelector('#hub-map'), {
      getView: () => {
        const s = OI.store.get(), e = s.exploration;
        const touched = e.hoursUsed > 0 || e.completed;
        return { mode: touched ? 'overview-fog' : 'aerial', scouted: e.scouted, discovered: e.discovered, base: s.log.exploration ? s.log.exploration.base : null };
      }
    });
    current = { unmount: () => hubMap.destroy() };
    const confirmBox = main.querySelector('#reset-confirm');
    const ask = (text, action) => {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `${text} <button class="btn small danger" id="yes">Yes, reset</button> <button class="btn small ghost" id="no">Cancel</button>`;
      confirmBox.querySelector('#yes').addEventListener('click', () => { action(); route(); });
      confirmBox.querySelector('#no').addEventListener('click', () => { confirmBox.hidden = true; });
    };
    main.querySelector('#reset-m1').addEventListener('click', () => ask('Clear the Mission 1 map, journal and base?', () => OI.store.resetExploration()));
    main.querySelector('#reset-all').addEventListener('click', () => ask('Clear the team, all missions and the Island Log?', () => OI.store.resetAll()));
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();
})();
