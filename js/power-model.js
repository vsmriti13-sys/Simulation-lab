/* Operation Island — Mission 4 energy model.
 * Hour by hour for 7 days (168 hours). Transparent rules:
 *  - Energy (Wh) = power (W) × hours.
 *  - A 300 W solar panel makes 300 W only in full midday sun. Output follows the sun
 *    from 06:00 to 18:00, and clouds cut it (90% loss under thick cloud).
 *  - A 1 kW wind turbine starts at 3 m/s, reaches 1,000 W at 12 m/s (power grows with
 *    wind speed cubed), and shuts down above 25 m/s to protect itself.
 *    Wind at the turbine = open-sea wind × the site's exposure (from Mission 1).
 *  - Batteries store 2.4 kWh each and lose 10% of what goes in.
 *  - The diesel generator (3 kW) starts when the batteries are empty and burns
 *    0.4 L of diesel per kWh; each litre releases 2.7 kg of CO₂.
 *  - The vaccine fridge must not lose power for more than 4 hours in a row.
 */
(function () {
  const W = OI.world;
  const HOURS = 168, BUDGET = 150;
  const PANEL_W = 300, TURBINE_W = 1000, BATTERY_WH = 2400, GEN_W = 3000;
  const COST = { panel: 8, turbine: 22, hillCable: 8, battery: 15, generator: 15, litre: 0.5 };
  // 7 days of weather: open-sea wind (m/s) and cloud (0 = clear, 1 = thick)
  const WEATHER = [
    { name: 'Sunny, light breeze', wind: 4, cloud: 0.1 },
    { name: 'Sunny and breezy', wind: 7, cloud: 0.15 },
    { name: 'Cloudy and windy', wind: 10, cloud: 0.7 },
    { name: 'Storm', wind: 22, cloud: 0.95 },
    { name: 'Grey and still', wind: 2, cloud: 0.85 },
    { name: 'Sunny and calm', wind: 2.5, cloud: 0.05 },
    { name: 'Sunny and breezy', wind: 6, cloud: 0.2 }
  ];
  // Appliances. hours: list of [from, to) clock hours. need: true = essential
  const APPLIANCES = [
    { id: 'lights', name: 'Lights for 6 shelters and the hall', count: 12, hours: [[18, 23]], need: true, fixed: true },
    { id: 'fridge', name: 'Vaccine fridge at the clinic', watts: 60, hours: [[0, 24]], need: true, fixed: true },
    { id: 'radio', name: 'GHA radio', watts: 10, hours: [[0, 24]], need: true },
    { id: 'phones', name: 'Charging 30 phones', watts: 60, hours: [[10, 16]], need: true },
    { id: 'pump', name: 'Electric water pump', watts: 250, hours: [[7, 9]], need: true },
    { id: 'laptops', name: 'School laptops (4)', watts: 200, hours: [[9, 13]], need: true },
    { id: 'kettle', name: 'Electric kettle for everyone', watts: 2000, hours: [[7, 8]], need: false },
    { id: 'fans', name: 'Electric fans (6) at night', watts: 240, hours: [[21, 24], [0, 5]], need: false }
  ];
  const BULBS = { led: { name: 'LED bulbs', watts: 5 }, old: { name: 'Old-style bulbs', watts: 40 } };

  function defaultDesign() {
    return { bulbs: 'led', on: { lights: true, fridge: true, radio: true, phones: true, pump: true, laptops: true, kettle: false, fans: false },
      panels: 4, turbines: 0, hill: false, batteries: 1, generator: false };
  }
  const applianceWatts = (a, d) => (a.id === 'lights' ? a.count * BULBS[d.bulbs].watts : a.watts);
  const onAt = (a, h) => a.hours.some(([f, t]) => h >= f && h < t);
  const dailyWh = (a, d) => applianceWatts(a, d) * a.hours.reduce((s, [f, t]) => s + (t - f), 0);

  function context(store) {
    const log = store.log.exploration;
    const base = log ? log.base : { r: 8, c: 11, grid: W.grid(8, 11), terrain: W.terrain(8, 11).name };
    const exposure = OI.storm.windFactor(base.r, base.c).factor;
    return { fromMission1: !!log, base, exposure, hillExposure: 1.15 };
  }

  function cost(d) {
    const items = [];
    if (d.panels) items.push([`${d.panels} × 300 W solar panels`, d.panels * COST.panel]);
    if (d.turbines) items.push([`${d.turbines} × 1 kW wind turbines`, d.turbines * COST.turbine]);
    if (d.turbines && d.hill) items.push(['Cable to the hilltop', COST.hillCable]);
    if (d.batteries) items.push([`${d.batteries} × 2.4 kWh batteries`, d.batteries * COST.battery]);
    if (d.generator) items.push(['Diesel generator', COST.generator]);
    return { items, total: items.reduce((a, [, v]) => a + v, 0) };
  }

  const sun = h => (h > 6 && h < 18 ? Math.sin(Math.PI * (h - 6) / 12) : 0);
  function windAt(t) { // open-sea wind for hour t, gently varying through the day
    const day = Math.floor(t / 24), h = t % 24, w = WEATHER[day];
    let v = w.wind * (0.85 + 0.25 * Math.sin((h - 9) / 24 * Math.PI * 2) + 0.08 * Math.sin(t * 1.7));
    if (w.wind > 20) v = w.wind * (h < 3 || h > 21 ? 0.7 : 1); // storm builds and eases
    return Math.max(0, v);
  }
  function turbinePower(v) {
    if (v < 3 || v > 25) return 0;
    if (v >= 12) return TURBINE_W;
    return TURBINE_W * (v * v * v - 27) / (1728 - 27);
  }

  function simulate(d, ctx) {
    const cap = d.batteries * BATTERY_WH;
    let charge = cap * 0.5, fuel = 0, fridgeGap = 0, worstFridgeGap = 0, wasted = 0;
    const hours = [];
    const apps = APPLIANCES.filter(a => d.on[a.id]);
    const exposure = d.hill ? ctx.hillExposure : ctx.exposure;
    for (let t = 0; t < HOURS; t++) {
      const day = Math.floor(t / 24), h = t % 24, w = WEATHER[day];
      const solar = d.panels * PANEL_W * sun(h + 0.5) * (1 - 0.9 * w.cloud) * 0.85;
      const vTurbine = windAt(t) * exposure;
      const wind = d.turbines * turbinePower(vTurbine);
      const loads = apps.filter(a => onAt(a, h)).map(a => ({ a, w: applianceWatts(a, d) }));
      // essential loads first: fridge, lights, radio, then the rest
      const order = ['fridge', 'lights', 'radio', 'phones', 'pump', 'laptops', 'kettle', 'fans'];
      loads.sort((x, y) => order.indexOf(x.a.id) - order.indexOf(y.a.id));
      let available = solar + wind; // Wh this hour
      const demand = loads.reduce((s, l) => s + l.w, 0);
      let gen = 0;
      // surplus charges the battery; shortfall comes from it, then from the generator
      if (available >= demand) {
        const spare = available - demand, room = cap - charge;
        const stored = Math.min(room, spare * 0.9);
        charge += stored; wasted += spare - stored / 0.9;
        available = demand;
      } else {
        const fromBattery = Math.min(charge, demand - available);
        charge -= fromBattery; available += fromBattery;
        if (available < demand && d.generator) { gen = Math.min(GEN_W, demand - available); available += gen; fuel += gen / 1000 * 0.4; }
      }
      // serve loads in priority order with what we have
      let left = available; const served = {};
      loads.forEach(l => { const s = Math.min(l.w, left); served[l.a.id] = s >= l.w - 0.01; left -= s; });
      const fridgeOn = !d.on.fridge || served.fridge;
      fridgeGap = fridgeOn ? 0 : fridgeGap + 1; worstFridgeGap = Math.max(worstFridgeGap, fridgeGap);
      const blackout = loads.some(l => !served[l.a.id]);
      hours.push({ t, day, h, solar: Math.round(solar), wind: Math.round(wind), windSpeed: Math.round(vTurbine * 10) / 10, demand: Math.round(demand), gen: Math.round(gen),
        charge: Math.round(charge), pct: cap ? Math.round(charge / cap * 100) : 0, blackout, fridgeOff: !fridgeOn, lightsOff: d.on.lights && loads.some(l => l.a.id === 'lights') && !served.lights, served });
    }
    // results
    const lightHours = hours.filter(x => d.on.lights && x.h >= 18 && x.h < 23);
    const lit = lightHours.filter(x => !x.lightsOff).length;
    const services = ['radio', 'phones', 'pump', 'laptops'].filter(id => {
      if (!d.on[id]) return false;
      const hrs = hours.filter(x => x.served[id] !== undefined);
      return hrs.length && hrs.filter(x => x.served[id]).length / hrs.length >= 0.95;
    });
    const co2 = Math.round(fuel * 2.7);
    const equipment = cost(d).total, fuelCost = Math.round(fuel * COST.litre);
    const scores = {
      lights: !d.on.lights ? 0 : lit === lightHours.length ? 3 : lit >= lightHours.length * 0.85 ? 2 : lit >= lightHours.length * 0.6 ? 1 : 0,
      fridge: !d.on.fridge ? 0 : worstFridgeGap === 0 ? 3 : worstFridgeGap <= 4 ? 2 : worstFridgeGap <= 8 ? 1 : 0,
      services: services.length >= 4 ? 3 : services.length === 3 ? 2 : services.length === 2 ? 1 : 0,
      cost: equipment + fuelCost <= 80 ? 3 : equipment + fuelCost <= 110 ? 2 : equipment + fuelCost <= 150 ? 1 : 0,
      environment: fuel === 0 ? 3 : fuel <= 3 ? 2 : fuel <= 8 ? 1 : 0
    };
    const demandWh = hours.reduce((s, x) => s + x.demand, 0);
    return { hours, cap, fuel: Math.round(fuel * 10) / 10, co2, wasted: Math.round(wasted), worstFridgeGap, lit, litOf: lightHours.length, services,
      blackoutHours: hours.filter(x => x.blackout).length, equipment, fuelCost, demandWh,
      solarWh: hours.reduce((s, x) => s + x.solar, 0), windWh: hours.reduce((s, x) => s + x.wind, 0), genWh: hours.reduce((s, x) => s + x.gen, 0),
      scores, total: Object.values(scores).reduce((a, b) => a + b, 0) };
  }

  OI.power = { HOURS, BUDGET, PANEL_W, TURBINE_W, BATTERY_WH, GEN_W, COST, WEATHER, APPLIANCES, BULBS, defaultDesign, applianceWatts, dailyWh, context, cost, simulate, turbinePower, windAt };
})();
