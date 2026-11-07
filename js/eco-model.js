/* Operation Island — Mission 5 ecosystem model. One step = one year, 10 years.
 * Transparent rules:
 *  - People: 30 now, 12 more every year (150 by year 10). Each person needs 1 share of food a year.
 *  - Farms: a grassland or forest square feeds 25 people a year, a hill square 15.
 *    Chemical fertiliser: +30% food but washes into the sea. Compost: +15% with no pollution
 *    (only if the waste is composted).
 *  - Fish: the reef holds up to 200 t of fish when healthy. Fish breed 50% a year when
 *    there is space (logistic growth). Each boat catches 6 t a year when the reef is full and
 *    only a little less as fish get scarcer, so too many boats can empty the reef. 1 t of fish feeds 4 people a year.
 *    A marine reserve (no fishing on a third of the reef) helps fish breed 30% faster.
 *  - Reef health falls with mud and pollution: cleared forest, farms, fertiliser, waste in the
 *    sea and overfishing (fewer grazing fish, so algae smother the coral).
 *  - Forest: clear-cut logging removes 30% of a square's trees a year; selective logging with
 *    replanting removes 5% and regrows 3%. Farms and village squares on forest clear it.
 *  - Turtles and seabirds lose nests when the village, lights or logging come close.
 *  - Food the island cannot grow is shipped in by the GHA, at a cost.
 */
(function () {
  const W = OI.world;
  const YEARS = 10, START_PEOPLE = 30, GROWTH = 12;
  const ZONES = {
    farm: { name: 'Farm', color: 'rgba(214, 170, 60, 0.6)', on: 'gfh', label: 'F' },
    village: { name: 'Village', color: 'rgba(220, 110, 70, 0.62)', on: 'gfhb', label: 'V' },
    logging: { name: 'Logging', color: 'rgba(120, 80, 40, 0.6)', on: 'f', label: 'L' },
    protect: { name: 'Protected', color: 'rgba(60, 170, 120, 0.5)', on: 'gfhbmskM', label: 'P' }
  };
  const FISH_K = 200, FISH_R = 0.5, CATCH = 6, FISH_FEEDS = 4, IMPORT_COST = 1; // credits per person-year of imported food
  const TURTLES = W.feature('turtles'), BIRDS = W.feature('birds');

  function defaultPlan(base) {
    return { zones: { [W.key(base.r, base.c)]: 'village' }, boats: 3, reserve: false, fertiliser: 'none', waste: 'sea', logging: 'clear', lightRules: false };
  }
  function canZone(zone, r, c) { return W.isLand(r, c) && ZONES[zone].on.includes(W.code(r, c)); }
  const forestTiles = () => { const out = []; for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) if (W.code(r, c) === 'f') out.push(W.key(r, c)); return out; };
  const near = (k, f, d) => { const [r, c] = k.split(',').map(Number); return W.dist({ r, c }, f) <= d; };

  function summary(plan) {
    const z = Object.entries(plan.zones);
    const count = id => z.filter(([, v]) => v === id).length;
    return { farm: count('farm'), village: count('village'), logging: count('logging'), protect: count('protect') };
  }

  function simulate(plan) {
    const F0 = forestTiles(), z = plan.zones;
    const forest = {}; F0.forEach(k => { forest[k] = (z[k] === 'farm' || z[k] === 'village') ? 0 : 1; });
    let fish = 160, reef = 0.95, turtles = 40, birds = 300;
    const years = [];
    const farmTiles = Object.keys(z).filter(k => z[k] === 'farm');
    const villageTiles = Object.keys(z).filter(k => z[k] === 'village');
    const logTiles = Object.keys(z).filter(k => z[k] === 'logging');
    for (let y = 1; y <= YEARS; y++) {
      const people = START_PEOPLE + GROWTH * y;
      // farms
      const fert = plan.fertiliser === 'chemical' ? 1.3 : plan.fertiliser === 'compost' && plan.waste === 'compost' ? 1.15 : 1;
      const farmFood = farmTiles.reduce((s, k) => { const [r, c] = k.split(',').map(Number); return s + (W.code(r, c) === 'h' ? 15 : 25); }, 0) * fert;
      // fish
      const K = FISH_K * reef, r = FISH_R * (plan.reserve ? 1.3 : 1);
      const effort = plan.boats * CATCH * Math.sqrt(fish / FISH_K) * (plan.reserve ? 0.8 : 1); // boats still find fish until stocks are very low
      const catchT = Math.min(effort, fish);
      fish = Math.max(0, fish + r * fish * (1 - fish / Math.max(1, K)) - catchT);
      const fishFood = catchT * FISH_FEEDS;
      const food = farmFood + fishFood;
      const fed = Math.min(1, food / people);
      const imports = Math.max(0, people - food) * IMPORT_COST;
      // forest
      logTiles.forEach(k => { if (forest[k] != null) forest[k] = Math.max(0, Math.min(1, forest[k] + (plan.logging === 'clear' ? -0.3 : -0.05 + 0.03))); });
      const cover = F0.reduce((s, k) => s + forest[k], 0) / F0.length;
      const cleared = F0.reduce((s, k) => s + (1 - forest[k]), 0);
      // timber for new houses: 0.6 units a year; each logging square gives 1 (clear-cut) or 0.4 (selective)
      const timber = logTiles.reduce((s, k) => s + (forest[k] > 0 ? (plan.logging === 'clear' ? 1 : 0.4) : 0), 0);
      const timberImports = Math.max(0, 0.6 - timber) * 25;
      // reef health
      const load = 0.012 * farmTiles.length * (plan.fertiliser === 'chemical' ? 2.2 : 1) + 0.022 * cleared +
        ({ sea: 0.22, burn: 0.03, landfill: 0.06, compost: 0 })[plan.waste] + (fish < 0.3 * FISH_K ? 0.15 : 0);
      reef = Math.max(0.05, Math.min(1, reef + 0.35 * (Math.max(0, 1 - load) - reef)));
      // wildlife
      const nearTurtles = Object.keys(z).filter(k => (z[k] === 'village' && near(k, TURTLES, 1)) || (z[k] === 'farm' && near(k, TURTLES, 0))).length;
      const turtleSafe = z[W.key(TURTLES.r, TURTLES.c)] === 'protect';
      turtles = Math.max(0, turtles + (turtleSafe && !nearTurtles ? 3 : 0) - nearTurtles * (plan.lightRules ? 3 : 6) - (plan.waste === 'sea' ? 2 : 0) - (reef < 0.5 ? 2 : 0));
      const nearBirds = Object.keys(z).filter(k => (z[k] === 'village' || z[k] === 'logging') && near(k, BIRDS, 1)).length;
      const birdSafe = z[W.key(BIRDS.r, BIRDS.c)] === 'protect';
      birds = Math.max(0, birds + (birdSafe && !nearBirds ? 10 : 0) - nearBirds * 35 - (fish < 0.3 * FISH_K ? 20 : 0));
      years.push({ y, people, farmFood: Math.round(farmFood), fishFood: Math.round(fishFood), catchT: Math.round(catchT * 10) / 10, fish: Math.round(fish), reef: Math.round(reef * 100), cover: Math.round(cover * 100),
        turtles: Math.round(turtles), birds: Math.round(birds), fed: Math.round(fed * 100), imports: Math.round(imports + timberImports), housing: villageTiles.length * 40 >= people });
    }
    const last = years[YEARS - 1];
    const fedYears = years.filter(x => x.fed >= 95).length;
    const imports = years.reduce((s, x) => s + x.imports, 0);
    const scores = {
      food: fedYears === 10 ? 3 : fedYears >= 8 ? 2 : fedYears >= 5 ? 1 : 0,
      economy: imports <= 60 ? 3 : imports <= 200 ? 2 : imports <= 450 ? 1 : 0,
      reef: last.reef >= 80 && last.fish >= 100 ? 3 : last.reef >= 60 && last.fish >= 60 ? 2 : last.reef >= 40 && last.fish >= 30 ? 1 : 0,
      forest: last.cover >= 80 ? 3 : last.cover >= 65 ? 2 : last.cover >= 45 ? 1 : 0,
      wildlife: last.turtles >= 40 && last.birds >= 300 ? 3 : last.turtles >= 30 && last.birds >= 240 ? 2 : last.turtles >= 15 && last.birds >= 150 ? 1 : 0
    };
    return { years, last, fedYears, imports, scores, total: Object.values(scores).reduce((a, b) => a + b, 0),
      housingShort: years.filter(x => !x.housing).length, msy: FISH_R * FISH_K / 4 };
  }

  OI.eco = { YEARS, START_PEOPLE, GROWTH, ZONES, FISH_K, FISH_R, CATCH, FISH_FEEDS, defaultPlan, canZone, summary, simulate, forestTiles };
})();
