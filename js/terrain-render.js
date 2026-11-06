/* Operation Island — realistic terrain painter.
 * Paints the island once, pixel by pixel, from the same height and terrain data the
 * simulations use: organic coastlines, shaded relief, reef shallows, canopy texture.
 * The result is cached and shared by every map on the page.
 */
(function () {
  const W = OI.world;
  const RES = 56; // pixels per map square in the painted image

  // ---- value noise ----
  function h2(x, y) { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct) { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; } return s / norm; }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];

  const C = {
    deep: hex('#0A3550'), ocean: hex('#11587A'), shallow: hex('#2A9DA6'), reef: hex('#6CCFC3'), foam: hex('#E9F4F2'),
    sand: hex('#E3CF9B'), wetSand: hex('#C9B27C'),
    grass: hex('#88A556'), grassDry: hex('#AAAE68'),
    forest: hex('#2E6431'), forestLight: hex('#4C8640'), forestDark: hex('#1D4722'),
    hill: hex('#8E9B58'), rock: hex('#958772'),
    slope: hex('#5E4F45'), ash: hex('#3F3530'), crater: hex('#2A1F1B'), lava: hex('#E8742A'),
    swamp: hex('#5C7246'), pool: hex('#45675F'), mangrove: hex('#355E40'), cliff: hex('#7A7062')
  };
  const ROUGH = { '~': 0, r: 0, b: 0.3, m: 0.2, s: 0.2, g: 1.2, f: 2, h: 6, k: 7, M: 9, V: 6, w: 0.5, l: 0 };

  let cached = null;
  function paint() {
    if (cached) return cached;
    const cols = W.COLS, rows = W.ROWS, Wp = cols * RES, Hp = rows * RES;
    // per-tile fields
    const landAt = (r, c) => (W.inside(r, c) && W.isLand(r, c) ? 1 : 0);
    const elevAt = (r, c) => {
      if (!W.inside(r, c)) return -6;
      if (!W.isLand(r, c)) return W.code(r, c) === 'r' ? -1.5 : -6;
      const ch = W.code(r, c);
      if (ch === 'V') return 52; // crater floor sits below the rim
      return W.elev(r, c);
    };
    const roughAt = (r, c) => ROUGH[W.code(r, c)] || 0;
    function interp(fn, x, y) { // x, y in tile units; samples at tile centres, smoothstep weights
      const u = x - 0.5, v = y - 0.5, c0 = Math.floor(u), r0 = Math.floor(v);
      let tx = u - c0, ty = v - r0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const a = fn(r0, c0), b = fn(r0, c0 + 1), c = fn(r0 + 1, c0), d = fn(r0 + 1, c0 + 1);
      return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
    }
    const E = new Float32Array(Wp * Hp), L = new Float32Array(Wp * Hp), T = new Uint8Array(Wp * Hp), R = new Float32Array(Wp * Hp);
    const volcAt = (r, c) => ('MV'.includes(W.code(r, c)) ? 1 : 0);
    const reefAt = (r, c) => (W.code(r, c) === 'r' ? 1 : 0);
    const crater = { x: W.CRATER.c + 0.5, y: W.CRATER.r + 0.5 };
    const codes = Object.keys(ROUGH);
    for (let py = 0; py < Hp; py++) {
      for (let px = 0; px < Wp; px++) {
        const x = (px + 0.5) / RES, y = (py + 0.5) / RES, i = py * Wp + px;
        const n1 = (fbm(x * 1.1, y * 1.1, 3) - 0.5) * 0.6 + (fbm(x * 4.3 + 3, y * 4.3, 2) - 0.5) * 0.45;
        const n2 = (fbm(x * 1.1 + 31.7, y * 1.1 + 17.3, 3) - 0.5) * 0.6 + (fbm(x * 4.3 + 11, y * 4.3 + 5, 2) - 0.5) * 0.45;
        const wx = x + n1, wy = y + n2;
        const land = interp(landAt, wx, wy) + (fbm(x * 2.6 + 5, y * 2.6 + 9, 3) - 0.5) * 0.3;
        L[i] = land;
        const r = clamp(Math.floor(wy), 0, rows - 1), c = clamp(Math.floor(wx), 0, cols - 1);
        T[i] = codes.indexOf(W.code(r, c));
        let e = interp(elevAt, x, y) + (fbm(x * 3.1, y * 3.1, 4) - 0.5) * interp(roughAt, x, y) * 3;
        // the volcano is a cone with gullies running down from the crater
        const vw = interp(volcAt, x, y);
        if (vw > 0) {
          const d = Math.hypot(x - crater.x, (y - crater.y) * 1.1), ang = Math.atan2(y - crater.y, x - crater.x);
          let cone = 78 - d * 26 + Math.sin(ang * 17 + fbm(x * 2, y * 2, 2) * 9) * 2.4 * clamp((d - 0.45) * 1.5, 0, 1);
          if (d < 0.32) cone = 78 - (0.32 - d) * 70; // crater bowl
          e = lerp(e, Math.max(e, cone), clamp(vw * 1.6, 0, 1));
        }
        E[i] = e;
        R[i] = clamp((interp(reefAt, wx, wy) - 0.3) * 2 + (fbm(x * 6, y * 6, 2) - 0.5), 0, 1);
      }
    }
    const cv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp;
    const g = cv.getContext('2d'); const img = g.createImageData(Wp, Hp); const D = img.data;
    const metresPerPx = W.TILE_M / RES, ex = 7;
    for (let py = 0; py < Hp; py++) {
      for (let px = 0; px < Wp; px++) {
        const i = py * Wp + px, x = (px + 0.5) / RES, y = (py + 0.5) / RES;
        const land = L[i];
        let col;
        if (land < 0.5) {
          const depthT = clamp((0.5 - land) / 0.5, 0, 1);
          col = mix(C.shallow, C.ocean, clamp(depthT * 2.2, 0, 1));
          col = mix(col, C.deep, clamp((depthT - 0.45) * 1.8, 0, 1));
          if (R[i] > 0) { const sp = fbm(x * 9, y * 9, 2); col = mix(col, C.reef, R[i] * clamp(0.35 + sp * 0.6, 0, 0.8)); }
          const ripple = Math.sin((x * 9 + y * 3) + fbm(x * 2, y * 2, 2) * 8) * 0.5 + 0.5;
          col = mix(col, C.foam, 0.03 * ripple * (1 - depthT));
          if (land > 0.455) col = mix(col, C.foam, clamp((land - 0.455) / 0.045, 0, 1) * 0.75);
        } else {
          const ch = codes[T[i]], tex = fbm(x * 7, y * 7, 3), fine = vnoise(x * 26, y * 26);
          const coast = clamp((land - 0.5) / 0.14, 0, 1);
          switch (ch) {
            case 'f': col = mix(C.forestDark, C.forestLight, clamp(tex * 0.9 + fine * 0.55 - 0.3, 0, 1)); break;
            case 'g': case 'w': case 'l': col = mix(C.grass, C.grassDry, clamp(tex * 1.3 - 0.35, 0, 1)); col = mix(col, C.forest, fine > 0.86 ? 0.35 : 0); break;
            case 'h': col = mix(C.hill, C.rock, clamp((E[i] - 18) / 25 + tex * 0.5 - 0.25, 0, 1)); break;
            case 'k': col = mix(C.cliff, C.rock, tex); break;
            case 'M': case 'V': {
              const d = Math.hypot(x - crater.x, y - crater.y);
              col = mix(C.ash, C.slope, clamp(d / 1.6 + tex * 0.35 - 0.1, 0, 1));
              col = mix(col, C.rock, clamp((d - 1.2) * 0.8, 0, 0.5) * fine);
              if (d < 0.34) col = mix(C.crater, col, clamp((d - 0.22) / 0.12, 0, 1));
              if (d < 0.17) col = mix(C.lava, C.crater, clamp(d / 0.17 + (tex - 0.5) * 0.8, 0, 1));
              break;
            }
            case 's': col = tex > 0.56 ? mix(C.pool, C.swamp, (tex - 0.56) * 2) : mix(C.swamp, C.grass, fine * 0.25); break;
            case 'm': col = fine > 0.62 && tex > 0.45 ? C.pool : mix(C.mangrove, C.forestDark, tex * 0.6); break;
            default: col = mix(C.sand, C.wetSand, clamp(fine * 0.5 - 0.1, 0, 0.4));
          }
          // sand and surf line along the coast (cliffs and mangroves keep their edge)
          if (ch !== 'k' && ch !== 'm' && ch !== 'M') col = mix(C.wetSand, col, clamp(coast * 1.6 - 0.05, 0, 1));
          if (ch !== 'k' && ch !== 'm' && ch !== 'M' && ch !== 'b') col = mix(C.sand, col, clamp(coast * 2.2, 0, 1));
          // relief shading: light from the north-west
          const ex0 = E[i - (px > 0 ? 1 : 0)], ex1 = E[i + (px < Wp - 1 ? 1 : 0)];
          const ey0 = E[i - (py > 0 ? Wp : 0)], ey1 = E[i + (py < Hp - 1 ? Wp : 0)];
          const dx = (ex1 - ex0) / (2 * metresPerPx) * ex, dy = (ey1 - ey0) / (2 * metresPerPx) * ex;
          const shade = (dx * 0.6 + dy * 0.6 + 1) / Math.sqrt(dx * dx + dy * dy + 1); // light vector (-0.6,-0.6,1) normalised-ish
          const k = clamp(0.55 + shade * 0.45 - 0.4 * (1 - 1 / Math.sqrt(dx * dx + dy * dy + 1)), 0.45, 1.18);
          col = [col[0] * k, col[1] * k, col[2] * k];
        }
        D[i * 4] = clamp(col[0], 0, 255); D[i * 4 + 1] = clamp(col[1], 0, 255); D[i * 4 + 2] = clamp(col[2], 0, 255); D[i * 4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    cached = cv;
    return cv;
  }

  OI.terrainImage = paint;
  OI.terrainRES = RES;
})();
