import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set) => ({
      tabState: {
        index: 1,
        activeTab: "all",
      },
      toggleTabs: (tab, index) =>
        set({
          activeTab: tab,
          index: index,
        }),

      audioFiles: [],
      setAudioFiles: (files) =>
        set({
          audioFiles: files,
        }),

      permissionGranted: false,
      setPermissionGranted: (value) =>
        set({
          permissionGranted: value,
        }),
      favourites: [],
      setFavourites: (value) =>
        set({
          favourites: value,
        }),
    }),
    {
      name: "Audio-Tab-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tabState: state.tabState,
        audioFiles: state.audioFiles,
        permissionGranted: state.permissionGranted,
      }),
    }
  )
);

export default useThemeStore;
