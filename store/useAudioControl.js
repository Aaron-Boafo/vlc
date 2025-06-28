import { create } from "zustand";
import { Audio } from "expo-av";
import useHistoryStore from './historyStore';
import usePlaybackStore from "./playbackStore";

const useAudioControl = create((set, get) => ({
  // Audio state
  sound: null,
  isPlaying: false,
  currentTrack: null,
  playQueue: [],
  originalQueue: [], // Store the original, unshuffled queue
  isShuffleOn: false,
  currentIndex: 0,
  duration: 0,
  position: 0,
  isLoading: false,
  isMiniPlayerVisible: true,

  // Sleep Timer State
  sleepTimerId: null,

  // Lyrics State
  lyrics: null,
  showLyrics: false,
  lyricsLoading: false,
  lyricsError: null,

  // Initialize audio
  initialize: async () => {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  },

  // Check if audio is initialized
  isInitialized: () => {
    return true; // For now, assume it's initialized if no error was thrown
  },

  setAndPlayPlaylist: async (tracks, startIndex = 0) => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping/unloading previous sound:", error);
      }
    }
    const trackToPlay = tracks[startIndex];
    set({
      playQueue: tracks,
      originalQueue: tracks,
      currentIndex: startIndex,
      currentTrack: trackToPlay,
      sound: null,
      isMiniPlayerVisible: true,
    });
    get()._loadAndPlayTrack(trackToPlay);
  },

  // Set play queue without starting
  setPlayQueue: async (tracks, startIndex = 0) => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping/unloading previous sound:", error);
      }
    }
    set({
      playQueue: tracks,
      originalQueue: tracks,
      currentIndex: startIndex,
      currentTrack: tracks[startIndex] || null,
      isPlaying: false,
      sound: null,
      isMiniPlayerVisible: true,
    });
    // Also fetch lyrics for the new track
    get().fetchLyrics(tracks[startIndex]);
    get().clearSleepTimer();
  },

  _loadAndPlayTrack: async (track) => {
    if (get().isLoading) {
      console.log('[AUDIO] Play request ignored: already loading');
      return;
    }
    set({ isLoading: true });
    const { sound: existingSound } = get();
    try {
      if (existingSound) {
        const status = await existingSound.getStatusAsync();
        if (status.isLoaded) {
          console.log('[AUDIO] Unloading sound for:', existingSound._key || 'unknown', 'Track:', get().currentTrack?.title);
          await existingSound.stopAsync();
          await existingSound.unloadAsync();
        }
      }
    } catch (e) {
      console.error("[AUDIO] Error ensuring single playback (unload):", e);
      set({ sound: null, isPlaying: false });
    }

    if (!track?.uri) {
      console.error("Attempted to play a track with no URI");
      return set({ isLoading: false, currentTrack: null });
    }
    
    set({ isLoading: true, sound: null, isPlaying: false, position: 0 });

    try {
      console.log('[AUDIO] Creating new sound for:', track.title, track.uri);
      const { playbackRate } = usePlaybackStore.getState();
      const initialStatus = {
        shouldPlay: true,
        volume: 1.0,
        rate: playbackRate,
        androidImplementation: 'MediaPlayer',
        metadata: {
          title: track.title || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Unknown Album',
          artwork: track.artwork,
        },
      };

      const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: track.uri },
          initialStatus,
          (status) => onPlaybackStatusUpdate(status, set, get)
      );
      set({
          sound: newSound,
          isPlaying: true,
          isLoading: false,
          currentTrack: track,
      });
      console.log('[AUDIO] Now playing:', track.title);
      try {
        if (useHistoryStore.getState().saveHistory) {
          useHistoryStore.getState().addToHistory(track);
        }
      } catch (e) {}
      get().fetchLyrics(track);
    } catch (error) {
      console.error("Error in _loadAndPlayTrack:", error);
      set({ isLoading: false, isPlaying: false });
    }
  },

  // Play current track (now primarily for resume)
  play: async () => {
    const { sound, currentTrack, isPlaying, isLoading } = get();
    if (isPlaying || isLoading) return;
    
    if (sound) {
      set({ isPlaying: true });
      console.log('[AUDIO] Resuming sound for:', currentTrack?.title);
      await sound.playAsync();
    } else if (currentTrack) {
      get()._loadAndPlayTrack(currentTrack);
    }
  },

  // Pause current track
  pause: async () => {
    const {sound, isLoading} = get();
    if (isLoading) return;
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        try {
          set({isLoading: true, isPlaying: false }); // Immediately update UI to show paused state
          await sound.pauseAsync();
          set({ isLoading: false});
        } catch (error) {
          console.error("Error pausing audio:", error);
          set({isLoading: false, isPlaying: true }); // Revert playing state on error
        }
      }
    }
    get().clearSleepTimer();
  },

  // Stop current track
  stop: async () => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping audio:", error);
      }
    }
    // Also clear the track info to reset the UI
    set({
      sound: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      currentTrack: null,
      playQueue: [],
      currentIndex: 0,
      lyrics: null, // Clear lyrics on stop
    });
     // Also clear any active sleep timer
    get().clearSleepTimer();
  },

  // Next track
  next: async () => {
    const { playQueue, currentIndex } = get();
    if (playQueue.length === 0) return;

    const nextIndex = (currentIndex + 1) % playQueue.length;
    const nextTrack = playQueue[nextIndex];

    set({ currentIndex: nextIndex });
    get()._loadAndPlayTrack(nextTrack);
  },

  // Previous track
  previous: async () => {
    const { playQueue, currentIndex, position, isPlaying } = get();
    if (playQueue.length === 0) return;

    // If track has been playing for > 3s, just restart it.
    if (position > 3000) {
      await get().seek(0);
      if (!isPlaying) await get().play();
      return;
    }

    const prevIndex =
      currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
    const prevTrack = playQueue[prevIndex];
    
    set({ currentIndex: prevIndex });
    get()._loadAndPlayTrack(prevTrack);
  },

  // Seek to position
  seek: async (position) => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.setPositionAsync(position);
      } catch (error) {
        console.error("Error seeking audio:", error);
      }
    }
  },

  // Sleep Timer Controls
  setSleepTimer: (minutes) => {
    const { clearSleepTimer, stop, sleepTimerId } = get();
    
    // Clear any existing timer first
    if (sleepTimerId) {
      clearSleepTimer();
    }

    const timeoutId = setTimeout(() => {
      stop();
    }, minutes * 60 * 1000);

    set({ sleepTimerId: timeoutId });
  },

  clearSleepTimer: () => {
    const { sleepTimerId } = get();
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      set({ sleepTimerId: null });
    }
  },

  // Lyrics Controls
  fetchLyrics: async (track) => {
    if (!track || !track.uri) {
        set({ lyrics: null });
        return;
    }
    // For now, we'll just set dummy lyrics.
    // In a real app, you would fetch this from a file or an API.
    // e.g., look for a .lrc file with the same name as the audio file.
    const dummyLyrics = `[00:01.00] These are placeholder lyrics for ${track.filename}.
[00:05.50] This is a dummy implementation.
[00:10.00] A real app would parse a .lrc file.
[00:15.25] Line 4.
[00:20.75] Line 5.`;
    set({ lyrics: dummyLyrics });
  },

  toggleLyrics: () => {
    set((state) => ({ showLyrics: !state.showLyrics }));
  },

  // Cleanup
  cleanup: async () => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error cleaning up audio:", error);
      }
    }
  },

  setPlaybackSpeed: async (rate) => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.setRateAsync(rate, true);
        usePlaybackStore.getState().setPlaybackRate(rate);
      } catch (error) {
        console.error("Error setting playback speed:", error);
      }
    }
  },

  hideMiniPlayer: () => set({ isMiniPlayerVisible: false }),
}));

const onPlaybackStatusUpdate = (status, set, get) => {
  if (!status.isLoaded) {
    if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
    return;
  }

  set({
    position: status.positionMillis || 0,
    duration: status.durationMillis || 0,
    isPlaying: status.isPlaying,
  });

  if (status.didJustFinish) {
    const { autoplay } = usePlaybackStore.getState();
    if (autoplay) {
      get().next();
    } else {
      set({ isPlaying: false });
    }
  }
};

export default useAudioControl; 