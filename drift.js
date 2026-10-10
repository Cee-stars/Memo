/*
  カードのすりガラスの中を、イエローキャブがドリフトしながら走るアニメーション。
  ・走るコースは、カードの大きさに合わせて伸び縮みする（左上で小さく一回転 → 右へ → 左へ切り返し → 右へ大きく回って → 左下へ）
  ・タイヤ痕と煙は「今どこまで走ったか」から毎フレーム描き直すので、画面を作り直しても途切れない
  ・文字の後ろを走る。見えていないカードは描かない（電池にやさしく）
*/
(() => {
'use strict';

const KEY = 'memo.drift';
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const enabled = () => lsGet(KEY) !== 'off';

/* コース（カードの左上 = 0,0 / 右下 = 1,1）。ユーザーが描いた黄色い線をなぞったもの */
const COURSE = [
  [0.13, 0.15], [0.15, 0.07], [0.24, 0.06], [0.29, 0.11], [0.27, 0.16],   // 左上で小さく一回転
  [0.38, 0.20], [0.51, 0.27], [0.58, 0.36], [0.58, 0.44], [0.50, 0.48],   // 右へ降りていく
  [0.36, 0.51], [0.23, 0.56], [0.17, 0.63], [0.19, 0.69], [0.27, 0.71],   // 左へ切り返し
  [0.37, 0.68], [0.48, 0.62], [0.60, 0.56], [0.72, 0.55], [0.80, 0.60],   // 右へ大きく
  [0.81, 0.70], [0.77, 0.78], [0.68, 0.84], [0.54, 0.89], [0.38, 0.92],   // 回り込んで
  [0.24, 0.93], [0.10, 0.93],                                               // 左下へ抜ける
];

// なめらかな曲線にする（Catmull-Rom）
function smooth(pts, steps) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const DENSE = smooth(COURSE, 14);

const SPEED = 165;        // px / 秒
const PAUSE = 1.4;        // 走り終えてから次に出てくるまで（秒）
const TRAIL = 520;        // タイヤ痕の長さ（px）
const MIN_HEIGHT = 230;   // これより低いカードでは走らせない

let cards = [];
let raf = 0, last = 0;
const t0 = performance.now();

const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
  for (const e of es) { const c = cards.find(c => c.el === e.target); if (c) c.visible = e.isIntersecting; }
}) : null;
const ro = 'ResizeObserver' in window ? new ResizeObserver(es => {
  for (const e of es) { const c = cards.find(c => c.el === e.target); if (c) layout(c); }
}) : null;

function layout(c) {
  const w = c.el.clientWidth, h = c.el.clientHeight;
  if (w === c.w && h === c.h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.w = w; c.h = h;
  c.canvas.width = Math.round(w * dpr); c.canvas.height = Math.round(h * dpr);
  c.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // コースをカードの大きさに合わせる（上の見出し部分は少し避ける）
  const top = Math.min(56, h * 0.12);
  const pts = DENSE.map(([x, y]) => [x * w, top + y * (h - top)]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const ang = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  // 曲がり具合（ドリフトの強さ）。前後をならしてガタつきを防ぐ
  const raw = ang.map((a, i) => {
    if (i === 0) return 0;
    let d = a - ang[i - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return d / Math.max(1, cum[i] - cum[i - 1]);
  });
  const curv = raw.map((_, i) => { let s = 0, n = 0; for (let k = -7; k <= 7; k++) { const v = raw[i + k]; if (v !== undefined) { s += v; n++; } } return s / n; });
  Object.assign(c, { pts, cum, ang, curv, total: cum[cum.length - 1] });
}

// コース上の距離 d の位置・向き・曲がり具合
function at(c, d) {
  const { cum, pts } = c;
  d = Math.max(0, Math.min(c.total, d));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const f = (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  let da = c.ang[hi] - c.ang[lo]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  return {
    x: pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f,
    y: pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f,
    a: c.ang[lo] + da * f,
    k: c.curv[lo] + (c.curv[hi] - c.curv[lo]) * f,
  };
}

function drawTaxi(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  // 影
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  roundRect(ctx, -15, -6.5, 32, 15, 5); ctx.fill();
  // 車体
  ctx.fillStyle = '#F7B81B'; ctx.strokeStyle = 'rgba(90,60,0,.55)'; ctx.lineWidth = 0.8;
  roundRect(ctx, -16, -7.5, 32, 15, 5); ctx.fill(); ctx.stroke();
  // 窓
  ctx.fillStyle = 'rgba(30,38,56,.85)';
  roundRect(ctx, 3, -5.8, 6.5, 11.6, 2); ctx.fill();      // フロントガラス
  roundRect(ctx, -11, -5.2, 4.5, 10.4, 1.6); ctx.fill();  // リアガラス
  // 屋根の TAXI ランプ
  ctx.fillStyle = '#FFF6D8'; roundRect(ctx, -3.5, -2.6, 4, 5.2, 1); ctx.fill();
  // チェッカー
  ctx.fillStyle = 'rgba(20,20,20,.7)';
  for (let i = 0; i < 4; i++) { ctx.fillRect(-6 + i * 3, -7.5, 1.5, 1.4); ctx.fillRect(-4.5 + i * 3, 6.1, 1.5, 1.4); }
  // ライト
  ctx.fillStyle = '#FFFBE6'; ctx.fillRect(14.6, -6, 1.6, 3); ctx.fillRect(14.6, 3, 1.6, 3);
  ctx.fillStyle = '#E2453A'; ctx.fillRect(-16.2, -6, 1.4, 2.6); ctx.fillRect(-16.2, 3.4, 1.4, 2.6);
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function slipOf(k) { return Math.max(-0.75, Math.min(0.75, k * 26)); }   // 曲がるほど車体が内側を向く

function draw(c, t) {
  const { ctx, w, h } = c;
  ctx.clearRect(0, 0, w, h);
  if (!c.total) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  const drive = c.total / SPEED, cycle = drive + PAUSE;
  const u = (t + c.phase) % cycle;
  const s = Math.min(u, drive) * SPEED;                         // 走った距離
  const fadeOut = u > drive ? 1 - (u - drive) / PAUSE : 1;      // 走り終えたら消えていく

  // タイヤ痕（曲がっているところほど濃い）
  const mark = dark ? '230,232,240' : '40,44,56';
  ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let d = Math.max(0, s - TRAIL); d < s - 6; d += 5) {
    const p1 = at(c, d), p2 = at(c, Math.min(s, d + 5));
    const strength = Math.min(1, Math.abs(p1.k) * 40);
    const age = 1 - (s - d) / TRAIL;
    const alpha = (0.05 + 0.32 * strength) * age * fadeOut;
    if (alpha < 0.01) continue;
    ctx.strokeStyle = `rgba(${mark},${alpha.toFixed(3)})`;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (const [p, i] of [[p1, 0], [p2, 1]]) {
        const ca = p.a + slipOf(p.k);
        const rx = p.x - Math.cos(ca) * 10 + Math.cos(ca + Math.PI / 2) * 5 * side;
        const ry = p.y - Math.sin(ca) * 10 + Math.sin(ca + Math.PI / 2) * 5 * side;
        i ? ctx.lineTo(rx, ry) : ctx.moveTo(rx, ry);
      }
    }
    ctx.stroke();
  }
  if (u > drive) return;

  // ドリフト中の煙
  const now = at(c, s);
  const drifting = Math.min(1, Math.abs(now.k) * 45);
  if (drifting > 0.15) {
    for (let i = 1; i <= 6; i++) {
      const p = at(c, s - i * 9);
      const ca = p.a + slipOf(p.k);
      const r = 4 + i * 2.6;
      const wob = Math.sin(t * 7 + i) * 2;
      ctx.fillStyle = dark ? `rgba(220,224,235,${(0.16 * drifting * (1 - i / 7)).toFixed(3)})`
                           : `rgba(140,146,160,${(0.20 * drifting * (1 - i / 7)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x - Math.cos(ca) * (12 + i * 3) + wob, p.y - Math.sin(ca) * (12 + i * 3) - wob, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 出てくる時はふわっと
  ctx.globalAlpha = Math.min(1, u / 0.35);
  drawTaxi(ctx, now.x, now.y, now.a + slipOf(now.k));
  ctx.globalAlpha = 1;
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  if (now - last < 33) return;   // 約30fps
  last = now;
  const t = (now - t0) / 1000;
  for (const c of cards) if (c.visible) draw(c, t);
}
function start() {
  if (raf || !cards.length || document.hidden) return;
  if (reduceMotion) { const t = 3; cards.forEach(c => draw(c, t)); return; }
  raf = requestAnimationFrame(loop);
}
function stop() { cancelAnimationFrame(raf); raf = 0; }

function refresh() {
  for (const c of cards) { io && io.unobserve(c.el); ro && ro.unobserve(c.el); c.canvas.remove(); }
  cards = [];
  if (!enabled()) { stop(); return; }
  let i = 0;
  document.querySelectorAll('#list .group').forEach(el => {
    if (el.classList.contains('closed') || el.clientHeight < MIN_HEIGHT) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'drift-layer';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const c = { el, canvas, ctx: canvas.getContext('2d'), visible: true, phase: (i++) * 2.7, w: 0, h: 0 };
    cards.push(c);
    layout(c);
    io && io.observe(el); ro && ro.observe(el);
  });
  if (!cards.length) stop(); else start();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

/* 見た目の設定のスイッチ */
const toggle = document.getElementById('driftToggle');
if (toggle) {
  toggle.checked = enabled();
  toggle.addEventListener('change', () => { lsSet(KEY, toggle.checked ? 'on' : 'off'); refresh(); });
}

window.MemoDrift = { refresh };
refresh();
})();
