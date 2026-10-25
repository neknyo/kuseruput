import { useEffect, useRef, useState } from "react";

/* ============================ CONFIG ============================ */
// world / physics (slow & floaty on purpose)
const LW = 360; // logical width, everything scales to this
const GRAVITY = 700;
const MAX_FALL = 520;
const JUMP_MIN = 230; // tap jump
const JUMP_MAX = 470; // full charge
const H_SPEED = 125; // sideways speed of a jump
const CHARGE_TIME = 1.1; // seconds to full charge
const AUTO_RELEASE = true; // jump automatically at full charge
const WALL_BOUNCE = 0.55;
const SQUISH = 0.45; // how flat Tili gets at full charge
const TW = 22, TH = 28; // Tili hitbox
const LEFT_ZONE = 0.35, RIGHT_ZONE = 0.65; // touch aim zones (screen width)

// lives / microplastics
const LIVES = 3;
const INVULN = 1.4;
const MP_SPEED = 36; // constant for every microplastic
const MP_TURN = 1.1; // how sharply they re-aim (lower = lazier)
const MP_SPAWN_EVERY = 14; // seconds between extra microplastics
const MP_MAX = 30;
const MP_RECYCLE = 380; // far-behind ones respawn under the screen

// map generation
const ROW_GAP = [66, 86]; // vertical gap, easy -> hard (+0..22 random)
const DIFF_ROWS = 50; // rows until full difficulty
const PILLAR_CHANCE = 0.3;
const CRUMBLE_DELAY = 0.7;
const CURRENT_SPEED = 55;
const GEN_AHEAD = 900;

// camera / look
const CAM_Y = 0.55; // Tili's screen height ratio
const CAM_LERP = 4;
const DECO_PAR = 0.85, DECO_ALPHA = 0.75;
const TEX_TILE = 420, TEX1_ALPHA = 0.45, TEX2_ALPHA = 0.4;
const C = {
  cream: "#FEF9E4", orange: "#F39835", bag: "#F4DDA8",
  bgTop: "#4a1803", bgBottom: "#8a2a08", blob: "rgba(205,85,22,0.22)",
  leaf: "#7DBB3F", leafDark: "#3E7A22", plastic: "#DDEFF5",
};
const asset = (f) => import.meta.env.BASE_URL + f;

/* ============================ HELPERS ============================ */
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const mod = (a, n) => ((a % n) + n) % n;
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
};

/* ============================ WORLD ============================ */
function genRow(w) {
  const d = Math.min(1, w.row / DIFF_ROWS);
  w.genY -= lerp(ROW_GAP[0], ROW_GAP[1], d) + rnd(0, 22);
  w.row++;
  const easy = w.row < 4;
  const r = Math.random();
  const mv = 0.2 + 0.2 * d, cr = 0.15 + 0.3 * d, sl = 0.1 + 0.2 * d;
  let type = "solid";
  if (!easy) type = r < mv ? "move" : r < mv + cr ? "crumble" : r < mv + cr + sl ? "slip" : "solid";
  const wd = type === "move" ? 72 : type === "crumble" ? 66 : type === "slip" ? 84 : rnd(80, 118) - d * 20;
  const cx = clamp(w.lastX + rnd(-140, 140), wd / 2 + 10, LW - wd / 2 - 10);
  const p = { x: cx - wd / 2, y: w.genY, w: wd, h: 16, type, dx: 0, a: 1, t: 0 };
  if (type === "move") {
    p.amp = rnd(28, 50);
    p.bx = clamp(p.x, p.amp + 6, LW - wd - p.amp - 6);
    p.x = p.bx; p.sp = rnd(0.5, 0.9); p.ph = rnd(0, 6.28);
  }
  if (type === "slip") p.slip = Math.random() < 0.5 ? -1 : 1;
  w.plats.push(p);
  if ((type === "solid" || type === "slip") && wd >= 90 && !easy && Math.random() < PILLAR_CHANCE + 0.2 * d) {
    const ph = rnd(44, 72);
    w.plats.push({ x: Math.random() < 0.5 ? p.x : p.x + p.w - 14, y: p.y - ph, w: 14, h: ph, type: "pillar", a: 1 });
  }
  if (type !== "move" && !easy && Math.random() < 0.5) {
    const sw = rnd(56, 76);
    const sx = cx < LW / 2 ? rnd(LW * 0.68, LW - sw / 2 - 10) : rnd(sw / 2 + 10, LW * 0.32);
    if (Math.abs(sx - cx) > (sw + wd) / 2 + 16) {
      const st = pick(["solid", "solid", "crumble", "slip"]);
      w.plats.push({ x: sx - sw / 2, y: w.genY + rnd(-18, 18), w: sw, h: 16, type: st, dx: 0, a: 1, t: 0, slip: Math.random() < 0.5 ? -1 : 1 });
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
  const w = { plats: [{ x: 0, y: 0, w: LW, h: 40, type: "solid", a: 1 }], decos: [], genY: 0, lastX: LW / 2, row: 0, decoY: 700 };
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
  S.lives = LIVES; S.maxH = 0; S.mps = []; S.mpTimer = 0;
  S.cam = -S.LH * CAM_Y - TH / 2;
  spawnMp(S);
}

function spawnMp(S) {
  S.mps.push({ x: rnd(12, LW - 12), y: S.cam + S.LH + rnd(30, 70), vx: 0, vy: -MP_SPEED, r: rnd(5, 9), k: pick([0, 1, 2]), rot: rnd(0, 6.28), spin: rnd(-1, 1) });
}

/* ============================ UPDATE ============================ */
function update(S, dt, inp) {
  S.t += dt;
  if (S.phase !== "play") return;
  const w = S.w, T = S.tili, hw = TW / 2;

  for (const p of w.plats) {
    if (p.type === "move") { const nx = p.bx + Math.sin(S.t * p.sp + p.ph) * p.amp; p.dx = nx - p.x; p.x = nx; }
    if (p.type === "crumble") {
      if (p.touched && !p.falling) { p.t += dt; if (p.t > CRUMBLE_DELAY) { p.falling = true; p.vy = 0; } }
      if (p.falling) { p.vy += GRAVITY * dt; p.y += p.vy * dt; p.a -= dt * 1.1; if (p.a <= 0) p.dead = true; }
    }
  }
  const solids = w.plats.filter((p) => !p.dead && !p.falling);
  const ov = (p) => T.x + hw > p.x && T.x - hw < p.x + p.w && T.y > p.y && T.y - TH < p.y + p.h;

  const hold = inp.ptr || inp.key;
  const dir = inp.ptr ? inp.ptrDir : (inp.kr ? 1 : 0) - (inp.kl ? 1 : 0);
  T.dir = dir;
  if (!hold) T.lock = false;
  T.land = Math.max(0, T.land - dt * 5);
  T.invuln = Math.max(0, T.invuln - dt);

  if (T.grounded) {
    if (T.stand && T.stand.dx) T.x += T.stand.dx;
    if (hold && !T.lock) T.charge = Math.min(1, T.charge + dt / CHARGE_TIME);
    if (T.charge > 0 && (!hold || (AUTO_RELEASE && T.charge >= 1))) {
      T.vy = -lerp(JUMP_MIN, JUMP_MAX, T.charge);
      T.vx = dir * H_SPEED;
      T.grounded = false; T.stand = null;
      if (hold) T.lock = true;
      T.charge = 0;
    }
  }

  const n = 3, h = dt / n;
  for (let i = 0; i < n; i++) {
    if (!T.grounded) T.vy = Math.min(MAX_FALL, T.vy + GRAVITY * h);
    let mvx = T.vx;
    if (T.grounded && T.stand && T.stand.slip) mvx = T.stand.slip * CURRENT_SPEED;
    T.x += mvx * h;
    for (const p of solids) {
      if (!ov(p)) continue;
      T.x = mvx > 0 || (mvx === 0 && T.x < p.x + p.w / 2) ? p.x - hw : p.x + p.w + hw;
      if (!T.grounded) T.vx = -T.vx * WALL_BOUNCE;
    }
    if (T.x < hw) { T.x = hw; if (!T.grounded) T.vx = Math.abs(T.vx) * WALL_BOUNCE; }
    if (T.x > LW - hw) { T.x = LW - hw; if (!T.grounded) T.vx = -Math.abs(T.vx) * WALL_BOUNCE; }

    if (!T.grounded) {
      T.y += T.vy * h;
      for (const p of solids) {
        if (!ov(p)) continue;
        if (T.vy > 0) {
          T.y = p.y; T.vy = 0; T.vx = 0; T.grounded = true; T.stand = p; T.land = 1;
          if (p.type === "crumble") p.touched = true;
        } else { T.y = p.y + p.h + TH; T.vy = 20; }
      }
    } else {
      const s = solids.find((p) => Math.abs(p.y - T.y) < 2 && T.x + hw - 3 > p.x && T.x - hw + 3 < p.x + p.w);
      if (s) T.stand = s; else { T.grounded = false; T.stand = null; T.vy = 0; }
    }
  }

  // camera + generation
  const target = T.y - TH / 2 - S.LH * CAM_Y;
  S.cam = Math.min(S.cam + (target - S.cam) * Math.min(1, dt * CAM_LERP), -S.LH * CAM_Y - TH / 2);
  while (w.genY > S.cam - GEN_AHEAD) genRow(w);
  while (w.decoY > S.cam - GEN_AHEAD) genDeco(w);
  S.maxH = Math.max(S.maxH, -T.y);

  // microplastics
  S.mpTimer += dt;
  if (S.mpTimer >= MP_SPAWN_EVERY && S.mps.length < MP_MAX) { S.mpTimer = 0; spawnMp(S); }
  const tx = T.x, ty = T.y - TH / 2;
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
    if (T.invuln <= 0 && d < m.r + 9) {
      S.mps.splice(i, 1);
      S.lives--; T.invuln = INVULN;
      if (S.lives <= 0) {
        S.phase = "over";
        if (S.maxH / 10 > S.best) { S.best = Math.floor(S.maxH / 10); try { localStorage.setItem("tili-best", S.best); } catch {} }
      }
    }
  }
}

/* ============================ DRAW ============================ */
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
  if (!img || !img.complete || !img.naturalWidth) return;
  const tw = TEX_TILE, th = TEX_TILE * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = alpha;
  for (let x = -mod(ox, tw); x < LW; x += tw) for (let y = -mod(oy, th); y < S.LH; y += th) ctx.drawImage(img, x, y, tw, th);
  ctx.restore();
}

function drawPlat(ctx, p, S) {
  const sy = p.y - S.cam;
  if (p.dead || sy > S.LH + 60 || sy + p.h < -60) return;
  let x = p.x;
  if (p.type === "crumble" && p.touched && !p.falling) x += Math.sin(S.t * 55) * 1.4 * (p.t / CRUMBLE_DELAY);
  const w = p.w, h = p.h;
  ctx.save(); ctx.globalAlpha = p.a;
  if (p.type === "pillar") {
    rr(ctx, x, sy, w, h, 5); ctx.fillStyle = C.orange; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = C.cream; ctx.fillRect(x, sy, w, 5); ctx.restore();
  } else if (p.type === "move") {
    rr(ctx, x, sy, w, h, 6); ctx.fillStyle = C.orange; ctx.fill();
    ctx.fillStyle = C.cream; ctx.fillRect(x + 3, sy, w - 6, 4);
    ctx.beginPath(); ctx.moveTo(x + 7, sy + 10); ctx.lineTo(x + 13, sy + 6); ctx.lineTo(x + 13, sy + 14);
    ctx.moveTo(x + w - 7, sy + 10); ctx.lineTo(x + w - 13, sy + 6); ctx.lineTo(x + w - 13, sy + 14); ctx.fill();
  } else if (p.type === "crumble") {
    rr(ctx, x, sy, w, h, 4); ctx.fillStyle = C.bag; ctx.fill();
    ctx.strokeStyle = C.orange; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); rr(ctx, x + 3, sy + 3, w - 6, h - 6, 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x + w * 0.7, sy + h); ctx.lineTo(x + w * 0.7, sy + h + 8); ctx.stroke();
    ctx.fillStyle = C.cream; ctx.fillRect(x + w * 0.7 - 5, sy + h + 8, 10, 11); ctx.strokeRect(x + w * 0.7 - 5, sy + h + 8, 10, 11);
  } else {
    rr(ctx, x, sy, w, h, 6); ctx.fillStyle = C.cream; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.orange; ctx.fillRect(x, sy + h - 5, w, 5);
    if (p.type === "slip") {
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2;
      const off = mod(S.t * CURRENT_SPEED * p.slip, 16);
      for (let cx = x - 16 + off; cx < x + w + 16; cx += 16) {
        ctx.beginPath(); ctx.moveTo(cx - 3 * p.slip, sy + 3); ctx.lineTo(cx + 3 * p.slip, sy + 7); ctx.lineTo(cx - 3 * p.slip, sy + 11); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawTili(ctx, T, S) {
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
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-hw * 1.5, -TH * 0.25, -hw * 1.2, -TH * 0.8, 0, -TH);
  ctx.bezierCurveTo(hw * 1.2, -TH * 0.8, hw * 1.5, -TH * 0.25, 0, 0);
  ctx.fillStyle = C.leaf; ctx.fill();
  ctx.strokeStyle = C.leafDark; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -TH * 0.28);
  ctx.moveTo(0, -TH * 0.8); ctx.lineTo(0, -TH * 0.92); ctx.stroke();
  const ex = T.dir * 1.5;
  ctx.fillStyle = "#1d3a10";
  ctx.beginPath(); ctx.arc(-4 + ex, -TH * 0.52, 2, 0, 6.283); ctx.arc(4 + ex, -TH * 0.52, 2, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(ex, -TH * 0.42, 2.5, 0.2, 2.94); ctx.strokeStyle = "#1d3a10"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  if (T.grounded && T.charge > 0) {
    const bw = 38, bx = T.x - bw / 2, bY = by - TH * sy - 16;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; rr(ctx, bx - 2, bY - 2, bw + 4, 10, 5); ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, C.cream); g.addColorStop(1, "#E5432A");
    ctx.fillStyle = g; rr(ctx, bx, bY, bw * T.charge, 6, 3); ctx.fill();
    ctx.fillStyle = C.cream; ctx.beginPath();
    if (T.dir === 0) { ctx.moveTo(T.x, bY - 10); ctx.lineTo(T.x - 4, bY - 4); ctx.lineTo(T.x + 4, bY - 4); }
    else { const ax = T.x + T.dir * (bw / 2 + 10); ctx.moveTo(ax + T.dir * 4, bY + 3); ctx.lineTo(ax - T.dir * 2, bY - 2); ctx.lineTo(ax - T.dir * 2, bY + 8); }
    ctx.fill();
  }
}

function drawMp(ctx, m, S) {
  const sy = m.y - S.cam;
  if (sy > S.LH + 10) {
    if (sy < S.LH + 160) {
      ctx.globalAlpha = 0.8 - (sy - S.LH) / 220; ctx.fillStyle = C.plastic; ctx.beginPath();
      ctx.moveTo(m.x, S.LH - 14); ctx.lineTo(m.x - 6, S.LH - 4); ctx.lineTo(m.x + 6, S.LH - 4); ctx.fill(); ctx.globalAlpha = 1;
    }
    return;
  }
  if (sy < -20) return;
  ctx.save(); ctx.translate(m.x, sy); ctx.rotate(m.rot);
  ctx.fillStyle = "rgba(190,235,255,0.22)"; ctx.beginPath(); ctx.arc(0, 0, m.r * 1.7, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.plastic; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath();
  if (m.k === 0) { const r = m.r; ctx.moveTo(r, 0); ctx.lineTo(r * 0.2, r * 0.9); ctx.lineTo(-r * 0.8, r * 0.4); ctx.lineTo(-r, -r * 0.5); ctx.lineTo(r * 0.1, -r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (m.k === 1) { ctx.arc(0, 0, m.r * 0.8, 0, 6.283); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-m.r * 0.25, -m.r * 0.25, m.r * 0.25, 0, 6.283); ctx.fill(); }
  else { ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.strokeStyle = C.plastic; ctx.moveTo(-m.r, 0); ctx.quadraticCurveTo(0, m.r * 0.8, m.r, 0); ctx.stroke(); }
  ctx.restore();
}

function draw(ctx, S, imgs) {
  const LH = S.LH, t = S.t, cam = S.cam;
  ctx.setTransform(S.dpr * S.s, 0, 0, S.dpr * S.s, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, C.bgTop); g.addColorStop(1, C.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);

  for (const b of S.blobs) {
    const per = LH + b.r * 2.5;
    const sy = mod(b.y - cam * b.par - t * 5, per) - b.r * 1.25;
    const sx = b.x + Math.sin(t * b.sp + b.ph) * 30;
    ctx.save(); ctx.translate(sx, sy); ctx.fillStyle = C.blob;
    blobPath(ctx, b, t); ctx.fill();
    for (const d of b.drops) { const a = d.a + t * b.sp * 0.6; ctx.beginPath(); ctx.arc(Math.cos(a) * b.r * d.d, Math.sin(a) * b.r * d.d, d.r, 0, 6.283); ctx.fill(); }
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
    if (!img.complete || !img.naturalWidth || sy < -130 || sy > LH + 130) continue;
    ctx.save(); ctx.translate(d.x, sy); ctx.rotate(d.r + Math.sin(t * 0.5 + d.ph) * 0.08);
    ctx.drawImage(img, -d.s / 2, (-d.s * img.naturalHeight) / img.naturalWidth / 2, d.s, (d.s * img.naturalHeight) / img.naturalWidth);
    ctx.restore();
  }
  ctx.restore();

  for (const p of S.w.plats) drawPlat(ctx, p, S);
  for (const m of S.mps) drawMp(ctx, m, S);
  drawTili(ctx, S.tili, S);

  tex(ctx, imgs.t1, S, "overlay", TEX1_ALPHA, cam * 0.5, cam * 0.5);
  tex(ctx, imgs.t2, S, "soft-light", TEX2_ALPHA, t * 8, t * 5 + cam * 0.3);
}

/* ============================ APP ============================ */
const ui = {
  fill: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 28, textAlign: "center", color: C.cream, background: "rgba(40,12,2,0.62)" },
  btn: { font: "inherit", fontSize: 18, fontWeight: 700, color: "#4a1803", background: C.cream, border: "none", borderBottom: `5px solid ${C.orange}`, borderRadius: 14, padding: "12px 34px", cursor: "pointer" },
};

export default function App() {
  const wrapRef = useRef(null), canvasRef = useRef(null), S = useRef(null);
  const inp = useRef({ ptr: false, ptrDir: 0, key: false, kl: false, kr: false });
  const [phase, setPhase] = useState("menu");
  const [hud, setHud] = useState({ lives: LIVES, h: 0, best: 0 });

  const start = () => {
    const st = S.current; reset(st); st.phase = "play"; st.tili.lock = true;
  };

  useEffect(() => {
    let best = 0;
    try { best = +localStorage.getItem("tili-best") || 0; } catch {}
    const st = (S.current = { t: 0, LH: 640, W: 360, H: 640, s: 1, dpr: 1, phase: "menu", shown: "menu", best, blobs: makeBlobs(), specks: makeSpecks() });
    reset(st);
    const load = (f) => { const i = new Image(); i.src = asset(f); return i; };
    const imgs = { deco: ["vistock1.webp", "vistock2.webp", "vistock3.webp", "vistock4.webp"].map(load), t1: load("gametexture1.webp"), t2: load("gametexture2.webp") };

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
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { i.key = down; e.preventDefault(); if (down && st.phase !== "play") start(); }
      if (["ArrowLeft", "KeyA"].includes(e.code)) { i.kl = down; e.preventDefault(); }
      if (["ArrowRight", "KeyD"].includes(e.code)) { i.kr = down; e.preventDefault(); }
    };
    const onD = (e) => kd(e, true), onU = (e) => kd(e, false);
    window.addEventListener("keydown", onD); window.addEventListener("keyup", onU);

    let last = performance.now(), raf, hv = "";
    const frame = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      update(st, dt, inp.current);
      draw(ctx, st, imgs);
      if (st.phase !== st.shown) { st.shown = st.phase; setPhase(st.phase); }
      const v = `${st.lives}|${Math.floor(st.maxH / 10)}|${st.best}`;
      if (v !== hv) { hv = v; setHud({ lives: st.lives, h: Math.floor(st.maxH / 10), best: st.best }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("keydown", onD); window.removeEventListener("keyup", onU); };
  }, []);

  const zone = (e) => {
    const r = canvasRef.current.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
    return f < LEFT_ZONE ? -1 : f > RIGHT_ZONE ? 1 : 0;
  };
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); inp.current.ptr = true; inp.current.ptrDir = zone(e); };
  const move = (e) => { if (inp.current.ptr) inp.current.ptrDir = zone(e); };
  const up = () => { inp.current.ptr = false; };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#2a0d02", display: "flex", justifyContent: "center", overscrollBehavior: "none", touchAction: "none", userSelect: "none", fontFamily: 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif' }}>
      <style>{`html,body,#root{margin:0;height:100%;overflow:hidden;overscroll-behavior:none}`}</style>
      <div ref={wrapRef} style={{ position: "relative", width: "min(100vw, 480px)", height: "100%" }}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

        <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", color: C.cream, fontWeight: 700, fontSize: 16, pointerEvents: "none", textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: LIVES }, (_, i) => (
              <svg key={i} width="20" height="24" viewBox="-12 -30 24 32" opacity={i < hud.lives ? 1 : 0.25}>
                <path d="M0 0C-17 -7 -14 -23 0 -28C14 -23 17 -7 0 0Z" fill={C.leaf} stroke={C.leafDark} strokeWidth="2" />
              </svg>
            ))}
          </div>
          <div>{hud.h} m</div>
        </div>

        {phase === "menu" && (
          <div style={ui.fill}>
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>Tili</div>
            <div style={{ fontSize: 17, maxWidth: 280 }}>Tili is a tea leaf stuck in a very big cup. Climb out before the microplastics catch her.</div>
            <div style={{ fontSize: 14, opacity: 0.85, maxWidth: 290 }}>
              Hold to charge, release to jump. Touch the left, middle or right of the screen to aim. On a keyboard: A / D to aim, Space to charge.
            </div>
            <button style={ui.btn} onClick={start}>Start</button>
          </div>
        )}
        {phase === "over" && (
          <div style={ui.fill}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>The microplastics got Tili</div>
            <div style={{ fontSize: 18 }}>You climbed {hud.h} m</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Best: {hud.best} m</div>
            <button style={ui.btn} onClick={start}>Climb again</button>
          </div>
        )}
      </div>
    </div>
  );
}
