// Surface film catalogue. Text fields are `{ en, zh }` records (see i18n.js `loc`).
// `id` indexes the switch in filmShader.js.
// `acrylic` tunes the clear plate's own front reflection underneath the film.
export const FILMS = [
  {
    id: 0, key: 'gloss',
    name: { en: 'Gloss', zh: '亮膜' },
    spec: { en: 'BOPP gloss · 25 µm', zh: 'BOPP 亮面 · 25 µm' },
    desc: { en: 'Vivid colour and a mirror-like finish. The best value.', zh: '色彩更鲜亮，镜面效果，性价比首选' },
    acrylic: { specular: 1.0, roughness: 0.0 },
  },
  {
    id: 1, key: 'matte',
    name: { en: 'Matte', zh: '哑膜' },
    spec: { en: 'BOPP matte · 25 µm', zh: 'BOPP 哑面 · 25 µm' },
    desc: { en: 'Classic muted look with no glare. Goes with anything.', zh: '经典低饱和质感，不反光，耐看百搭' },
    acrylic: { specular: 0.12, roughness: 0.06 },
  },
  {
    id: 2, key: 'soft',
    name: { en: 'Soft-touch', zh: '触感膜' },
    spec: { en: 'Velvet PET · 30 µm', zh: '绒面 PET · 30 µm' },
    desc: { en: 'Velvety, silky-smooth haze with a premium feel.', zh: '绒面柔滑，高级雾感，上手很治愈' },
    acrylic: { specular: 0.06, roughness: 0.08 },
  },
  {
    id: 3, key: 'glitter',
    name: { en: 'Fine glitter frost', zh: '细闪磨砂' },
    spec: { en: 'Frosted PET + micro-flake · 30 µm', zh: '磨砂 PET + 微闪粉 · 30 µm' },
    desc: { en: 'Tiny, understated sparkles that reward a closer look.', zh: '细小微闪，低调不浮夸，细品才有惊喜' },
    acrylic: { specular: 0.15, roughness: 0.05 },
  },
  {
    id: 4, key: 'holo',
    name: { en: 'Plain holographic', zh: '素面镭射' },
    spec: { en: 'Transparent holo PET · 25 µm', zh: '透明镭射 PET · 25 µm' },
    desc: { en: 'Irregular rainbow flashes that never steal the show.', zh: '无规则彩虹碎光，不抢原画风头' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 5, key: 'star',
    name: { en: 'Holo stars', zh: '镭射星星' },
    spec: { en: 'Transparent holo PET · star emboss', zh: '透明镭射 PET · 星星压纹' },
    desc: { en: 'Stars all over. Maximum dreaminess.', zh: '满版星光点点，梦幻感拉满' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 6, key: 'cross',
    name: { en: 'Cross holographic', zh: '十字镭射' },
    spec: { en: 'Transparent holo PET · cross grating', zh: '透明镭射 PET · 十字光栅' },
    desc: { en: 'Cross-shaped flares with a sense of occasion.', zh: '十字形闪光，很有仪式感' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 7, key: 'rain',
    name: { en: 'Holo rain streaks', zh: '镭射云纹' },
    spec: { en: 'Transparent holo PET · slanted beams', zh: '透明镭射 PET · 斜向光柱' },
    desc: { en: 'Flowing diagonal rainbow beams. Pure atmosphere.', zh: '雨丝 / 斜光柱：流动斜向彩光，氛围感绝了' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 8, key: 'heart',
    name: { en: 'Holo hearts', zh: '镭射爱心' },
    spec: { en: 'Transparent holo PET · heart emboss', zh: '透明镭射 PET · 爱心压纹' },
    desc: { en: 'Built-in motif, great for themed pieces.', zh: '自带专属纹样，适合主题向封面' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 9, key: 'glass',
    name: { en: 'Shattered glass holo', zh: '镭射玻璃' },
    spec: { en: 'Transparent holo PET · shard grating', zh: '透明镭射 PET · 碎片光栅' },
    desc: { en: 'Broken-glass shards that each flash on their own.', zh: '碎玻璃纹样，每一片独立闪光' },
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
];

export const SIZES = [
  { key: 'shikishi', label: { en: 'Shikishi 242×273', zh: '色纸 242×273' }, w: 242, h: 273 },
  { key: 'mini', label: { en: 'Mini 120×135', zh: '迷你 120×135' }, w: 120, h: 135 },
  { key: 'square', label: { en: 'Square 150×150', zh: '方形 150×150' }, w: 150, h: 150 },
  { key: 'a5', label: { en: 'A5 148×210', zh: 'A5 148×210' }, w: 148, h: 210 },
];

export const THICKNESS = [3, 5, 8, 10]; // mm
