import {create} from "zustand";
import {Audio} from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {createJSONStorage, persist} from "zustand/middleware";

export default create(
  persist(
    (set, get) => ({
      sound: null,
      playlist: [],
      currentIndex: 0,
      isLooping: false,
      isShuffling: false,
      status: null,
      lastPosition: 0,
      wasPlaying: false,

      setPlaylist: async (tracks, startIndex = 0) => {
        await get().unload();
        set({
          playlist: Array.isArray(tracks) ? tracks : [tracks],
          currentIndex: startIndex,
        });
        await get().loadAndPlayCurrent();
      },

      loadAndPlayCurrent: async () => {
        const {playlist, currentIndex, isLooping} = get();
        const track = playlist[currentIndex];
        if (!track) return;

        const prevSound = get().sound;
        if (prevSound) {
          await prevSound.unloadAsync();
          prevSound.setOnPlaybackStatusUpdate(null);
        }

        const {sound: newSound, status} = await Audio.Sound.createAsync(track, {
          shouldPlay: true,
          isLooping,
        });

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          set({
            status,
            lastPosition: status.positionMillis ?? 0,
            wasPlaying: status.isPlaying,
          });

          if (status.didJustFinish && !status.isLooping) {
            await get().next();
          }
        });

        set({
          sound: newSound,
          status,
          lastPosition: status.positionMillis ?? 0,
          wasPlaying: status.isPlaying,
        });
      },

      play: async () => {
        const sound = get().sound;
        if (sound) await sound.playAsync();
      },

      pause: async () => {
        const sound = get().sound;
        if (sound) await sound.pauseAsync();
      },

      stop: async () => {
        const sound = get().sound;
        if (sound) await sound.stopAsync();
      },

      unload: async () => {
        const sound = get().sound;
        if (sound) {
          await sound.unloadAsync();
          sound.setOnPlaybackStatusUpdate(null);
        }
        set({sound: null, status: null});
      },

      next: async () => {
        const {playlist, currentIndex, isShuffling} = get();
        let nextIndex;

        if (isShuffling) {
          nextIndex = Math.floor(Math.random() * playlist.length);
        } else {
          nextIndex = currentIndex + 1;
        }

        if (nextIndex < playlist.length) {
          set({currentIndex: nextIndex});
          await get().loadAndPlayCurrent();
        }
      },

      previous: async () => {
        const {currentIndex} = get();
        if (currentIndex > 0) {
          set({currentIndex: currentIndex - 1});
          await get().loadAndPlayCurrent();
        }
      },

      seek: async (positionMillis) => {
        const sound = get().sound;
        if (sound) await sound.setPositionAsync(positionMillis);
        set({lastPosition: positionMillis});
      },

      getStatus: async () => {
        const sound = get().sound;
        return sound ? await sound.getStatusAsync() : null;
      },

      toggleLoop: async () => {
        const isLooping = !get().isLooping;
        set({isLooping});
        const sound = get().sound;
        if (sound) await sound.setIsLoopingAsync(isLooping);
      },

      toggleShuffle: () => {
        set((state) => ({isShuffling: !state.isShuffling}));
      },
      restorePlayback: async () => {
        const {playlist, currentIndex, lastPosition, wasPlaying, isLooping} =
          get();
        const track = playlist[currentIndex];
        if (!track) return;

        const {sound: newSound} = await Audio.Sound.createAsync(track, {
          shouldPlay: wasPlaying,
          isLooping,
          positionMillis: lastPosition,
        });

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          set({
            status,
            lastPosition: status.positionMillis ?? 0,
            wasPlaying: status.isPlaying,
          });

          if (status.didJustFinish && !status.isLooping) {
            await get().next();
          }
        });

        set({sound: newSound});
      },
      backgroundPlaySetup: async () => {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          allowsRecordingIOS: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      },
    }),
    {
      name: "music-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        playlist: state.playlist,
        currentIndex: state.currentIndex,
        isLooping: state.isLooping,
        isShuffling: state.isShuffling,
        lastPosition: state.lastPosition,
        wasPlaying: state.wasPlaying,
      }),
    }
  )
);
