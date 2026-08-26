import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import tinycolor from 'tinycolor2';

// Define theme colors first
const accentColors = {
  purple: '#8B5CF6',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F97316',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
   gray: "#6B7280",
  yellow: '#F59E0B',
  fuchsia: '#D946EF',
  lime: '#84CC16',
  cyan: '#06B6D4',
  emerald: '#059669',
  violet: '#8B5A2B',
  rose: '#F43F5E',
  amber: '#F59E0B',
  sky: '#0EA5E9',
};

// Typography and spacing constants
const typography = {
  fontSizeXS: 12,
  fontSizeSM: 14,
  fontSizeMD: 16,
  fontSizeLG: 18,
  fontSizeXL: 20,
  fontSize2XL: 24,
  fontSize3XL: 30,
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemiBold: '600',
  fontWeightBold: '700',
};

const spacing = {
  spaceXS: 4,
  spaceSM: 8,
  spaceMD: 16,
  spaceLG: 24,
  spaceXL: 32,
  space2XL: 48,
};

const getThemeColors = (theme, accentColor) => {
  const accent = accentColors[accentColor] || accentColors.purple;

  // Create a slightly lighter and darker version for hover/press states
  const accentLight = tinycolor(accent).lighten(15).toString();
  const accentDark = tinycolor(accent).darken(15).toString();

  const baseTheme = {
    // Primary colors
    primary: accent,
    primaryLight: accentLight,
    primaryDark: accentDark,

    // Secondary colors (complementary to primary)
    secondary: tinycolor(accent).complement().toString(),

    // Accent color (same as primary for consistency)
    accent: accent,
  };

  if (theme === 'dark') {
    return {
      ...baseTheme,
      // Background colors
      background: '#0F0F23',
      backgroundSecondary: '#1A1A2E',
      card: '#16213E',
      surface: '#1E1E3F',

      // Text colors
      text: '#FFFFFF',
      textSecondary: '#B0B0C3',
      textTertiary: '#8A8A9E',

      // Border and divider colors
      border: '#2A2A4A',
      divider: '#2A2A4A',

      // Status colors
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',

      // Shadow and overlay
      shadow: '#000000',
      overlay: 'rgba(0, 0, 0, 0.5)',

      // Interactive states
      hover: 'rgba(139, 92, 246, 0.1)',
      pressed: 'rgba(139, 92, 246, 0.2)',
      disabled: '#4A4A6A',

      // Gradients
      gradientPrimary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      gradientSecondary: 'linear-gradient(135deg, #00F5A0 0%, #00D9FF 100%)',
      // Typography and spacing
      ...typography,
      ...spacing,
    };
  } else {
    return {
      ...baseTheme,
      // Background colors
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFC',
      card: '#FFFFFF',
      surface: '#F1F5F9',

      // Text colors
      text: '#1E293B',
      textSecondary: '#64748B',
      textTertiary: '#94A3B8',

      // Border and divider colors
      border: '#E2E8F0',
      divider: '#E2E8F0',

      // Status colors
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',

      // Shadow and overlay
      shadow: '#000000',
      overlay: 'rgba(0, 0, 0, 0.3)',

      // Interactive states
      hover: 'rgba(139, 92, 246, 0.1)',
      pressed: 'rgba(139, 92, 246, 0.2)',
      disabled: '#CBD5E1',

      // Gradients
      gradientPrimary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      gradientSecondary: 'linear-gradient(135deg, #00F5A0 0%, #00D9FF 100%)',
      // Typography and spacing
      ...typography,
      ...spacing,
    };
  }
};

// Create a separate store configuration
const createThemeStore = (set, get) => ({
  // Initial state - keeping your preferred dark theme and purple accent
  activeTheme: "dark",
  accentColor: "purple",
  themeColors: getThemeColors("dark", "purple"),
  selectedBackground: null,
  _hasHydrated: false,
  
  // Force re-render counter to ensure all components update
  _updateCounter: 0,

  // Actions
  toggleTheme: () => {
    const state = get();
    const newTheme = state.activeTheme === "light" ? "dark" : "light";
    set({
      activeTheme: newTheme,
      themeColors: getThemeColors(newTheme, state.accentColor),
      _updateCounter: state._updateCounter + 1, // Force re-render
    });
  },

  setAccentColor: (color) => {
    const state = get();
    const newThemeColors = getThemeColors(state.activeTheme, color);
    console.log('🎨 Setting accent color:', color);
    console.log('🎨 New primary color:', newThemeColors.primary);
    console.log('🎨 Update counter:', state._updateCounter + 1);
    set({
      accentColor: color,
      themeColors: newThemeColors,
      _updateCounter: state._updateCounter + 1, // Force re-render
    });
    console.log('✅ Theme store updated successfully');
  },

  setBackground: (background) => {
    set({ selectedBackground: background });
  },

  // Initialize theme with system preferences
  initializeTheme: () => {
    const state = get();
    set({
      themeColors: getThemeColors(state.activeTheme, state.accentColor),
      _hasHydrated: true
    });
  },

  // Reset to default theme - keeping your preferences
  resetTheme: () => {
    set({
      activeTheme: "dark",
      accentColor: "purple",
      themeColors: getThemeColors("dark", "purple"),
      selectedBackground: null,
    });
  }
});

// Create the store with persistence
const useThemeStore = create(
  persist(createThemeStore, {
    name: "theme-storage-v3",
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
    partialize: (state) => ({
      activeTheme: state.activeTheme,
      accentColor: state.accentColor,
      selectedBackground: state.selectedBackground,
    }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        state.initializeTheme();
      }
    },
    skipHydration: false,
  })
);

export default useThemeStore;