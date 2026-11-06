/* Operation Island — the shared island world.
 * Every mission reads this file: terrain, heights, features and expert knowledge.
 * One tile = 250 m. Rows run north (0) to south (12), columns west (A) to east (R).
 */
window.OI = window.OI || {};

(function () {
  const MAP = [
    '~~~~~~~~~~~~~~~~~~',
    '~~~~~~~kkhk~~~~~~~',
    '~~~~~khMMMhk~~~~~~',
    '~~~~bfhMVMMhk~~~~~',
    '~~~bffhMMMhhfk~~~~',
    '~~~bffhhwhhfffb~~~',
    '~~mmgffgwgffffbr~~',
    '~~msggfgwgfffgbr~~',
    '~~msggggwlgffhbr~~',
    '~~~mbggwgghhfbbr~~',
    '~~~~bbwbbbhfbb~~~~',
    '~~~~~~~bbbb~~~~~~~',
    '~~~~~~~~~~~~~~~~~~'
  ];
  const ROWS = MAP.length;
  const COLS = MAP[0].length;
  const TILE_M = 250;
  const LETTERS = 'ABCDEFGHIJKLMNOPQR';
  const LANDING = { r: 11, c: 9 };
  const CRATER = { r: 3, c: 8 };
  // River from the volcano's foot to the south-west mouth.
  const RIVER = [{ r: 5, c: 8 }, { r: 6, c: 8 }, { r: 7, c: 8 }, { r: 8, c: 8 }, { r: 9, c: 7 }, { r: 10, c: 6 }];
  const RIVER_ELEV = { 5: 14, 6: 10, 7: 7, 8: 5, 9: 3, 10: 1 };

  const TERRAIN = {
    '~': { name: 'Open ocean', land: false },
    r: { name: 'Coral reef', land: false },
    b: { name: 'Beach', land: true, elev: 2, ground: 'loose sand', build: 'Poor',
      general: 'Soft sand, driftwood and the sound of waves.',
      hydrologist: 'Groundwater under the sand is salty. Nothing here is safe to drink.',
      biologist: 'Crabs, seabirds and low beach plants.',
      engineer: 'Sand shifts under weight, so foundations are poor. Easy to reach by boat.',
      meteorologist: 'Wide open to the wind coming off the sea.' },
    m: { name: 'Mangrove', land: true, elev: 0.6, ground: 'soft tidal mud', build: 'Poor',
      general: 'Tangled roots standing in shallow, salty water.',
      hydrologist: 'Brackish water, part sea and part fresh. Not drinkable.',
      biologist: 'Young fish and crabs shelter between the roots. Mangroves also soak up the force of storm waves.',
      engineer: 'Too soft and wet to build on.',
      meteorologist: 'Low and sheltered by dense branches.' },
    s: { name: 'Swamp', land: true, elev: 1, ground: 'waterlogged peat', build: 'Poor',
      general: 'Still water, reeds and a buzzing sound everywhere.',
      hydrologist: 'Stagnant water with no flow. Unsafe to drink.',
      biologist: 'Frogs, reeds and many insects.',
      engineer: 'Waterlogged ground: a building would sink.',
      meteorologist: 'Humid and sheltered.' },
    g: { name: 'Grassland', land: true, elev: 5, ground: 'deep, dark soil', build: 'Good',
      general: 'Open, flat meadow with tall grass.',
      hydrologist: 'No surface water, but the soil is damp just below the surface.',
      biologist: 'Grasses, wildflowers, butterflies and grasshoppers.',
      engineer: 'Flat and open: the easiest ground on the island to build on.',
      meteorologist: 'Open land with little to stop the wind.' },
    f: { name: 'Forest', land: true, elev: 8, ground: 'soil bound by roots', build: 'Fair',
      general: 'Tall trees, deep shade and bird calls overhead.',
      hydrologist: 'The ground is damp and shaded. No open water here.',
      biologist: 'A dense canopy full of birds, insects and climbing plants.',
      engineer: 'Plenty of timber, but trees must be cleared before building.',
      meteorologist: 'The trees break the wind.' },
    h: { name: 'Hills', land: true, elev: 20, ground: 'thin, rocky soil', build: 'Fair',
      general: 'Grassy slopes with a wide view across the island.',
      hydrologist: 'Rain runs straight off the slopes. Little water stays up here.',
      biologist: 'Tough shrubs, lizards and soaring birds.',
      engineer: 'Firm ground, but sloping. A site would need levelling.',
      meteorologist: 'Exposed: wind speeds up as it climbs over the ridge.' },
    k: { name: 'Sea cliffs', land: true, elev: 18, ground: 'bare rock', build: 'Poor',
      general: 'Sheer rock walls dropping into the sea.',
      hydrologist: 'Bare rock. No fresh water.',
      biologist: 'Seabirds nest on narrow ledges.',
      engineer: 'Crumbling edges. Not a building site.',
      meteorologist: 'Very exposed to sea winds.' },
    M: { name: 'Volcano slopes', land: true, elev: 45, ground: 'loose ash and lava rock', build: 'Poor',
      general: 'Steep, dark slopes of crumbly black rock.',
      hydrologist: 'Rainwater soaks straight into the porous rock.',
      biologist: 'Very few plants have taken root in the ash.',
      engineer: 'Steep and unstable. Not a building site.',
      meteorologist: 'Exposed and windy near the summit.' },
    V: { name: 'Volcano crater', land: true, elev: 70, ground: 'hot volcanic rock', build: 'Poor',
      general: 'A wide crater with a warm, sulphur-smelling floor.',
      hydrologist: 'No drinkable water. Rain turns to steam on hot rock.',
      biologist: 'Almost nothing lives here.',
      engineer: 'Far too dangerous to build on.',
      meteorologist: 'Gas and steam drift on the wind.' },
    w: { name: 'River', land: true, elev: 5, ground: 'gravel riverbed', build: 'Poor',
      general: 'A clear, fast stream running toward the sea.',
      hydrologist: 'Flowing fresh water. It must be filtered and disinfected before drinking.',
      biologist: 'Small fish, freshwater shrimp and dragonflies.',
      engineer: 'You cannot build in a river channel.',
      meteorologist: 'Cool air flows down the valley.' },
    l: { name: 'Lake', land: true, elev: 4, ground: 'soft lake mud', build: 'Poor',
      general: 'A calm freshwater lake fed by the river.',
      hydrologist: 'Fresh water, but green algae grows at the edges. Needs treatment.',
      biologist: 'Water birds, frogs and reeds.',
      engineer: 'You cannot build on open water.',
      meteorologist: 'Calm surface; mist gathers here in the morning.' }
  };

  const ROLES = [
    { id: 'geologist', name: 'Geologist', icon: '🪨', color: '#8A6A4F', focus: 'Rocks, height above sea level and safe ground' },
    { id: 'hydrologist', name: 'Hydrologist', icon: '💧', color: '#2A7FA8', focus: 'Fresh water: where it is and whether it is safe' },
    { id: 'biologist', name: 'Biologist', icon: '🌿', color: '#3E8A4A', focus: 'Plants, animals, food and the ecosystem' },
    { id: 'engineer', name: 'Engineer', icon: '🛠️', color: '#B4691F', focus: 'Building materials and building sites' },
    { id: 'meteorologist', name: 'Meteorologist', icon: '🌦️', color: '#6A5AA8', focus: 'Wind, weather and storm evidence' }
  ];

  // Features: things a team can discover. roles: 'any' or the experts who notice it.
  // use: water (safe | treat | unsafe), food, material, shelter, danger, clue, wildlife.
  const FEATURES = [
    { id: 'landing', r: 11, c: 9, icon: '⚓', name: 'Landing place', cat: 'access', roles: 'any',
      text: 'Our boat is anchored here. Supplies arrive by sea.' },
    { id: 'spring', r: 8, c: 12, icon: '💧', name: 'Freshwater spring', cat: 'water', water: 'safe', roles: ['hydrologist', 'geologist'],
      text: 'Cold, clear water bubbles out between rocks at the foot of the hill.',
      expert: { hydrologist: 'Test strip: no bacteria detected, pH 7.1. Safe to drink. Flow is about 2 litres per minute.',
        geologist: 'Rainwater filters through the hill rock and comes out clean here.' } },
    { id: 'hotspring', r: 4, c: 10, icon: '♨️', name: 'Hot spring', cat: 'water', water: 'unsafe', roles: ['hydrologist', 'geologist'],
      text: 'Warm water that smells of rotten eggs.',
      expert: { hydrologist: 'High sulphur and dissolved metals. Not drinkable.',
        geologist: 'The water is heated by magma underground. The volcano is not asleep.' } },
    { id: 'vents', r: 2, c: 9, icon: '🌋', name: 'Steam vents', cat: 'danger', danger: 'volcanic', roles: ['geologist'],
      text: 'Steam hisses out of cracks lined with yellow sulphur crystals.',
      expert: { geologist: 'These are fumaroles. The volcano is active, not extinct. Keep settlements well away.' } },
    { id: 'crater', r: 3, c: 8, icon: '🔥', name: 'Active crater', cat: 'danger', danger: 'volcanic', roles: 'any',
      text: 'The crater floor is warm to touch. Do not go further.' },
    { id: 'landslide', r: 5, c: 9, icon: '⛰️', name: 'Landslide scar', cat: 'danger', danger: 'landslide', roles: ['geologist', 'engineer'],
      text: 'A fresh scar where a whole slope of soil slid downhill.',
      expert: { geologist: 'Loose ash soil on a steep slope. Heavy rain could trigger another slide onto the valley below.',
        engineer: 'Anything built at the foot of this slope could be buried.' } },
    { id: 'flood-debris', r: 7, c: 7, icon: '🌊', name: 'Flood debris', cat: 'clue', roles: ['hydrologist', 'meteorologist'],
      text: 'Dried grass and branches are caught in the bushes, well above the ground.',
      expert: { hydrologist: 'The debris line is 1.8 m above the river bank. When it rains hard, the river spreads across this valley.',
        meteorologist: 'Evidence of a big rainstorm in the past. This valley floods.' } },
    { id: 'driftwood', r: 7, c: 14, icon: '🪵', name: 'Storm driftwood', cat: 'clue', roles: ['meteorologist', 'geologist'],
      text: 'Logs and seaweed are piled up far from the water\'s edge.',
      expert: { meteorologist: 'This is a storm line: storm waves have reached 2.5 m above normal sea level here.',
        geologist: 'The beach is only about 2 m high. Storm waves wash right over it.' } },
    { id: 'bent-trees', r: 8, c: 13, icon: '🌬️', name: 'Wind-bent trees', cat: 'clue', roles: ['meteorologist', 'biologist'],
      text: 'Every tree on this ridge leans the same way, toward the west.',
      expert: { meteorologist: 'Strong winds usually blow in from the east. Storms will hit the east side hardest.',
        biologist: 'The trees have grown bent over many years of strong east winds.' } },
    { id: 'turtles', r: 6, c: 14, icon: '🐢', name: 'Turtle nesting beach', cat: 'wildlife', protect: true, roles: ['biologist'],
      text: 'Tracks lead up the sand to buried nests.',
      expert: { biologist: 'Green sea turtles nest here. They are endangered: lights, noise and buildings would drive them away.' } },
    { id: 'birds', r: 1, c: 9, icon: '🐦', name: 'Seabird colony', cat: 'wildlife', protect: true, roles: ['biologist', 'any'],
      text: 'Hundreds of seabirds nest on the cliff ledges.',
      expert: { biologist: 'Their droppings fertilise the soil below, and their eggs are a food source, if harvested carefully.' } },
    { id: 'coconuts-east', r: 5, c: 14, icon: '🥥', name: 'Coconut palms', cat: 'food', food: true, roles: 'any',
      text: 'A grove of coconut palms heavy with fruit.',
      expert: { biologist: 'Coconuts give food, drink and fibre for rope.', engineer: 'Palm trunks and fibre are useful for light building.' } },
    { id: 'coconuts-south', r: 10, c: 12, icon: '🥥', name: 'Coconut palms', cat: 'food', food: true, roles: 'any',
      text: 'Coconut palms lean over the sand.' },
    { id: 'reef-fish', r: 9, c: 14, icon: '🐟', name: 'Reef fishing', cat: 'food', food: true, roles: ['biologist'],
      text: 'The reef just offshore is full of life.',
      expert: { biologist: 'Fish, octopus and sea cucumbers: a rich food source if it is not overfished.' } },
    { id: 'breadfruit', r: 7, c: 10, icon: '🍈', name: 'Breadfruit and bananas', cat: 'food', food: true, roles: ['biologist'],
      text: 'Large green fruits hang from wide-leaved trees.',
      expert: { biologist: 'Breadfruit and wild bananas: filling, safe food that grows all year.' } },
    { id: 'boar', r: 4, c: 5, icon: '🐗', name: 'Wild boar tracks', cat: 'food', food: true, roles: ['biologist'],
      text: 'Churned-up mud and hoof prints.',
      expert: { biologist: 'Wild boar live here. A food source, but they are strong and can be aggressive.' } },
    { id: 'fertile', r: 8, c: 5, icon: '🌱', name: 'Fertile soil', cat: 'food', food: true, roles: ['biologist', 'geologist'],
      text: 'Dark, crumbly soil full of worms.',
      expert: { geologist: 'Silt left behind by river floods plus volcanic ash: some of the richest soil on the island.',
        biologist: 'Ideal for growing crops.' } },
    { id: 'manchineel', r: 5, c: 3, icon: '☠️', name: 'Manchineel trees', cat: 'danger', danger: 'poison', roles: ['biologist'],
      text: 'Small trees with shiny green "beach apples".',
      expert: { biologist: 'Manchineel: one of the most poisonous trees in the world. Its fruit is toxic and its sap burns skin, even rain dripping off the leaves.' } },
    { id: 'mosquitoes', r: 7, c: 3, icon: '🦟', name: 'Mosquito swarms', cat: 'danger', danger: 'disease', roles: 'any',
      text: 'Clouds of mosquitoes rise from the still water.',
      expert: { biologist: 'They breed in stagnant water. Mosquitoes can spread diseases such as dengue and malaria.' } },
    { id: 'mangrove-nursery', r: 6, c: 2, icon: '🦀', name: 'Mangrove nursery', cat: 'wildlife', protect: true, roles: ['biologist'],
      text: 'Thousands of tiny fish dart between the roots.',
      expert: { biologist: 'The reef\'s fish grow up here. Mangroves also break storm waves before they reach the land.' } },
    { id: 'bamboo', r: 6, c: 7, icon: '🎋', name: 'Bamboo grove', cat: 'material', material: true, roles: ['engineer', 'biologist'],
      text: 'Tall stands of bamboo along the river.',
      expert: { engineer: 'Light, strong and flexible: excellent for frames and walls. It regrows within a few years.' } },
    { id: 'clay', r: 9, c: 8, icon: '🧱', name: 'Clay bank', cat: 'material', material: true, roles: ['engineer', 'geologist'],
      text: 'Sticky red clay in the river bank.',
      expert: { engineer: 'This clay can be shaped and dried into bricks.', geologist: 'Fine clay washed down from the volcanic hills.' } },
    { id: 'basalt', r: 9, c: 11, icon: '🪨', name: 'Basalt rock', cat: 'material', material: true, roles: ['geologist', 'engineer'],
      text: 'Dark, heavy boulders stick out of the hillside.',
      expert: { geologist: 'Basalt: cooled lava from long ago. Hard and solid.', engineer: 'Excellent stone for foundations.' } },
    { id: 'hardwood', r: 7, c: 11, icon: '🌳', name: 'Hardwood trees', cat: 'material', material: true, roles: ['engineer'],
      text: 'Tall, straight trees with dense wood.',
      expert: { engineer: 'Strong beams and posts. Cut carefully and replant so the forest recovers.' } },
    { id: 'cave', r: 9, c: 10, icon: '🕳️', name: 'Dry cave', cat: 'shelter', roles: 'any',
      text: 'A dry cave in the hillside, big enough for six people.',
      expert: { geologist: 'Solid rock roof with no cracks: a good emergency shelter.' } },
    { id: 'aloe', r: 10, c: 11, icon: '🪴', name: 'Aloe plants', cat: 'food', roles: ['biologist'],
      text: 'Spiky plants full of clear gel.',
      expert: { biologist: 'Aloe vera: the gel soothes burns and cuts. A natural first-aid kit.' } }
  ];
  // River and lake tiles carry their own water features.
  RIVER.forEach((t, i) => FEATURES.push({ id: 'river-' + i, r: t.r, c: t.c, icon: '🏞️', name: 'River water', cat: 'water', water: 'treat', roles: 'any', hidden: true,
    text: 'Fresh water flows past here.',
    expert: { hydrologist: 'Cloudy after rain. Filter and disinfect (boil or treat) before drinking.' } }));
  FEATURES.push({ id: 'lake', r: 8, c: 9, icon: '🏞️', name: 'Lake water', cat: 'water', water: 'treat', roles: 'any', hidden: true,
    text: 'A freshwater lake.', expert: { hydrologist: 'Some algae. Filter and disinfect before drinking.' } });

  // Setting sail: what the team packs. effect = what it changes on the island.
  const KIT_LIMIT = 15; // kg the helicopter can carry for team equipment
  const KIT = [
    { id: 'tablets', name: 'Water purification tablets', kg: 1, need: 'Water', pillar: 'Environment' },
    { id: 'testkit', name: 'Water test kit', kg: 1, need: 'Water', pillar: 'Environment', effect: 'The Hydrologist can test whether water is safe to drink.' },
    { id: 'jerrycans', name: 'Two full 20-litre water cans', kg: 40, need: 'Water', pillar: 'Environment' },
    { id: 'pot', name: 'Cooking pot (boils water)', kg: 2, need: 'Water', pillar: 'Environment' },
    { id: 'rations', name: 'Food rations for 3 days', kg: 6, need: 'Food', pillar: 'Environment', effect: '+2 survey hours: less time spent looking for food.' },
    { id: 'fishing', name: 'Fishing kit', kg: 1, need: 'Food', pillar: 'Environment' },
    { id: 'seeds', name: 'Seeds for planting', kg: 1, need: 'Food', pillar: 'Economy' },
    { id: 'tarp', name: 'Tarpaulin and rope', kg: 4, need: 'Shelter', pillar: 'Society' },
    { id: 'tent', name: 'Tent', kg: 6, need: 'Shelter', pillar: 'Society' },
    { id: 'firstaid', name: 'First-aid kit', kg: 2, need: 'Health', pillar: 'Society' },
    { id: 'nets', name: 'Mosquito nets', kg: 1, need: 'Health', pillar: 'Society' },
    { id: 'radio', name: 'Hand-held radio', kg: 2, need: 'Communication', pillar: 'Society', effect: 'You hear GHA radio messages, including storm warnings.' },
    { id: 'torches', name: 'Head torches', kg: 1, need: 'Safety', pillar: 'Society', effect: '+2 survey hours: you can keep working after sunset.' },
    { id: 'tools', name: 'Multi-tool and machete', kg: 2, need: 'Tools', pillar: 'Economy' },
    { id: 'mapkit', name: 'Compass, notebook and pencils', kg: 1, need: 'Tools', pillar: 'Economy' },
    { id: 'solar', name: 'Solar phone charger', kg: 2, need: 'Energy', pillar: 'Economy' },
    { id: 'speaker', name: 'Music speaker', kg: 1, need: 'Comfort', pillar: 'Society' }
  ];
  const NEEDS = ['Water', 'Food', 'Shelter', 'Health', 'Safety', 'Communication', 'Tools', 'Energy'];

  // ---------- geometry helpers ----------
  const key = (r, c) => r + ',' + c;
  const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const code = (r, c) => (inside(r, c) ? MAP[r][c] : '~');
  const terrain = (r, c) => TERRAIN[code(r, c)];
  const isLand = (r, c) => !!terrain(r, c).land;
  const isWaterBody = (r, c) => code(r, c) === 'w' || code(r, c) === 'l';
  const grid = (r, c) => LETTERS[c] + (r + 1);
  const dist = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
  function neighbours(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && inside(r + dr, c + dc)) out.push({ r: r + dr, c: c + dc });
    }
    return out;
  }
  function hash(r, c) { const x = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453; return x - Math.floor(x); }

  // ---------- heights ----------
  const ELEV = [];
  const RIVER_H = []; // height above the normal river level, for tiles beside the river
  for (let r = 0; r < ROWS; r++) {
    ELEV.push([]); RIVER_H.push([]);
    for (let c = 0; c < COLS; c++) {
      const t = terrain(r, c);
      let e = t.land ? t.elev : 0;
      const ch = code(r, c);
      if ('gfhkM'.includes(ch)) e += Math.max(0, 8 - r) * 1.5 + hash(r, c) * 3;
      if (ch === 'b') e = 1.6 + hash(r, c) * 0.6;
      if (ch === 'w') e = RIVER_ELEV[r];
      if (ch === 'l') e = 4.5;
      let rh = null;
      if (t.land && !isWaterBody(r, c)) {
        const nearRiver = neighbours(r, c).filter(n => isWaterBody(n.r, n.c));
        if (nearRiver.length) {
          const riverLevel = Math.min(...nearRiver.map(n => code(n.r, n.c) === 'l' ? 4.5 : RIVER_ELEV[n.r]));
          if ('gsbm'.includes(ch)) rh = 1.6 + hash(c, r) * 0.8;
          else if (ch === 'f') rh = 4 + hash(c, r);
          else rh = 9 + hash(c, r) * 4;
          e = Math.max(e, riverLevel + rh);
          if ('gsbm'.includes(ch)) e = riverLevel + rh;
        }
      }
      ELEV[r].push(Math.round(e * 10) / 10);
      RIVER_H[r].push(rh == null ? null : Math.round(rh * 10) / 10);
    }
  }

  function featuresAt(r, c) { return FEATURES.filter(f => f.r === r && f.c === c); }
  function feature(id) { return FEATURES.find(f => f.id === id); }
  function canSee(f, role) { return f.roles === 'any' || f.roles.includes('any') || f.roles.includes(role); }

  OI.world = {
    KIT, KIT_LIMIT, NEEDS,
    MAP, ROWS, COLS, TILE_M, LETTERS, LANDING, CRATER, RIVER, TERRAIN, ROLES, FEATURES,
    key, inside, code, terrain, isLand, isWaterBody, grid, dist, neighbours, hash,
    elev: (r, c) => ELEV[r][c],
    riverHeight: (r, c) => RIVER_H[r][c],
    featuresAt, feature, canSee,
    role: id => ROLES.find(x => x.id === id),
    metres: tiles => tiles * TILE_M
  };
})();
