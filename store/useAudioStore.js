import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import {mmkvStorage} from "./mmkvStorage";

const theme = (set) => ({
  audioFiles: [],
  permissionGranted: false,
  musicFavourite: [],
  loading: true,

  setLoading: (loading) =>
    set({
      loading: loading,
    }),

  setAudioFiles: (files) =>
    set({
      audioFiles: files,
    }),

  setPermissionGranted: (value) =>
    set({
      permissionGranted: value,
    }),

  setFavourites: (value) =>
    set({
      musicFavourite: value,
    }),
});

const useThemeStore = create(
  persist(theme, {
    name: "Audio-Tab-storage",
    storage: createJSONStorage(() => ({
      setItem: (key, value) => mmkvStorage.set(key, value),
      getItem: (key) => mmkvStorage.getString(key),
      removeItem: (key) => mmkvStorage.delete(key),
    })),
    partialize: (state) => ({
      tabState: state.tabState,
      audioFiles: state.audioFiles,
      permissionGranted: state.permissionGranted,
    }),
  })
);

export default useThemeStore;
