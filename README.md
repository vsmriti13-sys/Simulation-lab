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
| 2 | The Water Crisis | In design | AquaQuest water filtration |
| 3 | Build to Survive | In design | Marshmallow earthquake towers, Tinkercad shelters |
| 4 | Power the Island | In design | Lava lamp ("It's dark!") |
| 5 | Protect the Ecosystem | In design | Observation activity |
| 6 | The Volcano Wakes | In design | Orange volcano, volcano-safe building, AR |

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
js/store.js             saved progress and the Island Log
js/map-view.js          the map (canvas)
js/missions/*.js        one file per mission
js/app.js               Mission Control hub, facilitator guide, routing
```

To add a mission, create `js/missions/<name>.js`, register it in `OI.missions`, add a route in `js/app.js`, and read `OI.store.get().log` to build on earlier decisions.

Created by Smriti Vasistha.
