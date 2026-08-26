import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { AppState } from 'react-native';

const AUDIO_FILE_CACHE = `${FileSystem.documentDirectory}audioFilesCache.json`;

const useSimpleAudioStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Core state
        audioFiles: [],
        isLoading: false,
        isInitialLoadComplete: false,
        isInitialized: false,
        permissionGranted: null,
        lastLoadTime: null,
        
        // UI state
        activeTab: 'all',
        sortOrder: { key: 'title', direction: 'asc' },

        // Initialize the store
        initialize: async () => {
          const state = get();
          
          // Prevent multiple initializations
          if (state.isInitialized) {
            console.log('⚡ Store already initialized, skipping...');
            return;
          }
          
          console.log('🚀 Initializing simple audio store...');
          
          // Step 1: Load from cache first for instant UI
          const cached = await get().loadAudioFilesFromCache();
          if (cached && cached.length > 0) {
            console.log(`📚 Loaded ${cached.length} files from cache`);
            set({ 
              audioFiles: cached, 
              isInitialLoadComplete: true,
              lastLoadTime: Date.now()
            });
          }

          // Step 2: Check permissions
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            set({ permissionGranted: false });
            return;
          }

          set({ permissionGranted: true, isInitialized: true });

          // Step 3: Load fresh files in background only if cache is old or empty
          if (!cached || cached.length === 0) {
            console.log('📥 No cache found, loading fresh files...');
            await get().loadAllAudioFiles();
          } else {
            console.log('⚡ Using cached files, skipping fresh load');
            // Only do a quick background check for new files
            setTimeout(() => {
              get().refreshInBackground();
            }, 2000); // Wait 2 seconds before background refresh
          }
        },

        // Main loading function - simplified and efficient
        loadAllAudioFiles: async (forceRefresh = false) => {
          const state = get();
          
          // Skip if already loading or recently loaded (unless forced)
          if (state.isLoading) return;
          if (!forceRefresh && state.lastLoadTime && (Date.now() - state.lastLoadTime) < 300000) { // 5 minutes
            console.log('⚡ Skipping reload - loaded recently (within 5 minutes)');
            return state.audioFiles;
          }

          set({ isLoading: true });
          console.log('🔄 Loading audio files...');

          let after = null;
          let hasNextPage = true;
          let allAssets = [];
          let batchCount = 0;

          try {
            while (hasNextPage && batchCount < 1000) { // Safety limit
              const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 15, // Slightly larger batches for efficiency
                after,
                sortBy: [MediaLibrary.SortBy.modificationTime],
              });

              if (!media.assets || media.assets.length === 0) break;

              // Process batch with smart filtering
              const batchAssets = await Promise.all(
                media.assets.map(async (asset) => {
                  // Filter out unwanted files
                  if (get().shouldSkipFile(asset.uri)) {
                    return null;
                  }

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
                    return null;
                  }
                })
              );

              const filteredAssets = batchAssets.filter((a) => a !== null);
              allAssets = [...allAssets, ...filteredAssets];

              // Progressive UI updates - show files as they load
              if (filteredAssets.length > 0) {
                const currentFiles = get().audioFiles;
                const updatedFiles = [...currentFiles, ...filteredAssets];
                set({ audioFiles: updatedFiles });
              }

              hasNextPage = media.hasNextPage;
              after = media.endCursor;
              batchCount++;

              // Small yield to keep UI responsive
              if (batchCount % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }

            // Final update and cache save
            const sortedFiles = get().sortFiles(allAssets);
            set({ 
              audioFiles: sortedFiles,
              isLoading: false,
              isInitialLoadComplete: true,
              lastLoadTime: Date.now()
            });

            await get().saveAudioFilesToCache(sortedFiles);
            console.log(`✅ Loaded ${sortedFiles.length} audio files`);

          } catch (error) {
            console.error('❌ Audio loading failed:', error);
            set({ isLoading: false });
          }
        },

        // Smart file filtering
        shouldSkipFile: (uri) => {
          const skipPatterns = [
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
          
          return skipPatterns.some(pattern => uri.includes(pattern));
        },

        // Background refresh when app becomes active
        refreshInBackground: async () => {
          const state = get();
          
          // Throttle background refresh - only once every 2 minutes
          if (state.lastLoadTime && (Date.now() - state.lastLoadTime) < 120000) {
            console.log('⚡ Skipping background refresh - too recent');
            return;
          }
          
          try {
            console.log('🔄 Starting background refresh...');
            const freshFiles = await get().scanForChanges();
            if (freshFiles.length > 0) {
              const currentFiles = get().audioFiles;
              const updatedList = get().mergeFiles(currentFiles, freshFiles);
              set({ audioFiles: updatedList, lastLoadTime: Date.now() });
              await get().saveAudioFilesToCache(updatedList);
              console.log(`🔄 Updated with ${freshFiles.length} new/modified files`);
            } else {
              console.log('🔄 No new files found in background refresh');
            }
          } catch (error) {
            console.log('Background refresh error:', error);
          }
        },

        // Scan for new or modified files only
        scanForChanges: async () => {
          const currentFiles = get().audioFiles;
          const currentUris = new Set(currentFiles.map(f => f.uri));
          const newOrUpdatedFiles = [];

          let after = null;
          let hasNextPage = true;

          while (hasNextPage) {
            const media = await MediaLibrary.getAssetsAsync({
              mediaType: MediaLibrary.MediaType.audio,
              first: 20,
              after,
            });

            for (const asset of media.assets) {
              if (get().shouldSkipFile(asset.uri)) continue;

              const existing = currentFiles.find(f => f.uri === asset.uri);
              const isNew = !currentUris.has(asset.uri);
              const isModified = existing && asset.modificationTime !== existing.modificationTime;

              if (isNew || isModified) {
                try {
                  const data = await getAudioMetadata(asset.uri, [
                    'album', 'artist', 'name', 'year', 'artwork'
                  ]);
                  const metadata = data.metadata || {};

                  newOrUpdatedFiles.push({
                    id: asset.id,
                    uri: asset.uri,
                    filename: asset.filename,
                    duration: asset.duration || 0,
                    album: metadata.album || 'Unknown Album',
                    artist: metadata.artist || 'Unknown Artist',
                    title: metadata.name || asset.filename.replace(/\.[^/.]+$/, ''),
                    year: metadata.year || null,
                    artwork: metadata.artwork || null,
                    creationTime: asset.creationTime,
                    modificationTime: asset.modificationTime,
                    metadataLoaded: true,
                  });
                } catch (error) {
                  console.log(`Metadata error for ${asset.filename}:`, error.message);
                }
              }
            }

            hasNextPage = media.hasNextPage;
            after = media.endCursor;
          }

          return newOrUpdatedFiles;
        },

        // Merge new files with existing ones
        mergeFiles: (currentFiles, newFiles) => {
          const merged = [...currentFiles];
          
          newFiles.forEach(newFile => {
            const existingIndex = merged.findIndex(f => f.uri === newFile.uri);
            if (existingIndex !== -1) {
              merged[existingIndex] = newFile; // Update existing
            } else {
              merged.push(newFile); // Add new
            }
          });

          return get().sortFiles(merged);
        },

        // Sort files
        sortFiles: (files) => {
          const { sortOrder } = get();
          return [...files].sort((a, b) => {
            const valA = a[sortOrder.key] || '';
            const valB = b[sortOrder.key] || '';
            
            if (typeof valA === 'string') {
              return sortOrder.direction === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
            }
            return sortOrder.direction === 'asc' ? valA - valB : valB - valA;
          });
        },

        // Sorting function
        sortAudioFiles: (key, direction) => {
          const sortedFiles = get().sortFiles(get().audioFiles);
          set({ audioFiles: sortedFiles, sortOrder: { key, direction } });
        },

        // Cache management
        saveAudioFilesToCache: async (data) => {
          try {
            await FileSystem.writeAsStringAsync(
              AUDIO_FILE_CACHE,
              JSON.stringify(data)
            );
          } catch (error) {
            console.log('Cache save error:', error);
          }
        },

        loadAudioFilesFromCache: async () => {
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

        // Clear cache
        clearCache: async () => {
          try {
            await FileSystem.deleteAsync(AUDIO_FILE_CACHE, { idempotent: true });
            set({ 
              audioFiles: [], 
              lastLoadTime: null,
              isInitialized: false,
              isInitialLoadComplete: false
            });
          } catch (error) {
            console.log('Cache clear error:', error);
          }
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
      }),
      {
        name: 'simple-audio-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          activeTab: state.activeTab,
          sortOrder: state.sortOrder,
          lastLoadTime: state.lastLoadTime,
          // Don't persist audioFiles - let them load fresh for better performance
        }),
      }
    )
  )
);

// Setup app state listener for background refresh
let appStateSubscription = null;

export const setupBackgroundRefresh = () => {
  if (appStateSubscription) return;
  
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      const store = useSimpleAudioStore.getState();
      if (store.permissionGranted && store.audioFiles.length > 0) {
        store.refreshInBackground();
      }
    }
  });
};

export const cleanupBackgroundRefresh = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

export default useSimpleAudioStore;