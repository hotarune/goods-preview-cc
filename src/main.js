import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { FILMS, SIZES, THICKNESS } from './films.js';
import { Board } from './board.js';
import { sharedUniforms } from './filmShader.js';
import { LANGS, getLang, setLang, onLangChange, t, loc, applyI18n } from './i18n.js';
import { drawNight, drawPastel, canvasTexture, loadImageTexture, coverFit } from './art.js';

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- state
const state = {
  film: 0,
  size: SIZES[0],
  thickness: 5,
  art: 'night',
  explode: false,
  compare: false,
  paused: false,
  follow: false,
};

// ---------------------------------------------------------------- renderer
const viewport = $('#viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
viewport.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
viewport.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;
scene.environmentIntensity = 0.5;

const camera = new THREE.PerspectiveCamera(30, 1, 2, 1500);
camera.position.set(0, 0, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 700;

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dce6, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
scene.add(keyLight, keyLight.target);

// A soft photo-studio environment: pale walls plus two diffuse softboxes.
// Kept dim on purpose so glossy reflections read as highlights, not white-outs.
function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float y = normalize(vP).y; gl_FragColor = vec4(mix(vec3(0.32,0.32,0.34), vec3(0.62,0.63,0.66), smoothstep(-0.6,0.8,y)), 1.0); }',
    }),
  );
  env.add(room);
  const panel = (w, h, pos, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity) }));
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(22, 14, new THREE.Vector3(-18, 16, 30), 2.2);
  panel(10, 30, new THREE.Vector3(34, 6, 12), 1.4);
  panel(40, 6, new THREE.Vector3(0, 40, 0), 1.2);
  return env;
}

// Screen-fixed grid backdrop (also shows through the acrylic's refraction).
function makeBackdrop(w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio, 2);
  c.width = Math.max(1, w * dpr); c.height = Math.max(1, h * dpr);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f7f5';
  ctx.fillRect(0, 0, c.width, c.height);
  const step = 64 * dpr;
  ctx.strokeStyle = 'rgba(0,0,0,0.035)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = (c.width / 2) % step; x < c.width; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, c.height); }
  for (let y = (c.height / 2) % step; y < c.height; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(c.width, y + 0.5); }
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- artwork
const artCanvases = { night: drawNight(), pastel: drawPastel() };
const artTextures = { night: canvasTexture(artCanvases.night), pastel: canvasTexture(artCanvases.pastel) };
let artTexture = artTextures.night;

// ---------------------------------------------------------------- boards
const main = new Board({ artTexture, filmId: state.film, withLabels: true });
scene.add(main.group);

let compareBoards = null;
const compareRoot = new THREE.Group();
compareRoot.visible = false;
scene.add(compareRoot);

function ensureCompareBoards() {
  if (compareBoards) return;
  compareBoards = FILMS.map((f) => {
    const b = new Board({ artTexture, filmId: f.id });
    const el = document.createElement('div');
    el.className = 'compare-label';
    el.textContent = loc(f.name);
    b.label = new CSS2DObject(el);
    b.label.center.set(0.5, 0);
    b.group.add(b.label);
    compareRoot.add(b.group);
    return b;
  });
  rebuild();
}

function allBoards() {
  return compareBoards ? [main, ...compareBoards] : [main];
}

function rebuild() {
  const { w, h } = state.size;
  for (const b of allBoards()) {
    b.build(w, h, state.thickness);
    b.setFilm(b === main ? state.film : b.filmId);
    b.setArt(artTexture);
  }
  coverFit(artTexture, w / h);
  if (compareBoards) layoutCompare();
  frameCamera();
}

function compareGrid() {
  const aspect = viewport.clientWidth / Math.max(1, viewport.clientHeight);
  return aspect > 1.0 ? { cols: 5, rows: 2 } : aspect > 0.7 ? { cols: 4, rows: 3 } : { cols: 2, rows: 5 };
}

function layoutCompare() {
  const { cols, rows } = compareGrid();
  const sx = main.w * 1.22, sy = main.h * 1.38;
  compareBoards.forEach((b, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = Math.min(cols, FILMS.length - r * cols);
    b.group.position.set((c - (inRow - 1) / 2) * sx, ((rows - 1) / 2 - r) * sy + main.h * 0.08, 0);
    b.label.position.set(0, -main.h / 2 - main.h * 0.07, 0);
    b.label.element.classList.toggle('active', b.filmId === state.film);
  });
}

// ---------------------------------------------------------------- camera framing
const camTween = { t: 1, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3() };

function fitDistance(boxW, boxH) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tan = Math.tan(vFov / 2);
  return Math.max(boxH / 2 / tan, boxW / 2 / (tan * camera.aspect));
}

function frameCamera(instant = false) {
  let boxW, boxH;
  const target = new THREE.Vector3();
  if (state.compare) {
    const { cols, rows } = compareGrid();
    boxW = cols * main.w * 1.22 + main.w * 0.3;
    boxH = rows * main.h * 1.38 + main.h * 0.6;
    target.y = -main.h * 0.05;
  } else if (state.explode) {
    boxW = main.w * 2.8;
    boxH = main.h * 3.1;
    target.set(-main.w * 0.35, -main.h * 0.12, 0);
  } else {
    boxW = main.w * 1.5;
    boxH = main.h * 1.55;
    target.y = -main.h * 0.08;
  }
  const d = fitDistance(boxW, boxH);
  camTween.fromPos.copy(camera.position);
  camTween.fromTgt.copy(controls.target);
  camTween.toTgt.copy(target);
  camTween.toPos.copy(target).add(new THREE.Vector3(0, 0, d));
  camTween.t = instant ? 1 : 0;
  if (instant) {
    camera.position.copy(camTween.toPos);
    controls.target.copy(target);
  }
}

// ---------------------------------------------------------------- resize
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  if (scene.background) scene.background.dispose();
  scene.background = makeBackdrop(w, h);
  if (compareBoards) layoutCompare();
  frameCamera(true);
}
new ResizeObserver(resize).observe(viewport);

// ---------------------------------------------------------------- UI: dock
const swatchWrap = $('#swatches');
const CHIP_GLYPH = { star: '★', heart: '♥' };
FILMS.forEach((f) => {
  const b = document.createElement('button');
  b.className = 'swatch';
  b.setAttribute('role', 'radio');
  b.innerHTML = `<span class="chip ${f.key}">${CHIP_GLYPH[f.key] || ''}</span><small></small>`;
  b.addEventListener('click', () => setFilm(f.id));
  swatchWrap.appendChild(b);
});

function renderSwatchText() {
  FILMS.forEach((f, i) => {
    const b = swatchWrap.children[i];
    b.title = t('swatch.title', { name: loc(f.name), key: (f.id + 1) % 10 });
    b.querySelector('small').textContent = loc(f.name);
  });
}

function setFilm(id) {
  state.film = id;
  main.setFilm(id);
  const f = FILMS[id];
  $('#film-eyebrow').textContent = t('film.eyebrow', { num: String(id + 1).padStart(2, '0'), total: FILMS.length });
  $('#film-name').textContent = loc(f.name);
  $('#film-desc').textContent = loc(f.desc);
  $('#film-spec').textContent = loc(f.spec);
  $('#film-tip').hidden = id < 4;
  [...swatchWrap.children].forEach((el, i) => el.setAttribute('aria-checked', String(i === id)));
  swatchWrap.children[id].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (compareBoards) compareBoards.forEach((b) => b.label.element.classList.toggle('active', b.filmId === id));
}

function setExplode(on) {
  if (on && state.compare) setCompare(false);
  state.explode = on;
  $('#btn-explode').setAttribute('aria-pressed', String(on));
  frameCamera();
}

function setCompare(on) {
  if (on) ensureCompareBoards();
  if (on && state.explode) { state.explode = false; $('#btn-explode').setAttribute('aria-pressed', 'false'); }
  state.compare = on;
  main.group.visible = !on;
  compareRoot.visible = on;
  $('#compare-hint').hidden = !on;
  $('#btn-compare').setAttribute('aria-pressed', String(on));
  if (compareBoards) layoutCompare();
  frameCamera();
}

function setPaused(on) {
  state.paused = on;
  $('#btn-pause').setAttribute('aria-pressed', String(on));
}

$('#btn-explode').addEventListener('click', () => setExplode(!state.explode));
$('#btn-compare').addEventListener('click', () => setCompare(!state.compare));
$('#btn-pause').addEventListener('click', () => setPaused(!state.paused));

// ---------------------------------------------------------------- UI: panel
function segmented(container, items, isActive, onPick) {
  const render = () => {
    container.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.textContent = loc(it.label);
      b.setAttribute('aria-pressed', String(isActive(it)));
      b.addEventListener('click', () => { onPick(it); render(); });
      container.appendChild(b);
    });
  };
  render();
  return render;
}
const renderSizes = segmented($('#sizes'), SIZES, (s) => s === state.size, (s) => { state.size = s; rebuild(); });
segmented($('#thickness'), THICKNESS.map((t) => ({ t, label: `${t} mm` })), (x) => x.t === state.thickness,
  (x) => { state.thickness = x.t; rebuild(); });

// Art tile thumbnails
document.querySelectorAll('.art-tile[data-art]').forEach((tile) => {
  const src = artCanvases[tile.dataset.art];
  const c = tile.querySelector('canvas');
  c.width = 120; c.height = 135;
  c.getContext('2d').drawImage(src, 0, 0, 120, 135);
  tile.addEventListener('click', () => useArt(tile.dataset.art, artTextures[tile.dataset.art]));
});

function useArt(key, tex) {
  state.art = key;
  artTexture = tex;
  coverFit(tex, state.size.w / state.size.h);
  allBoards().forEach((b) => b.setArt(tex));
  document.querySelectorAll('.art-tile').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.art === key)));
}

async function useFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const tex = await loadImageTexture(file);
  const up = document.querySelector('.art-tile.upload');
  up.dataset.art = 'upload';
  up.classList.add('has-image');
  up.style.background = `center / cover no-repeat url(${tex.image.src})`;
  artTextures.upload = tex;
  useArt('upload', tex);
}
$('#file').addEventListener('change', (e) => useFile(e.target.files[0]));

const drop = $('#drop');
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; drop.hidden = false; });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.hidden = true; } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; drop.hidden = true;
  useFile(e.dataTransfer.files[0]);
});

$('#follow').addEventListener('change', (e) => { state.follow = e.target.checked; });
$('#strength').addEventListener('input', (e) => { sharedUniforms.uStrength.value = +e.target.value; });

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (/^[0-9]$/.test(e.key)) setFilm((+e.key + 9) % 10);
  else if (e.key === 'e' || e.key === 'E') setExplode(!state.explode);
  else if (e.key === 'c' || e.key === 'C') setCompare(!state.compare);
  else if (e.key === 'ArrowRight') setFilm((state.film + 1) % FILMS.length);
  else if (e.key === 'ArrowLeft') setFilm((state.film + FILMS.length - 1) % FILMS.length);
  else if (e.key === ' ') { e.preventDefault(); setPaused(!state.paused); }
});

// ---------------------------------------------------------------- UI: language
const langSelect = $('#lang');
LANGS.forEach(({ code, label }) => langSelect.add(new Option(label, code)));
langSelect.addEventListener('change', (e) => setLang(e.target.value));

function applyLang() {
  langSelect.value = getLang();
  applyI18n();
  renderSwatchText();
  renderSizes();
  setFilm(state.film);
  main.updateLabels();
  if (compareBoards) compareBoards.forEach((b) => { b.label.element.textContent = loc(FILMS[b.filmId].name); });
}
onLangChange(applyLang);

// ---------------------------------------------------------------- pointer: cursor light + compare picking
const pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
});
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!state.compare || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(compareBoards.flatMap((b) => b.pickables), false)[0];
  if (hit) {
    setFilm(hit.object.userData.board.filmId);
    setCompare(false);
  }
});

// ---------------------------------------------------------------- animation
const qFront = new THREE.Quaternion();
const qIso = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.98, 0, -0.62, 'XYZ'));
const qTmp = new THREE.Quaternion();
const eTmp = new THREE.Euler();
const lightView = new THREE.Vector3();
let explodeAmt = 0;
let motionTime = 0;
let lastNow = performance.now();

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function tick() {
  const now = performance.now();
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;
  if (!state.paused) motionTime += dt;
  sharedUniforms.uTime.value = motionTime;
  const t = motionTime;

  // Explode transition
  const target = state.explode ? 1 : 0;
  explodeAmt += Math.sign(target - explodeAmt) * Math.min(Math.abs(target - explodeAmt), dt * 1.4);
  const e = ease(explodeAmt);
  main.setExplode(e);

  // Gentle rocking so highlights sweep across the film, like tilting it in hand.
  const amp = 1 - e * 0.7;
  eTmp.set(Math.sin(t * 0.37) * 0.13 * amp, Math.sin(t * 0.55) * 0.36 * amp, 0);
  const sway = new THREE.Quaternion().setFromEuler(eTmp);
  qTmp.slerpQuaternions(qFront, qIso, e).multiply(sway);
  main.group.quaternion.copy(qTmp);
  if (compareBoards && state.compare) compareBoards.forEach((b) => b.group.quaternion.copy(sway));

  // Key light, defined in view space so it behaves the same whichever way you orbit.
  if (state.follow) lightView.set(pointer.x * 1.6, pointer.y * 1.6, 1);
  else lightView.set(Math.sin(t * 0.41) * 0.9, 0.75 + Math.sin(t * 0.23) * 0.25, 1);
  lightView.normalize().applyQuaternion(camera.quaternion);
  sharedUniforms.uLight.value.copy(lightView);
  sharedUniforms.uBox.value.set(-18, 16, 30).normalize(); // matches the env softbox
  keyLight.position.copy(controls.target).addScaledVector(lightView, 50);
  keyLight.target.position.copy(controls.target);

  // Camera tween
  if (camTween.t < 1) {
    camTween.t = Math.min(1, camTween.t + dt * 1.3);
    const k = ease(camTween.t);
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTgt, camTween.toTgt, k);
  }
  controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- boot
applyLang();
rebuild();
resize();
controls.addEventListener('start', () => { camTween.t = 1; });
tick();

// Debug / automation hook
window.__shikishi = { state, setFilm, setExplode, setCompare, setPaused, setLang };
