import { Cover } from './models';

export interface GradientPreset { key: string; label: string; css: string; }

export const GRADIENTS: GradientPreset[] = [
  { key: 'tide', label: 'Tide', css: 'linear-gradient(135deg,#0b6e75,#22b8c5 55%,#b6f0e0)' },
  { key: 'ember', label: 'Ember', css: 'linear-gradient(135deg,#7a1f3d,#e4572e 60%,#ffb347)' },
  { key: 'dusk', label: 'Dusk', css: 'linear-gradient(135deg,#2b1055,#7597de 70%,#f6d5f7)' },
  { key: 'moss', label: 'Moss', css: 'linear-gradient(135deg,#123524,#3e7c4f 60%,#d9e4a8)' },
  { key: 'plum', label: 'Plum', css: 'linear-gradient(135deg,#3a0ca3,#b5179e 65%,#ffc8dd)' },
  { key: 'sand', label: 'Sand', css: 'linear-gradient(135deg,#7f5539,#d4a373 60%,#fefae0)' },
  { key: 'steel', label: 'Steel', css: 'linear-gradient(135deg,#1b263b,#415a77 60%,#e0e1dd)' },
  { key: 'citrus', label: 'Citrus', css: 'linear-gradient(135deg,#f77f00,#fcbf49 55%,#eae2b7)' },
  { key: 'lagoon', label: 'Lagoon', css: 'linear-gradient(135deg,#03045e,#0096c7 60%,#caf0f8)' },
  { key: 'rose', label: 'Rose', css: 'linear-gradient(135deg,#9d0208,#f25c54 60%,#ffe5d9)' },
];

export const COLORS = ['#0e7c86', '#c2410c', '#4f46e5', '#15803d', '#be185d', '#a16207', '#334155', '#7c3aed', '#0369a1', '#b91c1c'];

/** CSS `background` value for gradient / colour covers; null for none / image. */
export function coverBackground(cover: Cover | null | undefined): string | null {
  if (!cover) return null;
  if (cover.type === 'gradient') return GRADIENTS.find((g) => g.key === cover.value)?.css ?? GRADIENTS[0].css;
  if (cover.type === 'color' && cover.value && /^#[0-9a-fA-F]{6}$/.test(cover.value)) return cover.value;
  return null;
}

/** Deterministic fallback so collections without a cover still look distinct. */
export function fallbackBackground(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length].css;
}
