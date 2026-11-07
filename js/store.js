/* Operation Island — saved progress (this browser only).
 * Everything lives in one object so later missions can read what earlier missions decided.
 */
(function () {
  const KEY = 'operation-island-v1';

  function freshExploration() {
    return {
      phase: 'briefing', lead: 'geologist', packed: null,
      scouted: {}, discovered: ['landing'], journal: [], hoursUsed: 0, radio: [],
      firstPin: null, firstReasons: [], base: null, prediction: null, attempts: [],
      debrief: {}, completed: false
    };
  }
  function freshWater() {
    return { phase: 'briefing', challenge: false, answers: {}, design: OI.water.defaultDesign(), prediction: null, attempts: [], pendingTest: false, debrief: {}, completed: false };
  }
  function freshBuild() {
    return { phase: 'briefing', design: { sticks: [], material: 'bamboo', roof: 'thatch', straps: false }, settings: { magnitude: 6, wind: 130 }, prediction: null, attempts: [], pendingTest: false, debrief: {}, completed: false };
  }
  function freshPower() {
    return { phase: 'briefing', answers: {}, design: OI.power.defaultDesign(), prediction: null, attempts: [], pendingTest: false, debrief: {}, completed: false };
  }
  function fresh() {
    return {
      version: 1,
      team: { name: '', members: {} },
      settings: { hours: 20 },
      exploration: freshExploration(),
      water: freshWater(),
      build: freshBuild(),
      power: freshPower(),
      log: {} // the Island Log: results each mission leaves behind for the next
    };
  }

  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || state.version !== 1) state = fresh();
  state.exploration = Object.assign(freshExploration(), state.exploration);
  state.water = Object.assign(freshWater(), state.water);
  state.water.design = Object.assign(OI.water.defaultDesign(), state.water.design);
  state.build = Object.assign(freshBuild(), state.build);
  state.power = Object.assign(freshPower(), state.power);
  state.power.design = Object.assign(OI.power.defaultDesign(), state.power.design);
  state.power.design.on = Object.assign(OI.power.defaultDesign().on, state.power.design.on);
  // the landing place is always known
  const lk = OI.world.key(OI.world.LANDING.r, OI.world.LANDING.c);
  if (!state.exploration.scouted[lk]) state.exploration.scouted[lk] = ['any'];

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: progress lasts for this visit */ } }

  OI.store = {
    get: () => state,
    save,
    resetExploration() {
      state.exploration = freshExploration();
      state.exploration.scouted[lk] = ['any'];
      delete state.log.exploration;
      save();
    },
    resetPower() { state.power = freshPower(); delete state.log.power; save(); },
    resetBuild() { state.build = freshBuild(); delete state.log.build; save(); },
    resetWater() { state.water = freshWater(); delete state.log.water; save(); },
    resetAll() { state = fresh(); state.exploration.scouted[lk] = ['any']; save(); }
  };
})();
