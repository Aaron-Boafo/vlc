import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Audio } from "expo-av";
import useHistoryStore from './historyStore';
import usePlaybackStore from "./playbackStore";
import AudioOptimizer from '../utils/audioOptimizations';
import * as FileSystem from 'expo-file-system';
import { setupMusicControls, updateNotification } from '../services/musicControlService';
import * as Notifications from 'expo-notifications';

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
    isTransitioning: false, // Prevent multiple simultaneous plays

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
        }).catch(audioError => {
          console.warn('Audio mode setup failed:', audioError);
        });

        // Setup music controls - delay and make safer to prevent startup crashes
        setTimeout(() => {
          try {
            const cleanup = setupMusicControls({
              play: () => get().play(),
              pause: () => get().pause(),
              next: () => get().next(),
              previous: () => get().previous(),
              seek: (position) => get().seek(position)
            });

            // Store cleanup function
            set({ _cleanupMusicControls: cleanup });
          } catch (musicControlError) {
            console.warn('Music control setup failed:', musicControlError);
            set({ _cleanupMusicControls: () => {} });
          }
        }, 2000); // Delay music control setup to prevent startup crash

        return () => {}; // Return empty cleanup for now
      } catch (error) {
        console.error("Error initializing audio:", error);
        return () => {}; // Return empty cleanup on error
      }
    },

    // Check if audio is initialized
    isInitialized: () => {
      return true; // For now, assume it's initialized if no error was thrown
    },

    setAndPlayPlaylist: async (tracks, startIndex = 0, showMiniPlayer = true) => {
      // Prevent multiple simultaneous plays
      const { isTransitioning, isLoading } = get();
      if (isTransitioning || isLoading) {
        console.log("Audio transition already in progress, ignoring request");
        return;
      }

      // Validate input
      if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        console.error("Invalid tracks provided to setAndPlayPlaylist:", tracks);
        return;
      }

      // Ensure startIndex is within bounds
      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

      set({ isTransitioning: true });

      try {
        const { sound } = get();
        if (sound) {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch (error) {
            console.error("Error stopping/unloading previous sound:", error);
          }
        }
        const trackToPlay = tracks[validStartIndex];

        // Validate track has required properties
        if (!trackToPlay || !trackToPlay.uri) {
          console.error("Invalid track at index", validStartIndex, ":", trackToPlay);
          set({ isTransitioning: false });
          return;
        }

        // 🎨 Enrich track with metadata if not already present
        const enrichedTrack = await get()._enrichTrackMetadata(trackToPlay);

        set({
          playQueue: tracks,
          originalQueue: tracks,
          currentIndex: validStartIndex,
          currentTrack: enrichedTrack,
          sound: null,
          isMiniPlayerVisible: showMiniPlayer,
        });

        console.log('🎵 Loading and playing track:', enrichedTrack.title);
        await get()._loadAndPlayTrack(enrichedTrack, true); // Skip transition check

        // Wait a bit to ensure audio has started before clearing transition state
        setTimeout(() => {
          set({ isTransitioning: false });
        }, 500);

        // Ensure playback starts - fallback mechanism
        setTimeout(async () => {
          const { sound, isPlaying } = get();
          if (sound && !isPlaying) {
            console.log('🎵 Fallback: Starting playback manually');
            try {
              await sound.playAsync();
              set({ isPlaying: true });
            } catch (error) {
              console.error('🎵 Fallback playback failed:', error);
            }
          }
        }, 1000);
      } catch (error) {
        console.error('Error in setAndPlayPlaylist:', error);
        set({ isTransitioning: false });
      }
    },

    // Set play queue without starting
    setPlayQueue: async (tracks, startIndex = 0) => {
      // Validate input
      if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        console.error("Invalid tracks provided to setPlayQueue:", tracks);
        return;
      }

      // Ensure startIndex is within bounds
      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

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
        currentIndex: validStartIndex,
        currentTrack: tracks[validStartIndex] || null,
        isPlaying: false,
        sound: null,
        isMiniPlayerVisible: true,
      });
      // Also fetch lyrics for the new track
      get().fetchLyrics(tracks[validStartIndex]);
      get().clearSleepTimer();
    },

    _loadAndPlayTrack: async (track, skipTransitionCheck = false) => {
      const { isLoading, isTransitioning } = get();

      // Only check isTransitioning if not called from setAndPlayPlaylist
      if (isLoading || (!skipTransitionCheck && isTransitioning)) {
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
            await FileSystem.makeDirectoryAsync(audiosDir, { intermediates: true }).catch(() => { });
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

        // Set up status callback using the getStatusUpdateHandler method
        const statusUpdateHandler = get().getStatusUpdateHandler();
        newSound.setOnPlaybackStatusUpdate(statusUpdateHandler);

        // Ensure playback starts
        try {
          await newSound.playAsync();
          console.log('🎵 Audio playback started for:', track.title);
        } catch (playError) {
          console.error('Error starting playback:', playError);
        }

        // Update state with the new track and sound
        set({
          sound: newSound,
          isPlaying: true,
          isLoading: false,
          currentTrack: track,
        });

        // Update notification for the new track
        updateNotification(track, true, 0, 0);

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
      const { sound, currentTrack, isPlaying, isLoading, isTransitioning } = get();
      if (isPlaying || isLoading || isTransitioning) return;

      if (sound) {
        set({ isPlaying: true });
        await sound.playAsync();
        // Update notification state to playing
        if (currentTrack) {
          const { position, duration } = get();
          updateNotification(currentTrack, true, position, duration);
        }
      } else if (currentTrack) {
        await get()._loadAndPlayTrack(currentTrack);
      }
    },

    // Pause current track
    pause: async () => {
      const { sound, isLoading, isTransitioning } = get();
      if (isLoading || isTransitioning) return;
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          try {
            set({ isLoading: true, isPlaying: false }); // Immediately update UI to show paused state
            await sound.pauseAsync();
            set({ isLoading: false });
            // Update notification state to paused
            if (currentTrack) {
              const { position, duration } = get();
              updateNotification(currentTrack, false, position, duration);
            }
          } catch (error) {
            set({ isLoading: false, isPlaying: true }); // Revert playing state on error
          }
        }
      }
      get().clearSleepTimer();
    },

    // Stop current track
    stop: async () => {
      const { sound } = get();
      set({
        sound: null,
        currentTrack: null,
        isPlaying: false,
        position: 0,
        duration: 0,
      });
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
      const { playQueue, currentIndex, isShuffleOn, isTransitioning, isLoading } = get();
      if (playQueue.length === 0 || isTransitioning || isLoading) return;

      set({ isTransitioning: true });

      try {
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

        // 🎨 Enrich track with metadata before playing
        const enrichedTrack = await get()._enrichTrackMetadata(nextTrack);

        set({ currentIndex: nextIndex, currentTrack: enrichedTrack });
        await get()._loadAndPlayTrack(enrichedTrack, true); // Skip transition check
      } finally {
        set({ isTransitioning: false });
      }
    },

    // Previous track
    previous: async () => {
      const { playQueue, currentIndex, position, isPlaying, isTransitioning, isLoading } = get();
      if (playQueue.length === 0 || isTransitioning || isLoading) return;

      // If track has been playing for > 3s, just restart it.
      if (position > 3000) {
        await get().seek(0);
        if (!isPlaying) await get().play();
        return;
      }

      set({ isTransitioning: true });

      try {
        const prevIndex =
          currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
        const prevTrack = playQueue[prevIndex];

        // 🎨 Enrich track with metadata before playing
        const enrichedTrack = await get()._enrichTrackMetadata(prevTrack);

        set({ currentIndex: prevIndex, currentTrack: enrichedTrack });
        await get()._loadAndPlayTrack(enrichedTrack, true); // Skip transition check
      } finally {
        set({ isTransitioning: false });
      }
    },

    // Seek to position
    seek: async (position) => {
      const { sound } = get();
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
            const lrcLyrics = get().convertToLrcFormat(data.lyrics, track.title);
            set({ lyrics: lrcLyrics, lyricsLoading: false });
            return;
          }
        }

        // If no lyrics found, create a placeholder
        const placeholderLyrics = `[00:01.00] ${track.title}
[00:05.00] By ${track.artist}
[00:10.00] No lyrics available for this track
[00:15.00] Enjoy the music!`;

        set({ lyrics: placeholderLyrics, lyricsLoading: false });
      } catch (error) {
        console.error('Error fetching lyrics:', error);
        set({ lyrics: null, lyricsLoading: false, lyricsError: 'Failed to load lyrics' });
      }
    },

    // Helper function to convert plain text to .lrc format
    convertToLrcFormat: (plainText, title) => {
      const lines = plainText.split('\n').filter(line => line.trim());
      let lrcContent = `[00:01.00] ${title}\n`;

      lines.forEach((line, index) => {
        const timeInSeconds = (index + 2) * 5; // 5 seconds per line
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        const timeStamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.00]`;
        lrcContent += `${timeStamp} ${line}\n`;
      });

      return lrcContent;
    },

    toggleLyrics: () => {
      set((state) => ({ showLyrics: !state.showLyrics }));
    },

    // Cleanup
    cleanup: async () => {
      const { sound, _cleanupMusicControls } = get();

      // Clean up the sound
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error("Error cleaning up audio:", error);
        }
      }

      // Clean up music controls
      if (_cleanupMusicControls) {
        _cleanupMusicControls();
      }

      // Clear notification
      try {
        await Notifications.dismissAllNotificationsAsync();
        console.log('🎵 Notifications cleared');
      } catch (error) {
        console.warn('Error clearing notifications:', error);
      }

      // Reset state
      set({
        sound: null,
        currentTrack: null,
        isPlaying: false,
        position: 0,
        duration: 0,
      });
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

    showMiniPlayer: () => set({ isMiniPlayerVisible: true }),

    // 🎨 Enrich track with metadata including artwork
    _enrichTrackMetadata: async (track) => {
      // If track already has artwork and complete metadata, return as is
      if (track.artwork && track.title && track.artist) {
        return track;
      }

      try {
        // Import getAudioMetadata dynamically to avoid circular dependencies
        const { getAudioMetadata } = await import('@missingcore/audio-metadata');

        const data = await getAudioMetadata(track.uri, ["album", "artist", "name", "year", "artwork"]);
        const metadata = data.metadata || {};

        let artworkUri = null;
        if (metadata.artwork) {
          if (metadata.artwork.startsWith('data:image')) {
            artworkUri = metadata.artwork;
          } else if (/^[A-Za-z0-9+/=]+$/.test(metadata.artwork)) {
            artworkUri = `data:image/png;base64,${metadata.artwork}`;
          } else {
            artworkUri = metadata.artwork;
          }
        }

        // Return enriched track with metadata
        const enrichedTrack = {
          ...track,
          title: metadata.name || track.title || track.filename?.replace(/\.[^/.]+$/, "") || 'Unknown Track',
          artist: metadata.artist || track.artist || 'Unknown Artist',
          album: metadata.album || track.album || 'Unknown Album',
          year: metadata.year || track.year || null,
          artwork: artworkUri || track.artwork || null,
        };

        console.log('🎨 Enriched track:', enrichedTrack.title, 'with artwork:', !!enrichedTrack.artwork);
        return enrichedTrack;
      } catch (error) {
        console.log('Failed to enrich track metadata for:', track.filename || track.title, error);
        // Return original track if metadata fetching fails
        return track;
      }
    },
    // Playback status update handler
    _onPlaybackStatusUpdate: function (status) {
      const { currentTrack } = useAudioControl.getState();

      if (!status.isLoaded) {
        if (status.error) {
          console.error(`Playback Error: ${status.error}`);
        }
        return;
      }


      const currentState = get();

      // Only update isPlaying if we're not in a loading/transitioning state
      // This prevents the status callback from overriding our manual play state
      const shouldUpdatePlayingState = !currentState.isLoading && !currentState.isTransitioning;

      set({
        position: status.positionMillis || 0,
        duration: status.durationMillis || 0,
        ...(shouldUpdatePlayingState && { isPlaying: status.isPlaying }),
      });

      // Update notification with current position
      if (currentTrack) {
        updateNotification(
          currentTrack,
          status.isPlaying,
          status.positionMillis || 0,
          status.durationMillis || 0
        );
      }

      // Handle end of track
      if (status.didJustFinish) {
        const { autoplay } = usePlaybackStore.getState();
        if (autoplay) {
          useAudioControl.getState().next();
        } else {
          useAudioControl.setState({ isPlaying: false });
          // Clear notification when playback stops
          // Note: MusicControl is no longer used, but keeping this for reference
          // You might want to clear notifications using expo-notifications if needed
        }
      }
    },

    // Add a method to get the status update handler
    getStatusUpdateHandler: function () {
      return (status) => {
        const state = useAudioControl.getState();
        if (state._onPlaybackStatusUpdate) {
          state._onPlaybackStatusUpdate(status);
        }

        // Update notification when track changes or playback state changes
        if (status.isLoaded && (status.didJustFinish || status.isPlaying !== state.isPlaying)) {
          updateNotification(
            state.currentTrack,
            status.isPlaying,
            status.positionMillis || 0,
            status.durationMillis || 0
          );
        }
      };
    },

    // Initialize the audio and notifications
    initializeAudio: async function () {
      try {
        // Request notification permissions
        await Notifications.requestPermissionsAsync();

        // Set up audio mode
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        console.log('Audio initialized successfully');
      } catch (error) {
        console.warn('Error initializing audio:', error);
      }
    }
  })));

export default useAudioControl;