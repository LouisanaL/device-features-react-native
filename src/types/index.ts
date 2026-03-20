export interface TravelEntry {
  id: string;
  imageUri: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  caption?: string;
}

export type RootStackParamList = {
  Home: undefined;
  AddEntry: undefined;
};

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  danger: string;
  dangerLight: string;
  cardShadow: string;
  overlay: string;
  statusBar: 'light' | 'dark';
  toggleTrackOff: string;
  toggleThumb: string;
}