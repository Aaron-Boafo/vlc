import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Define theme colors first
const accentColors = {
  purple: "#F44BF8",
  blue: "#2196F3",
  orange: "#EA580C",
  lime: "#1DB954",
  red: "#EF4444",
  amber: "#FFBF00",
  indigo: "#4B0082",
  gray: "#64748B"
};

// Theme color generator function
const getThemeColors = (themeType, accentColor = "purple") => {
  const baseTheme = {
    primary: accentColors[accentColor],
    primaryLight: accentColors[accentColor] + '20',
    shadow: accentColors[accentColor],
    descText: "#8e8e8e",
    iconBackground: accentColors[accentColor],
    accentColor: accentColors[accentColor],
  };

  return themeType === "light"
    ? {
        ...baseTheme,
        background: "#fff",
        sectionBackground: "#f1f5f9",
        card: "#e5e7eb",
        tabIconColor: "#000",
        ribbon: "#2b2138",
        text: "#000",
        textSecondary: "#666",
      }
    : {
        ...baseTheme,
        background: "#0A0A0A",
        sectionBackground: "#18181b",
        card: "#212121",
        tabIconColor: "#fff",
        ribbon: accentColors[accentColor],
        text: "#fff",
        textSecondary: "#fff",
      };
};

// Create a separate store configuration
const createThemeStore = (set, get) => ({
  // Initial state
  activeTheme: "light",
  accentColor: "purple",
  themeColors: getThemeColors("light", "purple"),
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
      accentColor: "purple",
      themeColors: getThemeColors("light", "purple"),
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