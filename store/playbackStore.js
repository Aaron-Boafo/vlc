import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const usePlaybackStore = create(
  persist(
    (set) => ({
      autoplay: true,
      backgroundPlay: true,
      playbackRate: 1.0,
      setAutoplay: (value) => set({ autoplay: value }),
      setBackgroundPlay: (value) => set({ backgroundPlay: value }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
    }),
    {
      name: "playback-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default usePlaybackStore; 