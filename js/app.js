/* Operation Island — Mission Control hub, facilitator guide and router. */
(function () {
  const W = OI.world;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // The week: each mission builds on the island the team has already explored.
  const MISSIONS = [
    { id: 'explore', n: 1, title: 'Explore the Island', status: 'open', day: 'Day 1',
      subjects: ['Geography', 'Science', 'Maths', 'Language'],
      blurb: 'Pack the helicopter, survey the island with five experts, collect evidence, choose a base site and test it against a tropical storm.',
      physical: ['Packing list and basic needs', 'Paper map of the island', 'Observation walk (GooseChase)', 'Journal entries and 3-2-1'] },
    { id: 'water', n: 2, title: 'The Water Crisis', status: 'open', day: 'Day 2',
      subjects: ['Chemistry', 'Biology', 'Maths', 'Sustainability'],
      blurb: 'Thirty settlers arrive. Budget, collect, store and disinfect water for 30 days, through a dry spell, using the sources your team found.',
      physical: ['AquaQuest water filtration'] },
    { id: 'build', n: 3, title: 'Build to Survive', status: 'open', day: 'Day 3',
      subjects: ['Physics', 'Engineering', 'Maths', 'Art'],
      blurb: 'Build a shelter frame from sticks and marshmallow joints, test it on a shake table and in a wind tunnel, then build the real one.',
      physical: ['Marshmallow-and-stick earthquake towers', 'Tinkercad shelter design'] },
    { id: 'power', n: 4, title: 'Power the Island', status: 'open', day: 'Day 4',
      subjects: ['Physics', 'Maths', 'Technology', 'Economics'],
      blurb: '"It\'s dark!" Audit the settlement\'s energy use, then keep the lights and the vaccine fridge on for 7 days with sun, wind, batteries or diesel.',
      physical: ['Lava lamp build'] },
    { id: 'eco', n: 5, title: 'Protect the Ecosystem', status: 'open', day: 'Day 5',
      subjects: ['Biology', 'Geography', 'Environmental science'],
      blurb: 'The settlement grows to 150 people. Paint a 10-year land-use plan, set fishing and waste rules, and watch what happens to the reef, forest, turtles and seabirds.',
      physical: ['Observation activity: animals, plants, birds, weather'] },
    { id: 'volcano', n: 6, title: 'The Volcano Wakes', status: 'open', day: 'Day 5',
      subjects: ['Earth science', 'Engineering', 'Geography'],
      blurb: 'The steam vents your Geologist found grow stronger. Read 10 days of monitoring data, decide when to evacuate, map the danger zones and protect the community.',
      physical: ['Orange volcano (baking soda and vinegar)', 'Volcano-safe building challenge', 'Augmented reality'] }
  ];

  function hub() {
    const s = OI.store.get(), log = s.log.exploration, e = s.exploration, wlog = s.log.water;
    const done = { explore: e.completed, water: s.water.completed, build: s.build.completed, power: s.power.completed, eco: s.eco.completed, volcano: s.volcano.completed };
    const vlog = s.log.volcano, doneCount = Object.values(done).filter(Boolean).length;
    const elog = s.log.eco;
    const plog = s.log.power;
    const blog = s.log.build;
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
          <a class="btn ghost" href="#teacher">Teacher Mode</a>
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
          ${wlog ? `<div><span class="label">Water system</span><strong class="mono">${wlog.score}/15</strong><small>Safe water on ${wlog.daysSafe} of 30 days</small></div>` : ''}
          ${vlog ? `<div><span class="label">Volcano</span><strong class="mono">${vlog.score}/15</strong><small>${vlog.evacDay ? 'Evacuated on day ' + vlog.evacDay : 'No evacuation'} · map ${vlog.accuracy}% match</small></div>` : ''}
          ${elog ? `<div><span class="label">Ecosystem</span><strong class="mono">${elog.score}/15</strong><small>Year 10: ${elog.fish} t fish, ${elog.cover}% forest, ${elog.turtles} turtle nests</small></div>` : ''}
          ${plog ? `<div><span class="label">Power</span><strong class="mono">${plog.score}/15</strong><small>Lights on ${plog.lit} of ${plog.litOf} evening hours${plog.fuel ? ` · ${plog.fuel} L diesel` : ''}</small></div>` : ''}
          ${blog ? `<div><span class="label">Shelter</span><strong class="mono">${blog.score}/15</strong><small>Earthquake: ${blog.quake === 'stand' ? 'stood' : blog.quake === 'damage' ? 'damaged' : 'collapsed'} · storm: ${blog.storm === 'stand' ? 'stood' : blog.storm === 'damage' ? 'damaged' : 'collapsed'}</small></div>` : ''}
        </div>
        <p class="muted">${doneCount === 6 ? 'All six missions complete. Operation Island 2040 is a success!' : `${doneCount} of 6 missions complete. Each mission builds on this base and on what your experts found.`}</p>`
        : `<p class="muted">Nothing recorded yet. When your team finishes Mission 1, its base site and discoveries are saved here and carried into the next missions.</p>`}
    </section>

    <section class="case-promo" aria-labelledby="cases-h">
      <h2 id="cases-h">Case Files</h2>
      <div class="case-card">
        <div><p class="eyebrow">Case File #1 · Guided virtual lab</p><h3>The Mystery Illness</h3>
          <p>A week after the storm, villagers fall ill. As the team's Hydrologist, interview families on the outbreak map, collect water samples and test them in the virtual lab: turbidity tube, pH strip, culture plate and microscope.</p>
          <p class="subjects">Science · Health · Maths · Literacy</p></div>
        <a class="btn primary" href="#case1">Open the case</a>
      </div>
    </section>

    <section aria-labelledby="missions-h">
      <h2 id="missions-h">Missions</h2>
      <ol class="missions">
        ${MISSIONS.map(m => `<li class="mission-card ${m.status}">
          <div class="mc-top"><span class="mc-n mono">M${m.n}</span><span class="mc-day">${m.day}</span>
            <span class="status ${m.status}">${m.status === 'open' ? (done[m.id] ? 'Complete' : 'Ready') : 'In design'}</span></div>
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
        <button class="btn ghost" id="reset-m2">Reset Mission 2</button>
        <button class="btn ghost" id="reset-m3">Reset Mission 3</button>
        <button class="btn ghost" id="reset-m4">Reset Mission 4</button>
        <button class="btn ghost" id="reset-m5">Reset Mission 5</button>
        <button class="btn ghost" id="reset-m6">Reset Mission 6</button>
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

      <h2>Mission 1: Explore the Island (70–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">10 min</td><td>Read the GHA letter. Teams of five pick their expert roles.</td><td>Stay in role: you are the GHA mission coordinator.</td></tr>
          <tr><td>Setting sail</td><td class="mono">10 min</td><td>"What are you going to take with you?" Teams pack 15 kg of equipment and check which basic needs it covers. Four items change the mission: the radio (storm warnings), the water test kit (the Hydrologist can test water), food rations and head torches (+2 survey hours each).</td><td>Link to Basic Human Needs and the three pillars of sustainability.</td></tr>
          <tr><td>Meeting time: aerial shot</td><td class="mono">5 min</td><td>Teams study the helicopter's aerial view, discuss the best place to settle and why, and pin a first-impression base site.</td><td>Ask: "What do you notice? What do you think is down there?"</td></tr>
          <tr><td>Ground expedition</td><td class="mono">20–30 min</td><td>Each survey costs one hour. Teams choose which expert to send to which square. Experts notice different things.</td><td>Read out radio messages. Ask each expert to report to the team.</td></tr>
          <tr><td>Choose a base</td><td class="mono">5–10 min</td><td>Teams review their evidence, choose a site and predict flooding and wind.</td><td>Insist on a reason based on evidence.</td></tr>
          <tr><td>Storm test</td><td class="mono">5–10 min</td><td>A 24-hour tropical storm hits the island. Teams see the result and the maths behind it, and may test another site.</td><td>Use the "What" questions below.</td></tr>
          <tr><td>Debrief</td><td class="mono">10–15 min</td><td>Compare first impressions with the final choice. Write journal entries. Save to the Island Log.</td><td>Link to the paper map and GooseChase observation walk.</td></tr>
        </tbody>
      </table></div>

      <h2>Mission 2: The Water Crisis (60–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">5 min</td><td>Thirty settlers are coming. Teams see their base and the water sources they found in Mission 1. The Hydrologist leads.</td><td>Add the extra challenge (15 more settlers on day 20) for confident groups.</td></tr>
          <tr><td>Water budget</td><td class="mono">10–15 min</td><td>Choose litres per person (7.5, 15 or 25) and calculate daily, monthly, drinking and rainwater amounts.</td><td>Maths focus: multiplication, percentages, units.</td></tr>
          <tr><td>Design and predict</td><td class="mono">15–20 min</td><td>Choose sources, storage and treatment within 120 credits, then predict.</td><td>Ask: "Which part of your design is the weakest?"</td></tr>
          <tr><td>30-day test</td><td class="mono">5–10 min</td><td>Day-by-day chart of rain and stored water through a 17-day dry spell. Teams can redesign and test again.</td><td>Use the "What" questions.</td></tr>
          <tr><td>Debrief</td><td class="mono">15–20 min</td><td>Record the real AquaQuest filter results and compare them with the simulation. Journal and 3-2-1.</td><td>Link to the AquaQuest station.</td></tr>
        </tbody>
      </table></div>
      <h3>Mission 2 rules</h3>
      <ul>
        <li>1 mm of rain on 1 m² of roof = 1 litre; 80% reaches the tank. Without a first-flush diverter, roof dirt contaminates the tank.</li>
        <li>The spring gives 900 L/day after rain, falling toward 300 L/day in dry weather. A river pump gives up to 800 L/day of cloudy water. A solar still makes 4 L per m² on sunny days.</li>
        <li>All sources share the tanks, so the dirtiest source decides the tank's water quality.</li>
        <li>Only drinking water (3 L per person per day) must be disinfected. Chlorine and solar bottles need clear water; boiling always works but uses 1 kg of firewood per 4 L.</li>
        <li>Same weather for everyone: showers on days 1–9, a dry spell on days 10–26 (2 mm in total), heavy rain on days 27–30.</li>
      </ul>

      <h2>Mission 3: Build to Survive (60–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">5 min</td><td>The brief: a shelter frame 3 m tall with a 2 m roof, using up to 30 sticks. Teams see their ground type and storm wind from Mission 1. The Engineer leads.</td><td>Show a real marshmallow and stick: "joints can turn".</td></tr>
          <tr><td>Design and predict</td><td class="mono">15–25 min</td><td>Teams build on a grid of joints, choose bamboo or hardwood, thatch or tiles, and roof straps, then predict.</td><td>Suggest starting from the box template to see squares fold.</td></tr>
          <tr><td>Shake and wind tests</td><td class="mono">5–15 min</td><td>A 10-second earthquake and a 10-second storm. Sticks turn orange and red as they strain, then break. Teams improve and retest.</td><td>Use the "What" questions.</td></tr>
          <tr><td>Debrief</td><td class="mono">20–30 min</td><td>Build the design with sticks and marshmallows, test it on a shake tray, and record the result. Tinkercad for the full shelter. Journal and 3-2-1.</td><td>Link to the marshmallow and Tinkercad stations.</td></tr>
        </tbody>
      </table></div>
      <h3>Mission 3 rules</h3>
      <ul>
        <li>Each stick is a stiff spring and each joint turns freely, like a marshmallow. Squares can fold; triangles cannot change shape unless a stick breaks.</li>
        <li>A stick breaks when stretched or squashed past its limit: bamboo 4.5%, hardwood 2.6%. Hardwood is stiffer but 2.5 times heavier.</li>
        <li>Earthquakes move the ground side to side: magnitude 5 = 3.5 cm, 6 = 7 cm, 7 = 11 cm. Sand shakes 1.5×, rock 0.7×.</li>
        <li>Wind pushes from the east with force proportional to speed², more strongly higher up. Untied thatch roofs lift off above 90 km/h, untied tiles above 140 km/h.</li>
      </ul>

      <h2>Mission 4: Power the Island (60–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">5 min</td><td>"It's dark!" The clinic's vaccine fridge and the lights need power. Teams see their base's wind exposure from Mission 1.</td><td>Start in the dark, if the room allows.</td></tr>
          <tr><td>Energy audit</td><td class="mono">15 min</td><td>Choose appliances (needs and wants) and LED or old-style bulbs; calculate W × h = Wh and kWh.</td><td>Maths focus: power vs energy, units.</td></tr>
          <tr><td>Design and predict</td><td class="mono">15–20 min</td><td>Solar panels, wind turbines (at the base or on the hill), batteries and an optional diesel generator, within 150 credits.</td><td>Ask: "What happens at night? On a still, grey day?"</td></tr>
          <tr><td>7-day test</td><td class="mono">5–10 min</td><td>An hour-by-hour chart of solar, wind, use and battery charge through sun, cloud, a storm and a still grey day.</td><td>Use the "What" questions.</td></tr>
          <tr><td>Debrief</td><td class="mono">20 min</td><td>Make a lava lamp (oil, water, food colouring, effervescent tablet), explain it with density, and work out the lava lamp maths. Journal and 3-2-1.</td><td>Link to "It's dark!" and the lava lamp.</td></tr>
        </tbody>
      </table></div>
      <h3>Mission 4 rules</h3>
      <ul>
        <li>Energy (Wh) = power (W) × time (h). The default settlement uses about 3.6 kWh a day; the vaccine fridge alone uses 1.44 kWh.</li>
        <li>A 300 W panel follows the sun from 06:00 to 18:00 and makes about 1.5 kWh on a clear day. Thick cloud cuts output by up to 90%.</li>
        <li>A 1 kW turbine starts at 3 m/s, reaches full power at 12 m/s (power rises with wind speed cubed) and shuts down above 25 m/s. Wind at the turbine = open-sea wind × site exposure.</li>
        <li>Batteries hold 2.4 kWh each and lose 10% when charging. The generator burns 0.4 L of diesel per kWh; 1 L releases 2.7 kg of CO₂.</li>
        <li>Weather for everyone: sunny Mon–Tue, cloudy and windy Wed, storm Thu, grey and still Fri, sunny Sat–Sun.</li>
      </ul>

      <h2>Mission 5: Protect the Ecosystem (60–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">5 min</td><td>The settlement will grow to 150 people in 10 years. The Biologist leads.</td><td>Frame it as a town-planning meeting.</td></tr>
          <tr><td>Food web</td><td class="mono">10–15 min</td><td>A reef food web and five cause-and-effect questions (overfishing, soil runoff, fertiliser, lights and turtles, mangroves).</td><td>Ask learners to trace each chain aloud.</td></tr>
          <tr><td>Plan and predict</td><td class="mono">20 min</td><td>Paint village, farm, logging and protected zones on the map; set boats, marine reserve, fertiliser, waste, logging style and turtle-friendly lights.</td><td>Let different experts argue for different parts of the island.</td></tr>
          <tr><td>10-year test</td><td class="mono">5–10 min</td><td>Six small charts, year by year: people fed, fish, reef health, forest, turtles, seabirds.</td><td>Use the "What" questions.</td></tr>
          <tr><td>Debrief</td><td class="mono">20–30 min</td><td>Observation walk (GooseChase): animals, plants, birds, weather. Journal and 3-2-1.</td><td>Link the island to the local environment.</td></tr>
        </tbody>
      </table></div>
      <h3>Mission 5 rules</h3>
      <ul>
        <li>People: 30 now, 12 more each year. Each village square houses 40; farms feed 25 people a year (hills 15). Chemical fertiliser +30%, compost +15% (needs composted waste).</li>
        <li>Fish: up to 200 t on a healthy reef, breeding 50% a year when there is room (logistic growth), so the safe yield is about 25 t a year. Each boat catches about 6 t. A marine reserve cuts the catch 20% but speeds breeding 30%.</li>
        <li>Reef health falls with cleared forest, farms, chemical fertiliser, waste in the sea and overfishing. Lower reef health means fewer fish.</li>
        <li>Clear-cut logging removes 30% of a square's trees a year; selective logging with replanting about 2%. New houses need timber; any shortfall is shipped in.</li>
        <li>Turtles lose nests when the village or farms come close to their beach (halved with turtle-friendly lights); seabirds when the village or logging come close to their cliffs.</li>
      </ul>

      <h2>Mission 6: The Volcano Wakes (60–90 minutes)</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Stage</th><th>Time</th><th>What happens</th><th>Your role</th></tr></thead>
        <tbody>
          <tr><td>Briefing</td><td class="mono">5 min</td><td>The steam vents found in Mission 1 are getting stronger. The Geologist leads.</td><td>Play the GHA Volcano Desk.</td></tr>
          <tr><td>Monitoring</td><td class="mono">15 min</td><td>Ten days of earthquakes, ground swelling and sulphur gas, with a daily Geologist's report. Teams set the alert level each day; red means evacuate.</td><td>Discuss the cost of a false alarm versus a late warning.</td></tr>
          <tr><td>Hazard map and plan</td><td class="mono">15–20 min</td><td>Paint danger zones, choose an assembly point, buy protection (steep roofs, tank covers, masks, stored seeds) and predict.</td><td>Hint: downhill and downwind.</td></tr>
          <tr><td>Eruption</td><td class="mono">5–10 min</td><td>Burning gas flows, lava down the valley, ash blown west, mudflows after rain. Painted zones are compared with what happened.</td><td>Use the "What" questions.</td></tr>
          <tr><td>Debrief</td><td class="mono">20–30 min</td><td>Orange volcano (baking soda and vinegar), the volcano-safe marshmallow building, augmented reality. Journal and 3-2-1.</td><td>Link to the volcano stations.</td></tr>
        </tbody>
      </table></div>
      <h3>Mission 6 rules</h3>
      <ul>
        <li>The eruption begins at 03:00 on day 11. Evacuating 1–3 days before is ideal; earlier costs time away from farms and school.</li>
        <li>Burning gas flows reach 500 m from the crater. Lava's front always moves into the lowest neighbouring square, so it follows the river valley to the sea.</li>
        <li>Ash falls downwind (west): up to 40 cm near the crater, thinning with distance. 10 cm collapses flat roofs (steep roofs survive up to 25 cm); 5 cm buries crops; any ash spoils uncovered water.</li>
        <li>Mudflows follow the river and the low land beside it, the same land that floods in Mission 1.</li>
      </ul>

      <h2>The science model</h2>
      <p>The rules are deliberately simple and visible, so learners can reason with them and check the maths:</p>
      <ul>
        <li><strong>Scale:</strong> one map square is 250 m × 250 m. The island is 4 km across.</li>
        <li><strong>Storm surge:</strong> the sea rises 2.6 m on the east coast, 2.0 m on the south, 1.5 m on the north and 0.8 m on the sheltered west. Mangroves next to a square absorb 1 m. Land lower than the surge floods.</li>
        <li><strong>River flood:</strong> 260 mm of rain in 24 hours raises the river by 2.8 m. Land beside the river that is less than 2.8 m above it floods. A square can be high above the sea and still flood from the river.</li>
        <li><strong>Wind:</strong> 130 km/h from the east × exposure. Beaches 100%, hills 115%, grassland 85%, forest 55%. Higher hills to the east cut it by 30%. Shelters are damaged above 85 km/h and destroyed above 110 km/h.</li>
        <li><strong>Landslide:</strong> heavy rain brings down the slope at the landslide scar onto the squares just below it.</li>
        <li><strong>Site score:</strong> 0–3 for each of water, food, materials, access, safety and environment (18 in total), grouped under the three pillars of sustainability: Environment (water, food, environment), Society (safety, access) and Economy (materials). Mangroves, forest, turtles and seabirds count.</li>
      </ul>
      <p>There is no single right answer. The forest near the hidden spring scores well but means clearing trees. The hills are dry but windy. The valley has water and rich soil but floods. Good teams argue for their trade-off.</p>

      <h2>"What" questions</h2>
      <ul class="prompts two-col">
        <li>What happened there?</li><li>What did you try?</li><li>What have you changed?</li>
        <li>What ideas haven't you tried yet?</li><li>What have you seen other teams trying?</li>
        <li>What do you notice about ___?</li><li>What do you think will happen if we ___?</li>
      </ul>

      <h2>STEAM Principles Checklist: Mission 1</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Principle</th><th>Where it shows up</th></tr></thead>
        <tbody>
          <tr><td>Integration of disciplines</td><td>Geography (maps, grid references), science (floods, wind, volcanoes, ecosystems), maths (heights, distances, subtraction, percentages), language (reports and journals).</td></tr>
          <tr><td>Inquiry-based learning</td><td>Teams decide where to look and which expert to send, and they predict before they test.</td></tr>
          <tr><td>Project-based learning</td><td>A real problem: where should displaced people live safely and sustainably?</td></tr>
          <tr><td>Creativity and innovation</td><td>Arguing for a trade-off; journal question 5 asks for a creative idea; the paper map adds art.</td></tr>
          <tr><td>Collaboration and communication</td><td>Five expert roles, each holding different evidence that the team needs.</td></tr>
          <tr><td>Real-world connections</td><td>Storm surge, river flooding, mangroves and climate displacement are real issues in Pacific islands.</td></tr>
          <tr><td>Use of technology</td><td>The simulation lets learners test decisions that are impossible to test physically.</td></tr>
          <tr><td>Interdisciplinary approach</td><td>One decision draws on every expert's evidence at once.</td></tr>
          <tr><td>Student-centred learning</td><td>Learners make every decision. The teacher coordinates in role.</td></tr>
        </tbody>
      </table></div>

      <h2>The week</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Day</th><th>Simulation mission</th><th>Hands-on activities from the course</th></tr></thead>
        <tbody>${MISSIONS.map(m => `<tr><td>${m.day}</td><td>M${m.n} · ${m.title}${m.status === 'open' ? '' : ' <span class="muted">(in design)</span>'}</td><td>${m.physical.join('; ')}</td></tr>`).join('')}
          <tr><td>Daily</td><td>Debrief in each mission</td><td>Journal entries and the choice board 3-2-1 reflection</td></tr>
          <tr><td>Day 5</td><td>Reflection</td><td>STEAM principles checklist, "Which part was engaging for you?"</td></tr>
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
    else if (view === 'water') { current = OI.missions.water; current.mount(main); }
    else if (view === 'build') { current = OI.missions.build; current.mount(main); }
    else if (view === 'power') { current = OI.missions.power; current.mount(main); }
    else if (view === 'eco') { current = OI.missions.eco; current.mount(main); }
    else if (view === 'volcano') { current = OI.missions.volcano; current.mount(main); }
    else if (view === 'guide') { main.innerHTML = guide(); }
    else if (view === 'teacher') { OI.teacher.render(main); }
    else if (view === 'case1') { current = OI.cases.illness; current.mount(main); }
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
    main.querySelector('#reset-m2').addEventListener('click', () => ask('Clear the Mission 2 water design and journal?', () => OI.store.resetWater()));
    main.querySelector('#reset-m3').addEventListener('click', () => ask('Clear the Mission 3 shelter design and journal?', () => OI.store.resetBuild()));
    main.querySelector('#reset-m4').addEventListener('click', () => ask('Clear the Mission 4 power design and journal?', () => OI.store.resetPower()));
    main.querySelector('#reset-m5').addEventListener('click', () => ask('Clear the Mission 5 plan and journal?', () => OI.store.resetEco()));
    main.querySelector('#reset-m6').addEventListener('click', () => ask('Clear the Mission 6 alerts, hazard map and journal?', () => OI.store.resetVolcano()));
    main.querySelector('#reset-all').addEventListener('click', () => ask('Clear the team, all missions and the Island Log?', () => OI.store.resetAll()));
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();
})();
