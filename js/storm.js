/* Operation Island — storm model.
 * Simple, transparent rules that learners can reason about:
 *  - Storm surge: the sea rises. Coastal land lower than the surge floods.
 *    East coast 2.6 m, south 2.0 m, north 1.5 m, west 0.8 m (sheltered).
 *    Mangroves next to a tile absorb 1 m of surge.
 *  - River flood: 260 mm of rain in 24 h raises the river 2.8 m.
 *    Land beside the river that is less than 2.8 m above it floods.
 *  - Wind: 130 km/h from the east. Each type of ground changes how much
 *    of that wind reaches you; higher ground to the east gives shelter.
 *  - Landslide: tiles below the landslide scar are buried in heavy rain.
 *  - Volcano: within 750 m (3 tiles) of the crater is a hazard zone.
 */
(function () {
  const W = OI.world;
  const STORM = { windKmh: 130, rainMm: 260, riverRise: 2.8, hours: 24,
    surge: { east: 2.6, south: 2.0, north: 1.5, west: 0.8 } };

  const WIND_FACTOR = { b: 1.0, k: 1.15, h: 1.15, M: 1.25, V: 1.25, g: 0.85, s: 0.7, m: 0.6, f: 0.55, w: 0.8, l: 0.8 };
  const ocean = (r, c) => !W.isLand(r, c);

  function coastSide(r, c) {
    if (!W.isLand(r, c)) return null;
    const sides = [];
    if (ocean(r, c + 1) || ocean(r - 1, c + 1) || ocean(r + 1, c + 1)) sides.push('east');
    if (ocean(r + 1, c) || ocean(r + 1, c - 1)) sides.push('south');
    if (ocean(r - 1, c)) sides.push('north');
    if (ocean(r, c - 1) || ocean(r - 1, c - 1)) sides.push('west');
    if (!sides.length) return null;
    // the most exposed side wins
    return sides.sort((a, b) => STORM.surge[b] - STORM.surge[a])[0];
  }

  function surgeAt(r, c) {
    const side = coastSide(r, c);
    if (!side) return { side: null, height: 0, mangrove: false };
    let h = STORM.surge[side];
    const mangrove = W.code(r, c) !== 'm' && W.neighbours(r, c).some(n => W.code(n.r, n.c) === 'm');
    if (mangrove) h = Math.max(0, h - 1);
    return { side, height: h, mangrove };
  }

  function windFactor(r, c) {
    const ch = W.code(r, c);
    let f = WIND_FACTOR[ch] == null ? 1 : WIND_FACTOR[ch];
    const e = W.elev(r, c);
    let shelter = null;
    for (const [dr, dc] of [[0, 1], [0, 2], [-1, 1], [1, 1]]) {
      const rr = r + dr, cc = c + dc;
      if (!W.inside(rr, cc) || !W.isLand(rr, cc)) continue;
      const n = W.code(rr, cc);
      if ('hkMV'.includes(n) && W.elev(rr, cc) > e + 5) shelter = 'hill';
      else if (n === 'f' && ch !== 'f' && !shelter) shelter = 'forest';
    }
    if (shelter === 'hill') f *= 0.7;
    if (shelter === 'forest') f *= 0.85;
    return { factor: Math.round(f * 100) / 100, shelter };
  }

  // Smooth storm curves over 24 hours
  const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  const bell = (t, mid, w) => Math.exp(-((t - mid) * (t - mid)) / (2 * w * w));
  const curve = {
    rain: t => STORM.rainMm * smooth(2, 20, t),
    river: t => STORM.riverRise * smooth(5, 17, t) * (t > 20 ? 1 - smooth(20, 30, t) * 0.4 : 1),
    surge: t => bell(t, 14, 3.2),
    wind: t => Math.max(0.2, bell(t, 13, 4.5))
  };

  function assess(r, c) {
    const elev = W.elev(r, c);
    const rh = W.riverHeight(r, c);
    const s = surgeAt(r, c);
    const wf = windFactor(r, c);
    const wind = Math.round(STORM.windKmh * wf.factor);
    let flood = null;
    if (s.height > elev) flood = { cause: 'surge', depth: s.height - elev };
    if (rh != null && STORM.riverRise > rh) {
      const d = STORM.riverRise - rh;
      if (!flood || d > flood.depth) flood = { cause: 'river', depth: d };
    }
    if (W.code(r, c) === 's' || W.code(r, c) === 'm') flood = flood || { cause: 'rain', depth: 0.5 };
    if (flood) flood.depth = Math.round(flood.depth * 10) / 10;
    const scar = W.feature('landslide');
    const landslide = W.dist({ r, c }, scar) <= 1 && elev < W.elev(scar.r, scar.c);
    const volcanoDist = W.dist({ r, c }, W.CRATER);
    return { elev, riverHeight: rh, surge: s, wind, windFactor: wf, flood, landslide,
      volcano: volcanoDist <= 3, volcanoDist };
  }

  // Is the tile under water at storm hour t? Used for the animation.
  function floodedAt(r, c, t) {
    if (!W.isLand(r, c) || W.isWaterBody(r, c)) return 0;
    const a = assess(r, c);
    let depth = 0;
    const sh = a.surge.height * curve.surge(t);
    if (sh > a.elev) depth = Math.max(depth, sh - a.elev);
    if (a.riverHeight != null) { const rr = curve.river(t); if (rr > a.riverHeight) depth = Math.max(depth, rr - a.riverHeight); }
    if ((W.code(r, c) === 's' || W.code(r, c) === 'm') && curve.rain(t) > 150) depth = Math.max(depth, 0.4);
    return depth;
  }

  // ---------- site scoring (0–3 stars per need) ----------
  function withinFeatures(r, c, radius) {
    return W.FEATURES.filter(f => W.dist({ r, c }, f) <= radius).map(f => ({ f, d: W.dist({ r, c }, f) }));
  }

  function score(r, c, outcome) {
    const o = outcome || assess(r, c);
    const notes = {};
    // Water
    let water = 0, bestWater = null;
    for (const { f, d } of withinFeatures(r, c, 6)) {
      if (f.cat !== 'water') continue;
      let s = 0;
      if (f.water === 'safe') s = d <= 1 ? 3 : d <= 3 ? 2 : d <= 5 ? 1 : 0;
      if (f.water === 'treat') s = d <= 1 ? 2 : d <= 3 ? 1 : 0;
      if (s > water) { water = s; bestWater = { f, d }; }
    }
    notes.water = bestWater
      ? `${bestWater.f.name} ${bestWater.d === 0 ? 'right on site' : W.metres(bestWater.d) + ' m away'}${bestWater.f.water === 'treat' ? ' (needs filtering and disinfecting)' : ' (safe to drink)'}.`
      : 'No drinkable water within 1.5 km.';
    // Food
    const food = withinFeatures(r, c, 3).filter(x => x.f.food);
    const foodScore = Math.min(3, food.length);
    notes.food = food.length ? `${food.length} food source${food.length > 1 ? 's' : ''} within 750 m: ${[...new Set(food.map(x => x.f.name.toLowerCase()))].join(', ')}.` : 'No food sources within 750 m.';
    // Materials
    const mats = withinFeatures(r, c, 3).filter(x => x.f.material);
    const forestNear = W.neighbours(r, c).concat([{ r, c }]).some(n => W.code(n.r, n.c) === 'f');
    const matScore = Math.min(3, mats.length + (forestNear ? 1 : 0));
    notes.materials = [mats.length ? [...new Set(mats.map(x => x.f.name.toLowerCase()))].join(', ') + ' within 750 m' : '', forestNear ? 'timber from the forest next door' : '']
      .filter(Boolean).join('; ') || 'No building materials close by.';
    notes.materials = notes.materials.charAt(0).toUpperCase() + notes.materials.slice(1) + '.';
    // Access to the landing place
    const dl = W.dist({ r, c }, W.LANDING);
    const access = dl <= 2 ? 3 : dl <= 4 ? 2 : dl <= 6 ? 1 : 0;
    notes.access = `${W.metres(dl)} m from the landing place, where supplies arrive.`;
    // Safety
    let safety = 3; const why = [];
    if (o.flood) { safety = 0; why.push(`Flooded ${o.flood.depth} m deep by ${o.flood.cause === 'surge' ? 'the storm surge' : o.flood.cause === 'river' ? 'the river' : 'rainwater'}.`); }
    if (o.landslide) { safety = 0; why.push('Buried by a landslide from the slope above.'); }
    if (o.wind >= 110) { safety -= 2; why.push(`Wind reached ${o.wind} km/h: shelters were torn apart.`); }
    else if (o.wind >= 85) { safety -= 1; why.push(`Wind reached ${o.wind} km/h: roofs were damaged.`); }
    else why.push(`Wind reached ${o.wind} km/h: shelters held.`);
    if (o.volcano) { safety -= 1; why.push(`Only ${W.metres(o.volcanoDist)} m from an active volcano.`); }
    const nearDanger = withinFeatures(r, c, 1).filter(x => x.f.danger === 'poison' || x.f.danger === 'disease');
    if (nearDanger.length) { safety -= 1; why.push(`Next to ${nearDanger.map(x => x.f.name.toLowerCase()).join(' and ')}.`); }
    safety = Math.max(0, safety);
    notes.safety = why.join(' ');
    // Environment (sustainability)
    let env = 3; const ewhy = [];
    const ch = W.code(r, c);
    if (ch === 'm') { env -= 2; ewhy.push('Building here destroys mangroves that protect the coast and shelter young fish.'); }
    if (ch === 'f') { env -= 1; ewhy.push('Trees must be cleared, removing habitat.'); }
    const protectedNear = withinFeatures(r, c, 1).filter(x => x.f.protect);
    if (protectedNear.length) { env -= 2; ewhy.push(`Disturbs the ${protectedNear.map(x => x.f.name.toLowerCase()).join(' and ')}.`); }
    if (ch === 's') { env -= 1; ewhy.push('Draining the swamp would harm wetland wildlife.'); }
    env = Math.max(0, env);
    notes.environment = ewhy.join(' ') || 'Low impact: open land, no protected habitats next to the site.';
    const scores = { water, food: foodScore, materials: matScore, access, safety, environment: env };
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    return { scores, total, notes };
  }

  // Features that mattered at this site but the team never discovered.
  function missedEvidence(r, c, discovered) {
    const has = new Set(discovered);
    const relevant = [];
    const o = assess(r, c);
    const add = id => { const f = W.feature(id); if (f && !has.has(id) && !relevant.includes(f)) relevant.push(f); };
    if (o.flood && o.flood.cause === 'river') add('flood-debris');
    if (o.flood && o.flood.cause === 'surge') add('driftwood');
    if (o.wind >= 85) add('bent-trees');
    if (o.landslide) add('landslide');
    if (o.volcano) { add('vents'); add('hotspring'); }
    W.FEATURES.forEach(f => {
      if (f.hidden || has.has(f.id)) return;
      const d = W.dist({ r, c }, f);
      if (f.water === 'safe' && d <= 3) add(f.id);
      if (f.protect && d <= 1) add(f.id);
      if ((f.danger === 'poison' || f.danger === 'disease') && d <= 1) add(f.id);
    });
    return relevant;
  }

  OI.storm = { STORM, assess, floodedAt, curve, score, missedEvidence, windFactor, surgeAt };
})();
