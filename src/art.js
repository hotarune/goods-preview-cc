import * as THREE from 'three';

// Procedural sample artworks so the app works with no assets.

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cloud(ctx, x, y, s, rand, top, bottom) {
  const n = 7 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const cx = x + (rand() - 0.5) * s * 2.2;
    const cy = y + (rand() - 0.5) * s * 0.5 - Math.abs(cx - x) * -0.15;
    const r = s * (0.35 + rand() * 0.45);
    const g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, top);
    g.addColorStop(0.7, bottom);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawNight(W = 1200, H = 1350) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rand = rng(7);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#070d2a');
  sky.addColorStop(0.45, '#1d3378');
  sky.addColorStop(0.8, '#5b7fd0');
  sky.addColorStop(1, '#9fb8ec');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 420; i++) {
    const x = rand() * W, y = rand() * H * 0.6, r = rand() ** 3 * 2.4 + 0.4;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Moon
  const mx = W * 0.7, my = H * 0.24, mr = W * 0.12;
  const glow = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
  glow.addColorStop(0, 'rgba(255,240,210,0.45)');
  glow.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff5dc';
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,190,170,0.35)';
  [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.22], [-0.1, 0.4, 0.12], [0.4, -0.35, 0.1]].forEach(([dx, dy, r]) => {
    ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); ctx.fill();
  });

  // Clouds, far to near
  for (let i = 0; i < 9; i++) {
    cloud(ctx, rand() * W, H * (0.45 + i * 0.045), W * (0.08 + rand() * 0.06), rand,
      'rgba(235,240,255,0.85)', 'rgba(120,150,220,0.35)');
  }

  // Skyline silhouette with lit windows
  const base = H * 0.86;
  let x = -10;
  ctx.fillStyle = '#0c1433';
  const windows = [];
  while (x < W) {
    const w = 40 + rand() * 90, h = 60 + rand() * 260;
    ctx.fillRect(x, base - h, w, H - base + h);
    for (let wy = base - h + 14; wy < H - 10; wy += 18) {
      for (let wx = x + 8; wx < x + w - 8; wx += 14) if (rand() > 0.72) windows.push([wx, wy]);
    }
    x += w + rand() * 6;
  }
  ctx.fillStyle = '#ffd98a';
  windows.forEach(([wx, wy]) => ctx.fillRect(wx, wy, 6, 8));

  // Title
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 64px "Hiragino Mincho ProN", "Songti SC", "Noto Serif CJK SC", serif';
  ctx.textAlign = 'center';
  const t = '星降る夜';
  for (let i = 0; i < t.length; i++) ctx.fillText(t[i], W * 0.14, H * 0.16 + i * 76);
  ctx.font = '500 22px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('STARFALL NIGHT', W * 0.14, H * 0.16 + t.length * 76 + 20);
  ctx.restore();
  return c;
}

export function drawPastel(W = 1200, H = 1350) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rand = rng(21);

  const sky = ctx.createLinearGradient(0, 0, W * 0.3, H);
  sky.addColorStop(0, '#ffd9e6');
  sky.addColorStop(0.5, '#ffeede');
  sky.addColorStop(1, '#cfe6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Soft bokeh
  for (let i = 0; i < 40; i++) {
    const x = rand() * W, y = rand() * H, r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = [340, 20, 200, 50][i % 4];
    g.addColorStop(0, `hsla(${hue},90%,92%,0.55)`);
    g.addColorStop(1, `hsla(${hue},90%,92%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 6; i++) {
    cloud(ctx, rand() * W, H * (0.55 + i * 0.07), W * (0.1 + rand() * 0.05), rand,
      'rgba(255,255,255,0.95)', 'rgba(255,220,235,0.4)');
  }

  // Petals
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = rand() * H, s = 10 + rand() * 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = `hsla(${340 + rand() * 15},80%,${80 + rand() * 10}%,0.9)`;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.8, -s * 0.6, s * 0.6, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.6, s * 0.6, -s * 0.8, -s * 0.6, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#e46a8f';
  ctx.font = 'italic 700 150px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Spring', W / 2, H * 0.42);
  ctx.font = '500 26px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(160,80,110,0.8)';
  ctx.fillText('— はるのひ —', W / 2, H * 0.42 + 56);
  return c;
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function loadImageTexture(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      resolve(t);
    }, undefined, reject);
  });
}

// Cover-fit a texture onto a board of the given aspect (w/h).
export function coverFit(texture, boardAspect) {
  const img = texture.image;
  const imgAspect = img.width / img.height;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  if (imgAspect > boardAspect) {
    texture.repeat.set(boardAspect / imgAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imgAspect / boardAspect);
    texture.offset.set(0, (1 - texture.repeat.y) / 2);
  }
  texture.needsUpdate = true;
}
