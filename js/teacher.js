/* Operation Island — Teacher Mode.
 * Any teacher picks a subject, age group, time and goal and gets ways to use the island missions.
 * The ideas are written in advance, so this works offline and needs no account.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const MISSIONS = { explore: 'Explore the Island', water: 'The Water Crisis', build: 'Build to Survive', power: 'Power the Island', eco: 'Protect the Ecosystem', volcano: 'The Volcano Wakes' };
  const ORDER = ['explore', 'water', 'build', 'power', 'eco', 'volcano'];

  // subject → goals, and one idea per mission: [title, task, product, goals]
  const SUBJECTS = {
    science: { name: 'Science', goals: ['Forces and structures', 'Energy', 'Water and materials', 'Ecosystems', 'Earth science', 'Working scientifically'], ideas: {
      explore: ['Fair-test the storm', 'Test three base sites against the same storm. Which variable (height, distance from the river, shelter from the east) changed the result? Change one thing at a time.', 'A results table and a conclusion that names the variable that mattered.', ['Working scientifically', 'Earth science']],
      water: ['Clean-water investigation', 'Build the AquaQuest filter, measure clarity before and after, then compare it with the simulated filter, chlorine and boiling. Why must drinking water be disinfected even when it looks clear?', 'A lab report with before-and-after measurements and an explanation of filtering versus disinfecting.', ['Water and materials', 'Working scientifically']],
      build: ['Triangles hold, squares fold', 'Test a squares-only frame, then a braced frame. Use the red and orange sticks to talk about tension and compression, then find triangles in bridges, cranes and roofs.', 'Labelled diagrams of both frames showing which sticks were in tension and which in compression.', ['Forces and structures']],
      power: ['Energy detectives', 'Use the energy audit to separate power (W) from energy (Wh). Trace the energy transfers from the sun to a lit bulb, then explain the lava lamp with density.', 'An energy-transfer diagram for one appliance, plus a lava lamp explanation.', ['Energy']],
      eco: ['Chain reactions', 'Draw the reef food web, then follow one change (too many boats, fertiliser, bright lights) through the 10-year charts. Which species felt it first?', 'A food web poster with one annotated chain reaction, using evidence from the charts.', ['Ecosystems']],
      volcano: ['Read the volcano', 'Interpret the earthquake, swelling and gas data as a volcanologist would. Link the signals to rising magma, then explain the orange volcano as an acid–base reaction.', 'A data-based evacuation recommendation and an explanation of the orange volcano reaction.', ['Earth science', 'Working scientifically']]
    } },
    maths: { name: 'Mathematics', goals: ['Calculation and units', 'Data and graphs', 'Percentages and ratio', 'Measurement and scale', 'Rates of change'], ideas: {
      explore: ['Scale and grid references', 'One square is 250 m. Work out walking distances between sites, and use the storm report to calculate flood depth (surge height minus ground height).', 'A worked sheet of distances and flood depths for three sites.', ['Measurement and scale', 'Calculation and units']],
      water: ['The water budget', 'Calculate daily and 30-day needs, rain collected (area × rainfall × 80%) and how many days the tanks last in the dry spell.', 'A budget table and a short justification of the tank size chosen.', ['Calculation and units', 'Percentages and ratio']],
      build: ['Geometry of strength', 'Why is the long stick 1.4 m? (Pythagoras for older pupils.) Compare designs by height per stick and by triangles per stick.', 'A comparison table of designs with ratios, and the "most efficient" design argued with numbers.', ['Measurement and scale', 'Percentages and ratio']],
      power: ['Watts, hours and graphs', 'Calculate Wh and kWh for each appliance, then read the 7-day chart: when is the battery lowest, and how fast does it drain at night?', 'Annotated graph with three calculated facts, including a rate of discharge.', ['Calculation and units', 'Data and graphs', 'Rates of change']],
      eco: ['Growth and collapse', 'Read the 10-year charts as percentages of the start. Why does catching more than 25 t a year make the fish fall faster each year?', 'Percentage-change table and a sketch graph of 4 boats versus 10 boats.', ['Data and graphs', 'Percentages and ratio', 'Rates of change']],
      volcano: ['Accelerating signals', 'Work out the day-to-day increases in earthquakes and gas. When do the increases themselves start growing? Use this to set an evidence-based alert threshold.', 'A table of differences and an alert rule written as an inequality.', ['Data and graphs', 'Rates of change']]
    } },
    geography: { name: 'Geography', goals: ['Maps and grid references', 'Natural hazards', 'Settlement and land use', 'Weather and climate', 'Resources and sustainability'], ideas: {
      explore: ['Site and situation', 'Use the survey map to judge settlement sites by water, relief, shelter and hazards. Compare with the paper map pupils draw.', 'An annotated sketch map with a justified settlement site.', ['Maps and grid references', 'Settlement and land use', 'Natural hazards']],
      water: ['Water security', 'Explore how rainfall patterns and dry seasons affect island water supply. Link to real small-island states facing drought.', 'A case-study comparison: Operation Island and a real island.', ['Resources and sustainability', 'Weather and climate']],
      build: ['Building for hazards', 'Compare the virtual shelters with real hazard-resistant buildings in Japan, Nepal and the Caribbean.', 'A fact file on one real hazard-resistant building style.', ['Natural hazards']],
      power: ['Where should the turbines go?', 'Use relief and wind exposure to site renewable energy. Why does the hill ridge get more wind than the forest base?', 'A map of the island with energy sites and an explanation of the wind exposure.', ['Resources and sustainability', 'Weather and climate', 'Maps and grid references']],
      eco: ['Land-use planning', 'Use the zoning tool as a planning exercise: housing, farming, forestry and conservation all compete for the same land.', 'A land-use plan with a key and a paragraph on its trade-offs.', ['Settlement and land use', 'Resources and sustainability']],
      volcano: ['Hazard mapping', 'Predict and map volcanic hazards using relief (downhill) and prevailing wind (downwind), then compare with the eruption. Link to Montserrat or Pinatubo.', 'A hazard map with a key and an evaluation of its accuracy.', ['Natural hazards', 'Maps and grid references']]
    } },
    english: { name: 'English and languages', goals: ['Persuasive writing', 'Reports and explanations', 'Speaking and debate', 'Narrative writing', 'Vocabulary'], ideas: {
      explore: ['The expedition journal', 'In role as experts, pupils write field notes and a journal entry for the GHA, using the expert reports as evidence.', 'A first-person expedition journal entry with subject vocabulary.', ['Narrative writing', 'Reports and explanations']],
      water: ['Letter to the GHA', 'Write a persuasive letter asking for funding for your water system, using your 30-day test results as evidence.', 'A persuasive letter with facts, numbers and a clear request.', ['Persuasive writing']],
      build: ['How our shelter survives', 'Write an explanation text: how the frame resists an earthquake, using "tension", "compression" and "brace" correctly.', 'An explanation text with a labelled diagram.', ['Reports and explanations', 'Vocabulary']],
      power: ['The great energy debate', 'Hold a formal debate: "The island should use a diesel generator." Teams use their test results as evidence.', 'Debate speeches and a reflection on the strongest argument.', ['Speaking and debate', 'Persuasive writing']],
      eco: ['Town meeting', 'Role-play a community meeting: fishers, farmers, conservationists and families argue over the 10-year plan.', 'Meeting minutes and a persuasive speech from one point of view.', ['Speaking and debate', 'Persuasive writing']],
      volcano: ['Emergency broadcast', 'Write and record the radio announcement ordering the evacuation, then a survivor\'s diary entry from day 11.', 'A broadcast script (clear, calm, urgent) and a narrative diary entry.', ['Narrative writing', 'Reports and explanations']]
    } },
    history: { name: 'History', goals: ['Past settlements', 'Disasters in history', 'Change over time', 'Using evidence'], ideas: {
      explore: ['Pacific navigators', 'Compare the team\'s site choices with how Polynesian navigators chose where to settle Pacific islands.', 'A comparison chart: Operation Island and a real Polynesian settlement.', ['Past settlements', 'Using evidence']],
      water: ['Water through the ages', 'Research historic water systems such as Roman aqueducts, Indian stepwells and island cisterns. What problems did they solve?', 'A timeline of water technology with one detailed example.', ['Past settlements', 'Change over time']],
      build: ['Traditional resilient building', 'Investigate traditional buildings that survive earthquakes or storms, such as Japanese pagodas, Inca stonework and Caribbean hurricane houses.', 'A presentation on one building tradition and why it works.', ['Change over time']],
      power: ['Lighting the dark', 'Trace how people lit their homes: oil lamps, candles, gas, old bulbs, LEDs. How did each change daily life?', 'An illustrated timeline of lighting.', ['Change over time']],
      eco: ['The Rapa Nui question', 'Examine evidence about Easter Island\'s environment. What do historians disagree about, and what evidence do they use?', 'A source-based argument using at least two pieces of evidence.', ['Using evidence', 'Past settlements']],
      volcano: ['Warnings from the past', 'Compare Pompeii (79 CE), Krakatoa (1883) and Montserrat (1995): what warnings were there, and how did people respond?', 'A comparison table and a judgement on what changed over time.', ['Disasters in history', 'Change over time']]
    } },
    art: { name: 'Art and design', goals: ['Architecture and design', 'Maps and illustration', 'Environmental campaigns', 'Model making'], ideas: {
      explore: ['The illustrated island', 'Create an illustrated map of the island with a key, compass rose and drawings of the discoveries.', 'An illustrated map in the style of an expedition chart.', ['Maps and illustration']],
      water: ['A beautiful water point', 'Design a public water tank or fountain that collects rain and becomes the heart of the village.', 'Design sketches and a material board.', ['Architecture and design']],
      build: ['Shelter design', 'Develop the tested frame into a full shelter in Tinkercad or as sketches, using local materials and patterns.', 'A Tinkercad model or design sheet with annotations.', ['Architecture and design', 'Model making']],
      power: ['Light art', 'Design a lamp for the settlement, inspired by the lava lamp, that uses as little energy as possible.', 'A design sheet and a prototype or model.', ['Model making', 'Architecture and design']],
      eco: ['Save the turtles campaign', 'Design a campaign poster or mural that persuades settlers to protect the reef or the turtle beach.', 'A campaign poster with a clear message and image.', ['Environmental campaigns']],
      volcano: ['Volcano in relief', 'Build a relief model of the island showing where lava, ash and mudflows go.', 'A painted relief model with a hazard key.', ['Model making', 'Maps and illustration']]
    } },
    music: { name: 'Music', goals: ['Soundscapes', 'Instruments from materials', 'Songs and storytelling'], ideas: {
      explore: ['Island soundscape', 'Turn the field notes into a soundscape (waves, birds, wind, river) using voices, body percussion and instruments.', 'A performed and recorded soundscape with a graphic score.', ['Soundscapes']],
      water: ['Water-glass scales', 'Tune glasses with different amounts of water. How does the volume of water change the pitch?', 'A tuned water xylophone and a short melody.', ['Instruments from materials']],
      build: ['Bamboo instruments', 'Make pan pipes or chimes from bamboo or tubes. How does length change pitch?', 'A homemade instrument and a recorded tune.', ['Instruments from materials']],
      power: ['The sound of a week of energy', 'Turn the 7-day energy chart into music: sun as melody, wind as rhythm, night as silence.', 'A data-sonification piece and a graphic score.', ['Soundscapes']],
      eco: ['Song of the reef', 'Write a song or chant for the turtle and reef campaign, or compare the sounds of a healthy and a damaged reef.', 'A performed song or a before-and-after reef soundscape.', ['Songs and storytelling', 'Soundscapes']],
      volcano: ['Rising tension', 'Compose a piece that follows the 10 monitoring days, getting louder and faster towards the eruption.', 'A composition with a structure linked to the data.', ['Soundscapes', 'Songs and storytelling']]
    } },
    citizenship: { name: 'Citizenship and social studies', goals: ['Fair decisions', 'Rights and responsibilities', 'Community planning', 'Global issues'], ideas: {
      explore: ['How do we decide?', 'Agree a fair way for the expert team to decide on the base: voting, consensus or the expert with the best evidence.', 'A group decision-making charter.', ['Fair decisions']],
      water: ['Sharing water fairly', 'If the tanks run low, who gets water first? Write fair rationing rules and test them against the 30-day results.', 'A water-sharing policy with reasons.', ['Fair decisions', 'Rights and responsibilities']],
      build: ['The right to a safe home', 'Explore building codes as rules that protect people. Who should make them, and who checks them?', 'A simple building code for the island.', ['Rights and responsibilities']],
      power: ['Who gets power first?', 'Rank the appliances by need. Why does the vaccine fridge come first? Who decides what counts as a need?', 'A ranked list with a justification for each choice.', ['Fair decisions']],
      eco: ['Planning for everyone', 'Run the 10-year plan as a community consultation. Whose voices are missing, such as future generations or wildlife?', 'A consultation report and a revised plan.', ['Community planning', 'Global issues']],
      volcano: ['Protecting the vulnerable', 'Plan an evacuation that works for everyone, including elderly, disabled and very young people. Link to climate refugees in the GHA story.', 'An inclusive evacuation plan.', ['Rights and responsibilities', 'Global issues']]
    } },
    economics: { name: 'Economics', goals: ['Budgets and trade-offs', 'Costs and benefits', 'Sustainable development'], ideas: {
      explore: ['The cost of a bad choice', 'Estimate the damage a flooded or windblown base would cause. Was the cheaper, easier site really cheaper?', 'A cost-benefit comparison of two sites.', ['Costs and benefits']],
      water: ['Value for money', 'Work out the cost per litre of safe water for each design within the 120-credit budget.', 'A value-for-money table and a recommendation.', ['Budgets and trade-offs']],
      build: ['Safety versus savings', 'Fewer sticks are cheaper, but are they safe? Find the cheapest design that still survives both tests.', 'A report on the cost of safety.', ['Costs and benefits', 'Budgets and trade-offs']],
      power: ['Buy now or pay later?', 'Compare upfront costs (panels, batteries) with running costs (diesel). Which is cheaper over 10 years?', 'A 10-year cost projection for two systems.', ['Budgets and trade-offs', 'Costs and benefits']],
      eco: ['Tragedy of the commons', 'Why does each fisher want one more boat, even though too many boats ruin the reef for everyone? What rules fix this?', 'An explanation of the commons problem with a proposed fishing rule.', ['Sustainable development']],
      volcano: ['The price of a false alarm', 'Compare the cost of evacuating too early with the cost of evacuating too late.', 'A decision matrix of costs and risks.', ['Costs and benefits']]
    } },
    computing: { name: 'Computing and technology', goals: ['Models and simulations', 'Data and sensors', 'Algorithms and rules'], ideas: {
      explore: ['The storm as an algorithm', 'Write the storm rules as pseudocode: IF ground height < surge THEN flooded. Then test your rules against the simulation.', 'Pseudocode or a flowchart that predicts flooding.', ['Algorithms and rules', 'Models and simulations']],
      water: ['Build the tank model', 'Recreate the 30-day tank model in a spreadsheet: stored + collected − used, day by day.', 'A working spreadsheet model with a chart.', ['Models and simulations', 'Data and sensors']],
      build: ['What does the model leave out?', 'The shelter physics uses springs and free joints. What real effects does it ignore, and how would that change the results?', 'A critique of the model with suggested improvements.', ['Models and simulations']],
      power: ['Smart energy', 'Design sensors and rules for a smart system that switches off the fans when the battery is low.', 'A control algorithm (flowchart) and a sensor list.', ['Data and sensors', 'Algorithms and rules']],
      eco: ['Feedback loops', 'Model fish growth and catch in a spreadsheet. Find the number of boats where the stock stops being stable.', 'A spreadsheet model and a graph of different fishing levels.', ['Models and simulations']],
      volcano: ['Early warning system', 'Write the alert-level rules as an algorithm using thresholds for earthquakes, swelling and gas. Test it on the 10 days of data.', 'An alert algorithm and a test log.', ['Data and sensors', 'Algorithms and rules']]
    } }
  };
  const AGES = {
    young: { name: '7–10', tips: ['Run the mission on a projector as a whole class, with the teacher reading reports aloud.', 'Pupils take expert roles in pairs, wearing role badges.', 'Use sentence starters and drawings instead of long written answers.', 'Focus on predict, observe and explain; skip the detailed scoring.'] },
    middle: { name: '11–14', tips: ['Teams of five, one device per team, each pupil in an expert role.', 'Written predictions before every test, using evidence.', 'Use the journal and 3-2-1 reflection as exit tickets.', 'Let teams compare results across groups before the debrief.'] },
    older: { name: '15+', tips: ['Ask pupils to check the model\'s numbers using the rules in the Facilitator Guide.', 'Critique the model: what does it simplify or leave out?', 'Set an open question with no single right answer and ask for a data-based recommendation.', 'Extend the product into a formal report or presentation.'] }
  };
  const TIMES = {
    lesson: { name: 'One lesson (50–60 min)', count: 1 },
    half: { name: 'Half a day', count: 1 },
    week: { name: 'A whole week', count: 6 }
  };
  const STRUCTURE = {
    lesson: [['5 min', 'Hook: read the GHA radio message in role.'], ['25 min', 'The simulation: predict, test, look at the results.'], ['20 min', 'Subject task (below).'], ['5–10 min', 'Share and use the "What" questions.']],
    half: [['10 min', 'Hook and expert roles.'], ['45 min', 'The full mission, including at least one retest.'], ['45 min', 'The hands-on activity linked to the mission.'], ['45 min', 'Subject task and product.'], ['15 min', 'Gallery walk and 3-2-1 reflection.']]
  };

  function rank(subject, goal) {
    const S = SUBJECTS[subject];
    return ORDER.map(m => ({ m, idea: S.ideas[m], score: !goal || S.ideas[m][3].includes(goal) ? 1 : 0 })).sort((a, b) => b.score - a.score || ORDER.indexOf(a.m) - ORDER.indexOf(b.m));
  }

  function planText(t) {
    const S = SUBJECTS[t.subject], A = AGES[t.age], ranked = rank(t.subject, t.goal);
    const picks = t.time === 'week' ? ORDER.map(m => ({ m, idea: S.ideas[m] })) : ranked.slice(0, 1);
    const lines = ['OPERATION ISLAND 2040 · TEACHER PLAN', `Subject: ${S.name} · Ages ${A.name} · ${TIMES[t.time].name}${t.goal ? ` · Goal: ${t.goal}` : ''}`, ''];
    if (t.time !== 'week') { lines.push('STRUCTURE'); STRUCTURE[t.time].forEach(([d, x]) => lines.push(`${d}: ${x}`)); lines.push(''); }
    picks.forEach(({ m, idea }, i) => lines.push(`${t.time === 'week' ? `Day ${[1, 2, 3, 4, 4, 5][i]}` : 'MISSION'}: ${MISSIONS[m]}`, `Task: ${idea[0]}. ${idea[1]}`, `Product: ${idea[2]}`, ''));
    lines.push(`ADAPTING FOR AGES ${A.name}`, ...A.tips.map(x => '- ' + x));
    return lines.join('\n');
  }

  function render(main) {
    const st = OI.store.get();
    st.teacher = Object.assign({ subject: 'science', age: 'middle', time: 'lesson', goal: '' }, st.teacher || {});
    const t = st.teacher, S = SUBJECTS[t.subject], A = AGES[t.age];
    if (t.goal && !S.goals.includes(t.goal)) t.goal = '';
    const ranked = rank(t.subject, t.goal);
    const chip = (name, val, label, on) => `<label class="${on ? 'on' : ''}"><input type="radio" name="${name}" value="${esc(val)}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
    const ideaCard = (m, idea, extra) => `<article class="idea">
      <div class="mc-top"><span class="mc-n mono">M${ORDER.indexOf(m) + 1}</span><span class="mc-day">${esc(MISSIONS[m])}</span>${extra || ''}</div>
      <h3>${esc(idea[0])}</h3><p>${esc(idea[1])}</p>
      <p class="hands-on"><span class="label">Pupils produce</span> ${esc(idea[2])}</p>
      <p class="subjects">${idea[3].map(esc).join(' · ')}</p>
      <a class="btn small" href="#${m}">Open the mission</a></article>`;
    let plan;
    if (t.time === 'week') {
      plan = `<h2>Your week</h2><p class="muted">One mission a day, all through a ${esc(S.name.toLowerCase())} lens. Days 4 and 5 hold two missions each, or drop one.</p>
        <div class="ideas">${ORDER.map((m, i) => ideaCard(m, S.ideas[m], `<span class="status open">Day ${[1, 2, 3, 4, 4, 5][i]}</span>`)).join('')}</div>`;
    } else {
      const best = ranked[0], others = ranked.slice(1, 3);
      plan = `<h2>Best fit</h2>${ideaCard(best.m, best.idea, best.score ? '<span class="status open">Matches your goal</span>' : '')}
        <h3>Lesson structure</h3>
        <ol class="timeline">${STRUCTURE[t.time].map(([d, x]) => `<li><span class="mono">${d}</span><span>${esc(x)}</span></li>`).join('')}</ol>
        <h3>Also works</h3><div class="ideas two">${others.map(o => ideaCard(o.m, o.idea)).join('')}</div>`;
    }
    main.innerHTML = `<div class="teacher">
      <header class="mission-head"><div><p class="eyebrow">For every teacher, not only STEM</p><h1 class="display">Teacher Mode</h1></div>
        <p class="lede">The island is the shared context; the curriculum is yours. Choose your subject, pupils and time, and get ways to use the missions in your lessons.</p></header>
      <form class="teacher-form" id="tform">
        <fieldset><legend>Subject</legend><div class="seg">${Object.entries(SUBJECTS).map(([k, s]) => chip('subject', k, s.name, t.subject === k)).join('')}</div></fieldset>
        <fieldset><legend>Learning goal <span class="muted">(optional)</span></legend><div class="seg">${chip('goal', '', 'Any', !t.goal)}${S.goals.map(g => chip('goal', g, g, t.goal === g)).join('')}</div></fieldset>
        <div class="row2">
          <fieldset><legend>Age group</legend><div class="seg">${Object.entries(AGES).map(([k, a]) => chip('age', k, a.name, t.age === k)).join('')}</div></fieldset>
          <fieldset><legend>Time available</legend><div class="seg">${Object.entries(TIMES).map(([k, x]) => chip('time', k, x.name, t.time === k)).join('')}</div></fieldset>
        </div>
      </form>
      <section class="plan">${plan}
        <h3>Adapting for ages ${esc(A.name)}</h3><ul class="prompts">${A.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="actions"><button class="btn primary" id="tcopy" type="button">Copy this plan</button><a class="btn ghost" href="#guide">Facilitator guide</a></div>
        <p class="muted" id="tcopy-status" aria-live="polite"></p><textarea id="tplan" class="report-text" rows="8" readonly hidden></textarea>
      </section></div>`;
    main.querySelectorAll('#tform input').forEach(r => r.addEventListener('change', () => { t[r.name] = r.value; if (r.name === 'subject') t.goal = ''; OI.store.save(); const y = window.scrollY; render(main); window.scrollTo({ top: y }); }));
    main.querySelector('#tcopy').addEventListener('click', () => {
      const txt = planText(t), status = main.querySelector('#tcopy-status'), ta = main.querySelector('#tplan');
      const fallback = () => { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); status.textContent = 'Select all of the text below and copy it.'; };
      try { navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Plan copied. Paste it into your planning document.'; }, fallback); } catch (e) { fallback(); }
    });
  }

  OI.teacher = { render, SUBJECTS, AGES, TIMES, planText };
})();
