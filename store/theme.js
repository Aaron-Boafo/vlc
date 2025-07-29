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
        // Modern Light Theme with Better Contrast
        background: "#F8FAFF",
        sectionBackground: "#F0F4FF",
        card: "#FFFFFF",
        cardElevated: "#E6EDFF",
        tabIconColor: accentColor,
        ribbon: accentDark,
        
        // Text with better contrast
        text: "#1A1F36",
        textSecondary: "#4A5568",
        textTertiary: "718096",
        
        // UI Elements
        border: "#E2E8F0",
        inputBackground: "#FFFFFF",
        inputText: "#1A1F36",
        inputPlaceholder: "#A0AEC0",
        
        // Status Colors
        success: "#00A86B",
        warning: "#DD6B20",
        error: "#E53E3E",
        info: "#3182CE",
        
        // Modern Effects
        overlay: 'rgba(248, 250, 255, 0.9)',
        backdrop: 'rgba(248, 250, 255, 0.7)',
        shadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        shadowLight: '0 2px 10px rgba(0, 0, 0, 0.05)',
        
        // Modern UI Elements
        cardShadow: '0 8px 30px rgba(0, 50, 150, 0.1)',
        buttonHover: 'rgba(0, 0, 0, 0.04)',
        buttonActive: 'rgba(0, 0, 0, 0.08)',
        
        // Gradients
        gradientPrimary: 'linear-gradient(135deg, #4D8AFF 0%, #8A63FF 100%)',
        gradientSecondary: 'linear-gradient(135deg, #00C2FF 0%, #00E0A0 100%)',
        // Typography and spacing
        ...typography,
        ...spacing,
      }
    : {
        ...baseTheme,
        // Vibrant Blue-Black Theme
        background: "#0E1525",
        sectionBackground: "#1A2238",
        card: "#1E2A4A",
        cardElevated: "#2A3A62",
        tabIconColor: accentLight,
        ribbon: accentDark,
        
        // Text with better contrast
        text: "#FFFFFF",
        textSecondary: "#C5D0FF",
        textTertiary: "#7E8DB8",
        
        // UI Elements
        border: "#3A4A7A",
        inputBackground: "#1E2A4A",
        inputText: "#FFFFFF",
        inputPlaceholder: "#7E8DB8",
        
        // Status Colors
        success: "#00F5A0",
        warning: "#FFB74D",
        error: "#FF5C8D",
        info: "#4D8AFF",
        
        // Modern Effects
        overlay: 'rgba(14, 21, 37, 0.9)',
        backdrop: 'rgba(14, 21, 37, 0.7)',
        shadow: '0 4px 20px rgba(0, 15, 50, 0.4)',
        shadowLight: '0 2px 10px rgba(0, 15, 50, 0.25)',
        
        // Modern UI Elements
        cardShadow: '0 8px 30px rgba(0, 20, 80, 0.35)',
        buttonHover: 'rgba(100, 150, 255, 0.15)',
        buttonActive: 'rgba(100, 150, 255, 0.25)',
        
        // Gradients
        gradientPrimary: 'linear-gradient(135deg, #4D8AFF 0%, #8A63FF 100%)',
        gradientSecondary: 'linear-gradient(135deg, #00F5A0 0%, #00D9FF 100%)',
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