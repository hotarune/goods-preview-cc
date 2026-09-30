// UI strings and language switching. The UI shows exactly one language at a time.
// Pure data plus a few helpers; DOM helpers only touch `document` when called.

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

export const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'shikishi.lang';

export const STRINGS = {
  en: {
    'doc.title': 'Acrylic Shikishi Preview',
    'brand.name': 'Acrylic <b>Shikishi</b>',
    'brand.sub': 'Surface film preview',
    'lang.label': 'Language',
    'compare.hint': 'Click a board to inspect it',
    'dock.label': 'Film finishes',
    'dock.explode': 'Exploded layer view (E)',
    'dock.compare': 'Compare all films (C)',
    'dock.pause': 'Pause motion (Space)',
    'swatch.title': '{name}  ({key})',
    'film.eyebrow': '{num} / {total} · Surface film',
    'film.tip': '💡 Holo films read best over dark artwork. Light images show less sparkle.',
    'art.title': 'Artwork',
    'art.night': 'Night',
    'art.pastel': 'Pastel',
    'art.upload': 'Upload',
    'art.uploadTitle': 'Upload an image (or drop it anywhere)',
    'size.title': 'Size',
    'thickness.title': 'Acrylic thickness',
    'light.title': 'Lighting',
    'light.follow': 'Light follows cursor',
    'light.strength': 'Film effect strength',
    'keys.film': 'film',
    'keys.explode': 'explode',
    'keys.compare': 'compare',
    'keys.space': 'Space',
    'keys.pause': 'pause',
    'keys.orbit': 'Drag to orbit · scroll to zoom',
    'drop.text': 'Drop image to use as artwork',
    'layer.film': '{name} film',
    'layer.acrylic': 'Clear acrylic',
    'layer.acrylicSpec': 'Cast PMMA · {t} mm',
    'layer.print': 'Printed ink',
    'layer.printSpec': 'UV CMYK, reverse printed · 12 µm',
    'layer.base': 'White underbase',
    'layer.baseSpec': 'UV white ink · 8 µm',
    'layer.back': 'Backing sheet',
    'layer.backSpec': 'Protective PET · 50 µm',
  },
  zh: {
    'doc.title': '亚克力色纸预览',
    'brand.name': '亚克力<b>色纸</b>',
    'brand.sub': '表面覆膜预览',
    'lang.label': '语言',
    'compare.hint': '点击任意一块查看详情',
    'dock.label': '覆膜效果',
    'dock.explode': '分层爆炸图（E）',
    'dock.compare': '对比全部覆膜（C）',
    'dock.pause': '暂停动画（空格）',
    'swatch.title': '{name}（{key}）',
    'film.eyebrow': '{num} / {total} · 表面覆膜',
    'film.tip': '💡 镭射类深色画面出效果更好，浅图闪感会偏弱。',
    'art.title': '画面',
    'art.night': '夜景',
    'art.pastel': '粉彩',
    'art.upload': '上传',
    'art.uploadTitle': '上传图片（也可直接拖入页面）',
    'size.title': '尺寸',
    'thickness.title': '亚克力厚度',
    'light.title': '光照',
    'light.follow': '光源跟随鼠标',
    'light.strength': '覆膜效果强度',
    'keys.film': '覆膜',
    'keys.explode': '分层',
    'keys.compare': '对比',
    'keys.space': '空格',
    'keys.pause': '暂停',
    'keys.orbit': '拖动旋转 · 滚轮缩放',
    'drop.text': '松开即可将图片用作画面',
    'layer.film': '表面膜 · {name}',
    'layer.acrylic': '透明亚克力',
    'layer.acrylicSpec': '浇铸 PMMA · {t} mm',
    'layer.print': '印刷油墨',
    'layer.printSpec': 'UV 四色反向印刷 · 12 µm',
    'layer.base': '白墨打底',
    'layer.baseSpec': 'UV 白墨 · 8 µm',
    'layer.back': '背膜',
    'layer.backSpec': 'PET 保护膜 · 50 µm',
  },
};

const isLang = (code) => Object.hasOwn(STRINGS, code);

// Map a browser locale such as "zh-CN" to a supported language code.
export function matchLang(locale) {
  const base = String(locale || '').toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

function initialLang() {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch { /* storage may be blocked */ }
  for (const l of globalThis.navigator?.languages || []) {
    const m = matchLang(l);
    if (m) return m;
  }
  return DEFAULT_LANG;
}

let current = initialLang();
const listeners = new Set();

export const getLang = () => current;

export function setLang(code) {
  if (!isLang(code) || code === current) return;
  current = code;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(code));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Look up a UI string and fill `{var}` placeholders.
export function t(key, vars = {}, lang = current) {
  const s = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// Pick the current language from a `{ en, zh }` record (film names, specs, ...).
export function loc(record, lang = current) {
  if (record == null || typeof record !== 'object') return record;
  return record[lang] ?? record[DEFAULT_LANG];
}

// Fill static markup: data-i18n (text), data-i18n-html, data-i18n-title, data-i18n-aria-label.
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
  if (root === document) {
    document.documentElement.lang = current === 'zh' ? 'zh-CN' : current;
    document.title = t('doc.title');
  }
}
