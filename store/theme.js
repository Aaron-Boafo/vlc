import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const getThemeColors = (themeType, accentColor = "purple") => {
  const accentColors = {
    purple: "#F44BF8",
    blue: "#2563EB",
    orange: "#EA580C",
    green: "#16A34A"
  };

  const baseTheme = {
    primary: accentColors[accentColor],
    shadow: accentColors[accentColor],
    descText: "#8e8e8e",
    iconBackground: accentColors[accentColor],
  };

  return themeType === "light"
    ? {
        ...baseTheme,
        background: "#fff",
        tabIconColor: "#000",
        ribbon: "#2b2138",
        text: "#000",
      }
    : {
        ...baseTheme,
        background: "#111017",
        tabIconColor: "#fff",
        ribbon: accentColors[accentColor],
        text: "#fff",
      };
};

const useThemeStore = create(
  persist(
    (set) => ({
      activeTheme: "light",
      accentColor: "purple",
      themeColors: getThemeColors("light", "purple"),

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
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
