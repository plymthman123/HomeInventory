/**
 * App color palette — supports light and dark mode.
 * Uses a blue-indigo primary consistent with a trusted "home" feel.
 */

const primary = {
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',  // main brand color
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
}

export const Colors = {
  light: {
    text:            '#11181C',
    textSecondary:   '#687076',
    background:      '#FFFFFF',
    backgroundSecondary: '#F6F6F6',
    card:            '#FFFFFF',
    border:          '#E6E8EB',
    primary:         primary[500],
    primaryDark:     primary[700],
    primaryLight:    primary[100],
    success:         '#16a34a',
    warning:         '#d97706',
    danger:          '#dc2626',
    tint:            primary[500],
    tabIconDefault:  '#687076',
    tabIconSelected: primary[500],
  },
  dark: {
    text:            '#ECEDEE',
    textSecondary:   '#9BA1A6',
    background:      '#151718',
    backgroundSecondary: '#1E2022',
    card:            '#1E2022',
    border:          '#2D3035',
    primary:         primary[400],
    primaryDark:     primary[300],
    primaryLight:    primary[900],
    success:         '#4ade80',
    warning:         '#fbbf24',
    danger:          '#f87171',
    tint:            primary[400],
    tabIconDefault:  '#9BA1A6',
    tabIconSelected: primary[400],
  },
}

export type ColorScheme = keyof typeof Colors
