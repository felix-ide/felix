export { classicLight } from './classic-light.js';
export { classicDark } from './classic-dark.js';
export { midnight } from './midnight.js';
export { forest } from './forest.js';
export { felixNeon } from './felix-neon.js';
export { felixGrid } from './felix-grid.js';
export { retroDark } from './retro-dark.js';
export { retroLight } from './retro-light.js';
export { arctic } from './arctic.js';
export { mars } from './mars.js';
export { deepOcean } from './deep-ocean.js';
export { monochromeGold } from './monochrome-gold.js';
export { northernLights } from './northern-lights.js';
export { felix } from './felix.js';

// Re-export all themes as a collection
import { classicLight } from './classic-light.js';
import { classicDark } from './classic-dark.js';
import { midnight } from './midnight.js';
import { forest } from './forest.js';
import { felixNeon } from './felix-neon.js';
import { felixGrid } from './felix-grid.js';
import { retroDark } from './retro-dark.js';
import { retroLight } from './retro-light.js';
import { arctic } from './arctic.js';
import { mars } from './mars.js';
import { deepOcean } from './deep-ocean.js';
import { monochromeGold } from './monochrome-gold.js';
import { northernLights } from './northern-lights.js';
import { felix } from './felix.js';
import { Theme } from '../types/theme.js';

export const themes: Record<string, Theme> = {
  'classic-light': classicLight,
  'classic-dark': classicDark,
  'midnight': midnight,
  'forest': forest,
  'felix-neon': felixNeon,
  'felix-grid': felixGrid,
  'retro-dark': retroDark,
  'retro-light': retroLight,
  'arctic': arctic,
  'mars': mars,
  'deep-ocean': deepOcean,
  'monochrome-gold': monochromeGold,
  'northern-lights': northernLights,
  'felix': felix,
};

export function getThemeById(themeId: string): Theme | undefined {
  return themes[themeId];
}
