export type ThemePresetId = 'midnight' | 'paper' | 'sage' | 'ember' | 'mist' | 'linen';
export type ThemeId = ThemePresetId | 'custom';

export interface ThemeVars {
  '--app-bg': string;
  '--app-bg-elevated': string;
  '--app-bg-stop': string;
  '--surface': string;
  '--surface-strong': string;
  '--surface-soft': string;
  '--surface-border': string;
  '--surface-border-strong': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-subtle': string;
  '--text-faint': string;
  '--primary': string;
  '--primary-strong': string;
  '--primary-soft': string;
  '--progress-start': string;
  '--progress-end': string;
  '--overlay-top': string;
  '--overlay-mid': string;
  '--overlay-bottom': string;
  '--overlay-radial': string;
  '--shadow-strong': string;
  '--shadow-soft': string;
  '--badge-bg': string;
  '--badge-border': string;
  '--pill-bg': string;
  '--pill-border': string;
  '--control-bg': string;
  '--control-border': string;
  '--control-text': string;
  '--menu-line': string;
  '--card-gradient-start': string;
  '--card-gradient-end': string;
  '--custom-card-start': string;
  '--custom-card-end': string;
}

export interface CustomThemeOverrides {
  textPrimary: string;
  textSecondary: string;
  accent: string;
  backgroundStart: string;
  backgroundEnd: string;
  gradientBalance: number;
}

export interface ThemeSelection {
  id: ThemeId;
  baseThemeId?: ThemePresetId;
  overrides?: Partial<CustomThemeOverrides>;
}

export interface ResolvedTheme {
  id: ThemeId;
  baseThemeId: ThemePresetId;
  vars: ThemeVars;
}

const STORAGE_KEY = 'fixate-reader:theme:v2';
const FALLBACK_THEME: ThemePresetId = 'midnight';

export const PRESET_THEME_IDS: ThemePresetId[] = ['midnight', 'paper', 'sage', 'ember', 'mist', 'linen'];

const presetThemes: Record<ThemePresetId, ThemeVars> = {
  midnight: {
    '--app-bg': '#07111f',
    '--app-bg-elevated': '#0f1b2d',
    '--app-bg-stop': '56%',
    '--surface': '#0c1523',
    '--surface-strong': '#132239',
    '--surface-soft': '#1a2c46',
    '--surface-border': 'rgba(189, 205, 228, 0.14)',
    '--surface-border-strong': 'rgba(189, 205, 228, 0.22)',
    '--text-primary': '#f5f7fb',
    '--text-secondary': '#d8e1ef',
    '--text-muted': '#a9bbd4',
    '--text-subtle': '#7f93b1',
    '--text-faint': '#60718c',
    '--primary': '#8ab4f8',
    '--primary-strong': '#adc8ff',
    '--primary-soft': 'rgba(138, 180, 248, 0.16)',
    '--progress-start': '#8ab4f8',
    '--progress-end': '#b39dfb',
    '--overlay-top': 'rgba(6, 13, 24, 0.08)',
    '--overlay-mid': 'rgba(6, 13, 24, 0.28)',
    '--overlay-bottom': 'rgba(6, 13, 24, 0.9)',
    '--overlay-radial': 'rgba(255, 255, 255, 0.16)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.34)',
    '--shadow-soft': 'rgba(0, 0, 0, 0.24)',
    '--badge-bg': 'rgba(138, 180, 248, 0.14)',
    '--badge-border': 'rgba(138, 180, 248, 0.24)',
    '--pill-bg': 'rgba(255, 255, 255, 0.14)',
    '--pill-border': 'rgba(255, 255, 255, 0.22)',
    '--control-bg': 'rgba(11, 21, 34, 0.86)',
    '--control-border': 'rgba(171, 192, 222, 0.16)',
    '--control-text': '#f5f7fb',
    '--menu-line': '#bfd0e7',
    '--card-gradient-start': '#20395e',
    '--card-gradient-end': '#0d1626',
    '--custom-card-start': 'rgba(138, 180, 248, 0.2)',
    '--custom-card-end': 'rgba(138, 180, 248, 0.08)',
  },
  paper: {
    '--app-bg': '#f3efe6',
    '--app-bg-elevated': '#ebe4d8',
    '--app-bg-stop': '61%',
    '--surface': '#fbf7ef',
    '--surface-strong': '#f0e7d8',
    '--surface-soft': '#e4d7c2',
    '--surface-border': 'rgba(89, 74, 54, 0.14)',
    '--surface-border-strong': 'rgba(89, 74, 54, 0.24)',
    '--text-primary': '#291f16',
    '--text-secondary': '#463528',
    '--text-muted': '#665140',
    '--text-subtle': '#7a6551',
    '--text-faint': '#91795e',
    '--primary': '#8d5f3a',
    '--primary-strong': '#ac7443',
    '--primary-soft': 'rgba(141, 95, 58, 0.12)',
    '--progress-start': '#8d5f3a',
    '--progress-end': '#c99b66',
    '--overlay-top': 'rgba(255, 249, 239, 0.05)',
    '--overlay-mid': 'rgba(52, 37, 23, 0.18)',
    '--overlay-bottom': 'rgba(37, 24, 16, 0.8)',
    '--overlay-radial': 'rgba(255, 250, 240, 0.18)',
    '--shadow-strong': 'rgba(66, 43, 20, 0.2)',
    '--shadow-soft': 'rgba(66, 43, 20, 0.12)',
    '--badge-bg': 'rgba(141, 95, 58, 0.12)',
    '--badge-border': 'rgba(141, 95, 58, 0.2)',
    '--pill-bg': 'rgba(255, 249, 239, 0.26)',
    '--pill-border': 'rgba(255, 249, 239, 0.32)',
    '--control-bg': 'rgba(251, 247, 239, 0.92)',
    '--control-border': 'rgba(89, 74, 54, 0.16)',
    '--control-text': '#291f16',
    '--menu-line': '#7d6247',
    '--card-gradient-start': '#ddccb2',
    '--card-gradient-end': '#f6edde',
    '--custom-card-start': 'rgba(141, 95, 58, 0.16)',
    '--custom-card-end': 'rgba(141, 95, 58, 0.06)',
  },
  sage: {
    '--app-bg': '#0d1716',
    '--app-bg-elevated': '#142321',
    '--app-bg-stop': '58%',
    '--surface': '#11201e',
    '--surface-strong': '#19322e',
    '--surface-soft': '#21433d',
    '--surface-border': 'rgba(187, 219, 201, 0.14)',
    '--surface-border-strong': 'rgba(187, 219, 201, 0.22)',
    '--text-primary': '#f3f8f5',
    '--text-secondary': '#d6e8de',
    '--text-muted': '#b2d0c1',
    '--text-subtle': '#89b09f',
    '--text-faint': '#6f9182',
    '--primary': '#9fd3b5',
    '--primary-strong': '#bfe6cf',
    '--primary-soft': 'rgba(159, 211, 181, 0.16)',
    '--progress-start': '#90c9ab',
    '--progress-end': '#d2e9c6',
    '--overlay-top': 'rgba(8, 16, 15, 0.06)',
    '--overlay-mid': 'rgba(8, 16, 15, 0.24)',
    '--overlay-bottom': 'rgba(8, 16, 15, 0.9)',
    '--overlay-radial': 'rgba(248, 255, 251, 0.16)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.32)',
    '--shadow-soft': 'rgba(0, 0, 0, 0.22)',
    '--badge-bg': 'rgba(159, 211, 181, 0.14)',
    '--badge-border': 'rgba(159, 211, 181, 0.22)',
    '--pill-bg': 'rgba(255, 255, 255, 0.14)',
    '--pill-border': 'rgba(255, 255, 255, 0.2)',
    '--control-bg': 'rgba(18, 33, 30, 0.88)',
    '--control-border': 'rgba(187, 219, 201, 0.16)',
    '--control-text': '#f3f8f5',
    '--menu-line': '#d1e8da',
    '--card-gradient-start': '#25453f',
    '--card-gradient-end': '#132421',
    '--custom-card-start': 'rgba(159, 211, 181, 0.16)',
    '--custom-card-end': 'rgba(159, 211, 181, 0.06)',
  },
  ember: {
    '--app-bg': '#180d0e',
    '--app-bg-elevated': '#271517',
    '--app-bg-stop': '58%',
    '--surface': '#211112',
    '--surface-strong': '#34191b',
    '--surface-soft': '#4d2424',
    '--surface-border': 'rgba(241, 207, 188, 0.14)',
    '--surface-border-strong': 'rgba(241, 207, 188, 0.22)',
    '--text-primary': '#fff5f2',
    '--text-secondary': '#f4ddd5',
    '--text-muted': '#e6baac',
    '--text-subtle': '#d29a89',
    '--text-faint': '#ba7f70',
    '--primary': '#ffb59d',
    '--primary-strong': '#ffd0c0',
    '--primary-soft': 'rgba(255, 181, 157, 0.16)',
    '--progress-start': '#ffb59d',
    '--progress-end': '#ffd6a5',
    '--overlay-top': 'rgba(25, 11, 12, 0.04)',
    '--overlay-mid': 'rgba(25, 11, 12, 0.2)',
    '--overlay-bottom': 'rgba(25, 11, 12, 0.86)',
    '--overlay-radial': 'rgba(255, 245, 242, 0.14)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.34)',
    '--shadow-soft': 'rgba(0, 0, 0, 0.24)',
    '--badge-bg': 'rgba(255, 181, 157, 0.14)',
    '--badge-border': 'rgba(255, 181, 157, 0.22)',
    '--pill-bg': 'rgba(255, 255, 255, 0.13)',
    '--pill-border': 'rgba(255, 255, 255, 0.2)',
    '--control-bg': 'rgba(34, 17, 18, 0.88)',
    '--control-border': 'rgba(241, 207, 188, 0.16)',
    '--control-text': '#fff5f2',
    '--menu-line': '#ffd6ca',
    '--card-gradient-start': '#5a2826',
    '--card-gradient-end': '#241112',
    '--custom-card-start': 'rgba(255, 181, 157, 0.18)',
    '--custom-card-end': 'rgba(255, 181, 157, 0.07)',
  },
  mist: {
    '--app-bg': '#eef3f7',
    '--app-bg-elevated': '#dfe8ef',
    '--app-bg-stop': '60%',
    '--surface': '#f8fbfd',
    '--surface-strong': '#ecf2f6',
    '--surface-soft': '#d2dce5',
    '--surface-border': 'rgba(61, 81, 103, 0.12)',
    '--surface-border-strong': 'rgba(61, 81, 103, 0.2)',
    '--text-primary': '#16202a',
    '--text-secondary': '#33485c',
    '--text-muted': '#55697a',
    '--text-subtle': '#6a8093',
    '--text-faint': '#7d94a8',
    '--primary': '#3e6fa3',
    '--primary-strong': '#5986b8',
    '--primary-soft': 'rgba(62, 111, 163, 0.14)',
    '--progress-start': '#3e6fa3',
    '--progress-end': '#86b1d5',
    '--overlay-top': 'rgba(252, 254, 255, 0.04)',
    '--overlay-mid': 'rgba(23, 35, 48, 0.16)',
    '--overlay-bottom': 'rgba(23, 35, 48, 0.72)',
    '--overlay-radial': 'rgba(255, 255, 255, 0.14)',
    '--shadow-strong': 'rgba(42, 57, 72, 0.18)',
    '--shadow-soft': 'rgba(42, 57, 72, 0.1)',
    '--badge-bg': 'rgba(62, 111, 163, 0.12)',
    '--badge-border': 'rgba(62, 111, 163, 0.18)',
    '--pill-bg': 'rgba(255, 255, 255, 0.18)',
    '--pill-border': 'rgba(255, 255, 255, 0.3)',
    '--control-bg': 'rgba(248, 251, 253, 0.9)',
    '--control-border': 'rgba(61, 81, 103, 0.16)',
    '--control-text': '#16202a',
    '--menu-line': '#4a6176',
    '--card-gradient-start': '#c7d8e8',
    '--card-gradient-end': '#eff5fb',
    '--custom-card-start': 'rgba(62, 111, 163, 0.14)',
    '--custom-card-end': 'rgba(62, 111, 163, 0.05)',
  },
  linen: {
    '--app-bg': '#f6f0e7',
    '--app-bg-elevated': '#e9dece',
    '--app-bg-stop': '62%',
    '--surface': '#fdf8f1',
    '--surface-strong': '#f3eadf',
    '--surface-soft': '#ddccb8',
    '--surface-border': 'rgba(88, 63, 41, 0.12)',
    '--surface-border-strong': 'rgba(88, 63, 41, 0.22)',
    '--text-primary': '#221811',
    '--text-secondary': '#4b3828',
    '--text-muted': '#6c5542',
    '--text-subtle': '#89705a',
    '--text-faint': '#a1846a',
    '--primary': '#8a5831',
    '--primary-strong': '#b26d35',
    '--primary-soft': 'rgba(138, 88, 49, 0.14)',
    '--progress-start': '#8a5831',
    '--progress-end': '#d39a5c',
    '--overlay-top': 'rgba(255, 251, 244, 0.03)',
    '--overlay-mid': 'rgba(38, 24, 14, 0.16)',
    '--overlay-bottom': 'rgba(38, 24, 14, 0.74)',
    '--overlay-radial': 'rgba(255, 255, 255, 0.16)',
    '--shadow-strong': 'rgba(58, 37, 23, 0.16)',
    '--shadow-soft': 'rgba(58, 37, 23, 0.09)',
    '--badge-bg': 'rgba(138, 88, 49, 0.12)',
    '--badge-border': 'rgba(138, 88, 49, 0.18)',
    '--pill-bg': 'rgba(255, 255, 255, 0.2)',
    '--pill-border': 'rgba(255, 255, 255, 0.3)',
    '--control-bg': 'rgba(253, 248, 241, 0.92)',
    '--control-border': 'rgba(88, 63, 41, 0.16)',
    '--control-text': '#221811',
    '--menu-line': '#735540',
    '--card-gradient-start': '#d9c3ab',
    '--card-gradient-end': '#f7eee2',
    '--custom-card-start': 'rgba(138, 88, 49, 0.14)',
    '--custom-card-end': 'rgba(138, 88, 49, 0.05)',
  },
};

export class ThemeManager {
  private selection_: ThemeSelection;
  private listeners = new Set<(resolved: ResolvedTheme, selection: ThemeSelection) => void>();

  constructor() {
    this.selection_ = this.detectInitialSelection();
    this.applyTheme(this.resolveSelection(this.selection_));
  }

  get theme(): ThemeId {
    return this.selection_.id;
  }

  get selection(): ThemeSelection {
    return cloneSelection(this.selection_);
  }

  get resolvedTheme(): ResolvedTheme {
    return this.resolveSelection(this.selection_);
  }

  resolveSelection(selection: ThemeSelection): ResolvedTheme {
    return buildResolvedTheme(selection);
  }

  setTheme(themeId: ThemePresetId): void {
    this.selection_ = { id: themeId };
    this.persistAndBroadcast();
  }

  resetToDefault(): void {
    this.selection_ = { id: FALLBACK_THEME };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore persistence failures and keep the active in-memory theme.
    }
    const resolved = this.resolveSelection(this.selection_);
    this.applyTheme(resolved);
    for (const listener of this.listeners) listener(resolved, this.selection);
  }

  applyCustomTheme(baseThemeId: ThemePresetId, overrides: Partial<CustomThemeOverrides>): void {
    this.selection_ = {
      id: 'custom',
      baseThemeId,
      overrides: sanitizeOverrides(overrides),
    };
    this.persistAndBroadcast();
  }

  subscribe(listener: (resolved: ResolvedTheme, selection: ThemeSelection) => void): () => void {
    this.listeners.add(listener);
    listener(this.resolveSelection(this.selection_), this.selection);
    return () => this.listeners.delete(listener);
  }

  private persistAndBroadcast(): void {
    const resolved = this.resolveSelection(this.selection_);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selection_));
    } catch {
      // Ignore persistence failures and keep the active in-memory theme.
    }
    this.applyTheme(resolved);
    for (const listener of this.listeners) listener(resolved, this.selection);
  }

  private detectInitialSelection(): ThemeSelection {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeSelection;
        if (isValidSelection(parsed)) return parsed;
      }
    } catch {
      // Fall through to the default theme.
    }
    return { id: FALLBACK_THEME };
  }

  private applyTheme(theme: ResolvedTheme): void {
    const root = document.documentElement;
    root.dataset.theme = theme.id;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.vars['--app-bg']);
  }
}

export function getThemePreset(themeId: ThemePresetId): ThemeVars {
  return { ...presetThemes[themeId] };
}

function buildResolvedTheme(selection: ThemeSelection): ResolvedTheme {
  if (selection.id !== 'custom') {
    return {
      id: selection.id,
      baseThemeId: selection.id,
      vars: getThemePreset(selection.id),
    };
  }

  const baseThemeId = selection.baseThemeId ?? FALLBACK_THEME;
  const base = getThemePreset(baseThemeId);
  const overrides = sanitizeOverrides(selection.overrides ?? {});
  const appBg = overrides.backgroundEnd ?? base['--app-bg'];
  const appBgElevated = overrides.backgroundStart ?? base['--app-bg-elevated'];
  const textPrimary = overrides.textPrimary ?? base['--text-primary'];
  const textSecondary = overrides.textSecondary ?? base['--text-secondary'];
  const accent = overrides.accent ?? base['--primary'];
  const gradientBalance = overrides.gradientBalance ?? parseInt(base['--app-bg-stop'], 10);

  const vars: ThemeVars = {
    ...base,
    '--app-bg': appBg,
    '--app-bg-elevated': appBgElevated,
    '--app-bg-stop': `${clamp(Math.round(gradientBalance), 35, 80)}%`,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-muted': mixHex(textSecondary, appBg, 0.76),
    '--text-subtle': mixHex(textSecondary, appBg, 0.58),
    '--text-faint': mixHex(textSecondary, appBg, 0.42),
    '--primary': accent,
    '--primary-strong': mixHex(accent, getContrastTarget(accent), 0.72),
    '--primary-soft': withAlpha(accent, 0.16),
    '--progress-start': accent,
    '--progress-end': mixHex(accent, appBgElevated, 0.58),
    '--badge-bg': withAlpha(accent, 0.14),
    '--badge-border': withAlpha(accent, 0.24),
    '--control-text': textPrimary,
    '--menu-line': mixHex(textSecondary, appBg, 0.78),
    '--custom-card-start': withAlpha(accent, 0.2),
    '--custom-card-end': withAlpha(accent, 0.08),
  };

  return {
    id: 'custom',
    baseThemeId,
    vars,
  };
}

function sanitizeOverrides(overrides: Partial<CustomThemeOverrides>): Partial<CustomThemeOverrides> {
  const result: Partial<CustomThemeOverrides> = {};
  if (isHexColor(overrides.textPrimary)) result.textPrimary = overrides.textPrimary;
  if (isHexColor(overrides.textSecondary)) result.textSecondary = overrides.textSecondary;
  if (isHexColor(overrides.accent)) result.accent = overrides.accent;
  if (isHexColor(overrides.backgroundStart)) result.backgroundStart = overrides.backgroundStart;
  if (isHexColor(overrides.backgroundEnd)) result.backgroundEnd = overrides.backgroundEnd;
  if (typeof overrides.gradientBalance === 'number' && Number.isFinite(overrides.gradientBalance)) {
    result.gradientBalance = clamp(Math.round(overrides.gradientBalance), 35, 80);
  }
  return result;
}

function isValidSelection(value: unknown): value is ThemeSelection {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ThemeSelection;
  if (candidate.id === 'custom') {
    return !candidate.baseThemeId || PRESET_THEME_IDS.includes(candidate.baseThemeId);
  }
  return PRESET_THEME_IDS.includes(candidate.id as ThemePresetId);
}

function cloneSelection(selection: ThemeSelection): ThemeSelection {
  return {
    id: selection.id,
    baseThemeId: selection.baseThemeId,
    overrides: selection.overrides ? { ...selection.overrides } : undefined,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixHex(a: string, b: string, weightA: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const weightB = 1 - weightA;
  return rgbToHex([ar * weightA + br * weightB, ag * weightA + bg * weightB, ab * weightA + bb * weightB]);
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function getContrastTarget(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#1b1714' : '#ffffff';
}
