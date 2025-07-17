import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Audio } from "expo-av";
import useHistoryStore from './historyStore';
import usePlaybackStore from "./playbackStore";
import AudioOptimizer from '../utils/audioOptimizations';
import * as FileSystem from 'expo-file-system';

const useAudioControl = create(
  subscribeWithSelector((set, get) => ({
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
      return;
    }
    set({ isLoading: true });
    const { sound: existingSound, playQueue, currentIndex } = get();
    
    try {
      if (existingSound) {
        const status = await existingSound.getStatusAsync();
        if (status.isLoaded) {
          await existingSound.stopAsync();
          await existingSound.unloadAsync();
        }
      }
    } catch (e) {
      console.error("[AUDIO] Error ensuring single playback (unload):", e);
      set({ sound: null, isPlaying: false });
    }

    if (!track?.uri) {
      console.error("Attempted to play a track with no URI:", track);
      console.error("Track details:", JSON.stringify(track, null, 2));
      return set({ isLoading: false, currentTrack: null });
    }
    
    set({ isLoading: true, sound: null, isPlaying: false, position: 0 });

    try {
      const { playbackRate } = usePlaybackStore.getState();
      
      // 🚀 Try to get optimized/preloaded sound first
      let newSound;
      try {
        newSound = await AudioOptimizer.getOptimizedSound(track);
        console.log('⚡ Using optimized sound for:', track.title);
      } catch (optimizerError) {
        console.log('Optimizer failed, using standard loading:', optimizerError);
        // Fallback to standard loading
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

        // --- FileSystem caching logic start ---
        let audioUri = track.uri;
        const isRemote = /^https?:\/\//.test(track.uri);
        if (isRemote) {
          const audiosDir = FileSystem.documentDirectory + 'audios/';
          const filename = encodeURIComponent(track.title || track.uri.split('/').pop());
          const localUri = audiosDir + filename;
          // Ensure audios directory exists
          await FileSystem.makeDirectoryAsync(audiosDir, { intermediates: true }).catch(() => {});
          const fileInfo = await FileSystem.getInfoAsync(localUri);
          if (!fileInfo.exists) {
            try {
              await FileSystem.downloadAsync(track.uri, localUri);
            } catch (e) {
              console.warn('Failed to cache audio, falling back to remote URI', e);
            }
          }
          // Use local file if it exists
          const cachedFileInfo = await FileSystem.getInfoAsync(localUri);
          if (cachedFileInfo.exists) {
            audioUri = localUri;
          }
        }
        // --- FileSystem caching logic end ---

        const soundResult = await Audio.Sound.createAsync(
            { uri: audioUri },
            initialStatus,
            (status) => onPlaybackStatusUpdate(status, set, get)
        );
        newSound = soundResult.sound;
      }

      // Configure the sound for playback
      await newSound.setStatusAsync({
        shouldPlay: true,
        volume: 1.0,
        rate: playbackRate,
      });
      
      // Set up status callback
      newSound.setOnPlaybackStatusUpdate((status) => onPlaybackStatusUpdate(status, set, get));

      set({
          sound: newSound,
          isPlaying: true,
          isLoading: false,
          currentTrack: track,
      });

      // 🚀 Start preloading next tracks in background
      setTimeout(() => {
        AudioOptimizer.preloadNextTracks(currentIndex, playQueue);
      }, 1000); // Wait 1 second before starting preload

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

  // Shuffle Controls
  toggleShuffle: () => {
    const { isShuffleOn, playQueue, currentIndex, originalQueue } = get();
    if (!isShuffleOn) {
      // Enable shuffle: shuffle the queue except the current track
      const currentTrack = playQueue[currentIndex];
      const rest = playQueue.filter((_, i) => i !== currentIndex);
      // Fisher-Yates shuffle
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const shuffledQueue = [currentTrack, ...rest];
      set({
        isShuffleOn: true,
        playQueue: shuffledQueue,
        currentIndex: 0,
      });
    } else {
      // Disable shuffle: restore original order and current index
      const currentTrack = playQueue[get().currentIndex];
      const originalIdx = originalQueue.findIndex(t => t.id === currentTrack.id);
      set({
        isShuffleOn: false,
        playQueue: originalQueue,
        currentIndex: originalIdx === -1 ? 0 : originalIdx,
      });
    }
  },

  // Next track
  next: async () => {
    const { playQueue, currentIndex, isShuffleOn } = get();
    if (playQueue.length === 0) return;

    let nextIndex;
    if (isShuffleOn) {
      // Pick a random index that's not the current one
      if (playQueue.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * playQueue.length);
        } while (nextIndex === currentIndex);
      }
    } else {
      nextIndex = (currentIndex + 1) % playQueue.length;
    }
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
        set({ lyrics: null, lyricsLoading: false, lyricsError: null });
        return;
    }

    set({ lyricsLoading: true, lyricsError: null });

    try {
      // First, try to find a .lrc file with the same name as the audio file
      const audioPath = track.uri;
      const basePath = audioPath.substring(0, audioPath.lastIndexOf('.'));
      const lrcPath = basePath + '.lrc';   
      // Check if .lrc file exists
      const lrcInfo = await FileSystem.getInfoAsync(lrcPath);
      
      if (lrcInfo.exists) {       // Read the .lrc file
        const lrcContent = await FileSystem.readAsStringAsync(lrcPath);
        set({ lyrics: lrcContent, lyricsLoading: false });
        return;
      }

      // If no .lrc file, try to fetch from online lyrics service
      // For now, we'll use a simple lyrics API (you can replace with your preferred service)
      const searchTerm = encodeURIComponent(`${track.title} ${track.artist}`);
      const response = await fetch(`https://api.lyrics.ovh/v1/${track.artist}/${track.title}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          // Convert plain text lyrics to .lrc format
          const lrcLyrics = convertToLrcFormat(data.lyrics, track.title);
          set({ lyrics: lrcLyrics, lyricsLoading: false });
          return;
        }
      }

      // If no lyrics found, create a placeholder
      const placeholderLyrics = `[00:0100] ${track.title}
[00:5 By ${track.artist}
[00o lyrics available for this track
[000] Enjoy the music!`;
      
      set({ lyrics: placeholderLyrics, lyricsLoading: false });
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      set({ lyrics: null, lyricsLoading: false, lyricsError: 'Failed to load lyrics' });
    }
  },

  // Helper function to convert plain text to .lrc format
  convertToLrcFormat: (plainText, title) => {
    const lines = plainText.split('\n').filter(line => line.trim());
    let lrcContent = `[00:010${title}\n`;
    
    lines.forEach((line, index) => {
      const timeInSeconds = (index + 2) * 5; // 5 seconds per line
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = timeInSeconds % 60;
      const timeStamp = `[${minutes.toString().padStart(2,0)}${seconds.toString().padStart(2,0)}.00]`;
      lrcContent += `${timeStamp} ${line}\n`;
    });
    
    return lrcContent;
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
}))
);

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