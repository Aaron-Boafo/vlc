import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { AppState } from 'react-native';

/**
 * Global Audio Store - Inspired by your friend's approach
 * Loads audio files once and keeps them in global state
 * No reloading on navigation - only on explicit user action
 */

const AUDIO_FILE_CACHE = `${FileSystem.documentDirectory}globalAudioCache.json`;

const useGlobalAudioStore = create(
  subscribeWithSelector((set, get) => ({
    // Core state - loaded once and persisted
    audioFiles: [],
    isLoading: false,
    isInitialized: false,
    permissionGranted: null,
    lastLoadTime: null,
    
    // UI state
    activeTab: 'all',
    sortOrder: { key: 'title', direction: 'asc' },

    // Initialize once - like your friend's approach
    initialize: async () => {
      const state = get();
      
      // Only initialize once
      if (state.isInitialized) {
        console.log('🎵 Audio store already initialized');
        return state.audioFiles;
      }

      console.log('🚀 Initializing global audio store...');

      try {
        // Step 1: Try to load from cache first (instant)
        const cached = await get().loadFromCache();
        if (cached && cached.length > 0) {
          console.log(`📚 Loaded ${cached.length} files from cache`);
          set({ 
            audioFiles: cached,
            isInitialized: true,
            lastLoadTime: Date.now()
          });
          
          // Return cached files immediately, refresh in background
          setTimeout(() => get().refreshInBackground(), 2000);
          return cached;
        }

        // Step 2: No cache, do full load
        return await get().loadAllAudioFiles();

      } catch (error) {
        console.error('❌ Audio store initialization failed:', error);
        set({ isInitialized: true }); // Mark as initialized to prevent retries
        return [];
      }
    },

    // Main loading function - like your friend's getFilteredAudios
    loadAllAudioFiles: async (forceRefresh = false) => {
      const state = get();
      
      if (state.isLoading) {
        console.log('⚡ Already loading, skipping...');
        return state.audioFiles;
      }

      set({ isLoading: true });
      console.log('🔄 Loading all audio files...');

      try {
        // Check permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('❌ Permission not granted!');
          set({ permissionGranted: false, isLoading: false });
          return [];
        }

        set({ permissionGranted: true });

        // Get all audio files (like your friend's approach)
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 1000, // Get a large batch
        });

        console.log(`📱 Found ${media.assets.length} audio files`);

        // Filter out unwanted files (like your friend's filtering)
        const excludedFolders = [
          '/storage/emulated/0/Android/data/com.certified.app/',
          '/storage/emulated/0/Music/Certified/',
          '/sdcard/Music/Certified/',
          '/WhatsApp/Media/WhatsApp Audio/Sent',
          '/WhatsApp/Media/WhatsApp Audio/Private',
          '/WhatsApp/Media/WhatsApp Voice Notes',
          '/WhatsApp/Media/.Statuses',
          '/WhatsApp/Private',
          '/Telegram',
          '/Instagram',
          '/Snapchat',
          '/.nomedia',
          '/Android/data',
          '/system/',
          '/cache/',
        ];

        const filtered = media.assets.filter(asset => {
          // Remove assets whose URI contains any of the excluded paths
          return !excludedFolders.some(folder => asset.uri.includes(folder));
        });

        console.log(`🔍 Filtered to ${filtered.length} audio files`);

        // Process files with metadata (in batches for performance)
        const processedFiles = await get().processFilesWithMetadata(filtered);

        // Sort by title (default)
        const sortedFiles = processedFiles.sort((a, b) => a.title.localeCompare(b.title));

        // Update state
        set({
          audioFiles: sortedFiles,
          isLoading: false,
          isInitialized: true,
          lastLoadTime: Date.now()
        });

        // Save to cache
        await get().saveToCache(sortedFiles);

        console.log(`✅ Loaded ${sortedFiles.length} audio files successfully`);
        return sortedFiles;

      } catch (error) {
        console.error('❌ Error loading audio files:', error);
        set({ isLoading: false });
        return [];
      }
    },

    // Process files with metadata (optimized)
    processFilesWithMetadata: async (assets) => {
      const batchSize = 10;
      const processedFiles = [];

      for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (asset) => {
          try {
            const data = await getAudioMetadata(asset.uri, [
              'album', 'artist', 'name', 'year', 'artwork'
            ]);
            const metadata = data.metadata || {};

            // Handle artwork properly
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

            return {
              id: asset.id,
              uri: asset.uri,
              filename: asset.filename,
              duration: asset.duration || 0,
              album: metadata.album || 'Unknown Album',
              artist: metadata.artist || 'Unknown Artist',
              title: metadata.name || asset.filename.replace(/\.[^/.]+$/, ''),
              year: metadata.year || null,
              artwork: artworkUri,
              creationTime: asset.creationTime,
              modificationTime: asset.modificationTime,
              metadataLoaded: true,
            };
          } catch (error) {
            console.log(`Metadata error for ${asset.filename}:`, error.message);
            return {
              id: asset.id,
              uri: asset.uri,
              filename: asset.filename,
              duration: asset.duration || 0,
              album: 'Unknown Album',
              artist: 'Unknown Artist',
              title: asset.filename.replace(/\.[^/.]+$/, ''),
              year: null,
              artwork: null,
              creationTime: asset.creationTime,
              modificationTime: asset.modificationTime,
              metadataLoaded: false,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        processedFiles.push(...batchResults);

        // Small delay to keep UI responsive
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      return processedFiles;
    },

    // Background refresh (minimal, only for new files)
    refreshInBackground: async () => {
      const state = get();
      
      // Only refresh if it's been a while
      if (state.lastLoadTime && (Date.now() - state.lastLoadTime) < 300000) { // 5 minutes
        console.log('⚡ Skipping background refresh - too recent');
        return;
      }

      try {
        console.log('🔄 Background refresh...');
        
        // Quick check for new files
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 50, // Just check recent files
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        const currentUris = new Set(state.audioFiles.map(f => f.uri));
        const newFiles = media.assets.filter(asset => !currentUris.has(asset.uri));

        if (newFiles.length > 0) {
          console.log(`🆕 Found ${newFiles.length} new files`);
          // Process and add new files
          const processedNew = await get().processFilesWithMetadata(newFiles);
          const updatedFiles = [...state.audioFiles, ...processedNew];
          const sortedFiles = updatedFiles.sort((a, b) => a.title.localeCompare(b.title));
          
          set({ audioFiles: sortedFiles, lastLoadTime: Date.now() });
          await get().saveToCache(sortedFiles);
        }
      } catch (error) {
        console.log('Background refresh error:', error);
      }
    },

    // Cache management
    saveToCache: async (files) => {
      try {
        await FileSystem.writeAsStringAsync(AUDIO_FILE_CACHE, JSON.stringify(files));
        console.log(`💾 Cached ${files.length} files`);
      } catch (error) {
        console.log('Cache save error:', error);
      }
    },

    loadFromCache: async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(AUDIO_FILE_CACHE);
        if (!fileInfo.exists) return null;
        
        const json = await FileSystem.readAsStringAsync(AUDIO_FILE_CACHE);
        if (!json || json.trim().length === 0) return null;
        
        return JSON.parse(json);
      } catch (error) {
        console.log('Cache load error:', error);
        return null;
      }
    },

    // Sorting
    sortAudioFiles: (key, direction) => {
      const sortedFiles = [...get().audioFiles].sort((a, b) => {
        const valA = a[key] || '';
        const valB = b[key] || '';
        
        if (typeof valA === 'string') {
          return direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        return direction === 'asc' ? valA - valB : valB - valA;
      });
      
      set({ audioFiles: sortedFiles, sortOrder: { key, direction } });
    },

    // Tab management
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Search functionality
    searchFiles: (query) => {
      if (!query.trim()) return get().audioFiles;
      
      const lowerQuery = query.toLowerCase();
      return get().audioFiles.filter(file => 
        file.title?.toLowerCase().includes(lowerQuery) ||
        file.artist?.toLowerCase().includes(lowerQuery) ||
        file.album?.toLowerCase().includes(lowerQuery)
      );
    },

    // Utility functions
    getFileById: (id) => get().audioFiles.find(f => f.id === id),
    getFilesByArtist: (artist) => get().audioFiles.filter(f => f.artist === artist),
    getFilesByAlbum: (album) => get().audioFiles.filter(f => f.album === album),

    // Force refresh (only when user explicitly requests)
    forceRefresh: async () => {
      console.log('🔄 Force refresh requested by user');
      set({ isInitialized: false, audioFiles: [] });
      return await get().loadAllAudioFiles(true);
    },

    // Clear cache
    clearCache: async () => {
      try {
        await FileSystem.deleteAsync(AUDIO_FILE_CACHE, { idempotent: true });
        set({ 
          audioFiles: [], 
          isInitialized: false,
          lastLoadTime: null 
        });
        console.log('🧹 Cache cleared');
      } catch (error) {
        console.log('Cache clear error:', error);
      }
    },

    // Set audio files directly (for unified system integration)
    setAudioFiles: (files) => {
      set({ 
        audioFiles: files,
        isInitialized: true,
        lastLoadTime: Date.now()
      });
      console.log(`🎵 Global store updated with ${files.length} files`);
    },
  }))
);

// Setup app state listener (like your friend's approach)
let appStateSubscription = null;

export const setupGlobalAudioStore = () => {
  if (appStateSubscription) return;
  
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      const store = useGlobalAudioStore.getState();
      if (store.isInitialized && store.audioFiles.length > 0) {
        // Only do a light background refresh
        setTimeout(() => store.refreshInBackground(), 3000);
      }
    }
  });
};

export const cleanupGlobalAudioStore = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

export default useGlobalAudioStore;