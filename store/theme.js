import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import tinycolor from 'tinycolor2';

// Define theme colors first
const accentColors = {
  fuchsia: "#F44BF8",  // Original Fuchsia - Modern and energetic
  gold: "#FFD700",     // Vibrant Gold - Excellent visibility in all modes
  coral: "#FB6A4A",    // Warm Coral - Better visibility on light UI
  teal: "#14B8A6",     // Teal 500 - More vibrant and contrast-friendly
  purple: "#8B5CF6",   // Violet 500 - Pops nicely in dark UI
  blue: "#2563EB",     // Blue 600 - Calmer and more readable in both themes
  red: "#DC2626",      // Red 600 - Deeper tone, prevents glare
  gray: "#6B7280"      // Slate Gray 500 - Better on dark backgrounds
};

// Typography
const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
};

// Spacing system (in pixels)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Theme color generator function
const getThemeColors = (themeType, accentColorName) => {
  // Get the base accent color
  const accentColor = accentColors[accentColorName] || accentColors.fuchsia;
  
  // Create a slightly lighter and darker version for hover/press states
  const accentLight = tinycolor(accentColor).lighten(15).toString();
  const accentDark = tinycolor(accentColor).darken(15).toString();
  
  const baseTheme = {
    // Primary accent colors
    primary: accentColor,
    primaryLight: accentLight,
    primaryDark: accentDark,
    
    // Secondary colors (complementary to primary)
    secondary: tinycolor(accentColor).complement().toString(),
    
    // Accent color (same as primary for consistency)
    accent: accentColor,
    shadow: accentColor,
    descText: "#8e8e8e",
    iconBackground: accentColor,
    accentColor: accentColor,
  };

  return themeType === "light"
    ? {
        ...baseTheme,
        // Warmer, darker white theme for better eye comfort
        background: "#F5F5F5",
        sectionBackground: "#EEEEEE",
        card: "#FAFAFA",
        cardElevated: "#E0E0E0",
        tabIconColor: accentColor,
        ribbon: accentDark,
        text: "#212121",
        textSecondary: "#424242",
        border: "#BDBDBD",
        inputBackground: "#EEEEEE",
        inputText: "#212121",
        inputPlaceholder: "#757575",
        success: "#059669",
        warning: "#D97706",
        error: "#DC2626",
        info: "#2563EB",
        // Typography and spacing
        ...typography,
        ...spacing,
      }
    : {
        ...baseTheme,
        // Dark theme colors with accent color integration
        background: "#0F172A",
        sectionBackground: "#1E293B",
        card: "#1E293B",
        cardElevated: "#2D3748",
        tabIconColor: accentLight, // Lighter accent for dark theme tabs
        ribbon: accentDark, // Darker accent for ribbons
        text: "#F8FAFC",
        textSecondary: "#94A3B8",
        border: "#2D3748",
        inputBackground: "#1E293B",
        inputText: "#F8FAFC",
        inputPlaceholder: "#94A3B8",
        success: "#10B981",
        warning: accentLight, // Lighter accent for warnings in dark mode
        error: "#EF4444",
        info: accentLight, // Lighter accent for info in dark mode
        // Typography and spacing
        ...typography,
        ...spacing,
      };
};

// Create a separate store configuration
const createThemeStore = (set, get) => ({
  // Initial state
  activeTheme: "light",
  accentColor: "fuchsia",
  themeColors: getThemeColors("light", "fuchsia"),
  selectedBackground: null,
  _hasHydrated: false,
  
  // Actions
  toggleTheme: () => {
    const state = get();
    const newTheme = state.activeTheme === "light" ? "dark" : "light";
    set({
      activeTheme: newTheme,
      themeColors: getThemeColors(newTheme, state.accentColor),
    });
  },

  setAccentColor: (color) => {
    const state = get();
    set({
      accentColor: color,
      themeColors: getThemeColors(state.activeTheme, color),
    });
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
  
  // Reset to default theme
  resetTheme: () => {
    set({
      activeTheme: "light",
      accentColor: "fuchsia",
      themeColors: getThemeColors("light", "fuchsia"),
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