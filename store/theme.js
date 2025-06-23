import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const getThemeColors = (themeType, accentColor = "purple") => {
  const accentColors = {
    purple: "#F44BF8",
    blue: "#00FFFF",
    orange: "#EA580C",
    lime: "#32CD32",
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
        background: "#111017",
        sectionBackground: "#222",
        card: "#374151",
        tabIconColor: "#fff",
        ribbon: accentColors[accentColor],
        text: "#fff",
        textSecondary: "#fff",
      };
};

const useThemeStore = create(
  persist(
    (set) => ({
      activeTheme: "light",
      accentColor: "purple",
      themeColors: getThemeColors("light", "purple"),
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
