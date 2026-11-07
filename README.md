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
js/app.js               Mission Control hub, facilitator guide, routing
```

To add a mission, create `js/missions/<name>.js`, register it in `OI.missions`, add a route in `js/app.js`, and read `OI.store.get().log` to build on earlier decisions.

Created by Smriti Vasistha.
