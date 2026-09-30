import * as THREE from 'three';

// Shared, per-frame uniforms (same object referenced by every film material).
export const sharedUniforms = {
  uLight: { value: new THREE.Vector3(0.4, 0.6, 1).normalize() },
  uLight2: { value: new THREE.Vector3(-0.3, 1, 0.3).normalize() },
  // Direction of a large softbox, for the window-like reflection glossy films show.
  uBox: { value: new THREE.Vector3(-0.4, 0.5, 1).normalize() },
  uStrength: { value: 1 },
  uTime: { value: 0 },
};

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * vec3(0.0, 0.0, 1.0));
  vT = normalize(m * vec3(1.0, 0.0, 0.0));
  vB = normalize(m * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragment = /* glsl */ `
#define PI 3.14159265359
uniform int uFilm;
uniform vec3 uLight;
uniform vec3 uLight2;
uniform vec3 uBox;
uniform float uStrength;
uniform float uIsolated;
uniform vec2 uSizeMM;
uniform float uTime;

varying vec2 vUv;
varying vec3 vWPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;

vec3 N, V, L, L2;

// ---------- noise ----------
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ---------- colour ----------
vec3 rainbow(float x) {
  vec3 c = clamp(0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))), 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}

// Diffraction from a linear grating at angle a in the film plane.
// Light only diffracts along the grating direction (across ~ 0), and only
// where the in-plane component of L+V lands inside the visible band
// [lo, 1.8*lo]; position within the band picks the hue (red -> violet).
// pitch scales the band (finer grating = larger angles), phase jitters it.
vec3 grating(vec3 Ld, float a, float pitch, float phase, float width) {
  vec2 g = vec2(cos(a), sin(a));
  vec3 s = Ld + V;
  vec2 sp = vec2(dot(s, vT), dot(s, vB));
  float along = abs(dot(sp, g));
  float across = dot(sp, vec2(-g.y, g.x));
  float lit = exp(-across * across * width);
  float lo = 0.16 * pitch + 0.12 * fract(phase);
  float x1 = (along - lo) / (0.8 * lo);
  float x2 = (along - 2.0 * lo) / (1.6 * lo);
  float b1 = smoothstep(0.0, 0.15, x1) * smoothstep(1.0, 0.85, x1);
  float b2 = smoothstep(0.0, 0.15, x2) * smoothstep(1.0, 0.85, x2) * 0.45;
  vec3 c = rainbow(clamp(x1, 0.0, 1.0) * 0.78) * b1 + rainbow(clamp(x2, 0.0, 1.0) * 0.78) * b2;
  float facing = max(dot(N, Ld), 0.0);
  return c * lit * facing;
}
vec3 holo(float a, float pitch, float phase, float width) {
  return grating(L, a, pitch, phase, width) + 0.2 * grating(L2, a, pitch, phase, width);
}

// Reflection of a soft rectangular light box; blur widens and softens it.
float softbox(float blur) {
  vec3 R = reflect(-V, N);
  vec3 up = abs(uBox.y) > 0.95 ? vec3(1, 0, 0) : vec3(0, 1, 0);
  vec3 bx = normalize(cross(up, uBox));
  vec3 by = cross(uBox, bx);
  vec2 uv = vec2(dot(R, bx), dot(R, by)) / max(dot(R, uBox), 1e-3);
  vec2 q = abs(uv) / (vec2(0.2, 0.13) * (1.0 + blur * 2.0));
  float d = max(q.x, q.y);
  return smoothstep(1.0, 0.75 - blur * 0.5, d) * (1.0 - 0.6 * d * d) * step(0.0, dot(R, uBox));
}

float spec(vec3 n, vec3 Ld, float power) {
  return pow(max(dot(reflect(-Ld, n), V), 0.0), power);
}

// ---------- shapes ----------
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float dot2(vec2 v) { return dot(v, v); }
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// Voronoi: returns (edge distance, cell id hash) — iq's two-pass method.
vec3 voronoi(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  vec2 mg, mr; float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec3(md, n + mg);
}

// ---------- flakes shared by glitter-type effects ----------
vec3 flakes(vec2 p, float density, float size, float power, float tint) {
  vec2 q = p * density;
  vec2 ci = floor(q);
  vec2 r = hash22(ci);
  vec2 f = fract(q) - 0.5 - (r - 0.5) * 0.5;
  float flake = smoothstep(size, size * 0.3, length(f));
  vec2 tilt = (hash22(ci + 7.31) - 0.5) * 0.9;
  vec3 n2 = normalize(N + vT * tilt.x + vB * tilt.y);
  float s = spec(n2, L, power) + 0.5 * spec(n2, L2, power);
  vec3 c = mix(vec3(1.0, 0.97, 0.93), rainbow(hash12(ci + 3.7)), tint);
  return c * flake * s;
}

void main() {
  N = normalize(vN);
  V = normalize(cameraPosition - vWPos);
  if (dot(N, V) < 0.0) N = -N;
  L = normalize(uLight);
  L2 = normalize(uLight2);
  vec3 H = normalize(L + V);
  float NdH = max(dot(N, H), 0.0);
  float NdV = max(dot(N, V), 0.0);
  float NdL = max(dot(N, L), 0.0);
  float fres = pow(1.0 - NdV, 5.0);

  vec2 p = vUv * uSizeMM;  // millimetres on the film

  vec3 add = vec3(0.0);
  vec3 hazeCol = vec3(0.93, 0.94, 0.96);
  float haze = 0.0;
  bool isHolo = uFilm >= 4;

  if (uFilm == 0) {
    // Gloss: crisp mirror highlight, nothing else.
    add += vec3(1.0) * (pow(NdH, 900.0) * 8.0 + pow(NdH, 90.0) * 0.18);
  } else if (uFilm == 1) {
    // Matte: diffuse haze lowers contrast, broad dull sheen.
    float grain = hash12(floor(p * 18.0)) - 0.5;
    haze = 0.15 + 0.25 * fres + grain * 0.015;
    hazeCol *= 0.55 + 0.45 * NdL;
    add += vec3(1.0) * (pow(NdH, 10.0) * 0.1 + softbox(0.8) * 0.08);
  } else if (uFilm == 2) {
    // Soft-touch: velvety haze and a grazing-angle sheen.
    float grain = vnoise(p * 6.0) - 0.5;
    haze = 0.19 + 0.3 * fres + grain * 0.02;
    hazeCol = vec3(0.95, 0.94, 0.93) * (0.6 + 0.4 * NdL);
    float velvet = pow(1.0 - NdV, 2.5);
    add += vec3(1.0, 0.98, 0.96) * (velvet * 0.35 * (0.4 + NdL) + pow(NdH, 5.0) * 0.05);
  } else if (uFilm == 3) {
    // Fine glitter frost: matte base with tiny scattered flakes.
    haze = 0.09 + 0.2 * fres;
    hazeCol *= 0.6 + 0.4 * NdL;
    add += flakes(p, 2.4, 0.2, 260.0, 0.25) * 4.0;
    add += flakes(p + 31.0, 1.3, 0.16, 180.0, 0.1) * 3.0;
    add += vec3(1.0) * pow(NdH, 12.0) * 0.08;
  } else if (uFilm == 4) {
    // Plain holo: irregular rainbow patches from a noise-warped grating.
    float a = 0.3 + (fbm(p * 0.01) - 0.5) * 1.4;
    float ph = fbm(p * 0.015 + 5.0) * 0.8;
    float grain = 0.35 + 1.1 * pow(vnoise(p * 0.9 + 11.0), 1.5);
    float patchy = 0.5 + 0.5 * smoothstep(0.3, 0.7, fbm(p * 0.02 + 3.0));
    add += holo(a, 1.5, ph, 3.0) * patchy * grain * 0.7;
    add += vec3(1.0) * pow(NdH, 400.0) * 3.0;
  } else if (uFilm == 5) {
    // Holo stars: two scales of embossed stars, each with its own grating.
    add += holo(0.4, 1.2, p.x * 0.004, 10.0) * 0.12;
    for (int k = 0; k < 2; k++) {
      float cell = k == 0 ? 7.0 : 3.6;
      vec2 q = p / cell;
      vec2 id = floor(q);
      vec2 r = hash22(id + float(k) * 19.0);
      if (r.x > (k == 0 ? 0.35 : 0.6)) {
        vec2 f = (fract(q) - 0.5 - (r - 0.5) * 0.35) * cell;
        float size = cell * mix(0.18, 0.32, r.y);
        f = rot(r.x * 6.28) * f;
        float d = sdStar5(f, size, 0.45);
        float m = smoothstep(0.12, -0.12, d);
        float rim = smoothstep(0.18, 0.0, abs(d)) * 0.5;
        vec3 c = holo(r.y * 6.28, 1.6, r.x * 3.0, 14.0);
        add += c * (m * 1.4 + rim) + vec3(0.9) * m * 0.025;
        vec3 n2 = normalize(N + (vT * (r.x - 0.5) + vB * (r.y - 0.5)) * 0.5);
        add += vec3(1.0) * m * spec(n2, L, 160.0) * 1.2;
      }
    }
    add += vec3(1.0) * pow(NdH, 400.0) * 3.0;
  } else if (uFilm == 6) {
    // Cross holo: long horizontal/vertical flare arms around random centres.
    float cell = 10.0;
    vec2 q = p / cell;
    vec2 id0 = floor(q);
    float hArm = 0.0, vArm = 0.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 id = id0 + vec2(float(i), float(j));
      vec2 r = hash22(id);
      vec2 c = id + 0.2 + r * 0.6;
      vec2 d = (q - c) * cell;
      float len = mix(1.5, 4.5, hash12(id + 2.0));
      float w = mix(0.08, 0.2, r.y);
      hArm += exp(-abs(d.y) / w) * exp(-abs(d.x) / len);
      vArm += exp(-abs(d.x) / w) * exp(-abs(d.y) / len);
      add += vec3(1.0) * exp(-dot(d, d) * 1.5) * spec(N, L, 40.0) * 2.0;
    }
    add += holo(0.0, 1.5, 0.0, 8.0) * hArm * 1.1;
    add += holo(PI * 0.5, 1.5, 0.3, 8.0) * vArm * 1.1;
    add += holo(0.0, 1.2, 0.0, 10.0) * 0.08;
    add += vec3(1.0) * pow(NdH, 400.0) * 3.0;
  } else if (uFilm == 7) {
    // Rain streaks: slanted beams, broken along their length, cloud-modulated.
    float ang = -0.52;
    vec2 q = rot(ang) * p;
    float colW = 1.6;
    float id = floor(q.x / colW);
    float r = hash12(vec2(id, 1.7));
    float fx = fract(q.x / colW) - 0.5;
    float width = mix(0.08, 0.4, hash12(vec2(id, 4.1)));
    float beam = smoothstep(width, width * 0.2, abs(fx));
    float seg = smoothstep(0.45, 0.6, vnoise(vec2(id * 3.1, q.y * 0.03 + r * 10.0)));
    float on = step(0.35, r);
    float cloud = 0.5 + 0.8 * fbm(p * 0.02 + 9.0);
    add += holo(ang + PI * 0.5, 1.4, q.y * 0.006 + r, 10.0) * beam * seg * on * cloud * 0.9;
    add += holo(ang, 1.0, fbm(p * 0.03), 10.0) * 0.08 * cloud;
    add += vec3(1.0) * pow(NdH, 400.0) * 3.0;
  } else if (uFilm == 8) {
    // Holo hearts: outlined, randomly rotated hearts at two scales.
    add += holo(1.0, 1.2, 0.0, 10.0) * 0.04;
    for (int k = 0; k < 2; k++) {
      float cell = k == 0 ? 13.0 : 7.5;
      vec2 q = p / cell + float(k) * 0.37;
      vec2 id = floor(q);
      vec2 r = hash22(id + float(k) * 11.0);
      if (r.x > 0.3) {
        vec2 f = (fract(q) - 0.5 - (r - 0.5) * 0.3) * cell;
        float size = cell * mix(0.28, 0.42, r.y);
        f = rot((r.x - 0.5) * 1.2) * f / size;
        float d = sdHeart(f + vec2(0.0, 0.5)) * size;
        float line = smoothstep(0.22, 0.02, abs(d));
        float fill = smoothstep(0.1, -0.1, d);
        vec3 c = holo(r.y * 6.28, 1.5, r.x * 2.0, 12.0);
        add += c * (line * 1.4 + fill * 0.2) + vec3(0.9) * line * 0.03;
      }
    }
    add += vec3(1.0) * pow(NdH, 400.0) * 3.0;
  } else {
    // Shattered glass: voronoi shards with independent grating orientations.
    vec3 vo = voronoi(p / 6.0);
    vec2 id = vo.yz;
    vec2 r = hash22(id);
    float bright = mix(0.2, 1.0, hash12(id + 5.0));
    add += holo(r.x * 6.28, mix(1.0, 2.2, r.y), r.y * 3.0, 20.0) * bright;
    vec3 n2 = normalize(N + (vT * (r.x - 0.5) + vB * (r.y - 0.5)) * 0.4);
    float edge = smoothstep(0.06, 0.0, vo.x);
    add += vec3(1.0) * edge * (0.04 + spec(n2, L, 60.0) * 0.8);
    add += vec3(1.0) * spec(n2, L, 500.0) * 0.6;
  }

  if (uFilm == 3) add += vec3(1.0) * softbox(0.6) * 0.1;

  // Seen on its own (exploded view) the film needs a little body to be visible.
  if (uIsolated > 0.0) {
    haze += uIsolated * 0.2;
    vec3 pearl = mix(vec3(0.9, 0.87, 1.0), vec3(0.84, 0.97, 0.95), clamp(vUv.x * 0.7 + vUv.y * 0.5 - 0.1, 0.0, 1.0));
    hazeCol = mix(hazeCol, pearl, uIsolated);
  }

  add *= uStrength;
  haze = clamp(haze, 0.0, 1.0);

  // Premultiplied output: additive light + alpha haze.
  vec3 addC = add;
  #ifdef TONE_MAPPING
  addC = toneMapping(addC);
  #endif
  addC = sRGBTransferOETF(vec4(addC, 1.0)).rgb;
  vec3 hz = sRGBTransferOETF(vec4(hazeCol, 1.0)).rgb;
  gl_FragColor = vec4(addC + hz * haze, haze);
}
`;

export function createFilmMaterial(filmId, sizeMM) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      uFilm: { value: filmId },
      uIsolated: { value: 0 },
      uSizeMM: { value: sizeMM.clone() },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}
