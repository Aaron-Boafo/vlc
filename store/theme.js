import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const getThemeColors = (themeType) => {
  const baseTheme = {
    primary: "#f44bf8",
    shadow: "#f44bf8",
    descText: "#8e8e8e",
    iconBackground: "#f44bf8",
    card: "#191825",
    search: "#222",
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
        ribbon: "#f44bf8",
        text: "#fff",
      };
};

const useThemeStore = create(
  persist(
    (set) => ({
      activeTheme: "light",
      themeColors: getThemeColors("light"),

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.activeTheme === "light" ? "dark" : "light";
          return {
            activeTheme: newTheme,
            themeColors: getThemeColors(newTheme),
          };
        }),
      currentTrack: null,
      setCurrentTrack: (track) => set(() => ({currentTrack: track})),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
