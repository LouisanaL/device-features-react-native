import { ThemeColors } from '../types';

export const lightTheme: ThemeColors = {
  background: '#FFFBEA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF8D6',
  primary: '#F5C000',
  primaryLight: '#FFF3B0',
  primaryDark: '#C49A00',
  text: '#1A1500',
  textSecondary: '#3D3200',
  textMuted: '#9A8C5A',
  textOnPrimary: '#1A1500',
  border: '#EDE4A0',
  danger: '#D32F2F',
  dangerLight: '#FDECEA',
  cardShadow: 'rgba(196,154,0,0.13)',
  overlay: 'rgba(0,0,0,0.45)',
  statusBar: 'dark',
  toggleTrackOff: '#D1C97A',
  toggleThumb: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  background: '#111008',
  surface: '#1E1A05',
  surfaceElevated: '#2A2508',
  primary: '#F5C000',
  primaryLight: '#2E2700',
  primaryDark: '#C49A00',
  text: '#FFF8DC',
  textSecondary: '#E8D98A',
  textMuted: '#8A7E4A',
  textOnPrimary: '#1A1500',
  border: '#3A3200',
  danger: '#EF5350',
  dangerLight: '#3D1A19',
  cardShadow: 'rgba(0,0,0,0.5)',
  overlay: 'rgba(0,0,0,0.7)',
  statusBar: 'light',
  toggleTrackOff: '#3A3A3A',
  toggleThumb: '#FFFFFF',
};

export const STORAGE_KEY = '@travel_diary_entries';