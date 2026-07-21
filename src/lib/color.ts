export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type BrandStep = (typeof BRAND_STEPS)[number];

type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: HSL): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Lightness target for each step of the scale, tuned for a pastel feel at the light end. */
const LIGHTNESS_BY_STEP: Record<BrandStep, number> = {
  50: 97,
  100: 92,
  200: 84,
  300: 72,
  400: 58,
  500: 47,
  600: 38,
  700: 31,
  800: 26,
  900: 21,
};

export function generateBrandScale(primaryHex: string): Record<BrandStep, string> {
  const base = hexToHsl(primaryHex);
  // Saturation and lightness interact perceptually: the same saturation reads as far
  // more vivid at mid-lightness (~50%) than near the light/dark extremes. Toning
  // saturation down and holding it constant across the ramp keeps a soft/pastel base
  // looking soft all the way to the darkest step, instead of turning vivid in the
  // middle of the ramp where buttons and headings usually sit.
  const saturation = Math.min(65, Math.max(15, base.s * 0.55));
  const scale = {} as Record<BrandStep, string>;

  for (const step of BRAND_STEPS) {
    scale[step] = hslToHex({
      h: base.h,
      s: saturation,
      l: LIGHTNESS_BY_STEP[step],
    });
  }

  return scale;
}
