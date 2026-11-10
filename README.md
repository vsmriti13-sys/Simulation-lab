# Operation Island 2040: STEAM Simulation Lab

A browser-based simulation lab for a week-long STEAM project. Learners take on the **Mantle of the Expert**: they are the Global Humanitarian Alliance's scientists and engineers, sent to explore a newly discovered Pacific island and design a sustainable settlement.

The simulations add what slides can't: changing variables, making decisions and seeing the consequences. Each mission pairs with a hands-on activity from the course (map making, water filtration, marshmallow towers, the volcano experiment and more).

## Run it

- **No installation.** Open `index.html` in a browser, or host the folder on any static host (GitHub Pages: *Settings → Pages → Deploy from branch*).
- No accounts and no data collection. Progress is saved in the browser on that device.
- Works on laptops, tablets, phones and projectors.

## Missions

| # | Mission | Status | Hands-on link |
|---|---------|--------|---------------|
| 1 | **Explore the Island** | ✅ Playable | Paper map, GooseChase observation walk, journal entries |
| 2 | **The Water Crisis** | ✅ Playable | AquaQuest water filtration |
| 3 | **Build to Survive** | ✅ Playable | Marshmallow earthquake towers, Tinkercad shelters |
| 4 | **Power the Island** | ✅ Playable | Lava lamp ("It's dark!") |
| 5 | **Protect the Ecosystem** | ✅ Playable | Observation activity (GooseChase) |
| 6 | **The Volcano Wakes** | ✅ Playable | Orange volcano, volcano-safe building, AR |

### Case Files (guided virtual labs)

Shorter, guided investigations in a virtual-lab layout: a large interactive scene, a side panel with the case's stages and a Handbook, a glossary of tappable words, coach tips, read-aloud and a score saved on the device.

**Case File #1: The Mystery Illness** (all 7 stages playable): villagers fall ill after the storm.
1. Introduction: the clinic's message and an outbreak chart.
2. Outbreak map: interview 18 families on an illustrated village map and find the pattern.
3. Water lab: collect samples and test them with a turbidity tube, pH strip, culture plate (tap-to-count and the quarter method) and microscope.
4. Hypothesis 1: choose a hypothesis and sort evidence cards into supports / goes against / does not help.
5. Hypothesis 2: a day-by-day river scene and timeline (rain, river level, E. coli, cases) and an ordering task about the chain of events.
6. Treatment plant: put the stages in order, set the chlorine dose and contact time, run the plant.
7. Case summary: a report built from the learner's evidence, recommendations and a message to the village.

**Case File #2: The Fallen Hall** (all 7 stages playable): an earthquake brings down the school hall while the clinic next door stands. Learners are the Engineer.
1. Introduction: the council's message, a seismograph trace and before/after drawings.
2. Site inspection: tap 10 hotspots on an illustrated site and compare the buildings.
3. Force lab: push test (square vs braced frames), roof weight (force = mass × acceleration) and ground trays (rock, soil, sand and liquefaction).
4. Hypothesis 1: sort evidence into causes (weak frame, heavy roof, soft ground).
5. Hypothesis 2: fair tests, changing one thing at a time, with the force ÷ strength calculation shown.
6. New hall: choose bracing, roof, site, joints, foundations and straps within 90 credits; test against a magnitude 7 earthquake and a 130 km/h storm.
7. Case summary: report, building rules for the island and a message to the council.

The case uses a transparent engineering check (force = mass × acceleration × ground effect, compared with bracing × joints × foundations), so learners can verify every result.

**Case File #3: Where Did the Fish Go?** (all 7 stages playable): the fishers' catch has fallen from 30 to 12 kg a day and the reef is turning green. Learners are the Biologist.
1. Introduction: the fishers' message and a two-year catch chart.
2. Reef survey: three dive sites; count coral and algae in a quadrat (% cover = squares × 4) and tap to count the parrotfish.
3. Reef lab: nitrate colour test at each site and a grazer tank (parrotfish × nutrients, 30 days).
4. Food web: draw the arrows of the reef food web, then choose a hypothesis (a trophic cascade with two causes).
5. Evidence: sort cards into overfishing of grazers, fertiliser runoff, and ruling out sharks and warm water.
6. Reef rescue: boats, marine reserve, parrotfish ban, compost and river trees; run 10 years against the goal (coral ≥ 50%, catch ≥ 20 kg) while keeping fishers' jobs in mind.
7. Case summary: report, recommendations and a message to the fishers.

**Case File #4: The Night the Fridge Went Warm** (all 7 stages playable): the clinic's solar-powered vaccine fridge loses power every night after midnight. Learners are the Meteorologist.
1. Introduction: Nurse Amara's message and a three-night fridge temperature chart.
2. Energy audit: inspect a cutaway of the clinic at night; fill in watts × hours = watt-hours for six appliances and find four clues (torn seal, dusty panels, tree shade, old battery).
3. Energy lab: a solar panel meter (sun/cloud, clean/dusty, shade, one change at a time) and a fair battery test (100 W lamp × hours = capacity).
4. Night budget: add up the energy used at night (2700 Wh) and move a night clock to see the battery run out at about 1 am.
5. Evidence: sort cards into using too much, making too little, storing too little, or not the cause.
6. Storm plan: choose fixes within 70 credits and run 72 hours of a forecast with two cloudy, windy days; the fridge must never lose power.
7. Case summary: report, recommendations and a message to the nurse.

**Teacher preview.** A *Teacher preview* switch on the Case Files page (and in every case's header) opens every stage of every case at once and unlocks the questions without finishing the tests, so teachers can look around quickly. A banner shows while it is on; switch it off before learners use the device.

### Teacher Mode

For any teacher, not only STEM: choose a subject (science, maths, geography, English and languages, history, art and design, music, citizenship, economics, computing), an age group (7–10, 11–14, 15+), the time available (one lesson, half a day, a week) and an optional learning goal. Teacher Mode suggests the best-fitting missions, each with a subject task, the product pupils make, a timed lesson structure and age adaptations, and the plan can be copied into a planning document.

### Mission 1: Explore the Island

1. **Briefing.** The GHA letter. Teams of five choose expert roles: Geologist, Hydrologist, Biologist, Engineer, Meteorologist.
2. **Aerial survey.** Study the island from the helicopter and pin a first-impression base site.
3. **Ground expedition.** Each survey costs one hour of daylight. Each expert notices different things: the Hydrologist tests the water, the Geologist measures height and finds the volcanic vents, and so on. Radio messages warn of an approaching storm.
4. **Choose a base and predict.** Teams can only build where they have surveyed. They predict flooding and wind, with reasons.
5. **Storm test.** A 24-hour tropical storm (storm surge, river flood, wind, landslide). The result shows the maths behind it, a score for six needs, and any evidence the team missed. Teams can try another site.
6. **Debrief.** First impression vs. final choice, journal entries, a copyable mission report, and the result saved to the **Island Log** for the next missions.

The science rules are deliberately simple and transparent. The in-app **Facilitator guide** lists all of them.

## Project structure

```
index.html              page shell
css/style.css           design
js/world.js             the shared island: map, heights, features, expert knowledge
js/storm.js             storm model and site scoring
js/terrain-render.js    paints the realistic island map
js/water-model.js       Mission 2 water model
js/build-model.js       Mission 3 structure physics (sticks and joints)
js/power-model.js       Mission 4 hour-by-hour energy model
js/eco-model.js         Mission 5 ten-year ecosystem model
js/volcano-model.js     Mission 6 monitoring data and eruption hazards
js/ui.js                shared interface pieces
js/store.js             saved progress and the Island Log
js/map-view.js          the map (canvas)
js/missions/*.js        one file per mission
js/teacher.js           Teacher Mode: subject ideas for every mission
js/cases/case-kit.js    the Case Files player (stages, handbook, glossary, coach tips, read-aloud)
js/cases/illness.js     Case File #1: The Mystery Illness
js/cases/hall.js        Case File #2: The Fallen Hall
js/cases/reef.js        Case File #3: Where Did the Fish Go?
js/cases/fridge.js      Case File #4: The Night the Fridge Went Warm
js/app.js               Mission Control hub, facilitator guide, routing
```

To add a mission, create `js/missions/<name>.js`, register it in `OI.missions`, add a route in `js/app.js`, and read `OI.store.get().log` to build on earlier decisions.

Created by Smriti Vasistha.
