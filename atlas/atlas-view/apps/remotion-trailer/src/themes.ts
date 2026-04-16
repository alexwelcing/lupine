/**
 * Theme configurations for the trailer
 * Choose a theme that matches your brand or preference
 */

export interface Theme {
  name: string;
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  glow: string;
}

export const themes: Record<string, Theme> = {
  // Default: Cyan cyberpunk
  cyberpunk: {
    name: 'Cyberpunk',
    background: '#06080d',
    primary: '#00c8f0',
    secondary: '#5de8a0',
    accent: '#f0b840',
    text: '#ffffff',
    textMuted: '#8892a8',
    glow: 'rgba(0, 200, 240, 0.5)',
  },

  // Warm: Orange/amber tones
  sunset: {
    name: 'Sunset',
    background: '#0d0906',
    primary: '#ff8c42',
    secondary: '#ff5472',
    accent: '#f0b840',
    text: '#fff5f0',
    textMuted: '#b8a090',
    glow: 'rgba(255, 140, 66, 0.5)',
  },

  // Cool: Purple/violet tones
  nebula: {
    name: 'Nebula',
    background: '#0a0610',
    primary: '#c084fc',
    secondary: '#818cf8',
    accent: '#f472b6',
    text: '#f3e8ff',
    textMuted: '#a890b8',
    glow: 'rgba(192, 132, 252, 0.5)',
  },

  // Professional: Blue corporate
  corporate: {
    name: 'Corporate',
    background: '#080c14',
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    glow: 'rgba(59, 130, 246, 0.5)',
  },

  // Matrix: Green terminal
  matrix: {
    name: 'Matrix',
    background: '#000800',
    primary: '#00ff41',
    secondary: '#00cc33',
    accent: '#ffff00',
    text: '#e0ffe0',
    textMuted: '#4a8050',
    glow: 'rgba(0, 255, 65, 0.5)',
  },

  // Monochrome: Grayscale
  monochrome: {
    name: 'Monochrome',
    background: '#0a0a0a',
    primary: '#ffffff',
    secondary: '#a0a0a0',
    accent: '#606060',
    text: '#ffffff',
    textMuted: '#808080',
    glow: 'rgba(255, 255, 255, 0.3)',
  },
};

// Current theme - change this to switch themes
export const currentTheme = themes.cyberpunk;

// Helper to use theme in components
export const useTheme = () => currentTheme;
