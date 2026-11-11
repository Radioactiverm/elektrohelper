// Generuje Material 3 barevné tokeny (světlý + tmavý režim) do public/css/tokens.css.
// Spuštění: node scripts/gen-theme.js
import { writeFileSync } from 'node:fs';
import {
  argbFromHex, hexFromArgb, Hct, TonalPalette, DynamicScheme, MaterialDynamicColors,
} from '@material/material-color-utilities';

const SEEDS = {
  primary: '#F5A623',   // jantarová – „Elektro“
  secondary: '#2E7D32', // zelená – ochranný vodič PE
  tertiary: '#1565C0',  // modrá – nulový vodič N
};

const roles = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow',
  'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'outline', 'outlineVariant', 'shadow', 'scrim', 'inverseSurface', 'inverseOnSurface', 'inversePrimary',
];

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function scheme(isDark) {
  const p = Hct.fromInt(argbFromHex(SEEDS.primary));
  const s = Hct.fromInt(argbFromHex(SEEDS.secondary));
  const t = Hct.fromInt(argbFromHex(SEEDS.tertiary));
  const ds = new DynamicScheme({
    sourceColorHct: p,
    variant: 2, // Variant.TONAL_SPOT (enum není v 0.3.0 exportován)
    contrastLevel: 0,
    isDark,
    primaryPalette: TonalPalette.fromHueAndChroma(p.hue, Math.max(p.chroma, 48)),
    secondaryPalette: TonalPalette.fromHueAndChroma(s.hue, 40),
    tertiaryPalette: TonalPalette.fromHueAndChroma(t.hue, 44),
    neutralPalette: TonalPalette.fromHueAndChroma(p.hue, 4),
    neutralVariantPalette: TonalPalette.fromHueAndChroma(p.hue, 8),
    errorPalette: TonalPalette.fromHueAndChroma(25, 84),
  });
  return roles.map((r) => `  --md-sys-color-${kebab(r)}: ${hexFromArgb(ds.getArgb(MaterialDynamicColors[r]))};`).join('\n');
}

const css = `/* Vygenerováno skriptem scripts/gen-theme.js – needitovat ručně. */
:root, :root[data-theme="light"] {
  color-scheme: light;
${scheme(false)}
}
:root[data-theme="dark"] {
  color-scheme: dark;
${scheme(true)}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${scheme(true).replace(/^ {2}/gm, '    ')}
  }
}
`;
writeFileSync(new URL('../public/css/tokens.css', import.meta.url), css);
console.log('public/css/tokens.css hotovo');
