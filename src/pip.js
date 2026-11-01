// pip.js: Pip, the little bird companion, painted in watercolour and ink.
// Plump, pear-shaped silhouette (approx 7.2u wide at belly, 5.2u at head, 8.5u tall with head tuft).
// Two little wings that gesture, flap, and hold props; two stubby pattering feet; a soft cream tummy;
// a bouncy feather crest (tuft) on top; and an expressive beak and button eyes.
// (x, y) is the ground point between the feet.
//
// Body-local coordinates in the front view:
//   Body center: (0, -5u). Feet reach y = 0. Head top at y = -8.2u, head tuft reaches y ≈ -10.5u.
//   Eye centers: (±1.7u, -5.9u). Beak at (0, -5.1u). Tummy patch at (0, -4.3u).
//   Wings pivot at (±3.4u, -4.8u) and are ~2.4u long.
//   o.armL / o.armR hooks are called at the wing tip in wing space (+x runs outward along wing).

// ---------- views ----------
// Five key views: front, q (3/4 right), side (profile right), qback (3/4 back right), back.
// flip: true mirrors any view to face screen-left.
const PIP_VIEWS = {
  front: {
    w: 7.2, hw: 5.2, cx: 0, fw: 1, sides: [-1, 1], eyeDist: 1.65, mx: 0, bx: 0, bw: 1,
    tuftX: 0, tuftAngle: 0, tailX: 0, tailY: -2.4, showTail: false,
    legs: [[-1.3, 0], [1.3, 0]],
    wings: [[-3.4, -1, 'L', 0], [3.4, 1, 'R', 0]],
    hatX: 0, hatW: 1
  },
  q: {
    w: 7.0, hw: 5.0, cx: 0.8, fw: 0.8, sides: [-1, 1], eyeDist: 1.4, mx: 0.35, bx: 0.6, bw: 0.85,
    tuftX: -0.4, tuftAngle: -0.2, tailX: -3.0, tailY: -2.7, showTail: true,
    stripSide: -1, seam: -1.2,
    legs: [[-0.8, 1], [1.4, 0]],
    wings: [[-2.8, -1, 'L', 2], [2.0, 1, 'R', 1]],
    hatX: 0.5, hatW: 0.92
  },
  side: {
    w: 6.2, hw: 4.8, cx: 1.0, fw: 0.55, sides: [1], eyeDist: 0.95, mx: 2.8, bx: 1.5, bw: 0.6,
    tuftX: -0.8, tuftAngle: -0.35, tailX: -2.8, tailY: -2.7, showTail: true,
    legs: [[-0.9, 1], [1.1, 0]],
    wings: [[-0.2, 0, 'L', 1]],
    hatX: 0.3, hatW: 0.78
  },
  qback: {
    w: 7.0, hw: 5.0, cx: 0, fw: 0, sides: [], mx: 0, bx: 0, bw: 0,
    tuftX: 0.4, tuftAngle: 0.2, tailX: -2.8, tailY: -2.7, showTail: true, back: true,
    stripSide: 1, seam: 1.2,
    legs: [[1.4, 0], [-0.8, 1]],
    wings: [[2.8, 1, 'R', 2], [-2.0, -1, 'L', 1]],
    hatX: -0.4, hatW: 0.92
  },
  back: {
    w: 7.2, hw: 5.2, cx: 0, fw: 0, sides: [], mx: 0, bx: 0, bw: 0,
    tuftX: 0, tuftAngle: 0, tailX: 0, tailY: -2.4, showTail: true, back: true,
    legs: [[-1.3, 0], [1.3, 0]],
    wings: [[-3.4, -1, 'R', 0], [3.4, 1, 'L', 0]],
    hatX: 0, hatW: 1
  }
};

let PIP_N = 0;

// Key view for a heading in turns: 0 = front, .25 = facing right, .5 = back, -.25 = facing left.
function spinPipView(a) {
  const K = [['front', 0], ['q', 0], ['side', 0], ['qback', 0], ['back', 0], ['qback', 1], ['side', 1], ['q', 1]];
  const [view, f] = K[((Math.round(a * 8) % 8) + 8) % 8]; return { view, flip: !!f };
}

function pipTurn(t, t0, t1, a0, a1) {
  const k = ease(seg(t, t0, t1)), v = spinPipView(lerp(a0, a1, k));
  return { ...v, smear: t > t0 && t < t1 ? .55 * Math.sin(k * Math.PI) : 0, smearDir: 0 };
}

// ---------- colour palettes & tints ----------
const PIP_PALETTES = {
  teal:   { col: '#3EA59F', dk: '#25706C', lt: '#7CD1CC', belly: '#FFF7E6', beak: '#E06B43', feet: '#E06B43' },
  ochre:  { col: '#EAA93C', dk: '#B5741B', lt: '#F7D07E', belly: '#FFFBF0', beak: '#D85A32', feet: '#D85A32' },
  blue:   { col: '#5B9BD5', dk: '#366A9E', lt: '#98C5EE', belly: '#FFF9ED', beak: '#E87D3E', feet: '#E87D3E' },
  rose:   { col: '#E5839B', dk: '#B04B67', lt: '#F7B7C7', belly: '#FFF7EB', beak: '#D96541', feet: '#D96541' },
  sap:    { col: '#6E9F58', dk: '#457332', lt: '#A3CB8F', belly: '#FFF9ED', beak: '#DF723E', feet: '#DF723E' },
  cream:  { col: '#F4ECE1', dk: '#C5B5A0', lt: '#FFFFFF', belly: '#FFFFFF', beak: '#EAA036', feet: '#EAA036' }
};

function pipCols(o) {
  const base = PIP_PALETTES[o.palette] || PIP_PALETTES.teal;
  const col = o.col || base.col, dk = o.dk || base.dk, lt = o.lt || base.lt;
  const belly = o.belly || base.belly, beak = o.beakCol || base.beak, feet = o.feetCol || base.feet;
  if (!o.tint) return { col, dk, lt, belly, beak, feet };
  const tc = TINT[o.tint] || o.tint, k = clamp(o.tintK ?? 1);
  return {
    col: mixCol(col, tc, .55 * k),
    dk: mixCol(dk, mixCol(tc, PAL.ink, .35), .5 * k),
    lt: mixCol(lt, mixCol(tc, '#FFFFFF', .4), .45 * k),
    belly, beak, feet
  };
}

// ---------- Pip main render function ----------
function pip(x, y, u, o = {}) {
  const id = o.boilKey ?? ++PIP_N, rs = part => boilSeed(`pip ${id} ${part}`);
  x += (o.dx || 0) * u;
  const V = PIP_VIEWS[o.view] || PIP_VIEWS.front;
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const sw = clamp(u / 14, .45, 2.4) * (o.swMul || 1), J = u * .06;
  const { col, dk, lt, belly, beak, feet } = pipCols(o);
  const far = mixCol(dk, PAL.ink, .25);

  rs('shadow');
  if (!o.noShadow) {
    const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06);
    const swidth = (V.w * 0.72) * u * f;
    paint(ellPts(x, y + u * .12, swidth, u * 0.9 * f, 22), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null });
  }

  if (sm > .05) pipSmearTrail(x, y + dy, u, V, sm, o.smearDir ?? (o.flip ? -1 : 1), col);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  // waddle rotation if walking
  if (o.walk != null && !o.rot) {
    const waddle = Math.sin(o.walk * TAU) * 0.08;
    rotate(waddle);
  }
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55) * (1 + sm * .35), (o.sy ?? 1) * (1 - sq));

  // --- Wing render helper ---
  const wing = ([px, dir, which, layer]) => {
    rs('wing' + which);
    const baseA = which === 'L' ? (o.aL ?? -0.65) : (o.aR ?? -0.65);
    const flapA = o.flap ? Math.sin((T * 26 + (which === 'L' ? 0 : 0.4))) * 0.65 : 0;
    const a = baseA + flapA;
    const hook = which === 'L' ? o.armL : o.armR;

    push();
    translate(px * u, -4.8 * u);
    if (dir === 0) { // side view near wing
      rotate(0.35 - a);
      pipWingShape(u, sw, J, layer === 2 ? mixCol(col, dk, .35) : col, dk, sw * .8);
      if (hook) { translate(2.2 * u, 0); hook(u, sw); }
    } else {
      rotate(dir < 0 ? a : -a);
      if (dir < 0) scale(-1, 1);
      pipWingShape(u, sw, J, layer === 2 ? mixCol(col, dk, .35) : col, dk, sw * .8);
      if (hook) {
        translate(2.2 * u, 0);
        if (dir < 0) scale(-1, 1);
        hook(u, sw);
      }
    }
    pop();
  };

  // 1. Far wings (behind body)
  V.wings.filter(w => w[3] !== 1).forEach(wing);

  // 2. Tail (drawn behind body for natural silhouette & fanned feathers)
  if (V.showTail) {
    rs('tail');
    pipTail(u, sw, J, V, col, dk, o);
  }

  // 3. Legs & Feet (under body)
  if (!o.noLegs) {
    V.legs.forEach(([lx, isFar], i) => {
      rs('leg' + i);
      let stepH = 2.0, stepX = 0, toeRot = 0;
      if (o.walk != null) {
        const ph = (o.walk + (i === 0 ? 0 : .5)) * TAU;
        stepX = Math.sin(ph) * .45;
        const lift = Math.max(0, Math.cos(ph));
        stepH = 2.0 - lift * 0.7;
        toeRot = Math.sin(ph) * 0.2;
      }
      pipFoot(u, sw, J, lx + stepX, stepH, toeRot, isFar ? mixCol(feet, PAL.ink, .25) : feet, isFar ? far : dk);
    });
  }

  // 4. Main Body (pear/dumpling shape)
  rs('body');
  const bodyPts = pipBodyGeometry(u, J, V);
  paint(bodyPts, { wash: col, washOp: 255, ink: null, curv: .35 });

  // Top highlight wash
  const hx = V.stripSide ? -V.stripSide * 0.8 : 0;
  paint(ellPts(hx * u, -6.8 * u, u * 1.8, u * 1.1, 16, J * 1.5, -.06), { fill: lt, fillOp: 110, bleed: .22, tex: .8, border: .7, ink: null });

  // Bottom shadow wash
  paint(ellPts(0, -2.5 * u, u * (V.w * 0.42), u * 1.2, 18, J), { fill: dk, fillOp: 125, bleed: .06, tex: .6, border: .4, ink: null });

  // Side strip shading (for 3/4 depth) - strictly clamped to pear geometry
  if (V.stripSide) {
    pipStripShading(u, sw, J, V, bodyPts, dk);
  }

  // Soft cream tummy patch
  if (V.bw > 0.05) {
    rs('belly');
    pipBelly(u, sw, J, V, belly);
  }

  // Ink outline of the body
  paint(bodyPts, { ink: PAL.ink, sw, curv: .35 });

  // Gloom on forehead
  if (o.gloom > .02) pipGloom(u, sw, V, o.gloom);

  // Face features (eyes, beak, blush)
  if (V.sides.length > 0) {
    rs('face');
    push();
    translate(V.cx * u, 0);
    scale(V.fw, 1);

    if (o.blush) pipBlush(u, sw, V, o.blush === true ? 1 : o.blush);

    rs('eyes');
    pipEyes(u, o, sw, V.sides, sm, V.eyeDist);

    rs('beak');
    push();
    translate(V.mx * u, 0);
    pipBeak(u, o.mouth || o.beak, sw, beak, V);
    pop();

    pop();
  }

  // 5. Head Tuft / Crest (signature bouncy feathers)
  rs('tuft');
  push();
  translate(V.tuftX * u, -8.1 * u);
  rotate(V.tuftAngle);
  pipTuft(u, sw, J, col, dk, lt, o);
  pop();

  // 6. Hat / Accessories
  if (o.hat) {
    rs('hat');
    push();
    translate(V.hatX * u, -0.4 * u);
    scale(V.hatW, 1);
    hat(u, o.hat, sw);
    pop();
  }

  // 7. Near wings (in front of body)
  V.wings.filter(w => w[3] === 1).forEach(wing);

  // 8. Custom draw hook
  rs('draw');
  if (o.draw) o.draw(u, sw);

  pop();

  // 9. Emotes
  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const ex = top ? x + dir * V.hatX * u : x + dir * (V.w * 0.5 + 0.6) * u;
    const ey = y + dy + (top ? -11.2 : -9.2) * u * (1 - sq);
    emote(o.emote, ex, ey, u * .85, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// ---------- Geometry helpers ----------
// Plump pear body outline
function pipBodyGeometry(u, j, V) {
  const pts = [];
  const n = 28;
  const cx = 0, cy = -4.9 * u;
  const rw = (V.w * 0.5) * u, rh = 3.3 * u;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const sa = Math.sin(a), ca = Math.cos(a);
    // pear modulation: wider at bottom (sa < 0), narrower at head (sa > 0)
    const factor = 1.0 - 0.22 * sa;
    const px = cx + ca * rw * factor + jit(j);
    const py = cy - sa * rh + jit(j);
    pts.push([px, py]);
  }
  return pts;
}

// Belly patch: soft rounded egg patch (curves around front breast in side view)
function pipBelly(u, sw, j, V, bellyCol) {
  const isSide = V === PIP_VIEWS.side;
  const bx = V.bx * u, by = isSide ? -4.1 * u : -4.3 * u;
  const bw = (2.2 * V.bw) * u, bh = isSide ? 2.5 * u : 2.1 * u;
  const pts = ellPts(bx, by, bw, bh, 20, j * 0.6, isSide ? -0.15 : 0);
  paint(pts, { wash: bellyCol, washOp: 255, fill: '#FFF1D6', fillOp: 50, ink: null, curv: .3 });
  // subtle delicate ink outline
  inkLine(pts, sw * .4, mixCol(PAL.ink, bellyCol, .4), 'inkfine', .4);
}

// Signature head tuft: 2 bouncy curved feathers
function pipTuft(u, sw, j, col, dk, lt, o) {
  const bp = bpOf(T);
  const idleSway = Math.sin(bp * Math.PI) * 0.12;
  const flapSway = o.flap ? Math.sin(T * 28) * 0.25 : 0;
  const sway = idleSway + flapSway;

  push();
  rotate(sway);
  // Main taller feather
  const f1 = [
    [-0.3 * u, 0],
    [-0.7 * u + jit(j), -1.2 * u],
    [-0.8 * u + jit(j), -2.2 * u],
    [-0.2 * u, -2.4 * u],
    [0.3 * u + jit(j), -1.8 * u],
    [0.2 * u, 0]
  ];
  paint(f1, { wash: col, fill: lt, fillOp: 90, ink: PAL.ink, sw: sw * .75, curv: .4 });

  // Secondary slightly smaller feather behind
  push();
  translate(-0.4 * u, 0.1 * u);
  rotate(-0.25 + sway * 0.5);
  const f2 = [
    [-0.25 * u, 0],
    [-0.6 * u + jit(j), -0.9 * u],
    [-0.65 * u + jit(j), -1.7 * u],
    [-0.1 * u, -1.85 * u],
    [0.25 * u, -1.2 * u],
    [0.15 * u, 0]
  ];
  paint(f2, { wash: mixCol(col, dk, .3), fill: dk, fillOp: 80, ink: PAL.ink, sw: sw * .65, curv: .4 });
  pop();

  pop();
}

// Strip shading along the 3/4 receding flank: soft organic watercolour volume without a harsh mechanical ink line
function pipStripShading(u, sw, j, V, bodyPts, dk) {
  const seamX = V.seam * u;
  const isLeft = V.stripSide === -1;
  const filtered = bodyPts.filter(p => isLeft ? (p[0] <= seamX + 0.15 * u) : (p[0] >= seamX - 0.15 * u));
  if (filtered.length >= 3) {
    let minY = 0, maxY = -Infinity;
    for (const p of filtered) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const patch = isLeft
      ? [...filtered, [seamX, maxY], [seamX, minY]]
      : [[seamX, minY], [seamX, maxY], ...filtered];
    paint(patch, { fill: dk, fillOp: 110, bleed: .1, tex: .6, border: .3, ink: null });
  }
}

// Tail: cute fanned feathers with beat-locked wagging
function pipTail(u, sw, j, V, col, dk, o) {
  const bp = bpOf(T);
  const wag = Math.sin(bp * TAU) * 0.15;
  const tx = (V.tailX || 0) * u, ty = (V.tailY || -2.7) * u;

  push();
  translate(tx, ty);

  if (V === PIP_VIEWS.back) {
    // Back view: tail emerging from lower back/rump, fanning DOWNWARDS and OUTWARDS
    rotate(wag * 0.5);
    for (let k = -1; k <= 1; k++) {
      push();
      rotate(k * 0.28);
      const feather = [
        [-0.4 * u, 0],
        [-0.55 * u + jit(j), 1.0 * u],
        [0, 1.7 * u + jit(j)],
        [0.55 * u + jit(j), 1.0 * u],
        [0.4 * u, 0]
      ];
      paint(feather, { wash: k === 0 ? col : mixCol(col, dk, .3), fill: dk, fillOp: 60, ink: PAL.ink, sw: sw * .65, curv: .35 });
      pop();
    }
  } else {
    // Side, 3/4, and 3/4-back views: fan of 3 feathers pointing OUT-LEFT (-x)
    rotate(wag);
    for (let k = -1; k <= 1; k++) {
      push();
      rotate(k * 0.25 - 0.1);
      const feather = [
        [0, -0.35 * u],
        [-1.3 * u + jit(j), -0.55 * u],
        [-2.0 * u + jit(j), 0],
        [-1.3 * u + jit(j), 0.55 * u],
        [0, 0.35 * u]
      ];
      paint(feather, { wash: k === 0 ? col : mixCol(col, dk, .35), fill: dk, fillOp: 60, ink: PAL.ink, sw: sw * .65, curv: .35 });
      pop();
    }
  }
  pop();
}

// Wing shape: cute teardrop wing with 3 feather scallops
function pipWingShape(u, sw, j, col, dk, strokeW) {
  const wingPts = [
    [0, -0.6 * u],
    [1.3 * u + jit(j), -0.8 * u],
    [2.3 * u + jit(j), -0.1 * u], // tip
    [2.2 * u + jit(j), 0.6 * u],
    [1.4 * u + jit(j), 0.9 * u],
    [0.4 * u + jit(j), 0.7 * u],
    [-0.2 * u, 0.2 * u]
  ];
  paint(wingPts, { wash: col, washOp: 255, fill: dk, fillOp: 70, ink: PAL.ink, sw: strokeW, curv: .35 });
}

// Foot: cute ankle + rounded two/three toes resting exactly on floor (y = 0)
function pipFoot(u, sw, j, lx, h, toeRot, footCol, shadowCol) {
  push();
  translate(lx * u, -h * u);
  // Ankle/leg
  paint(rectPts(-0.25 * u, 0, 0.5 * u, h * u - 0.25 * u, j * 0.4), { wash: footCol, ink: PAL.ink, sw: sw * .65 });
  // Toes on ground (bottom touches y = 0 exactly)
  translate(0, h * u - 0.25 * u);
  rotate(toeRot);
  const toes = [
    [-0.55 * u, -0.15 * u],
    [-0.7 * u + jit(j), 0.25 * u],
    [-0.25 * u + jit(j), 0.25 * u],
    [0.1 * u + jit(j), 0.25 * u],
    [0.55 * u + jit(j), 0.25 * u],
    [0.7 * u + jit(j), 0.2 * u],
    [0.55 * u, -0.15 * u]
  ];
  paint(toes, { wash: footCol, fill: shadowCol, fillOp: 60, ink: PAL.ink, sw: sw * .7, curv: .3 });
  pop();
}

// ---------- Eyes & Beak ----------
function pipEyes(u, o, sw, sides, smear = 0, eyeDist = 1.65) {
  const kinds = Array.isArray(o.eyes) ? o.eyes : o.eyes === 'wink' ? ['happy', 'normal'] : [o.eyes || 'normal', o.eyes || 'normal'];
  const sqz = clamp(o.squint || 0);

  if (smear > .5) {
    for (const s of sides) inkLine([[s * eyeDist * u - .7 * u, -5.9 * u], [s * eyeDist * u + .7 * u, -5.9 * u]], sw * 1.3, PAL.ink, 'ink', 0);
    return;
  }
  if (sqz > .8) {
    for (const s of sides) inkLine([[s * eyeDist * u - .6 * u, -5.9 * u], [s * eyeDist * u + .6 * u, -5.9 * u]], sw, PAL.ink, 'ink', 0);
    return;
  }
  if (kinds[0] === 'shades') {
    pipSunglasses(u, sw, sides, eyeDist);
    return;
  }

  if (sqz > 0) { push(); translate(0, -5.9 * u); scale(1 + sqz * .15, 1 - sqz); translate(0, 5.9 * u); }
  for (const s of sides) {
    push();
    translate(s * eyeDist * u, -5.9 * u);
    pipEye(kinds[s < 0 ? 0 : 1], s, u, o, sw);
    pop();
  }
  if (sqz > 0) pop();
}

function pipEye(e, s, u, o, sw) {
  const lx = (o.lookX || 0) * u * .35, ly = (o.lookY || 0) * u * .3;
  const blinkOn = ['normal', 'look', 'wide'].includes(e) && ((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12;
  if (blinkOn) {
    inkLine([[-.55 * u, 0], [.55 * u, 0]], sw * 1.1, PAL.ink, 'ink', 0);
    return;
  }

  const lineEye = (pts, w = 1.2, c = .2) => inkLine(pts.map(([a, b]) => [a * u, b * u]), sw * w, PAL.ink, 'ink', c);

  switch (e) {
    case 'normal': case 'look':
      // Big shiny button eye
      paint(ellPts(lx, ly, u * .65, u * .82, 16), { wash: PAL.ink, ink: null });
      // Primary highlight
      paint(ellPts(lx - u * .2, ly - u * .25, u * .24, u * .3, 10), { wash: PAL.cream, washOp: 240, ink: null });
      // Secondary tiny glint
      paint(ellPts(lx + u * .2, ly + u * .25, u * .1, u * .1, 8), { wash: PAL.cream, washOp: 200, ink: null });
      break;

    case 'wide':
      paint(ellPts(lx, ly, u * .82, u * 1.05, 18), { wash: PAL.ink, ink: null });
      paint(ellPts(lx - u * .25, ly - u * .32, u * .32, u * .38, 12), { wash: PAL.cream, washOp: 250, ink: null });
      paint(ellPts(lx + u * .25, ly + u * .32, u * .14, u * .14, 8), { wash: PAL.cream, washOp: 220, ink: null });
      break;

    case 'happy':
      lineEye([[-.65, .35], [0, -.45], [.65, .35]], 1.3, .4);
      break;

    case 'closed':
      lineEye([[-.65, -.1], [0, .35], [.65, -.1]], 1.2, .4);
      break;

    case 'sleepy':
      paint(ellPts(lx, ly + 0.1 * u, u * .62, u * .5, 14), { wash: PAL.ink, ink: null });
      lineEye([[-.7, 0], [0, -.15], [.7, 0]], 1.1, .3);
      break;

    case 'narrow':
      paint(ellPts(lx, ly, u * .65, u * .38, 12), { wash: PAL.ink, ink: null });
      break;

    case 'angry': case 'determined': {
      const hi = e === 'angry' ? .6 : .4, top = e === 'angry' ? -.5 : -.4;
      const P = [[-.6, s < 0 ? top : top + hi], [.6, s < 0 ? top + hi : top], [.55, .7], [-.55, .7]];
      paint(P.map(([a, b]) => [a * u + lx, b * u + ly]), { wash: PAL.ink, ink: null });
      if (e === 'determined') paint(ellPts(lx - .15 * u, ly + .18 * u, u * .15, u * .18, 8), { wash: PAL.cream, ink: null });
      break;
    }

    case 'sad': case 'teary': {
      const P = [[-.55, s < 0 ? -.1 : -.6], [.55, s < 0 ? -.6 : -.1], [.55, .7], [-.55, .7]];
      paint(P.map(([a, b]) => [a * u + lx, b * u + ly]), { wash: PAL.ink, ink: null });
      paint(ellPts(lx - .12 * u, ly + .05 * u, u * .14, u * .18, 8), { wash: PAL.cream, ink: null });
      if (e === 'teary') {
        const w = Math.sin(T * 9 + s) * .05 * u;
        paint(ellPts(0, .8 * u + w, .75 * u, .32 * u, 12), { wash: PAL.sky, washOp: 210, fill: '#FFFFFF', fillOp: 60, ink: PAL.ink, sw: sw * .4 });
      }
      break;
    }

    case 'cry':
      lineEye([[-.7, .35], [-.2, -.05], [.2, .1], [.7, -.15]].map(([a, b]) => [a * -s, b]), 1.3, .3);
      const tearStream = [];
      for (let k = 0; k <= 4; k++) tearStream.push([(s * .4 + Math.sin(T * 8 + k * 1.3 + s) * .1 * k / 4) * u, (.3 + k * .65) * u]);
      paint(ribbon(tearStream, .38 * u, .65 * u), { wash: PAL.sky, washOp: 230, fill: '#FFFFFF', fillOp: 70, ink: PAL.ink, sw: sw * .4 });
      break;

    case 'squeeze':
      lineEye([[-.5 * -s, -.55], [.5 * -s, 0], [-.5 * -s, .55]], 1.3, 0);
      break;

    case 'shine': case 'spark':
      paint(ellPts(lx * .6, ly * .6, u * .75, u * .95, 16), { wash: PAL.ink, ink: null });
      paint(starPts(lx * .6, ly * .6, u * .85 * (1 + .1 * Math.sin(T * 12))), { wash: PAL.ochre, fill: PAL.cream, fillOp: 80, ink: PAL.ink, sw: sw * .5 });
      break;

    case 'heart':
      paint(heartPts(0, .1 * u, u * .75 * (1 + .1 * pulse(T))), { wash: '#E2476E', ink: PAL.ink, sw: sw * .5 });
      break;

    case 'x':
      lineEye([[-.6, -.6], [.6, .6]], 1, 0);
      lineEye([[.6, -.6], [-.6, .6]], 1, 0);
      break;

    case 'swirl': {
      const sp = [];
      for (let k = 0; k < 14; k++) {
        const a = k * .65 + T * 6 * s, r = k * .05 * u;
        sp.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      inkLine(sp, sw * .6, PAL.ink, 'inkfine', .6);
      break;
    }

    case 'scared':
      paint(ellPts(0, 0, u * .8, u * .95, 14), { wash: PAL.cream, ink: PAL.ink, sw: sw * .6 });
      paint(ellPts((o.lookX || 0) * u * .25 + Math.sin(T * 40) * .03 * u, 0, u * .26, u * .32, 10), { wash: PAL.ink, ink: null });
      break;

    case 'blank':
      paint(ellPts(0, 0, u * .68, u * .82, 12), { wash: PAL.cream, ink: PAL.ink, sw: sw * .65 });
      break;

    default:
      paint(ellPts(lx, ly, u * .65, u * .82, 16), { wash: PAL.ink, ink: null });
      paint(ellPts(lx - u * .2, ly - u * .25, u * .24, u * .3, 10), { wash: PAL.cream, washOp: 240, ink: null });
  }
}

function pipSunglasses(u, sw, sides, eyeDist) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]);
  const lens = cx => P([[cx - 1.1, -6.8], [cx + 1.1, -6.8], [cx + 1.0, -6.0], [cx + 0.6, -5.3], [cx, -5.2], [cx - 0.6, -5.3], [cx - 1.0, -6.0]]);
  if (sides.length > 1) {
    for (const s of [-1, 1]) inkLine(P([[s * 2.8, -6.5], [s * 3.6, -6.6]]), sw * .7, PAL.ink, 'ink', 0);
    inkLine(P([[-0.8, -6.4], [0, -6.6], [0.8, -6.4]]), sw * .7, PAL.ink, 'ink', .4);
  } else {
    inkLine(P([[0.8, -6.5], [-3.4, -6.6]]), sw * .7, PAL.ink, 'ink', 0);
  }
  for (const s of sides) {
    const cx = s * eyeDist;
    paint(lens(cx), { wash: '#2A2740', ink: PAL.ink, sw: sw * .85, curv: .3 });
    inkLine(P([[cx - .6, -6.2], [cx - .15, -6.6]]), sw * .4, PAL.cream, 'inkfine', 0);
  }
}

// Beak: tiny cute triangular beak, opens when speaking/chirping/laughing
function pipBeak(u, m, sw, beakCol, V) {
  const isSide = V === PIP_VIEWS.side;
  const isQ = V === PIP_VIEWS.q;
  const darkMouth = '#4A1F2A';

  // Open mouth states
  const isOpen = ['open', 'laugh', 'O', 'wail', 'grin', 'yawn', 'cat', 'chirp'].includes(m);

  if (isSide) {
    // Profile beak: points forward horizontally past right edge
    if (isOpen) {
      // Upper beak
      paint([[0, -5.5 * u], [1.3 * u, -5.3 * u], [0, -4.9 * u]], { wash: beakCol, ink: PAL.ink, sw: sw * .7, curv: .2 });
      // Dark mouth interior + tongue
      paint([[0, -4.9 * u], [0.8 * u, -4.9 * u], [0, -4.4 * u]], { wash: darkMouth, ink: null, curv: .2 });
      paint(ellPts(0.3 * u, -4.8 * u, 0.4 * u, 0.2 * u, 8), { wash: PAL.rose, ink: null });
      // Lower beak
      paint([[0, -4.6 * u], [1.1 * u, -4.4 * u], [0, -4.1 * u]], { wash: beakCol, ink: PAL.ink, sw: sw * .7, curv: .2 });
    } else {
      // Closed beak
      paint([[0, -5.6 * u], [1.3 * u, -5.1 * u], [0, -4.5 * u]], { wash: beakCol, ink: PAL.ink, sw: sw * .75, curv: .25 });
      inkLine([[0, -5.1 * u], [1.1 * u, -5.1 * u]], sw * .4, PAL.ink, 'inkfine', 0);
    }
    return;
  }

  // Front / 3/4 beak
  if (isOpen) {
    // Open beak: upper jaw + dark opening + lower jaw
    const w = 0.85 * u;
    const skew = isQ ? 0.15 * u : 0;
    // Upper beak
    paint([[-w * 0.9 + skew, -5.4 * u], [skew * 0.5, -5.7 * u], [w * 0.9 + skew, -5.4 * u], [skew, -5.1 * u]], { wash: beakCol, ink: PAL.ink, sw: sw * .65, curv: .2 });
    // Inside mouth
    paint([[-w * 0.7 + skew, -5.1 * u], [w * 0.7 + skew, -5.1 * u], [w * 0.5 + skew, -4.4 * u], [-w * 0.5 + skew, -4.4 * u]], { wash: darkMouth, ink: null, curv: .3 });
    // Pink tongue
    paint(ellPts(skew, -4.6 * u, w * 0.4, 0.22 * u, 10), { wash: PAL.rose, ink: null });
    // Lower beak rim
    paint([[-w * 0.65 + skew, -4.6 * u], [skew, -4.3 * u], [w * 0.65 + skew, -4.6 * u]], { wash: beakCol, ink: PAL.ink, sw: sw * .65, curv: .3 });
  } else {
    // Resting closed triangular beak
    const bw = 0.72 * u, bh = 0.62 * u;
    const skew = isQ ? 0.15 * u : 0;
    const beakPts = [
      [-bw + skew, -5.35 * u],
      [skew * 0.5, -5.55 * u],
      [bw + skew, -5.35 * u],
      [skew * 0.5, -5.35 * u + bh]
    ];
    paint(beakPts, { wash: beakCol, ink: PAL.ink, sw: sw * .75, curv: .25 });
    // Subtle mouth split line
    inkLine([[-bw * 0.7 + skew, -5.35 * u], [bw * 0.7 + skew, -5.35 * u]], sw * .4, PAL.ink, 'inkfine', 0);
  }
}

function pipBlush(u, sw, V, b) {
  for (const s of V.sides) {
    const bx = s * (V.eyeDist + 0.65) * u;
    paint(ellPts(bx, -5.2 * u, u * .65, u * .35, 14), { fill: PAL.rose, fillOp: 160 * clamp(b), bleed: .2, ink: null });
    if (b > .6) {
      for (let k = -1; k <= 1; k++) {
        inkLine([[bx + k * .28 * u - .18 * u, -5.0 * u], [bx + k * .28 * u + .05 * u, -5.4 * u]], sw * .35, mixCol(PAL.rose, PAL.ink, .3), 'inkfine', 0);
      }
    }
  }
}

function pipGloom(u, sw, V, g) {
  const gw = (V.w * 0.45) * u;
  paint(rectPts(-gw, -8.1 * u, gw * 2, 2.0 * u, u * .04), { fill: PAL.indigo, fillOp: 140 * g, bleed: .08, tex: .5, border: .6, ink: null });
  for (let i = 0; i < 5; i++) {
    const gx = lerp(-gw + 0.3 * u, gw - 0.3 * u, i / 4);
    inkLine([[gx, -8.0 * u], [gx + jit(u * .04), (-8.0 + 1.8 * g * (.7 + .3 * hash(i))) * u]], sw * .4, PAL.ink, 'inkfine', 0);
  }
}

function pipSmearTrail(x, y, u, V, k, dir, col) {
  const sides = dir === 0 ? [-1, 1] : [-dir];
  for (const s of sides) for (let i = 0; i < 3; i++) {
    const yy = y - (6.8 - i * 1.6) * u, x0 = x + s * (V.w * 0.45) * u, len = (2.5 + 2.5 * hash(i + 5 * s)) * u * k;
    inkLine([[x0, yy], [x0 + s * len * .5, yy + jit(u * .1)], [x0 + s * len, yy]], 2.0 * k, col, 'dry', .3);
  }
}

// ---------- Emotions & Motion (alive on beat) ----------
const PIP_EMO = {
  neutral:    { eyes: 'normal', beak: 'smile', take: .3, body: t => { const b = _b(t); return { dy: -.2 * b.ab, sq: .03 * b.hit, aL: -.65 + .05 * b.s1, aR: -.65 - .05 * b.s1 }; } },
  happy:      { eyes: 'happy', beak: 'smile', blush: .35, take: .6, body: t => { const b = _b(t); return { dy: -1.3 * b.ab, sq: .12 * b.hit, aL: .5 + .4 * b.s1, aR: .5 - .4 * b.s1, flap: true }; } },
  excited:    { eyes: 'wide', beak: 'open', emote: 'spark', take: 1, body: t => { const b = _b(t), h = Math.abs(b.s2); return { dy: -2.6 * h, sq: .18 * pulse2(t) - .06 * h, aL: 1.1 + .4 * Math.sin(b.bp * TAU * 2), aR: 1.1 - .4 * Math.sin(b.bp * TAU * 2), flap: true }; } },
  chirp:      { eyes: 'happy', beak: 'open', emote: 'music', blush: .4, take: .7, body: t => { const b = _b(t); return { dy: -.8 * b.ab, sq: .08 * b.hit, rot: .06 * Math.sin(b.bp * TAU), aL: .7 + .3 * b.s1, aR: .7 - .3 * b.s1 }; } },
  laugh:      { eyes: 'squeeze', beak: 'laugh', blush: .45, take: .8, body: t => { const c = Math.abs(Math.sin(t * TAU * 5)); return { dy: -.5 * c, sq: .1 * c - .04, rot: -.06 + .03 * Math.sin(t * TAU * 5), aL: -.25 + .15 * c, aR: -.25 + .15 * c }; } },
  love:       { eyes: 'heart', beak: 'smile', blush: .8, tint: 'rosy', tintK: .5, emote: 'hearts', take: .7, body: t => { const b = _b(t), s = Math.sin(b.bp * Math.PI / 2); return { rot: .08 * s, dx: .4 * s, dy: -.6 * b.ab, sq: .05 * b.hit, aL: -.5 + .15 * b.s1, aR: -.5 - .15 * b.s1 }; } },
  shy:        { eyes: 'look', beak: 'smile', blush: 1, take: .3, body: t => { const b = _b(t), s = Math.sin(b.bp * Math.PI / 2); return { lookX: -.7, lookY: .8, sq: .06, rot: -.05 + .02 * s, dx: .15 * s, aL: -.75, aR: -.75 }; } },
  proud:      { eyes: 'closed', beak: 'smile', tint: 'gold', tintK: .3, emote: 'spark', take: .5, body: t => { const b = _b(t); return { sq: -.1 - .03 * b.ab, dy: -.3 * b.hit, aL: -.85, aR: -.85, rot: .02 * b.s1 }; } },
  smug:       { eyes: 'narrow', beak: 'smile', take: .4, body: t => { const b = _b(t), s = Math.sin(b.bp * Math.PI / 2); return { lookX: .4, rot: -.06 + .03 * s, dy: -.2 * b.ab, aL: -.65, aR: .4 + .15 * s }; } },
  relieved:   { eyes: 'closed', beak: 'smile', emote: 'sweat', take: .4, body: t => { const b = _b(t), br = Math.sin(t * TAU * .35); return { sq: .05 + .05 * br, dy: -.15 * b.ab, aL: -.65, aR: -.65 }; } },
  sad:        { eyes: 'sad', beak: 'smile', tint: 'blue', tintK: .35, gloom: .35, emote: 'cloud', take: .3, body: t => { const b = _b(t), s = Math.sin(b.bp * Math.PI / 4); return { sq: .08 + .02 * s, rot: .03 * s, aL: -.7, aR: -.7, lookY: .5 }; } },
  cry:        { eyes: 'cry', beak: 'wail', tint: 'blue', tintK: .2, take: .8, body: t => { const b = _b(t), sob = Math.sin(b.f * Math.PI) * Math.exp(-b.f * 2); return { sq: .14 * sob - .02, dy: -.6 * sob, aL: .8 + .15 * Math.sin(t * TAU * 6), aR: .8 - .15 * Math.sin(t * TAU * 6), rot: .03 * b.s1 }; } },
  angry:      { eyes: 'angry', beak: 'smile', tint: '#8B4268', tintK: .55, blush: .6, emote: 'anger', take: .8, body: t => { const b = _b(t); return { dx: .1 * Math.sin(t * TAU * 18), sq: .12 * b.hit, aL: -.4 + .1 * b.hit, aR: -.4 + .1 * b.hit }; } },
  furious:    { eyes: 'angry', beak: 'open', tint: '#A6335C', tintK: .65, blush: .9, emote: 'steam', take: 1.2, body: t => { const b = _b(t); return { dx: .22 * Math.sin(t * TAU * 20), rot: .025 * Math.sin(t * TAU * 13), sq: .2 * b.hit, dy: -.7 * Math.sin(b.f * Math.PI) * (1 - b.f), aL: 1 + .2 * Math.sin(t * TAU * 9), aR: 1 - .2 * Math.sin(t * TAU * 9), flap: true }; } },
  scared:     { eyes: 'scared', beak: 'open', tint: 'pale', tintK: .6, emote: 'sweat', take: 1.1, body: t => ({ dx: .1 * Math.sin(t * TAU * 22), sq: -.06, aL: 1 + .08 * Math.sin(t * TAU * 17), aR: 1 + .08 * Math.sin(t * TAU * 19), flap: true }) },
  surprised:  { eyes: 'wide', beak: 'O', emote: '!', fade: true, take: 1.3, body: t => { const b = _b(t); return { sq: -.14, dy: -.4 - .15 * b.ab, aL: 1.2 + .05 * b.s2, aR: 1.2 - .05 * b.s2, flap: true }; } },
  confused:   { eyes: ['narrow', 'wide'], beak: 'smile', emote: '?', take: .6, body: t => { const b = _b(t); return { rot: .12 * Math.sin(b.bp * Math.PI / 4), aL: -.5, aR: 1.3 + .15 * Math.sin(t * TAU * 3), dy: -.15 * b.ab }; } },
  thinking:   { eyes: 'look', beak: 'smile', emote: 'dots', take: .4, body: t => { const b = _b(t); return { lookX: .5, lookY: -.8, rot: .06, aR: .7, aL: -.65, dy: -.1 * b.ab }; } },
  idea:       { eyes: 'shine', beak: 'open', emote: 'bulb', take: 1.1, body: t => { const b = _b(t); return { dy: -1.2 * b.ab, sq: -.05 + .1 * b.hit, aR: 1.5 + .1 * b.s2, aL: -.4 + .2 * b.s1, flap: true }; } },
  determined: { eyes: 'determined', beak: 'smile', take: .7, body: t => { const b = _b(t); return { rot: .06, sq: -.04 + .06 * b.hit, dy: -.3 * b.ab, aL: -.4, aR: -.4 }; } },
  sleepy:     { eyes: 'sleepy', beak: 'smile', emote: 'zzz', take: .2, body: t => { const br = Math.sin(t * TAU * .3); return { sq: .06 + .05 * br, rot: .06 * Math.sin(t * .8), aL: -.75, aR: -.75 }; } },
  bored:      { eyes: 'narrow', beak: 'smile', take: .2, body: t => { return { lookX: -.3, lookY: .4, sq: .07, rot: -.04, aL: -.75, aR: -.75 }; } },
  nervous:    { eyes: 'look', beak: 'smile', tint: 'pale', tintK: .2, emote: 'sweat', take: .5, body: t => { const b = _b(t); return { lookX: beatN(t) % 2 ? .8 : -.8, dx: .3 * b.s1, sq: .04, aL: -.5, aR: -.5 }; } },
  suspicious: { eyes: 'narrow', beak: 'smile', take: .4, body: t => { const s = Math.sin(t * TAU * .25); return { lookX: s, rot: -.08 * s, dx: .4 * s, sq: .04, aL: -.65, aR: -.65 }; } },
  disgusted:  { eyes: 'squeeze', beak: 'smile', tint: 'green', tintK: .5, take: .8, body: t => { return { rot: -.1, dx: -.3, sq: .05, aL: .4, aR: .4 }; } },
  dizzy:      { eyes: 'swirl', beak: 'open', emote: 'stars', take: .7, body: t => { const a = t * TAU * .8; return { rot: .14 * Math.sin(a), dx: .6 * Math.sin(a), dy: -.3 * Math.abs(Math.cos(a)), aL: .3 + .5 * Math.sin(a * 1.3), aR: .3 - .5 * Math.sin(a * 1.3) }; } },
  cool:       { eyes: 'shades', beak: 'smile', emote: 'music', take: .4, body: t => { const b = _b(t); return { rot: .04 * b.hit, dy: -.35 * b.hit, sq: .06 * b.hit, aL: -.65, aR: .5 + .1 * b.s1 }; } },
  starstruck: { eyes: 'spark', beak: 'open', tint: 'gold', tintK: .3, take: 1, body: t => { const b = _b(t), h = Math.abs(b.s2); return { dy: -1.7 * h, sq: .1 * pulse2(t), aL: 1.1, aR: 1.1, flap: true }; } },
  ko:         { eyes: 'x', beak: 'open', tint: 'pale', tintK: .3, emote: 'stars', take: 1, body: t => ({ sq: .25 + .02 * Math.sin(t * 3), rot: .14, aL: -.9, aR: -.8 }) },
  playful:    { eyes: 'wink', beak: 'open', take: .6, body: t => { const b = _b(t), side = beatN(t) % 2 ? 1 : -1, k = lerp(-side, side, easeOut(clamp(b.f * 3))); return { dx: .7 * k, dy: -1.3 * b.ab, rot: .1 * k, sq: .1 * b.hit, aL: .6 + .5 * k, aR: .6 - .5 * k, flap: true }; } },
  mischief:   { eyes: 'narrow', beak: 'smile', gloom: .3, take: .5, body: t => { const r = Math.sin(t * TAU * 4); return { lookX: .3, sq: .07, rot: .04, aL: -.4 + .15 * r, aR: -.4 - .15 * r }; } },
  hopeful:    { eyes: 'shine', beak: 'smile', blush: .35, take: .5, body: t => { const b = _b(t); return { sq: -.06 - .02 * b.ab, dy: -.3 * b.ab, lookY: -.4, aL: .3 + .05 * b.s1, aR: .3 - .05 * b.s1, rot: .03 * Math.sin(b.bp * Math.PI / 2) }; } }
};

function pipFeel(name, t, over = {}) {
  const E = PIP_EMO[name] || PIP_EMO.neutral;
  return {
    eyes: E.eyes, mouth: E.beak, tint: E.tint, tintK: E.tintK ?? 1, blush: E.blush || 0,
    gloom: E.gloom || 0, emote: E.emote, ...(E.body ? E.body(t) : {}), ...over
  };
}

function pipEmotions(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc, cur = pipFeel(name, t, over);
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tkS = o.take ?? 1;
  const E = PIP_EMO[name] || PIP_EMO.neutral;
  let squint = cur.squint || 0;
  if (tn - t < .1) squint = Math.max(squint, 1 - (tn - t) / .1);
  if (i > 0 && age < .14) squint = Math.max(squint, 1 - age / .14);
  const prev = i > 0 ? pipFeel(keys[i - 1][1], t, keys[i - 1][2]) : null;
  if (prev && age < .5) {
    const base = { dy: 0, sq: 0, aL: -.65, aR: -.65, rot: 0, dx: 0, lookX: 0, lookY: 0 };
    const k = backOut(seg(age, 0, .4)), kc = ease(seg(age, 0, .3));
    for (const f in base) cur[f] = lerp(prev[f] ?? base[f], cur[f] ?? base[f], k);
    for (const f of ['blush', 'gloom']) cur[f] = lerp(prev[f] || 0, cur[f] || 0, kc);
  }
  const t1 = prev ? take(t, tc, (E.take ?? .6) * tkS) : { sq: 0, dy: 0 };
  const En = i + 1 < keys.length ? PIP_EMO[keys[i + 1][1]] || PIP_EMO.neutral : null, t2 = En ? take(t, tn, (En.take ?? .6) * tkS) : { sq: 0, dy: 0 };
  cur.sq = (cur.sq || 0) + t1.sq + t2.sq; cur.dy = (cur.dy || 0) + t1.dy + t2.dy;
  cur.squint = squint;
  const same = prev && prev.emote === cur.emote;
  cur.emoteK = same ? 1 : seg(age, .06, .32) * (E.fade && !(over && over.emote) ? 1 - seg(age, 1.4, 1.8) : 1);
  cur.emoteAge = age;
  return cur;
}

// ---------- Dances & Moves ----------
function pipMove(style, t, seed = 0) {
  const bp = bpOf(t), bi = Math.floor(bp), bf = bp - bi, hit = Math.max(0, 1 - bf * 3.5), s1 = Math.sin(bp * Math.PI), ab = Math.abs(s1);
  const o = { dy: 0, sq: 0, aL: -.65, aR: -.65, rot: 0, walk: null, dx: 0, flap: false };
  if (style === 'mix') style = ['bounce', 'hop', 'flutter', 'spin', 'waddle', 'wave'][(Math.floor(bp / 8) + seed) % 6];
  switch (style) {
    case 'bounce': o.dy = -ab * 1.8; o.sq = hit * .14; o.aL = .3 + s1; o.aR = .3 - s1; break;
    case 'hop': o.dy = -ab * 4.2; o.sq = hit * .2; o.aL = o.aR = .8 + ab * 0.9; o.flap = true; break;
    case 'flutter': o.dy = -ab * 2.0; o.flap = true; o.aL = o.aR = 1.0; o.sq = hit * .08; break;
    case 'waddle': case 'walk': o.walk = bp / 2; o.dy = 0; o.aL = -.5 + .25 * s1; o.aR = -.5 - .25 * s1; break;
    case 'run': o.walk = bp * 1.6; o.dy = -Math.abs(Math.sin(bp * TAU)); o.aL = .7 * Math.sin(bp * TAU); o.aR = -o.aL; o.rot = -.07; o.flap = true; break;
    case 'spin': {
      const ph = (((bi % 4) + 4) % 4 === 3) ? bf : 0;
      Object.assign(o, spinPipView(ph)); o.smear = ph > .1 && ph < .9 ? .5 : 0; o.smearDir = 0;
      o.dy = -Math.sin(ph * Math.PI) * 3 - ab; o.aL = o.aR = .7 + ph; o.sq = hit * .1; o.flap = true; break;
    }
    case 'wave': o.dy = -ab; o.aL = 1.2 + .5 * Math.sin(bp * TAU * 2); o.aR = -.65; o.sq = hit * .08; break;
    case 'idle': o.dy = -ab * .35; o.sq = hit * .04; o.aL = -.65; o.aR = -.65; break;
  }
  return o;
}

function pipDancer(x, y, u, style, t, extra = {}) {
  pip(x, y, u, { ...pipMove(style, t, extra.seed || 0), ...extra });
}
