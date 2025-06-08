import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set) => ({
      activeTab: "all",
      toggleTabs: (tabs) =>
        set(() => {
          return {activeTab: tabs};
        }),
    }),

    {
      name: "Audio-Tab-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
