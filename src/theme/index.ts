export const colors = {
  bg: '#0b0b10',
  panel: '#15151e',
  panelHigh: '#1d1d2a',
  line: '#2c2c3c',
  ink: '#f4f1ea',
  muted: '#9a97a8',
  gold: '#e8b547',
  red: '#e0323c',
  blue: '#2f7cf6',
  green: '#4ecf7a',
  purple: '#b56cf0',
};

export const meterColors = {
  cash: colors.green,
  hype: colors.red,
  stable: colors.blue,
  rep: colors.gold,
} as const;

export const fonts = {
  display: 'BebasNeue_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyHeavy: 'Inter_800ExtraBold',
};

export const maxContentWidth = 480;
