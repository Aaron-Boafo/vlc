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

  setAudioFiles: (newFiles) =>
    set((state) => {
      const existingIds = new Set(state.audioFiles.map((f) => f.id));
      const filtered = newFiles.filter((f) => !existingIds.has(f.id));
      return {
        audioFiles: [...state.audioFiles, ...filtered],
      };
    }),

  setInitialAudioFiles: (files) =>
    set(() => ({
      audioFiles: files, // completely replaces current list when it loads from the cach memory
    })),

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
