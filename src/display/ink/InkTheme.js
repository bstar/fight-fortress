/**
 * InkTheme - Theme context and utilities for Ink components
 */

import React from 'react';
import { THEMES, DEFAULT_THEME, getTheme } from '../themes.js';

// Theme context
export const ThemeContext = React.createContext(getTheme(DEFAULT_THEME));

/**
 * Theme provider component
 */
export function ThemeProvider({ themeName = DEFAULT_THEME, children }) {
  const theme = getTheme(themeName);
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

/**
 * Hook to use current theme
 */
export function useTheme() {
  return React.useContext(ThemeContext);
}

/**
 * Convert hex color to chalk-compatible format
 * Ink/chalk support hex colors directly with chalk.hex()
 */
export function hexToChalk(hex) {
  return hex.replace('#', '');
}

export { THEMES, DEFAULT_THEME, getTheme };
