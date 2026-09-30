import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createFilmMaterial } from './filmShader.js';
import { FILMS } from './films.js';

// 1 world unit = 10 mm.
const MM = 0.1;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function flatGeometry(shape, w, h) {
  const g = new THREE.ShapeGeometry(shape, 16);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  }
  return g;
}

// Dashed outline like the reference's exploded diagram.
function outline(shape) {
  const pts = shape.getPoints(16);
  pts.push(pts[0]);
  const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)));
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({
    color: 0x9a9a9a, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0,
  }));
  line.computeLineDistances();
  line.scale.setScalar(1.035);
  return line;
}

function makeLabel(index) {
  const el = document.createElement('div');
  el.className = 'layer-label';
  el.innerHTML = `
    <div class="ll-text">
      <div class="ll-title"><span class="ll-num">0${index + 1}</span><span class="ll-name"></span></div>
      <div class="ll-spec"></div>
    </div>
    <span class="ll-line"></span><span class="ll-dot"></span>`;
  const obj = new CSS2DObject(el);
  obj.center.set(1, 0.5);
  return obj;
}

export class Board {
  constructor({ artTexture, filmId = 0, withLabels = false }) {
    this.group = new THREE.Group();
    this.filmId = filmId;
    this.explode = 0;
    this.withLabels = withLabels;

    this.acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      thickness: 0.5,
      ior: 1.49,
      roughness: 0,
      metalness: 0,
      specularIntensity: 1,
      attenuationColor: new THREE.Color(0xe6f4f1),
      attenuationDistance: 12,
      envMapIntensity: 0.55,
    });
    this.printMat = new THREE.MeshStandardMaterial({ map: artTexture, roughness: 0.55, metalness: 0 });
    this.baseMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.9, side: THREE.DoubleSide });
    this.backMat = new THREE.MeshStandardMaterial({
      color: 0xdedcd5, roughness: 0.75, side: THREE.DoubleSide, transparent: true, opacity: 1,
    });

    // Layer order, front to back.
    this.layers = [
      { key: 'film' },
      { key: 'acrylic' },
      { key: 'print' },
      { key: 'base' },
      { key: 'back' },
    ].map((l, i) => {
      const holder = new THREE.Group();
      this.group.add(holder);
      const layer = { ...l, holder, index: i };
      if (withLabels) {
        layer.label = makeLabel(i);
        holder.add(layer.label);
      }
      return layer;
    });
  }

  build(wMM, hMM, tMM) {
    this.wMM = wMM; this.hMM = hMM; this.tMM = tMM;
    const w = wMM * MM, h = hMM * MM, t = tMM * MM;
    this.w = w; this.h = h; this.t = t;
    const r = Math.min(w, h) * 0.035;
    const shape = roundedRect(w, h, r);

    for (const l of this.layers) {
      l.holder.children.filter((c) => c.isMesh || c.isLine).forEach((c) => {
        c.geometry.dispose();
        l.holder.remove(c);
      });
    }

    const bevel = Math.min(0.04, t * 0.12);
    const acrylicGeo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.01)), {
      depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 3, curveSegments: 16,
    });
    acrylicGeo.translate(0, 0, -(t - bevel * 2) / 2);
    this.acrylicMat.thickness = t;

    const flat = flatGeometry(shape, w, h);
    const sizeMM = new THREE.Vector2(wMM, hMM);
    if (!this.filmMat) this.filmMat = createFilmMaterial(this.filmId, sizeMM);
    this.filmMat.uniforms.uSizeMM.value.copy(sizeMM);

    const meshes = {
      film: new THREE.Mesh(flat, this.filmMat),
      acrylic: new THREE.Mesh(acrylicGeo, this.acrylicMat),
      print: new THREE.Mesh(flat.clone(), this.printMat),
      base: new THREE.Mesh(flat.clone(), this.baseMat),
      back: new THREE.Mesh(flat.clone(), this.backMat),
    };
    meshes.film.renderOrder = 2;

    // Assembled z (local to board) for each layer.
    const z = { film: t / 2 + 0.012, acrylic: 0, print: -t / 2 - 0.012, base: -t / 2 - 0.03, back: -t / 2 - 0.05 };
    for (const l of this.layers) {
      l.mesh = meshes[l.key];
      l.mesh.userData.board = this;
      l.holder.add(l.mesh);
      l.line = outline(shape);
      l.holder.add(l.line);
      l.z0 = z[l.key];
      if (l.label) l.label.position.set(-w / 2 - 0.2, -h / 2 + r * 1.5, 0);
    }
    this.setExplode(this.explode);
    this.updateLabels();
  }

  setArt(texture) {
    this.printMat.map = texture;
    this.printMat.needsUpdate = true;
  }

  setFilm(id) {
    this.filmId = id;
    if (!this.filmMat) return;
    this.filmMat.uniforms.uFilm.value = id;
    const a = FILMS[id].acrylic;
    this.acrylicMat.specularIntensity = a.specular;
    this.acrylicMat.roughness = a.roughness;
    this.updateLabels();
  }

  // e: 0 assembled .. 1 fully exploded
  setExplode(e) {
    this.explode = e;
    const gap = Math.max(this.w, this.h) * 0.36;
    const mid = (this.layers.length - 1) / 2;
    for (const l of this.layers) {
      l.holder.position.z = THREE.MathUtils.lerp(l.z0, (mid - l.index) * gap, e);
      l.line.material.opacity = e * 0.9;
      if (l.label) {
        l.label.element.style.opacity = Math.max(0, e * 1.4 - 0.4);
        l.label.visible = e > 0.02;
      }
    }
    this.filmMat.uniforms.uIsolated.value = e;
  }

  updateLabels() {
    if (!this.withLabels || !this.tMM) return;
    const f = FILMS[this.filmId];
    const info = [
      [`${f.en} film · ${f.cn}`, f.spec],
      ['Clear acrylic', `Cast PMMA · ${this.tMM} mm`],
      ['Printed ink', 'UV CMYK, reverse printed · 12 µm'],
      ['White underbase', 'UV white ink · 8 µm'],
      ['Backing sheet', 'Protective PET · 50 µm'],
    ];
    this.layers.forEach((l, i) => {
      l.label.element.querySelector('.ll-name').textContent = info[i][0];
      l.label.element.querySelector('.ll-spec').textContent = info[i][1];
    });
  }

  get pickables() {
    return this.layers.map((l) => l.mesh);
  }
}
