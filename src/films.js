// Surface film catalogue. `id` indexes the switch in filmShader.js.
// `acrylic` tunes the clear plate's own front reflection underneath the film.
export const FILMS = [
  {
    id: 0, key: 'gloss', cn: '亮膜', en: 'Gloss',
    spec: 'BOPP gloss · 25 µm',
    desc: '色彩更鲜亮，镜面效果，性价比首选',
    descEn: 'Vivid colour and a mirror-like finish. The best value.',
    acrylic: { specular: 1.0, roughness: 0.0 },
  },
  {
    id: 1, key: 'matte', cn: '哑膜', en: 'Matte',
    spec: 'BOPP matte · 25 µm',
    desc: '经典低饱和质感，不反光，耐看百搭',
    descEn: 'Classic muted look with no glare. Goes with anything.',
    acrylic: { specular: 0.12, roughness: 0.06 },
  },
  {
    id: 2, key: 'soft', cn: '触感膜', en: 'Soft-touch',
    spec: 'Velvet PET · 30 µm',
    desc: '绒面柔滑，高级雾感，上手很治愈',
    descEn: 'Velvety, silky-smooth haze with a premium feel.',
    acrylic: { specular: 0.06, roughness: 0.08 },
  },
  {
    id: 3, key: 'glitter', cn: '细闪磨砂', en: 'Fine glitter frost',
    spec: 'Frosted PET + micro-flake · 30 µm',
    desc: '细小微闪，低调不浮夸，细品才有惊喜',
    descEn: 'Tiny, understated sparkles that reward a closer look.',
    acrylic: { specular: 0.15, roughness: 0.05 },
  },
  {
    id: 4, key: 'holo', cn: '素面镭射', en: 'Plain holographic',
    spec: 'Transparent holo PET · 25 µm',
    desc: '无规则彩虹碎光，不抢原画风头',
    descEn: 'Irregular rainbow flashes that never steal the show.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 5, key: 'star', cn: '镭射星星', en: 'Holo stars',
    spec: 'Transparent holo PET · star emboss',
    desc: '满版星光点点，梦幻感拉满',
    descEn: 'Stars all over. Maximum dreaminess.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 6, key: 'cross', cn: '十字镭射', en: 'Cross holographic',
    spec: 'Transparent holo PET · cross grating',
    desc: '十字形闪光，很有仪式感',
    descEn: 'Cross-shaped flares with a sense of occasion.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 7, key: 'rain', cn: '镭射云纹', en: 'Holo rain streaks',
    spec: 'Transparent holo PET · slanted beams',
    desc: '雨丝 / 斜光柱：流动斜向彩光，氛围感绝了',
    descEn: 'Flowing diagonal rainbow beams. Pure atmosphere.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 8, key: 'heart', cn: '镭射爱心', en: 'Holo hearts',
    spec: 'Transparent holo PET · heart emboss',
    desc: '自带专属纹样，适合主题向封面',
    descEn: 'Built-in motif, great for themed pieces.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
  {
    id: 9, key: 'glass', cn: '镭射玻璃', en: 'Shattered glass holo',
    spec: 'Transparent holo PET · shard grating',
    desc: '碎玻璃纹样，每一片独立闪光',
    descEn: 'Broken-glass shards that each flash on their own.',
    acrylic: { specular: 0.8, roughness: 0.0 },
  },
];

export const SIZES = [
  { key: 'shikishi', label: '色紙 242×273', w: 242, h: 273 },
  { key: 'mini', label: 'Mini 120×135', w: 120, h: 135 },
  { key: 'square', label: 'Square 150×150', w: 150, h: 150 },
  { key: 'a5', label: 'A5 148×210', w: 148, h: 210 },
];

export const THICKNESS = [3, 5, 8, 10]; // mm
