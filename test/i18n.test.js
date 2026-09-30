import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS, LANGS, DEFAULT_LANG, t, loc, matchLang, setLang, getLang, onLangChange } from '../src/i18n.js';
import { FILMS, SIZES } from '../src/films.js';

const CJK = /[぀-ヿ㐀-鿿＀-￯]/;
// Material/unit abbreviations and shortcut keys that are normal in Chinese product copy.
const ZH_ALLOWED_LATIN = /\b(BOPP|PET|PMMA|UV|CMYK|mm|A\d)\b|µm|<\/?b>|（[A-Z]）/g;
const hasLatinWord = (s) => /[A-Za-z]/.test(s.replace(ZH_ALLOWED_LATIN, '').replace(/\{\w+\}/g, ''));

// Every localized string shown in the UI, per language.
function allStrings(lang) {
  const out = Object.entries(STRINGS[lang]).map(([k, v]) => [k, v]);
  for (const f of FILMS) for (const field of ['name', 'desc', 'spec']) out.push([`film.${f.key}.${field}`, f[field][lang]]);
  for (const s of SIZES) out.push([`size.${s.key}`, s.label[lang]]);
  return out;
}

test('every language defines the same keys', () => {
  const ref = Object.keys(STRINGS[DEFAULT_LANG]).sort();
  for (const { code } of LANGS) assert.deepEqual(Object.keys(STRINGS[code]).sort(), ref, code);
});

test('film and size records have every language', () => {
  for (const { code } of LANGS) {
    for (const f of FILMS) for (const field of ['name', 'desc', 'spec']) assert.ok(f[field][code], `${f.key}.${field}.${code}`);
    for (const s of SIZES) assert.ok(s.label[code], `${s.key}.${code}`);
  }
});

test('English UI contains no Chinese or Japanese text', () => {
  for (const [k, v] of allStrings('en')) assert.ok(!CJK.test(v), `${k}: ${v}`);
});

test('Chinese UI contains no English words', () => {
  for (const [k, v] of allStrings('zh')) assert.ok(!hasLatinWord(v), `${k}: ${v}`);
});

test('placeholders match across languages', () => {
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort();
  for (const [k, v] of Object.entries(STRINGS.en)) assert.deepEqual(vars(STRINGS.zh[k]), vars(v), k);
});

test('t() fills placeholders and falls back sensibly', () => {
  assert.equal(t('film.eyebrow', { num: '03', total: 10 }, 'en'), '03 / 10 · Surface film');
  assert.equal(t('film.eyebrow', { num: '03', total: 10 }, 'zh'), '03 / 10 · 表面覆膜');
  assert.equal(t('size.title', {}, 'xx'), 'Size');
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('loc() picks the language and passes plain values through', () => {
  assert.equal(loc(FILMS[0].name, 'en'), 'Gloss');
  assert.equal(loc(FILMS[0].name, 'zh'), '亮膜');
  assert.equal(loc({ en: 'only' }, 'zh'), 'only');
  assert.equal(loc('5 mm', 'zh'), '5 mm');
});

test('matchLang() maps browser locales', () => {
  assert.equal(matchLang('zh-CN'), 'zh');
  assert.equal(matchLang('zh_TW'), 'zh');
  assert.equal(matchLang('en-GB'), 'en');
  assert.equal(matchLang('fr'), null);
});

test('setLang() switches language and notifies listeners', () => {
  const start = getLang();
  const seen = [];
  const off = onLangChange((c) => seen.push(c));
  setLang('zh');
  setLang('zh');
  setLang('bogus');
  setLang('en');
  off();
  setLang(start);
  assert.deepEqual(seen, start === 'zh' ? ['en'] : ['zh', 'en']);
});

test('index.html has no hard-coded Chinese text and every i18n key exists', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!/[\u3040-\u30ff\u3400-\u9fff]/.test(html), 'index.html should get Chinese text only from i18n.js');
  const keys = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20);
  for (const k of keys) assert.ok(k in STRINGS.en, k);
});
