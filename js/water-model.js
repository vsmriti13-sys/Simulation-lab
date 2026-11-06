/* Operation Island — Mission 2 water model.
 * Transparent rules (all in litres):
 *  - 1 mm of rain on 1 m² of roof = 1 litre. Gutters and tanks catch 80% of it.
 *    Without a first-flush diverter, roof dirt and bird droppings wash into the tank.
 *  - The spring gives 900 L/day after rain. In dry weather it slows toward 300 L/day.
 *  - A hand pump on the river or lake delivers up to 800 L/day of cloudy water.
 *  - A solar still turns sea water into 4 L of pure water per m² on a sunny day (1 L when cloudy).
 *  - Everything flows into the same tanks. Overflow is lost.
 *  - Drinking water is 3 L per person per day. It is safe if the tank water is safe,
 *    or if enough of it is disinfected (boiling, chlorine or solar bottles). Chlorine and
 *    solar bottles only work on clear water, so cloudy river water must be filtered first.
 */
(function () {
  const W = OI.world;
  const DAYS = 30;
  // Same weather for every team: showers, then a 17-day dry spell, then the rains return.
  const RAIN = [12, 0, 25, 8, 0, 30, 5, 0, 18, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 15, 0, 22];
  const PEOPLE = 30, EXTRA = { day: 20, people: 15 };
  const DRINK = 3, BUDGET = 120, BASE_ROOF = 40, BASE_STORE = 200, TANK = 1000;
  const LEVELS = [
    { id: 7.5, name: 'Survival', note: 'Drinking, cooking and a little washing. People stay alive, but hygiene suffers and illness spreads.' },
    { id: 15, name: 'Basic', note: 'The international emergency standard (Sphere): drinking 3 L, cooking 3 L, personal hygiene 6 L, washing clothes 3 L.' },
    { id: 25, name: 'Comfortable', note: 'Enough for regular showers and laundry.' }
  ];
  const COST = { roofPer10: 1, tank: 8, pipePer250: 4, pump: 12, hosePer250: 3, stillPerM2: 3, filter: 10, firstFlush: 2, chlorineDrop: 20, bottlesPer10: 1 };

  function defaultDesign() {
    return { level: 15, roof: BASE_ROOF, tanks: 2, spring: false, river: false, still: 0, filter: false, firstFlush: false, boil: false, chlorine: false, bottles: 0 };
  }

  // What the team can use, from Mission 1's Island Log (or the GHA's suggested base).
  function context(store) {
    const log = store.log.exploration;
    const base = log ? log.base : { r: 8, c: 11, grid: W.grid(8, 11), terrain: W.terrain(8, 11).name };
    const discovered = log ? log.discovered : W.FEATURES.map(f => f.id);
    const packed = store.exploration.packed || [];
    const nearest = ids => ids.map(id => W.feature(id)).filter(Boolean).map(f => ({ f, d: Math.max(1, W.dist(base, f)) })).sort((a, b) => a.d - b.d)[0] || null;
    const spring = discovered.includes('spring') ? nearest(['spring']) : null;
    const river = nearest(discovered.filter(id => id.startsWith('river-') || id === 'lake'));
    return {
      fromMission1: !!log, base,
      spring: spring && spring.d <= 4 ? spring : null, springTooFar: spring && spring.d > 4 ? spring : null,
      river: river && river.d <= 4 ? river : null,
      springTested: (store.exploration.packed ? packed.includes('testkit') : true) && discovered.includes('spring'),
      bamboo: discovered.includes('bamboo'),
      tablets: packed.includes('tablets'), pot: packed.includes('pot')
    };
  }

  function cost(d, ctx) {
    const items = [];
    if (d.roof > BASE_ROOF) items.push(['Extra roof and gutters', Math.ceil((d.roof - BASE_ROOF) / 10) * COST.roofPer10]);
    if (d.tanks) items.push([`${d.tanks} × 1,000 L tank`, d.tanks * COST.tank]);
    if (d.spring && ctx.spring) items.push([`${ctx.bamboo ? 'Bamboo' : 'Plastic'} pipe, ${W.metres(ctx.spring.d)} m`, Math.ceil(ctx.spring.d * COST.pipePer250 / (ctx.bamboo ? 2 : 1))]);
    if (d.river && ctx.river) items.push([`Hand pump and ${W.metres(ctx.river.d)} m hose`, COST.pump + ctx.river.d * COST.hosePer250]);
    if (d.still) items.push([`Solar still, ${d.still} m²`, d.still * COST.stillPerM2]);
    if (d.filter) items.push(['Sand and gravel filter', COST.filter]);
    if (d.firstFlush) items.push(['First-flush diverter', COST.firstFlush]);
    if (d.chlorine && !ctx.tablets) items.push(['Chlorine tablets (GHA supply drop)', COST.chlorineDrop]);
    if (d.bottles) items.push([`${d.bottles} clear bottles`, Math.ceil(d.bottles / 10) * COST.bottlesPer10]);
    return { items, total: items.reduce((a, [, v]) => a + v, 0) };
  }

  function springFlow(dryDays) { return Math.round(300 + 600 * Math.exp(-dryDays / 8)); }

  function simulate(d, ctx, challenge) {
    const capacity = BASE_STORE + d.tanks * TANK;
    // quality of the tank water: the worst source connected decides
    const sources = [];
    if (d.roof > 0) sources.push(d.firstFlush ? 'safe' : 'germs');
    if (d.spring && ctx.spring) sources.push(ctx.springTested ? 'safe' : 'unknown');
    if (d.river && ctx.river) sources.push('cloudy');
    if (d.still) sources.push('safe');
    const rank = { safe: 0, unknown: 1, germs: 2, cloudy: 3 };
    const quality = sources.sort((a, b) => rank[b] - rank[a])[0] || 'safe';
    const clear = quality !== 'cloudy' || d.filter;
    let stored = Math.min(capacity, 600), dry = 0, chlorineLeft = d.chlorine ? 10000 : 0;
    const days = [];
    for (let i = 0; i < DAYS; i++) {
      const rain = RAIN[i], sunny = rain === 0;
      dry = rain > 10 ? 0 : dry + 1;
      const people = PEOPLE + (challenge && i + 1 >= EXTRA.day ? EXTRA.people : 0);
      const demand = people * d.level, drink = people * DRINK;
      const inflow = {
        rain: Math.round(d.roof * rain * 0.8),
        spring: d.spring && ctx.spring ? springFlow(dry) : 0,
        river: d.river && ctx.river ? 800 : 0,
        still: d.still * (sunny ? 4 : 1)
      };
      const totalIn = inflow.rain + inflow.spring + inflow.still;
      let before = stored + totalIn;
      // the pump only runs to top up the tank
      const pumped = Math.min(inflow.river, Math.max(0, capacity + demand - before));
      inflow.river = pumped; before += pumped;
      const supplied = Math.min(demand, before);
      let after = before - supplied;
      const overflow = Math.max(0, after - capacity);
      after = Math.min(after, capacity);
      // drinking water safety
      const drinkAvail = Math.min(drink, supplied);
      let safeLitres = quality === 'safe' ? drinkAvail : 0, wood = 0, method = quality === 'safe' ? 'none needed' : 'none';
      if (quality !== 'safe') {
        let need = drinkAvail; const used = [];
        if (d.chlorine && clear && chlorineLeft > 0) { const x = Math.min(need, chlorineLeft); chlorineLeft -= x; need -= x; safeLitres += x; used.push('chlorine'); }
        if (need > 0 && d.bottles && clear) { const x = Math.min(need, d.bottles * (sunny ? 1.5 : 0.75)); need -= x; safeLitres += x; used.push('solar bottles'); }
        if (need > 0 && d.boil) { wood += need / 4; safeLitres += need; need = 0; used.push('boiling'); }
        method = used.join(' + ') || 'none';
      }
      days.push({
        day: i + 1, rain, sunny, people, demand, drink, inflow, supplied, stored: Math.round(after), overflow: Math.round(overflow),
        enough: supplied >= demand - 0.5, safe: safeLitres >= drinkAvail - 0.5 && drinkAvail > 0, wood, method
      });
      stored = after;
    }
    const daysEnough = days.filter(x => x.enough).length;
    const daysSafe = days.filter(x => x.safe).length;
    const wood = Math.round(days.reduce((a, x) => a + x.wood, 0));
    const firstShort = (days.find(x => !x.enough) || {}).day || null;
    const c = cost(d, ctx).total;
    const tier = (v, a, b, cc) => (v >= a ? 3 : v >= b ? 2 : v >= cc ? 1 : 0);
    const scores = {
      enough: tier(daysEnough, 30, 27, 20),
      safe: tier(daysSafe, 30, 27, 20),
      hygiene: d.level >= 15 ? 3 : 1,
      cost: c <= 80 ? 3 : c <= 100 ? 2 : c <= BUDGET ? 1 : 0,
      environment: wood <= 50 ? 3 : wood <= 200 ? 2 : wood <= 500 ? 1 : 0
    };
    return { days, capacity, quality, clear, daysEnough, daysSafe, wood, firstShort, cost: c, scores, total: Object.values(scores).reduce((a, b) => a + b, 0) };
  }

  OI.water = { DAYS, RAIN, PEOPLE, EXTRA, DRINK, BUDGET, BASE_ROOF, BASE_STORE, TANK, LEVELS, COST, defaultDesign, context, cost, simulate, springFlow };
})();
