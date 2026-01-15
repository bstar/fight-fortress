/**
 * TUI Themes
 * Color schemes for the fight simulation display
 */

export const THEMES = {
  cosmic: {
    name: 'Cosmic',
    // Primary UI colors
    background: '#1a1a2e',
    foreground: '#e0e0e0',
    border: '#4a4a6a',
    borderFocus: '#7b68ee',

    // Fighter colors
    fighterA: '#ff6b6b',      // Red corner
    fighterB: '#4ecdc4',      // Blue corner

    // Status colors
    health: '#2ecc71',
    healthLow: '#e74c3c',
    stamina: '#3498db',
    staminaLow: '#e67e22',

    // Action colors
    punch: '#f39c12',
    block: '#9b59b6',
    evade: '#1abc9c',
    clinch: '#95a5a6',

    // Event colors
    knockdown: '#e74c3c',
    hurt: '#c0392b',
    ko: '#8e44ad',
    warning: '#f1c40f',

    // Commentary
    commentary: '#bdc3c7',
    commentaryHighlight: '#ecf0f1',

    // Referee
    referee: '#f39c12',

    // Round/Timer
    round: '#f1c40f',
    timer: '#ecf0f1'
  },

  catppuccin: {
    name: 'Catppuccin Mocha',
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    border: '#45475a',
    borderFocus: '#cba6f7',

    fighterA: '#f38ba8',      // Pink
    fighterB: '#89b4fa',      // Blue

    health: '#a6e3a1',
    healthLow: '#f38ba8',
    stamina: '#89dceb',
    staminaLow: '#fab387',

    punch: '#f9e2af',
    block: '#cba6f7',
    evade: '#94e2d5',
    clinch: '#6c7086',

    knockdown: '#f38ba8',
    hurt: '#eba0ac',
    ko: '#cba6f7',
    warning: '#f9e2af',

    commentary: '#a6adc8',
    commentaryHighlight: '#cdd6f4',

    referee: '#fab387',
    round: '#f9e2af',
    timer: '#cdd6f4'
  },

  tokyoNight: {
    name: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#c0caf5',
    border: '#3b4261',
    borderFocus: '#7aa2f7',

    fighterA: '#f7768e',      // Red
    fighterB: '#7aa2f7',      // Blue

    health: '#9ece6a',
    healthLow: '#f7768e',
    stamina: '#7dcfff',
    staminaLow: '#e0af68',

    punch: '#e0af68',
    block: '#bb9af7',
    evade: '#73daca',
    clinch: '#565f89',

    knockdown: '#f7768e',
    hurt: '#db4b4b',
    ko: '#bb9af7',
    warning: '#e0af68',

    commentary: '#9aa5ce',
    commentaryHighlight: '#c0caf5',

    referee: '#ff9e64',
    round: '#e0af68',
    timer: '#c0caf5'
  },

  gruvbox: {
    name: 'Gruvbox Dark',
    background: '#282828',
    foreground: '#ebdbb2',
    border: '#504945',
    borderFocus: '#fabd2f',

    fighterA: '#fb4934',      // Red
    fighterB: '#83a598',      // Aqua

    health: '#b8bb26',
    healthLow: '#fb4934',
    stamina: '#83a598',
    staminaLow: '#fe8019',

    punch: '#fabd2f',
    block: '#d3869b',
    evade: '#8ec07c',
    clinch: '#928374',

    knockdown: '#fb4934',
    hurt: '#cc241d',
    ko: '#d3869b',
    warning: '#fabd2f',

    commentary: '#a89984',
    commentaryHighlight: '#ebdbb2',

    referee: '#fe8019',
    round: '#fabd2f',
    timer: '#ebdbb2'
  },

  rosePine: {
    name: 'Rose Pine',
    background: '#191724',
    foreground: '#e0def4',
    border: '#403d52',
    borderFocus: '#c4a7e7',

    fighterA: '#eb6f92',      // Rose
    fighterB: '#9ccfd8',      // Foam

    health: '#31748f',
    healthLow: '#eb6f92',
    stamina: '#9ccfd8',
    staminaLow: '#f6c177',

    punch: '#f6c177',
    block: '#c4a7e7',
    evade: '#31748f',
    clinch: '#6e6a86',

    knockdown: '#eb6f92',
    hurt: '#eb6f92',
    ko: '#c4a7e7',
    warning: '#f6c177',

    commentary: '#908caa',
    commentaryHighlight: '#e0def4',

    referee: '#ebbcba',
    round: '#f6c177',
    timer: '#e0def4'
  },

  // High contrast for accessibility
  highContrast: {
    name: 'High Contrast',
    background: '#000000',
    foreground: '#ffffff',
    border: '#444444',
    borderFocus: '#00ff00',

    fighterA: '#ff0000',
    fighterB: '#00ffff',

    health: '#00ff00',
    healthLow: '#ff0000',
    stamina: '#00ffff',
    staminaLow: '#ffff00',

    punch: '#ffff00',
    block: '#ff00ff',
    evade: '#00ff00',
    clinch: '#888888',

    knockdown: '#ff0000',
    hurt: '#ff0000',
    ko: '#ff00ff',
    warning: '#ffff00',

    commentary: '#cccccc',
    commentaryHighlight: '#ffffff',

    referee: '#ffff00',
    round: '#ffff00',
    timer: '#ffffff'
  }
};

// Default theme
export const DEFAULT_THEME = 'cosmic';

/**
 * Get theme by name
 */
export function getTheme(name) {
  return THEMES[name] || THEMES[DEFAULT_THEME];
}

/**
 * Get list of available theme names
 */
export function getThemeNames() {
  return Object.keys(THEMES);
}

/**
 * Get theme display names
 */
export function getThemeList() {
  return Object.entries(THEMES).map(([key, theme]) => ({
    id: key,
    name: theme.name
  }));
}

export default THEMES;
