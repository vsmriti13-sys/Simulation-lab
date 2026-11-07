/* Operation Island — Mission 6 volcano model.
 * Transparent rules:
 *  - Monitoring: earthquakes, ground swelling and sulphur gas all rise before an eruption.
 *    The eruption begins at 03:00 on day 11.
 *  - Pyroclastic flows (fast, burning clouds of gas and rock) sweep the slopes within 500 m of the crater.
 *  - Lava always runs downhill: its front moves into the lowest neighbouring square,
 *    so it follows valleys, until it reaches the sea or runs out (18 squares).
 *  - Ash: the trade winds blow from the east, so ash falls to the west of the crater.
 *    40 cm near the crater, thinning with distance. 10 cm of wet ash can collapse a flat roof.
 *  - Mudflows (lahars): heavy rain mixes with ash and races down the river valley,
 *    flooding the same low land as the river floods in Mission 1.
 */
(function () {
  const W = OI.world;
  const DAYS = 10;
  const DATA = {
    quakes: [3, 4, 6, 5, 9, 14, 22, 35, 60, 120],
    swell: [0, 1, 2, 4, 6, 9, 14, 22, 33, 48],
    gas: [80, 90, 110, 150, 180, 260, 400, 650, 900, 1400]
  };
  const NOTES = [
    'A few small earthquakes, as usual. The hot spring smells of sulphur.',
    'Normal activity. The Geologist checks the instruments.',
    'Slightly more earthquakes. Nothing unusual at the vents.',
    'The ground on the north slope has risen by 4 mm.',
    'Steam from the vents is thicker. Some springs are warmer.',
    'The seabirds have left their cliff nests near the crater.',
    'Earthquakes are coming closer to the surface. Cracks appear on the crater path.',
    'Sulphur gas has quadrupled since day 1. People can smell it at the base.',
    'Constant small earthquakes. The north slope has swollen by 33 mm: magma is rising.',
    'Earthquakes every few minutes, felt by everyone. A glow is seen inside the crater at night.'
  ];
  const LEVELS = [
    { id: 'green', name: 'Green', text: 'Normal. Carry on.' },
    { id: 'yellow', name: 'Yellow', text: 'Watch. Monitor more often.' },
    { id: 'orange', name: 'Orange', text: 'Prepare. Pack bags, plan the route.' },
    { id: 'red', name: 'Red', text: 'Evacuate now.' }
  ];
  const PROTECT = {
    roofs: { name: 'Steep roofs', cost: 20, text: 'Ash slides off steep roofs instead of piling up.' },
    covers: { name: 'Cover the water tanks', cost: 5, text: 'Keeps ash out of the drinking water.' },
    masks: { name: 'Dust masks for everyone', cost: 5, text: 'Ash is sharp glass dust that damages lungs.' },
    seeds: { name: 'Store seeds and food', cost: 10, text: 'If ash buries the crops, you can replant and still eat.' }
  };
  const BUDGET = 30;

  // ---- hazard footprints (worked out once; the same island for every team) ----
  let cached = null;
  function hazards() {
    if (cached) return cached;
    const C = W.CRATER, out = {};
    const set = (k, type, order) => { if (!out[k]) out[k] = { types: [], order: {} }; if (!out[k].types.includes(type)) out[k].types.push(type); out[k].order[type] = order; };
    // pyroclastic flows
    for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
      if (W.isLand(r, c) && W.dist({ r, c }, C) <= 2) set(W.key(r, c), 'flow', W.dist({ r, c }, C));
    }
    // lava: the front always moves into its lowest neighbouring square (steepest way down).
    // If the front is in a hollow, the flow spreads into the lowest square beside it instead.
    const lava = new Set([W.key(C.r, C.c)]); let step = 0, tip = { r: C.r, c: C.c };
    set(W.key(C.r, C.c), 'lava', 0);
    const lowestAround = cells => {
      let best = null;
      cells.forEach(({ r, c }) => W.neighbours(r, c).forEach(n => {
        const nk = W.key(n.r, n.c);
        if (lava.has(nk) || !W.isLand(n.r, n.c)) return;
        const e = W.elev(n.r, n.c) + (n.r !== r && n.c !== c ? 0.01 : 0);
        if (!best || e < best.e) best = { r: n.r, c: n.c, e };
      }));
      return best;
    };
    while (lava.size < 18) {
      let next = lowestAround([tip]);
      if (!next || next.e > W.elev(tip.r, tip.c) + 0.5) next = lowestAround([...lava].map(k => { const [r, c] = k.split(',').map(Number); return { r, c }; }));
      if (!next) break;
      lava.add(W.key(next.r, next.c)); set(W.key(next.r, next.c), 'lava', ++step); tip = next;
      if (W.neighbours(next.r, next.c).some(n => !W.isLand(n.r, n.c))) break; // reached the sea
    }
    // ash: blown west by the trade winds
    const ash = {};
    for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
      if (!W.isLand(r, c)) continue;
      const down = C.c - c, side = r - C.r;
      const spread = 1 + Math.max(0, down) * 0.45;
      let cm = 40 * Math.exp(-Math.max(0, down) / 4) * Math.exp(-(side * side) / (2 * spread * spread));
      if (down < 0) cm *= Math.exp(down * 0.9); // very little upwind
      cm = Math.round(cm * 10) / 10;
      if (cm >= 0.5) ash[W.key(r, c)] = cm;
      if (cm >= 10) set(W.key(r, c), 'ash', Math.abs(down));
    }
    // lahars: the river and the low land beside it
    for (let r = 0; r < W.ROWS; r++) for (let c = 0; c < W.COLS; c++) {
      if (r < 5 || !W.isLand(r, c)) continue;
      const rh = W.riverHeight(r, c);
      if (W.isWaterBody(r, c) || (rh != null && rh < 3)) set(W.key(r, c), 'lahar', r);
    }
    cached = { tiles: out, ash, lavaCount: lava.size };
    return cached;
  }

  function context(store) {
    const log = store.log;
    const base = log.exploration ? log.exploration.base : { r: 8, c: 11, grid: W.grid(8, 11), terrain: W.terrain(8, 11).name };
    const zones = log.eco ? log.eco.zones : { [W.key(base.r, base.c)]: 'village' };
    const homes = Object.keys(zones).filter(k => zones[k] === 'village');
    if (!homes.includes(W.key(base.r, base.c))) homes.push(W.key(base.r, base.c));
    const farms = Object.keys(zones).filter(k => zones[k] === 'farm');
    return { base, homes, farms, fromMission1: !!log.exploration, fromMission5: !!log.eco };
  }

  function evaluate(plan, ctx) {
    const H = hazards();
    const danger = k => !!H.tiles[k];
    const evacDay = plan.alerts.findIndex(a => a === 'red') + 1 || null; // 1–10, or null
    const ashAt = k => H.ash[k] || 0;
    const homesHit = ctx.homes.filter(k => H.tiles[k] && H.tiles[k].types.some(t => t !== 'ash'));
    const homesAsh = ctx.homes.filter(k => !homesHit.includes(k) && ashAt(k) >= 10);
    const roofsLost = plan.protect.roofs ? homesAsh.filter(k => ashAt(k) >= 25) : homesAsh;
    const settlementInDanger = ctx.homes.some(danger);
    const assembly = plan.assembly;
    const assemblySafe = assembly ? !danger(assembly) && ashAt(assembly) < 5 : false;
    const baseAsh = ashAt(W.key(ctx.base.r, ctx.base.c));
    const waterBad = baseAsh >= 0.5 && !plan.protect.covers;
    const farmsLost = ctx.farms.filter(k => danger(k) || ashAt(k) >= 5);
    // hazard map accuracy
    const truth = Object.keys(H.tiles), painted = Object.keys(plan.painted || {});
    const hit = painted.filter(k => H.tiles[k]).length;
    const union = new Set([...truth, ...painted]).size;
    const accuracy = union ? hit / union : 0;
    const daysAway = evacDay ? DAYS + 1 - evacDay : 0;
    const scores = {
      safety: evacDay ? (assemblySafe ? 3 : 1) : (settlementInDanger ? 0 : (baseAsh >= 1 && !plan.protect.masks ? 1 : 2)),
      timing: !evacDay ? (settlementInDanger ? 0 : 3) : daysAway <= 3 ? 3 : daysAway <= 5 ? 2 : daysAway <= 8 ? 1 : 0,
      map: accuracy >= 0.6 ? 3 : accuracy >= 0.4 ? 2 : accuracy >= 0.2 ? 1 : 0,
      homes: homesHit.length + roofsLost.length === 0 ? 3 : homesHit.length === 0 ? 2 : homesHit.length < ctx.homes.length ? 1 : 0,
      land: (!waterBad && (farmsLost.length === 0 || plan.protect.seeds)) ? 3 : (!waterBad || farmsLost.length === 0 || plan.protect.seeds) ? 2 : 1
    };
    if (plan.protect.masks && scores.safety === 2) scores.safety = 3;
    return { evacDay, daysAway, homesHit, homesAsh, roofsLost, settlementInDanger, assemblySafe, baseAsh, waterBad, farmsLost, accuracy: Math.round(accuracy * 100), hit, truth: truth.length, painted: painted.length,
      scores, total: Object.values(scores).reduce((a, b) => a + b, 0) };
  }

  OI.volcano = { DAYS, DATA, NOTES, LEVELS, PROTECT, BUDGET, hazards, context, evaluate };
})();
