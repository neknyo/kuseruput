import { useEffect, useRef, useState } from "react";

/* ============================ CONFIG ============================ */
// world / physics (slow & floaty on purpose)
const LW = 360; // logical width, everything scales to this
const GRAVITY = 800;
const MAX_FALL = 520;
const JUMP_MIN = 230; // tap jump
const JUMP_MAX = 520; // full charge
const H_SPEED = 190; // sideways speed of a FULL charge jump
const H_MIN = 0.3; // sideways speed of a tap jump, as a fraction of H_SPEED
const CHARGE_TIME = 1.1; // seconds to full charge
const AUTO_RELEASE = true; // jump automatically at full charge
const WALL_BOUNCE = 0.55;
const SQUISH = 0.45; // how flat Tili gets at full charge
const TW = 30, TH = 42; // Tili hitbox
const TILI_H = 70; // Tili sprite draw height

// lives / microplastics
const LIVES = 3;
const INVULN = 1.4;
const MP_SPEED = 36;
const MP_TURN = 1.1;
const MP_SPAWN_EVERY = 14;
const MP_MAX = 30;
const MP_RECYCLE = 380;
const MP_R = [12, 18];
const IMPACT_T = 0.32;

// map generation
const ROW_GAP = [70, 74];
const DIFF_ROWS = 50;
const CRUMBLE_DELAY = 1.2;
const GEN_AHEAD = 900;
const CAM_Y = 0.58;
const CAM_LERP = 4;
const DECO_PAR = 0.2, DECO_ALPHA = 0.75;
const TEX_TILE = 420, TEX1_ALPHA = 0.45, TEX2_ALPHA = 0.4;
const C = {
  cream: "#FEF9E4", orange: "#F39835", bgTop: "#4a1803", bgBottom: "#8a2a08",
  blob: "rgba(205,85,22,0.22)", leaf: "#7DBB3F", leafDark: "#3E7A22", plastic: "#DDEFF5",
};
const BGM_FILE = "bgm.mp3";
const asset = (f) => import.meta.env.BASE_URL + f;

/* ============================ HELPERS ============================ */
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const mod = (a, n) => ((a % n) + n) % n;
const ready = (img) => img && img.complete && img.naturalWidth;

/* ============================ PLATFORM CONFIG ============================ */
// Platform definitions:
// type 1: 1573x385, hitbox from top: 142. Rate: 50% (solid)
// type 2: 912x554, hitbox from top: 82. Rate: 10% (solid, +1 health)
// type 3: 1361x468, hitbox from top: 80. Rate: 40% (crumble)
const PLATFORMS = [
  { type: "solid", weight: 50, wFactor: 1573 / 385, topOffset: 142 / 385, imgIndex: 0 },
  { type: "solid", weight: 10, wFactor: 912 / 554, topOffset: 82 / 554, imgIndex: 1 },
  { type: "crumble", weight: 40, wFactor: 1361 / 468, topOffset: 80 / 468, imgIndex: 2 }
];

function pickPlatform() {
  const total = PLATFORMS.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PLATFORMS) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return PLATFORMS[0];
}

/* ============================ WORLD ============================ */
function genRow(w) {
  const d = Math.min(1, w.row / DIFF_ROWS);
  w.genY -= lerp(ROW_GAP[0], ROW_GAP[1], d) + rnd(0, 11);
  w.row++;

  const easy = w.row < 4;
  let pdef = PLATFORMS[0];
  if (!easy) pdef = pickPlatform();

  const wd = pdef.type === "crumble" ? 70 : rnd(75, 110) - d * 15;
  const cx = clamp(w.lastX + rnd(-125, 125), wd / 2 + 10, LW - wd / 2 - 10);

  const p = {
    x: cx - wd / 2, y: w.genY, w: wd, h: 14,
    type: pdef.type, def: pdef, dx: 0, a: 1, t: 0, healed: false
  };

  w.plats.push(p);

  if (pdef.type !== "move" && !easy && Math.random() < 0.4) {
    const sw = rnd(56, 76);
    const sx = cx < LW / 2 ? rnd(LW * 0.68, LW - sw / 2 - 10) : rnd(sw / 2 + 10, LW * 0.32);
    if (Math.abs(sx - cx) > (sw + wd) / 2 + 16) {
      const sdef = pickPlatform();
      w.plats.push({
        x: sx - sw / 2, y: w.genY + rnd(-18, 18), w: sw, h: 14,
        type: sdef.type, def: sdef, dx: 0, a: 1, t: 0, healed: false
      });
    }
  }
  w.lastX = cx;
}

function genDeco(w) {
  w.decoY -= rnd(90, 170);
  const i = pick([0, 1, 1, 2, 2, 3, 3]);
  const s = i === 0 ? rnd(90, 120) : rnd(55, 90);
  w.decos.push({ i, s, x: rnd(20, LW - 20), y: w.decoY, r: rnd(-0.5, 0.5), ph: rnd(0, 6.28) });
}

function makeWorld() {
  const w = { plats: [{ x: 0, y: 0, w: LW, h: 40, type: "floor", a: 1, healed: true }], decos: [], genY: 0, lastX: LW / 2, row: 0, decoY: 700 };
  while (w.genY > -GEN_AHEAD) genRow(w);
  while (w.decoY > -GEN_AHEAD) genDeco(w);
  return w;
}

function makeBlobs() {
  return Array.from({ length: 7 }, () => ({
    x: rnd(0, LW), y: rnd(0, 800), r: rnd(55, 110), sp: rnd(0.15, 0.4), ph: rnd(0, 6.28), par: rnd(0.15, 0.35),
    pts: Array.from({ length: 9 }, () => rnd(0.5, 1.3)),
    drops: Array.from({ length: 3 }, () => ({ a: rnd(0, 6.28), d: rnd(1.3, 1.8), r: rnd(4, 9) })),
  }));
}
const makeSpecks = () =>
  Array.from({ length: 16 }, () => ({ x: rnd(0, LW), y: rnd(0, 800), rx: rnd(4, 7), ry: rnd(3, 5), ph: rnd(0, 6.28), a: rnd(0, 3) }));

function reset(S) {
  S.w = makeWorld();
  S.tili = { x: LW / 2, y: 0, vx: 0, vy: 0, grounded: true, stand: S.w.plats[0], charge: 0, dir: 0, lock: false, land: 0, invuln: 0 };
  S.lives = LIVES; S.maxH = 0; S.mps = []; S.mpTimer = 0; S.clean = 0;
  S.vigI = 0; S.impact = 0; S.freeze = 0; S.paused = false;
  S.cam = -S.LH * CAM_Y - TH / 2;
  spawnMp(S);
}

function spawnMp(S) {
  S.mps.push({ x: rnd(12, LW - 12), y: S.cam + S.LH + rnd(30, 70), vx: 0, vy: -MP_SPEED, r: rnd(MP_R[0], MP_R[1]), k: pick([0, 1, 2]), rot: rnd(0, 6.28), spin: rnd(-1, 1) });
}

/* ============================ UPDATE ============================ */
function update(S, dt, inp) {
  S.t += dt;
  S.impact = Math.max(0, S.impact - dt);

  S.vigI += ((LIVES - S.lives) / LIVES - S.vigI) * Math.min(1, dt * 3);

  let targetTilt = 0;
  // Prioritize Keyboard Arrow inputs over Gyro
  if (inp.kl) targetTilt = -1;
  else if (inp.kr) targetTilt = 1;
  else if (inp.useGyro) targetTilt = clamp(inp.gamma / 35, -1, 1);
  else targetTilt = 0;

  inp.smoothedTilt = lerp(inp.smoothedTilt || 0, targetTilt, Math.min(1, dt * 6));
  S.tilt = inp.smoothedTilt;

  if (S.phase !== "play") return;
  if (S.freeze > 0) { S.freeze -= dt; return; }
  const w = S.w, T = S.tili, hw = TW / 2;

  for (const p of w.plats) {
    if (p.type === "crumble") {
      if (p.touched && !p.falling) { p.t += dt; if (p.t > CRUMBLE_DELAY) { p.falling = true; p.vy = 0; } }
      if (p.falling) { p.vy += GRAVITY * dt; p.y += p.vy * dt; p.a -= dt * 1.1; if (p.a <= 0) p.dead = true; }
    }
  }
  const solids = w.plats.filter((p) => !p.dead && !p.falling);

  const hold = inp.charge;
  T.dir = inp.smoothedTilt;

  if (!hold) T.lock = false;
  T.land = Math.max(0, T.land - dt * 5);
  T.invuln = Math.max(0, T.invuln - dt);

  if (T.grounded) {
    if (T.stand && T.stand.dx) T.x += T.stand.dx;
    if (hold && !T.lock) T.charge = Math.min(1, T.charge + dt / CHARGE_TIME);
    if (T.charge > 0 && (!hold || (AUTO_RELEASE && T.charge >= 1))) {
      T.vy = -lerp(JUMP_MIN, JUMP_MAX, T.charge);
      T.vx = T.dir * H_SPEED * lerp(H_MIN, 1, T.charge);
      T.grounded = false; T.stand = null;
      if (hold) T.lock = true;
      T.charge = 0;
    }
  }

  const n = 3, h = dt / n;
  for (let i = 0; i < n; i++) {
    if (!T.grounded) T.vy = Math.min(MAX_FALL, T.vy + GRAVITY * h);
    T.x += T.vx * h;

    if (T.x < hw) { T.x = hw; if (!T.grounded) T.vx = Math.abs(T.vx) * WALL_BOUNCE; }
    if (T.x > LW - hw) { T.x = LW - hw; if (!T.grounded) T.vx = -Math.abs(T.vx) * WALL_BOUNCE; }

    if (!T.grounded) {
      const py = T.y;
      T.y += T.vy * h;
      if (T.vy > 0) {
        for (const p of solids) {
          if (py <= p.y + 1 && T.y >= p.y && T.x + hw - 3 > p.x && T.x - hw + 3 < p.x + p.w) {
            T.y = p.y; T.vy = 0; T.vx = 0; T.grounded = true; T.stand = p; T.land = 1;
            if (p.type === "crumble") p.touched = true;

            // Health Logic for Platform 2
            if (p.def && p.def.imgIndex === 1 && !p.healed) {
              p.healed = true;
              S.lives = Math.min(LIVES, S.lives + 1);
            }
            break;
          }
        }
      }
    } else {
      const s = solids.find((p) => Math.abs(p.y - T.y) < 2 && T.x + hw - 3 > p.x && T.x - hw + 3 < p.x + p.w);
      if (s) T.stand = s; else { T.grounded = false; T.stand = null; T.vy = 0; }
    }
  }

  if (T.y > S.cam + S.LH + 80) {
    S.lives--; S.hits++;
    S.impact = IMPACT_T; S.freeze = 0.07;

    if (S.lives <= 0) {
      S.phase = "over";
      if (S.maxH / 10 > S.best) { S.best = Math.floor(S.maxH / 10); try { localStorage.setItem("tili-best", S.best); } catch {} }
    } else {
      let best = null;
      for (const p of solids) {
        const sy = p.y - S.cam;
        if (p.type !== "crumble" && sy > 0.1 * S.LH && sy < S.LH - 20 && (!best || p.y > best.y)) {
          best = p;
        }
      }
      if (!best) {
        for (const p of solids) {
          if (!best || Math.abs(p.y - T.y) < Math.abs(best.y - T.y)) best = p;
        }
      }
      if (best) {
        T.x = clamp(best.x + best.w / 2, TW, LW - TW);
        T.y = best.y;
        T.vx = 0; T.vy = 0; T.grounded = true; T.stand = best; T.charge = 0; T.invuln = INVULN;
        S.cam = T.y - TH / 2 - S.LH * CAM_Y;
      } else {
        const emergencyPlat = { x: LW / 2 - 50, y: S.cam + S.LH * 0.5, w: 100, h: 14, type: "floor", a: 1, healed: true };
        S.w.plats.push(emergencyPlat);
        T.x = LW / 2; T.y = emergencyPlat.y; T.vx = 0; T.vy = 0; T.grounded = true; T.stand = emergencyPlat; T.charge = 0; T.invuln = INVULN;
      }
    }
  }

  const target = T.y - TH / 2 - S.LH * CAM_Y;
  S.cam = Math.min(S.cam + (target - S.cam) * Math.min(1, dt * CAM_LERP), -S.LH * CAM_Y - TH / 2);
  while (w.genY > S.cam - GEN_AHEAD) genRow(w);
  while (w.decoY > S.cam - GEN_AHEAD) genDeco(w);
  S.maxH = Math.max(S.maxH, -T.y);
  S.clean += dt;
  if (S.clean > 2) {
    S.clean = 0;
    w.plats = w.plats.filter((p) => p.y < S.cam + S.LH + 300 || p === T.stand);
    w.decos = w.decos.filter((d) => d.y < S.cam + S.LH + 400);
  }

  S.mpTimer += dt;
  if (S.mpTimer >= MP_SPAWN_EVERY && S.mps.length < MP_MAX) { S.mpTimer = 0; spawnMp(S); }
  const tx = T.x, ty = T.y - TH * 0.6;
  for (let i = S.mps.length - 1; i >= 0; i--) {
    const m = S.mps[i];
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dt * MP_TURN);
    m.vx += (dx / d * MP_SPEED - m.vx) * k;
    m.vy += (dy / d * MP_SPEED - m.vy) * k;
    const sp = Math.hypot(m.vx, m.vy) || 1;
    m.vx *= MP_SPEED / sp; m.vy *= MP_SPEED / sp;
    m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.spin * dt;
    if (m.y > S.cam + S.LH + MP_RECYCLE) { m.x = rnd(12, LW - 12); m.y = S.cam + S.LH + rnd(30, 70); }
    if (T.invuln <= 0 && d < m.r * 0.75 + 8) {
      S.hitX = m.x; S.hitY = m.y - S.cam; S.hitSeed = rnd(0, 6.28);
      S.mps.splice(i, 1);
      S.lives--; S.hits++; T.invuln = INVULN;
      S.impact = IMPACT_T; S.freeze = 0.07;
      if (S.lives <= 0) {
        S.phase = "over";
        if (S.maxH / 10 > S.best) { S.best = Math.floor(S.maxH / 10); try { localStorage.setItem("tili-best", S.best); } catch {} }
      }
    }
  }
}

/* ============================ DRAWING ============================ */
function blobPath(ctx, b, t) {
  const n = b.pts.length, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + Math.sin(t * b.sp * 0.5 + b.ph) * 0.4;
    const r = b.r * (b.pts[i] + 0.12 * Math.sin(t * b.sp + b.ph + i * 1.7));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  ctx.beginPath();
  const mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const s = mid(pts[n - 1], pts[0]);
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  ctx.closePath();
}

function tex(ctx, img, S, mode, alpha, ox, oy) {
  if (!ready(img)) return;
  const tw = TEX_TILE, th = TEX_TILE * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = alpha;
  for (let x = -mod(ox, tw); x < LW; x += tw) for (let y = -mod(oy, th); y < S.LH; y += th) ctx.drawImage(img, x, y, tw, th);
  ctx.restore();
}

function drawPlat(ctx, p, S, imgs) {
  const sy = p.y - S.cam;
  if (p.dead || sy > S.LH + 60 || sy + p.h < -60) return;
  let x = p.x;
  if (p.type === "crumble" && p.touched && !p.falling) x += Math.sin(S.t * 55) * 1.4 * (p.t / CRUMBLE_DELAY);
  const w = p.w, h = p.h;

  ctx.save(); ctx.globalAlpha = p.a;

  if (p.type === "floor") {
    ctx.fillStyle = C.orange; ctx.fillRect(x, sy, w, h);
    ctx.fillStyle = C.cream; ctx.fillRect(x, sy, w, 6);
  } else if (p.def && p.def.imgIndex !== undefined && ready(imgs.plat[p.def.imgIndex])) {
    const img = imgs.plat[p.def.imgIndex];
    const drawH = w / p.def.wFactor;
    const visualY = sy - (drawH * p.def.topOffset);
    ctx.drawImage(img, x, visualY, w, drawH);
  } else {
    ctx.fillStyle = p.type === "crumble" ? C.bag : C.orange;
    ctx.fillRect(x, sy, w, h);
  }
  ctx.restore();
}

function drawTili(ctx, T, S, img) {
  const hw = TW / 2, by = T.y - S.cam;
  let sx = 1, sy = 1;
  if (T.grounded) { sy = 1 - SQUISH * T.charge; sx = 1 + SQUISH * 0.7 * T.charge; }
  else { const st = clamp(Math.abs(T.vy) / 600, 0, 0.25); sy = 1 + st; sx = 1 - st * 0.6; }
  sy *= 1 - 0.25 * T.land; sx *= 1 + 0.2 * T.land;
  ctx.save();
  if (T.invuln > 0 && Math.floor(S.t * 12) % 2) ctx.globalAlpha = 0.35;
  ctx.translate(T.x, by);
  ctx.scale(sx, sy);
  if (!T.grounded) ctx.rotate(clamp(T.vx / H_SPEED, -1, 1) * 0.25);
  if (ready(img)) {
    const h = TILI_H, w = h * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-hw * 1.5, -TH * 0.25, -hw * 1.2, -TH * 0.8, 0, -TH);
    ctx.bezierCurveTo(hw * 1.2, -TH * 0.8, hw * 1.5, -TH * 0.25, 0, 0);
    ctx.fillStyle = C.leaf; ctx.fill();
    ctx.strokeStyle = C.leafDark; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();

  if (T.grounded && T.charge > 0) {
    const bw = 38, bx = T.x - bw / 2, bY = by - TILI_H * sy - 16;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx - 2, bY - 2, bw + 4, 10);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, C.cream); g.addColorStop(1, "#E5432A");
    ctx.fillStyle = g; ctx.fillRect(bx, bY, bw * T.charge, 6);
  }
}

function drawMp(ctx, m, S, imgs) {
  const sy = m.y - S.cam;
  if (sy > S.LH + 10 || sy < -40) return;
  ctx.save(); ctx.translate(m.x, sy); ctx.rotate(m.rot);
  const img = imgs.mp[m.k];
  if (ready(img)) {
    const w = m.r * 2.6, h = w * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = C.plastic; ctx.beginPath(); ctx.arc(0, 0, m.r * 0.8, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx, S) {
  const k = S.vigI;
  if (k < 0.01) return;
  const LH = S.LH, cx = LW / 2, cy = LH / 2, R = Math.hypot(cx, cy);
  const pulse = 1 + 0.05 * Math.sin(S.t * (2 + 4 * k)) * k;

  const g = ctx.createRadialGradient(cx, cy, R * (0.8 - 0.4 * k), cx, cy, R * pulse);
  g.addColorStop(0, "rgba(255, 105, 180, 0)");
  g.addColorStop(1, `rgba(255, 20, 147, ${0.45 * k})`);

  ctx.save();
  ctx.fillStyle = g;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillRect(0, 0, LW, LH);
  ctx.restore();
}

function drawImpact(ctx, S) {
  if (S.impact <= 0) return;
  const p = S.impact / IMPACT_T, LH = S.LH, cx = S.hitX, cy = S.hitY, R = Math.hypot(LW, LH);
  ctx.save();
  const flash = p > 0.72;
  ctx.fillStyle = flash ? "rgba(255,248,230,0.92)" : `rgba(229,67,42,${p * 0.45})`;
  ctx.fillRect(0, 0, LW, LH);
  ctx.strokeStyle = `rgba(254,249,228,${p})`; ctx.lineWidth = 4 * p + 1;
  ctx.beginPath(); ctx.arc(cx, cy, (1 - p) * 170 + 12, 0, 6.283); ctx.stroke();
  ctx.restore();
}

function draw(ctx, S, imgs) {
  const LH = S.LH, t = S.t, cam = S.cam;
  ctx.setTransform(S.dpr * S.s, 0, 0, S.dpr * S.s, 0, 0);
  const sh = S.impact > 0 ? S.impact / IMPACT_T : 0;
  ctx.save();
  if (sh) ctx.translate((Math.random() - 0.5) * 14 * sh, (Math.random() - 0.5) * 14 * sh);
  const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, C.bgTop); g.addColorStop(1, C.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, LW + 40, LH + 40);

  for (const b of S.blobs) {
    const per = LH + b.r * 2.5;
    const sy = mod(b.y - cam * b.par - t * 5, per) - b.r * 1.25;
    const sx = b.x + Math.sin(t * b.sp + b.ph) * 30;
    ctx.save(); ctx.translate(sx, sy); ctx.fillStyle = C.blob;
    blobPath(ctx, b, t); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "rgba(235,140,60,0.35)";
  for (const s of S.specks) {
    const sy = mod(s.y - cam * 0.45 - t * 6, LH + 20) - 10, sx = s.x + Math.sin(t * 0.4 + s.ph) * 14;
    ctx.beginPath(); ctx.ellipse(sx, sy, s.rx, s.ry, s.a + t * 0.2, 0, 6.283); ctx.fill();
  }

  ctx.save(); ctx.globalAlpha = DECO_ALPHA;
  for (const d of S.w.decos) {
    const img = imgs.deco[d.i], sy = d.y - cam * DECO_PAR + Math.sin(t * 0.8 + d.ph) * 5;
    if (!ready(img) || sy < -130 || sy > LH + 130) continue;
    ctx.save(); ctx.translate(d.x, sy); ctx.rotate(d.r + Math.sin(t * 0.5 + d.ph) * 0.08);
    ctx.drawImage(img, -d.s / 2, (-d.s * img.naturalHeight) / img.naturalWidth / 2, d.s, (d.s * img.naturalHeight) / img.naturalWidth);
    ctx.restore();
  }
  ctx.restore();

  for (const p of S.w.plats) drawPlat(ctx, p, S, imgs);
  for (const m of S.mps) drawMp(ctx, m, S, imgs);
  drawTili(ctx, S.tili, S, imgs.tili);

  tex(ctx, imgs.t1, S, "overlay", TEX1_ALPHA, cam * 0.5, cam * 0.5);
  tex(ctx, imgs.t2, S, "soft-light", TEX2_ALPHA, t * 8, t * 5 + cam * 0.3);
  ctx.restore();

  drawVignette(ctx, S);
  drawImpact(ctx, S);
}

/* ============================ APP ============================ */
const ui = {
  fill: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 28, textAlign: "center", color: C.cream, background: "rgba(40,12,2,0.62)", zIndex: 50 },
  btn: { font: "inherit", fontSize: 18, fontWeight: 700, color: "#4a1803", background: C.cream, border: "none", borderBottom: `5px solid ${C.orange}`, borderRadius: 22, padding: "12px 34px", cursor: "pointer", minWidth: 200 },
};

export default function App() {
  const wrapRef = useRef(null), canvasRef = useRef(null), S = useRef(null), bgm = useRef(null), pauseFn = useRef(() => {});
  const inp = useRef({ charge: false, kl: false, kr: false, useGyro: false, gamma: 0, smoothedTilt: 0 });
  const [phase, setPhase] = useState("menu");
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ lives: LIVES, h: 0, best: 0, hits: 0, tilt: 0 });

  const start = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') inp.current.useGyro = true;
      } catch (e) { console.warn("Gyro permission denied or error"); }
    } else {
      inp.current.useGyro = true;
    }

    const st = S.current; reset(st); st.phase = "play"; st.tili.lock = true;
    setPaused(false);
    const a = bgm.current;
    if (a) a.play().catch(() => {});
  };

  useEffect(() => {
    let best = 0;
    try { best = +localStorage.getItem("tili-best") || 0; } catch {}
    const st = (S.current = { t: 0, LH: 640, W: 360, H: 640, s: 1, dpr: 1, phase: "menu", shown: "menu", best, hits: 0, blobs: makeBlobs(), specks: makeSpecks(), vig: [] });
    reset(st);
    const load = (f) => { const i = new Image(); i.src = asset(f); return i; };
    const imgs = {
      deco: ["vistock1.webp", "vistock2.webp", "vistock3.webp", "vistock4.webp"].map(load),
      mp: ["plastic1.webp", "plastic2.webp", "plastic3.webp"].map(load),
      plat: ["platform1.webp", "platform2.webp", "platform3.webp"].map(load),
      tili: load("tili.webp"),
      t1: load("gametexture1.webp"), t2: load("gametexture2.webp"),
    };

    const audio = new Audio(asset(BGM_FILE));
    audio.loop = true; audio.volume = 0.5;
    bgm.current = audio;

    pauseFn.current = (v) => {
      if (st.phase !== "play") return;
      st.paused = v;
      inp.current.charge = false;
      setPaused(v);
      if (v) audio.pause(); else audio.play().catch(() => {});
    };

    const cvs = canvasRef.current, ctx = cvs.getContext("2d");
    const resize = () => {
      const r = wrapRef.current.getBoundingClientRect();
      st.W = r.width; st.H = r.height; st.dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = r.width * st.dpr; cvs.height = r.height * st.dpr;
      st.s = st.W / LW; st.LH = st.H / st.s;
      if (st.phase === "menu") st.cam = -st.LH * CAM_Y - TH / 2;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrapRef.current);

    const kd = (e, down) => {
      const i = inp.current;
      if (down && (e.code === "KeyP" || e.code === "Escape") && st.phase === "play") { pauseFn.current(!st.paused); e.preventDefault(); return; }
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { i.charge = down; e.preventDefault(); if (down && st.phase === "menu") start(); }
      if (["ArrowLeft", "KeyA"].includes(e.code)) { i.kl = down; e.preventDefault(); }
      if (["ArrowRight", "KeyD"].includes(e.code)) { i.kr = down; e.preventDefault(); }
    };
    const onD = (e) => kd(e, true), onU = (e) => kd(e, false);
    const onVis = () => { if (document.hidden && st.phase === "play" && !st.paused) pauseFn.current(true); };

    const handleOrientation = (event) => {
      if (inp.current.useGyro && event.gamma !== null) {
        inp.current.gamma = clamp(event.gamma, -45, 45);
      }
    };

    window.addEventListener("keydown", onD); window.addEventListener("keyup", onU);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener('deviceorientation', handleOrientation);

    let last = performance.now(), raf, hv = "";
    const frame = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      if (!st.paused) update(st, dt, inp.current);
      draw(ctx, st, imgs);
      if (st.phase !== st.shown) { st.shown = st.phase; setPhase(st.phase); }
      const v = `${st.lives}|${Math.floor(st.maxH / 10)}|${st.best}|${st.hits}|${Math.round(st.tilt*100)}`;
      if (v !== hv) { hv = v; setHud({ lives: st.lives, h: Math.floor(st.maxH / 10), best: st.best, hits: st.hits, tilt: st.tilt }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); audio.pause();
      window.removeEventListener("keydown", onD); window.removeEventListener("keyup", onU);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); inp.current.charge = true; };
  const up = () => { inp.current.charge = false; };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#2a0d02", display: "flex", justifyContent: "center", overscrollBehavior: "none", touchAction: "none", userSelect: "none" }}>
      <style>{`
        html,body,#root{margin:0;height:100%;overflow:hidden;overscroll-behavior:none}
        @keyframes hbShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px) rotate(-3deg)}30%{transform:translateX(8px) rotate(3deg)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}80%{transform:translateX(-2px)}}
        @keyframes hbLost{0%{transform:scale(1);filter:brightness(1)}20%{transform:scale(1.7) rotate(-14deg);filter:brightness(3) saturate(0)}55%{transform:scale(1.35) rotate(10deg);filter:brightness(1.6)}100%{transform:scale(1) rotate(0);filter:grayscale(1)}}
      `}</style>
      <div ref={wrapRef} style={{ position: "relative", width: "min(100vw, 480px)", height: "100%" }}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerUp={up} onPointerCancel={up}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

        <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: C.cream, fontWeight: 800, fontSize: 30, lineHeight: 1, pointerEvents: "none", textShadow: "0 2px 6px rgba(0,0,0,.55)" }}>
          <div key={hud.hits} style={{ display: "flex", gap: 6, animation: hud.hits > 0 ? "hbShake 0.5s" : "none" }}>
            {Array.from({ length: 3 }, (_, i) => {
              const lost = i >= hud.lives;
              const justLost = hud.hits > 0 && i === hud.lives;
              return (
                <img key={i} src={asset("health.webp")} alt="" draggable={false} width={38} height={38}
                  style={{ width: 38, height: 38, objectFit: "contain", opacity: lost ? 0.3 : 1, filter: lost ? "grayscale(1)" : "none", animation: justLost ? "hbLost 0.7s ease-out" : "none" }} />
              );
            })}
          </div>
          <div>{hud.h} m</div>
        </div>

        {/* Pause Button moved to bottom, right above the slider */}
        {phase === "play" && !paused && (
          <button aria-label="Pause" onClick={() => pauseFn.current(true)}
            style={{ position: "absolute", bottom: 45, left: "50%", transform: "translateX(-50%)", width: 44, height: 44, borderRadius: "50%", border: "none", borderBottom: `4px solid ${C.orange}`, background: C.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: 0, zIndex: 10 }}>
            <span style={{ width: 5, height: 16, borderRadius: 2, background: "#4a1803" }} />
            <span style={{ width: 5, height: 16, borderRadius: 2, background: "#4a1803" }} />
          </button>
        )}

        {/* Tilt Slider Bar */}
        {phase === "play" && (
          <div style={{ position: "absolute", bottom: 20, left: 40, right: 40, height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 2, height: 14, background: "rgba(255,255,255,0.4)" }} />
            <div style={{ position: "absolute", top: -6, left: `calc(50% + ${hud.tilt * 50}%)`, transform: "translateX(-50%)", width: 14, height: 18, borderRadius: 7, background: C.cream, border: `2px solid ${C.orange}`, transition: "left 0.1s linear" }} />
          </div>
        )}

        {phase === "play" && paused && (
          <div style={ui.fill}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>Paused</div>
            <button style={ui.btn} onClick={() => pauseFn.current(false)}>Resume</button>
            <button style={{...ui.btn, background: "#e5a782", borderBottomColor: "#b2461a", color: "#4a1803", marginTop: 10}} onClick={() => window.location.href = "/"}>Back to Home</button>
          </div>
        )}

        {phase === "menu" && (
          <div style={ui.fill}>
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>Bebas Celup</div>
            <div style={{ fontSize: 20, maxWidth: 500 }}>Bantu Tili Kabur dari Mikroplastik!</div>
            <div style={{ height: 50}}></div>
            <div style={{ fontSize: 15, maxWidth: 280 }}>Miringkan HP kamu ke kiri/kanan untuk mengarahkan Tili, lalu Tahan layar untuk melompat!</div>
            <div style={{ fontSize: 9, opacity: 0.85, maxWidth: 290, marginTop: 8 }}>
              (Di PC: Tahan Panah Kiri/Kanan dan tekan Spasi)
            </div>
            <button style={{ ...ui.btn, marginTop: 20 }} onClick={start}>Mulai</button>
            <div style={{ height: 100}}></div>
          </div>
        )}

        {phase === "over" && (
          <div style={ui.fill}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>Game Over</div>
            <div style={{ fontSize: 18 }}>Ketinggian dicapai {hud.h} m</div>
            <div style={{ fontSize: 14}}>Capaian Tertinggi: {hud.best} m</div>
            <button style={ui.btn} onClick={start}>Main Lagi</button>
            <button style={{...ui.btn, background: C.cream, borderBottomColor: "#b2461a", color: "#4a1803", marginTop: 10}} onClick={() => window.location.href = "/"}>Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}
