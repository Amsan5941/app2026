/**
 * Fitness App Design System
 * Supports dark and light themes with energetic accent colors.
 */

import { Platform } from 'react-native';

// ── Dark Palette ──────────────────────────────────────────────
export const DarkPalette = {
  // Backgrounds (deep dark)
  bg: '#0A0A10',
  bgCard: '#13131E',
  bgCardHover: '#1A1A2A',
  bgElevated: '#181828',
  bgInput: '#111120',

  // Accent — energetic purple / violet
  accent: '#7C5CFC',
  accentLight: '#A78BFA',
  accentDark: '#5B3FD4',
  accentMuted: 'rgba(124, 92, 252, 0.15)',

  // Semantic
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#38BDF8',

  // Text
  textPrimary: '#F1F1F6',
  textSecondary: '#9494B0',
  textMuted: '#5E5E7A',
  textInverse: '#0A0A10',

  // Borders & dividers
  border: '#1E1E30',
  borderLight: '#2A2A40',
  divider: 'rgba(255,255,255,0.06)',

  // Gradients
  gradientStart: '#7C5CFC',
  gradientEnd: '#38BDF8',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
};

// ── Light Palette ─────────────────────────────────────────────
export const LightPalette = {
  // Backgrounds (clean light)
  bg: '#F2F2F8',
  bgCard: '#FFFFFF',
  bgCardHover: '#EBEBF5',
  bgElevated: '#FAFAFE',
  bgInput: '#EEEEF8',

  // Accent — same brand purple (unchanged for brand consistency)
  accent: '#7C5CFC',
  accentLight: '#A78BFA',
  accentDark: '#5B3FD4',
  accentMuted: 'rgba(124, 92, 252, 0.10)',

  // Semantic (slightly more saturated for light backgrounds)
  success: '#16A34A',
  successMuted: 'rgba(22, 163, 74, 0.12)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',
  error: '#DC2626',
  errorMuted: 'rgba(220, 38, 38, 0.12)',
  info: '#0284C7',

  // Text
  textPrimary: '#0F0E1A',
  textSecondary: '#4B4A6A',
  textMuted: '#9090B0',
  textInverse: '#F1F1F6',

  // Borders & dividers
  border: '#E0DFF0',
  borderLight: '#CCCCE8',
  divider: 'rgba(0,0,0,0.06)',

  // Gradients (unchanged — same brand accent)
  gradientStart: '#7C5CFC',
  gradientEnd: '#38BDF8',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
};

// ── Backward-compat alias ─────────────────────────────────────
// All existing static imports of `Palette` continue to work (default dark).
export const Palette = DarkPalette;

// ── Spacing scale ─────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

// ── Border radii ──────────────────────────────────────────────
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// ── Legacy Colors export (keeps existing imports working) ─────
const tintColorLight = '#7C5CFC';
const tintColorDark = '#7C5CFC';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F1F1F6',
    background: '#0A0A10',
    tint: tintColorDark,
    icon: '#5E5E7A',
    tabIconDefault: '#5E5E7A',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
