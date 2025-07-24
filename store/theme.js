import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const getThemeColors = (themeType, accentColor = accentColors) => {
  const accentColors = {
    purple: "#8B5CF6",
    blue: "#2196F3",
    orange: "#EA580C",
    lime: "#1DB954",
    red: "#EF4444",
    amber: "#FFBF00",
    indigo: "#4B0082",
    gray: "#64748B"
  };

  const baseTheme = {
    primary: accentColors[accentColor],
    primaryLight: accentColors[accentColor] + '20',
    shadow: accentColors[accentColor],
    descText: "#8e8e8e",
    iconBackground: accentColors[accentColor],
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
        background: "#0F0F23",
        sectionBackground: "#1A1A2E",
        card: "#16213E",
        tabIconColor: "#B8BCC8",
        ribbon: accentColors[accentColor],
        text: "#FFFFFF",
        textSecondary: "#B8BCC8",
        border: "#2A2D47",
        surface: "#16213E",
      };
};

const useThemeStore = create(
  persist(
    (set) => ({
      activeTheme: "dark",
      accentColor: "purple",
      themeColors: getThemeColors("dark", "purple"),
      selectedBackground: null,

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.activeTheme === "light" ? "dark" : "light";
          return {
            activeTheme: newTheme,
            themeColors: getThemeColors(newTheme, state.accentColor),
          };
        }),

      setAccentColor: (color) =>
        set((state) => ({
          accentColor: color,
          themeColors: getThemeColors(state.activeTheme, color),
        })),

      setBackground: (background) =>
        set(() => ({ selectedBackground: background })),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTheme: state.activeTheme,
        accentColor: state.accentColor,
        selectedBackground: state.selectedBackground,
      }),
    }
  )
);

export default useThemeStore;
