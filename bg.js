/*
  背景：アメリカの本物の動画（videos/ フォルダ）、通信なしで動くアニメ、自分の動画。
  ・ニューヨークの夜 / ルート66の夕日 / ゴールデンゲートブリッジ は Canvas で描いているので通信なし・オフラインでも動く
  ・自分の動画は端末の IndexedDB に保存して、音なし・ループで流す
*/
(() => {
'use strict';

const PREF_KEY = 'memo.bg.v1';
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/* ---------- DOM ---------- */
const canvas = document.createElement('canvas');
canvas.className = 'bg-layer';
canvas.setAttribute('aria-hidden', 'true');
const video = document.createElement('video');
video.className = 'bg-layer video-bright';
video.muted = true; video.loop = true; video.playsInline = true; video.autoplay = true;
video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true');
const overlay = document.createElement('div');
overlay.className = 'bg-overlay';
document.body.prepend(canvas, video, overlay);
const ctx = canvas.getContext('2d');

/* ---------- 便利関数 ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
function off(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function vgrad(g, h, stops) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function glow(g, x, y, r, color, alpha) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color.replace('A', alpha));
  gr.addColorStop(1, color.replace('A', 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/* ======================================================================
   1. ニューヨークの夜：きらめく窓、赤白青に光るエンパイア・ステート、走る車
   ====================================================================== */
function sceneNYC(W, H, s) {
  const sky = off(W, H), sg = sky.getContext('2d');
  sg.fillStyle = vgrad(sg, H, [[0, '#070B1E'], [0.45, '#141A40'], [0.78, '#3A2A5C'], [1, '#5A3560']]);
  sg.fillRect(0, 0, W, H);
  glow(sg, W * 0.82, H * 0.12, 60 * s, 'rgba(255,240,210,A)', 0.25);
  sg.fillStyle = '#F4EAD2';
  sg.beginPath(); sg.arc(W * 0.82, H * 0.12, 14 * s, 0, Math.PI * 2); sg.fill();

  const stars = Array.from({ length: Math.round(W * H / (9000 * s * s)) }, () => ({
    x: rand(0, W), y: rand(0, H * 0.55), r: rand(0.5, 1.4) * s, p: rand(0, 6.28), sp: rand(0.6, 1.8),
  }));

  const ground = H * 0.88;
  const city = off(W, H), cg = city.getContext('2d');
  // 遠くのビル
  for (let x = -10 * s; x < W;) {
    const bw = rand(26, 60) * s, bh = rand(0.12, 0.3) * H;
    cg.fillStyle = '#1C2048';
    cg.fillRect(x, ground - bh, bw, bh);
    x += bw + rand(0, 6) * s;
  }
  // 手前のビル（窓つき）
  const windows = [];
  const near = '#0C0E24';
  const esbX = W * 0.6;
  function building(x, bw, bh) {
    cg.fillStyle = near;
    cg.fillRect(x, ground - bh, bw, bh);
    const ww = 3 * s, wh = 4.5 * s, gx = 7 * s, gy = 10 * s;
    for (let wy = ground - bh + 8 * s; wy < ground - 10 * s; wy += gy) {
      for (let wx = x + 5 * s; wx < x + bw - 5 * s; wx += gx) {
        const win = { x: wx, y: wy, w: ww, h: wh, on: Math.random() < 0.38, c: Math.random() < 0.8 ? '#FFD27A' : '#BFD8FF' };
        windows.push(win);
        cg.fillStyle = win.on ? win.c : '#151833';
        cg.fillRect(wx, wy, ww, wh);
      }
    }
  }
  for (let x = -20 * s; x < W;) {
    const bw = rand(34, 80) * s;
    if (Math.abs(x + bw / 2 - esbX) < 70 * s) { x += bw; continue; }
    building(x, bw, rand(0.16, 0.36) * H);
    x += bw + rand(2, 10) * s;
  }
  // エンパイア・ステート・ビル
  const tiers = [[90, 0.28], [64, 0.36], [44, 0.42], [26, 0.46], [12, 0.49]];
  tiers.forEach(([tw, th]) => building(esbX - tw * s / 2, tw * s, th * H));
  const topY = ground - 0.49 * H;
  cg.fillStyle = near;
  cg.fillRect(esbX - 2 * s, topY - 40 * s, 4 * s, 40 * s);
  // クライスラー・ビル風の尖塔
  const crX = W * 0.22, crBase = ground - 0.38 * H;
  building(crX - 22 * s, 44 * s, 0.38 * H);
  cg.fillStyle = near;
  cg.beginPath(); cg.moveTo(crX - 16 * s, crBase); cg.lineTo(crX, crBase - 60 * s); cg.lineTo(crX + 16 * s, crBase); cg.fill();
  cg.strokeStyle = 'rgba(255,220,160,.55)'; cg.lineWidth = 1.2 * s;
  for (let i = 1; i <= 4; i++) {
    cg.beginPath(); cg.arc(crX, crBase - i * 10 * s + 14 * s, (18 - i * 3.5) * s, Math.PI * 1.1, Math.PI * 1.9); cg.stroke();
  }
  cg.fillStyle = '#05060F';
  cg.fillRect(0, ground, W, H - ground);

  const cars = Array.from({ length: 14 }, (_, i) => ({
    lane: i % 2, x: rand(0, W), v: rand(30, 70) * s * (i % 2 ? -1 : 1),
  }));
  const usa = [[230, 60, 70], [255, 255, 255], [70, 110, 230]];

  return t => {
    ctx.drawImage(sky, 0, 0);
    for (const st of stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(st.p + t * st.sp));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;
    // 窓がときどき点いたり消えたり
    for (let i = 0; i < 3; i++) {
      const w = windows[(Math.random() * windows.length) | 0];
      if (!w) break;
      w.on = !w.on;
      cg.fillStyle = w.on ? w.c : '#151833';
      cg.fillRect(w.x, w.y, w.w, w.h);
    }
    ctx.drawImage(city, 0, 0);
    // てっぺんが赤→白→青に変わる
    const k = (t / 4) % 3, a = usa[k | 0], b = usa[((k | 0) + 1) % 3], f = k % 1;
    const col = a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',');
    glow(ctx, esbX, topY - 6 * s, 46 * s, `rgba(${col},A)`, 0.55);
    ctx.fillStyle = `rgb(${col})`;
    ctx.fillRect(esbX - 5 * s, topY - 4 * s, 10 * s, 6 * s);
    // 車のライト
    for (const c of cars) {
      c.x += c.v / 30;
      if (c.x > W + 20) c.x = -20; if (c.x < -20) c.x = W + 20;
      const y = ground + (c.lane ? 10 : 22) * s;
      glow(ctx, c.x, y, 9 * s, c.lane ? 'rgba(255,80,80,A)' : 'rgba(255,240,200,A)', 0.7);
    }
  };
}

/* ======================================================================
   2. ルート66の夕日：まっすぐな道、流れていくセンターライン、66の標識
   ====================================================================== */
function sceneRoute66(W, H, s) {
  const hz = H * 0.56, cx = W * 0.5;
  const bg = off(W, H), g = bg.getContext('2d');
  g.fillStyle = vgrad(g, hz, [[0, '#26184A'], [0.4, '#6E3570'], [0.75, '#E0705A'], [1, '#F7B267']]);
  g.fillRect(0, 0, W, hz);
  // 夕日（レトロなしま模様）
  const sr = Math.min(W, H) * 0.2;
  g.save();
  g.beginPath(); g.rect(0, 0, W, hz); g.clip();
  const sun = g.createLinearGradient(0, hz - sr, 0, hz);
  sun.addColorStop(0, '#FFE29A'); sun.addColorStop(1, '#FF8A5B');
  g.fillStyle = sun;
  g.beginPath(); g.arc(cx, hz, sr, Math.PI, 0); g.fill();
  g.clip();
  g.fillStyle = '#E0705A';
  for (let i = 0; i < 5; i++) g.fillRect(cx - sr, hz - sr * 0.12 - i * sr * 0.17, sr * 2, (5 - i) * 0.6 * s + 1.5 * s);
  g.restore();
  // メサ（テーブル状の岩山）
  function mesa(x, w, h, col) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, hz); g.lineTo(x + w * 0.15, hz - h); g.lineTo(x + w * 0.85, hz - h); g.lineTo(x + w, hz); g.fill();
  }
  mesa(W * -0.05, W * 0.35, H * 0.09, '#5A2848');
  mesa(W * 0.62, W * 0.45, H * 0.12, '#5A2848');
  mesa(W * 0.15, W * 0.18, H * 0.05, '#47203C');
  mesa(W * 0.78, W * 0.15, H * 0.06, '#47203C');
  g.fillStyle = vgrad(g, H, [[0, '#3A1A35'], [hz / H, '#3A1A35'], [1, '#170A16']]);
  g.fillRect(0, hz, W, H - hz);
  // 道
  g.fillStyle = '#231626';
  g.beginPath(); g.moveTo(cx - 3 * s, hz); g.lineTo(cx + 3 * s, hz); g.lineTo(W * 1.15, H); g.lineTo(W * -0.15, H); g.fill();
  g.strokeStyle = 'rgba(247,210,140,.5)'; g.lineWidth = 2 * s;
  g.beginPath(); g.moveTo(cx - 2 * s, hz); g.lineTo(W * -0.05, H); g.moveTo(cx + 2 * s, hz); g.lineTo(W * 1.05, H); g.stroke();

  const clouds = Array.from({ length: 5 }, () => ({ x: rand(0, W), y: rand(0.08, 0.35) * H, w: rand(80, 180) * s, v: rand(3, 8) * s }));
  const N = 14;
  const P = z => hz + (H - hz) * z * z;          // 奥行き z(0..1) → 画面のy
  const X = (z, side) => cx + side * (W * 0.65) * z * z; // 道の端からの距離

  function shield(x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#6B4A3A'; ctx.fillRect(-1.5, 0, 3, 46);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -30); ctx.quadraticCurveTo(0, -36, 15, -30); ctx.lineTo(14, -8);
    ctx.quadraticCurveTo(10, 4, 0, 8); ctx.quadraticCurveTo(-10, 4, -14, -8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 15px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('66', 0, -7);
    ctx.font = 'bold 6px Helvetica, Arial, sans-serif'; ctx.fillText('US', 0, -21);
    ctx.restore();
  }

  return t => {
    ctx.drawImage(bg, 0, 0);
    ctx.fillStyle = 'rgba(255,190,200,.22)';
    for (const c of clouds) {
      c.x = (c.x + c.v / 30) % (W + c.w);
      ctx.beginPath(); ctx.ellipse(c.x - c.w / 2, c.y, c.w / 2, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // センターライン
    const sp = (t * 0.35) % 1;
    ctx.fillStyle = '#F6D365';
    for (let i = 0; i < N; i++) {
      const z1 = (i + sp) / N, z2 = (i + sp + 0.45) / N;
      if (z2 > 1.05) continue;
      const y1 = P(z1), y2 = P(Math.min(z2, 1.05));
      const w1 = 0.5 * s + 7 * s * z1 * z1, w2 = 0.5 * s + 7 * s * z2 * z2;
      ctx.beginPath(); ctx.moveTo(cx - w1, y1); ctx.lineTo(cx + w1, y1); ctx.lineTo(cx + w2, y2); ctx.lineTo(cx - w2, y2); ctx.fill();
    }
    // 電柱（左）と 66 の標識（右）が近づいてくる
    for (let i = 0; i < 4; i++) {
      const z = ((t * 0.09 + i / 4) % 1), y = P(z), k = 0.15 + z * z * 3.2;
      const px = X(z, -1) - 30 * s * z * z;
      ctx.strokeStyle = '#140912'; ctx.lineWidth = Math.max(1, 3 * k * s);
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y - 120 * k * s); ctx.moveTo(px - 18 * k * s, y - 110 * k * s); ctx.lineTo(px + 18 * k * s, y - 110 * k * s); ctx.stroke();
    }
    const zs = (t * 0.07) % 1;
    shield(X(zs, 1) + 30 * s * zs * zs, P(zs) - 46 * (0.15 + zs * zs * 3) * s, (0.15 + zs * zs * 3) * s);
  };
}

/* ======================================================================
   3. ゴールデンゲートブリッジ：夕暮れ、流れる霧、点滅する航空灯
   ====================================================================== */
function sceneGoldenGate(W, H, s) {
  const deck = H * 0.62, sea = H * 0.66;
  const bg = off(W, H), g = bg.getContext('2d');
  g.fillStyle = vgrad(g, H, [[0, '#18203E'], [0.35, '#3B4C78'], [0.58, '#E39A6E'], [0.66, '#F2B880'], [0.661, '#1C2A40'], [1, '#0A121F']]);
  g.fillRect(0, 0, W, H);
  glow(g, W * 0.5, sea, W * 0.5, 'rgba(255,190,130,A)', 0.35);
  // 丘（マリン岬）
  g.fillStyle = '#1B2236';
  g.beginPath(); g.moveTo(0, sea); g.quadraticCurveTo(W * 0.1, H * 0.5, W * 0.32, sea); g.fill();
  g.beginPath(); g.moveTo(W * 0.78, sea); g.quadraticCurveTo(W * 0.95, H * 0.54, W * 1.05, sea); g.fill();

  const orange = '#C0362C';
  const t1 = W * 0.27, t2 = W * 0.73, top = deck - H * 0.3, tw = 7 * s;
  g.strokeStyle = orange; g.fillStyle = orange;
  // 主ケーブル
  g.lineWidth = 2.2 * s;
  const cable = [];
  g.beginPath(); g.moveTo(t1, top + 6 * s); g.quadraticCurveTo(W / 2, deck + H * 0.02, t2, top + 6 * s); g.stroke();
  g.beginPath(); g.moveTo(-W * 0.05, deck - 4 * s); g.quadraticCurveTo(t1 * 0.6, deck - 10 * s, t1, top + 6 * s); g.stroke();
  g.beginPath(); g.moveTo(W * 1.05, deck - 4 * s); g.quadraticCurveTo(W - (W - t2) * 0.6, deck - 10 * s, t2, top + 6 * s); g.stroke();
  // 吊りケーブル
  g.lineWidth = 0.7 * s;
  for (let x = t1 + 8 * s; x < t2; x += 9 * s) {
    const u = (x - t1) / (t2 - t1);
    const cy = (1 - u) * (1 - u) * (top + 6 * s) + 2 * (1 - u) * u * (deck + H * 0.02) + u * u * (top + 6 * s);
    g.beginPath(); g.moveTo(x, cy); g.lineTo(x, deck); g.stroke();
    cable.push(x);
  }
  // 塔
  for (const tx of [t1, t2]) {
    g.fillRect(tx - tw * 1.6, top, tw, sea - top);
    g.fillRect(tx + tw * 0.6, top, tw, sea - top);
    for (const f of [0, 0.22, 0.44, 0.66]) g.fillRect(tx - tw * 1.6, top + (deck - top) * f, tw * 3.2, 3.5 * s);
  }
  // 道路
  g.fillRect(-10, deck, W + 20, 5 * s);
  g.fillStyle = '#7A231D';
  g.fillRect(-10, deck + 5 * s, W + 20, 3 * s);

  const fog = Array.from({ length: 9 }, () => ({ x: rand(-0.3, 1.3) * W, y: rand(deck - H * 0.18, sea + H * 0.04), r: rand(70, 150) * s, v: rand(6, 14) * s }));
  const shimmer = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(sea + 4, H), w: rand(8, 30) * s, p: rand(0, 6.28) }));
  const cars = Array.from({ length: 10 }, (_, i) => ({ x: rand(0, W), v: rand(25, 45) * s * (i % 2 ? -1 : 1) }));

  return t => {
    ctx.drawImage(bg, 0, 0);
    for (const sh of shimmer) {
      ctx.globalAlpha = 0.15 + 0.25 * Math.abs(Math.sin(sh.p + t));
      ctx.fillStyle = '#F2C49A';
      ctx.fillRect(sh.x, sh.y, sh.w, 1.2 * s);
    }
    ctx.globalAlpha = 1;
    for (const c of cars) {
      c.x += c.v / 30;
      if (c.x > W + 10) c.x = -10; if (c.x < -10) c.x = W + 10;
      glow(ctx, c.x, deck - 1.5 * s, 4 * s, c.v > 0 ? 'rgba(255,245,210,A)' : 'rgba(255,90,80,A)', 0.9);
    }
    // 航空灯
    if (Math.sin(t * 3) > 0.2) for (const tx of [t1, t2]) glow(ctx, tx, top - 2 * s, 8 * s, 'rgba(255,60,50,A)', 0.95);
    // 霧
    for (const f of fog) {
      f.x += f.v / 30;
      if (f.x - f.r > W) f.x = -f.r;
      glow(ctx, f.x, f.y, f.r, 'rgba(235,235,245,A)', 0.2);
    }
  };
}

const SCENES = { nyc: sceneNYC, route66: sceneRoute66, goldengate: sceneGoldenGate };

/* ---------- 自分の動画（IndexedDB） ---------- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('memo-bg', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction('files').objectStore('files').get(key);
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}
async function idbPut(key, val) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(val, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

/* ---------- 本物の動画（Pexels の無料動画を縦長・音なしに変換して同梱） ---------- */
const VIDEOS = {
  'nyc-taxi':               { anim: 'nyc', day: true },
  'brooklyn-bridge':        { anim: 'nyc', day: true },
  'times-square-night':     { anim: 'nyc' },
  'times-square-timelapse': { anim: 'nyc', day: true },
  'golden-gate-day':        { anim: 'goldengate', day: true },
  'golden-gate-night':      { anim: 'goldengate' },
};
const VIDEO_KEYS = Object.keys(VIDEOS);

/* ---------- 制御 ---------- */
let mode = lsGet(PREF_KEY) || 'shuffle';
// 本物の動画を入れたので、前にアニメを選んでいた人も一度だけ動画に切り替える
if (!lsGet(PREF_KEY + '.migrated2')) {
  if (SCENES[mode]) { mode = 'shuffle'; lsSet(PREF_KEY, mode); }
  lsSet(PREF_KEY + '.migrated2', '1');
}
let draw = null, raf = 0, last = 0, t0 = performance.now(), size = { w: 0, h: 0 };
let currentScene = null, videoURL = null, playingVideo = false, applyId = 0;

function pickVideo() {
  // 前回と違う動画にする
  const prev = lsGet(PREF_KEY + '.lastVideo');
  // テーマに関係なく明るい昼の動画から選ぶ（夜の動画はメニューから選べる）
  const pool = VIDEO_KEYS.filter(k => k !== prev && VIDEOS[k].day);
  const k = pool[(Math.random() * pool.length) | 0];
  lsSet(PREF_KEY + '.lastVideo', k);
  return k;
}

function build() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  size = { w, h };
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const s = Math.max(0.8, Math.min(w, h) / 400) * dpr;
  draw = SCENES[currentScene](canvas.width, canvas.height, s);
  draw((performance.now() - t0) / 1000);
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  if (now - last < 33) return; // 約30fps（電池にやさしく）
  last = now;
  draw && draw((now - t0) / 1000);
}
function stop() { cancelAnimationFrame(raf); raf = 0; }
function start() { if (!raf && draw && !reduceMotion && !document.hidden) raf = requestAnimationFrame(loop); }

function showAnim(key) {
  playingVideo = false;
  video.removeAttribute('src'); video.removeAttribute('poster'); video.load();
  video.style.display = 'none';
  currentScene = key;
  canvas.style.display = 'block';
  build();
  start();
}
function showVideo(src, poster, fallbackAnim) {
  const id = applyId;
  playingVideo = true;
  canvas.style.display = 'none';
  if (poster) video.poster = poster; else video.removeAttribute('poster');
  video.src = src;
  video.style.display = 'block';
  // 通信できない時などはアニメに切り替える
  video.onerror = () => { if (id === applyId && fallbackAnim) showAnim(fallbackAnim); };
  if (!reduceMotion) video.play().catch(() => {});
}

async function apply() {
  applyId++;
  stop();
  document.body.classList.toggle('has-bg', mode !== 'off');
  canvas.style.display = 'none';
  video.style.display = 'none';
  video.pause();
  if (mode === 'off') return;
  if (mode === 'video') {
    try {
      const blob = await idbGet('video');
      if (blob) {
        if (videoURL) URL.revokeObjectURL(videoURL);
        videoURL = URL.createObjectURL(blob);
        showVideo(videoURL, null, 'nyc');
        return;
      }
    } catch {}
    mode = 'shuffle';
  }
  if (SCENES[mode]) { showAnim(mode); return; }
  const key = VIDEOS[mode] ? mode : pickVideo();
  showVideo(`videos/${key}.mp4`, `videos/${key}.jpg`, VIDEOS[key].anim);
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (canvas.style.display !== 'block') return;
    // iPhone のアドレスバーの出し入れ程度では作り直さない
    if (Math.abs(canvas.clientWidth - size.w) > 2 || Math.abs(canvas.clientHeight - size.h) > 120) build();
  }, 200);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stop(); video.pause(); }
  else if (playingVideo) video.play().catch(() => {});
  else start();
});
// 低電力モードなどで自動再生が止められた時は、画面に触れたら再生する
['touchstart', 'pointerdown'].forEach(ev => document.addEventListener(ev, () => {
  if (playingVideo && video.paused && !reduceMotion) video.play().catch(() => {});
}, { passive: true }));

/* ---------- UI（フッターのセレクトと動画ボタン） ---------- */
const sel = document.getElementById('bgSelect');
const fileIn = document.getElementById('bgFile');
const videoBtn = document.getElementById('bgVideoBtn');

async function refreshSelect() {
  if (!sel) return;
  let hasVideo = false;
  try { hasVideo = !!(await idbGet('video')); } catch {}
  const opt = sel.querySelector('option[value=video]');
  opt.hidden = !hasVideo; opt.disabled = !hasVideo;
  sel.value = mode;
}
if (sel) sel.addEventListener('change', () => {
  mode = sel.value; lsSet(PREF_KEY, mode); apply();
});
if (videoBtn) videoBtn.addEventListener('click', () => fileIn.click());
if (fileIn) fileIn.addEventListener('change', async () => {
  const f = fileIn.files[0];
  fileIn.value = '';
  if (!f) return;
  try {
    await idbPut('video', f);
    mode = 'video'; lsSet(PREF_KEY, mode);
    await refreshSelect();
    apply();
  } catch {
    alert('動画を保存できませんでした。もう少し短い動画で試してください。');
  }
});

apply();
refreshSelect();
})();
