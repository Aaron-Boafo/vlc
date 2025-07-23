import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import * as MediaLibrary from "expo-media-library";
import {getAudioMetadata} from "@missingcore/audio-metadata";
import * as FileSystem from 'expo-file-system';
import MediaCacheManager from '../utils/MediaCacheManager';

const AUDIO_LIST_PATH = FileSystem.documentDirectory + 'audio_list.json';

const useAudioStore = create(
  persist(
    (set, get) => ({
      // Tab state
      activeTab: "all",
      toggleTabs: (tabs) =>
        set(() => {
          return {activeTab: tabs};
        }),

      // Audio files state
      audioFiles: [],
      isLoading: false,
      sortOrder: { key: 'title', direction: 'asc' }, // default sort
      setAudioFiles: (files) => set({ audioFiles: files }),
      
      // Sorting function
      sortAudioFiles: (key, direction) => {
        const sortedFiles = [...get().audioFiles].sort((a, b) => {
          const valA = a[key] || '';
          const valB = b[key] || '';
          
          if (typeof valA === 'string') {
            return direction === 'asc' 
              ? valA.localeCompare(valB) 
              : valB.localeCompare(valA);
          }
          // For numeric values like duration or date
          return direction === 'asc' ? valA - valB : valB - valA;
        });
        set({ audioFiles: sortedFiles, sortOrder: { key, direction } });
      },
      
      // Current track and playlist
      currentTrack: null,
      playlist: [],
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setPlaylist: (tracks) => set({ playlist: tracks }),

      // Load audio files with intelligent caching
      loadAudioFiles: async () => {
        try {
          set({ isLoading: true, audioFiles: [] });
          
          // Use the new MediaCacheManager for intelligent loading
          const audioFiles = await MediaCacheManager.loadMediaFiles('audio', (progress) => {
            console.log(`📊 Audio loading progress: ${progress.phase} - ${progress.message || ''}`);
            
            // Update UI with progress - show files as they load
            if (progress.phase === 'cache_loaded' && progress.files && progress.files.length > 0) {
              // Show cached files immediately while checking for updates
              const sortedFiles = [...progress.files].sort((a, b) => a.title.localeCompare(b.title));
              set({ audioFiles: sortedFiles, isLoading: false }); // Set loading to false to show files
              
              // Start background metadata loading immediately
              setTimeout(() => {
                loadMetadataInBackground(sortedFiles);
              }, 100);
            } else if (progress.phase === 'full_scan' && progress.files && progress.files.length > 0) {
              // Show files as they're being scanned for progressive loading
              const sortedFiles = [...progress.files].sort((a, b) => a.title.localeCompare(b.title));
              set({ audioFiles: sortedFiles }); // Keep loading true during scan
            } else if (progress.phase === 'complete' && progress.files) {
              // Final update when loading is complete
              const sortedFiles = [...progress.files].sort((a, b) => a.title.localeCompare(b.title));
              set({ audioFiles: sortedFiles, isLoading: false });
              
              // Start background metadata loading for final files
              setTimeout(() => {
                loadMetadataInBackground(sortedFiles);
              }, 100);
            } else if (progress.phase === 'complete') {
              // Just mark as complete if no files in progress
              set({ isLoading: false });
            }
          });

          // Sort by title (default) - final sort
          const sortedFiles = [...audioFiles].sort((a, b) => a.title.localeCompare(b.title));
          set({ audioFiles: sortedFiles, isLoading: false });

          // Start background metadata loading if not already started
          setTimeout(() => {
            loadMetadataInBackground(sortedFiles);
          }, 100);

          console.log(`✅ Loaded ${audioFiles.length} audio files using intelligent caching`);
          
        } catch (error) {
          console.error("Error loading audio files:", error);
          set({ isLoading: false });
          
          // Fallback to old method if new cache manager fails
          try {
            await get().refreshAudioFiles();
          } catch (fallbackError) {
            console.error("Fallback loading also failed:", fallbackError);
          }
        }
      },

      // Force rescan and update cache
      refreshAudioFiles: async () => {
        try {
          set({ isLoading: true, audioFiles: [] });
          
          // Use MediaCacheManager for force refresh
          const audioFiles = await MediaCacheManager.forceRefresh('audio', (progress) => {
            console.log(`📊 Audio refresh progress: ${progress.phase} - ${progress.message || ''}`);
            
            // Update UI with current progress
            if (progress.filesFound > 0) {
              // You can show intermediate results here if desired
            }
          });

          // Sort by title (default)
          const sortedFiles = [...audioFiles].sort((a, b) => a.title.localeCompare(b.title));
          set({ audioFiles: sortedFiles, isLoading: false });

          // Start optimized metadata loading
          setTimeout(() => {
            loadMetadataOptimized(sortedFiles);
          }, 100);

          console.log(`✅ Force refreshed ${audioFiles.length} audio files`);
          
        } catch (error) {
          console.error("Error refreshing audio files:", error);
          set({ isLoading: false });
          
          // Fallback to original method
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
              console.log("Media library permission not granted");
              return;
            }
            
            let allFiles = [];
            let hasNextPage = true;
            const batchSize = 100;
            
            while (hasNextPage) {
              const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: batchSize,
              });
              
              const basicFiles = media.assets.map((asset) => ({
                id: asset.id,
                uri: asset.uri,
                filename: asset.filename,
                duration: asset.duration,
                album: "Unknown Album",
                artist: "Unknown Artist",
                title: asset.filename.replace(/\.[^/.]+$/, ""),
                year: null,
                artwork: null,
                metadataLoaded: false,
              }));
              
              allFiles = [...allFiles, ...basicFiles].filter(
                (file, index, self) => index === self.findIndex(f => f.id === file.id)
              );
              
              const sortedFiles = [...allFiles].sort((a, b) => a.title.localeCompare(b.title));
              set({ audioFiles: sortedFiles });
              
              hasNextPage = media.hasNextPage;
            }
            
            // Save to old cache as fallback
            await FileSystem.writeAsStringAsync(AUDIO_LIST_PATH, JSON.stringify(allFiles));
            
          } catch (fallbackError) {
            console.error("Fallback refresh also failed:", fallbackError);
          }
        }
      },

      // Load metadata for specific file when needed
      loadMetadataForFile: async (fileId) => {
        const state = get();
        const fileIndex = state.audioFiles.findIndex(f => f.id === fileId);
        
        if (fileIndex === -1 || state.audioFiles[fileIndex].metadataLoaded) {
          return;
        }

        const file = state.audioFiles[fileIndex];
        
        try {
          const data = await getAudioMetadata(file.uri, [
            "album",
            "artist", 
            "name",
            "year",
            "artwork",
          ]);
          
          const metadata = data.metadata || {};
          
          // Handle base64 artwork
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

          // In loadMetadataForFile and loadMetadataInBackground, after checking for embedded artwork, if artworkUri is still null, fetch from iTunes API
          // Add a helper function to fetch artwork from iTunes
          async function fetchArtworkFromiTunes(title, artist) {
            try {
              const query = encodeURIComponent(`${title} ${artist}`);
              const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
              const response = await fetch(url);
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                return data.results[0].artworkUrl100?.replace('100x100', '300x300') || null;
              }
            } catch (e) {
              // Ignore errors, fallback to default
            }
            return null;
          }

          if (!artworkUri) {
            artworkUri = await fetchArtworkFromiTunes(metadata.name || file.title, metadata.artist || file.artist);
          }

          // Update specific file with metadata
          const updatedFiles = [...state.audioFiles];
          updatedFiles[fileIndex] = {
            ...file,
            album: metadata.album || "Unknown Album",
            artist: metadata.artist || "Unknown Artist",
            title: metadata.name || file.title,
            year: metadata.year || null,
            artwork: artworkUri,
            metadataLoaded: true,
          };

          set({ audioFiles: updatedFiles });
        } catch (error) {
          console.log("Metadata error for", file.uri, error);
        }
      },
    }),

    {
      name: "Audio-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        audioFiles: state.audioFiles,
      }),
    }
  )
);

// Helper function to load metadata in background
const loadMetadataInBackground = async (files) => {
  const batchSize = 10; // Process 10 files at a time
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (file) => {
        try {
          const data = await getAudioMetadata(file.uri, [
            "album",
            "artist",
            "name", 
            "year",
            "artwork",
          ]);
          
          const metadata = data.metadata || {};
          
          // Handle base64 artwork
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

          // In loadMetadataForFile, after checking for embedded artwork, if artworkUri is still null, fetch from iTunes API
          async function fetchArtworkFromiTunes(title, artist) {
            try {
              const query = encodeURIComponent(`${title} ${artist}`);
              const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
              const response = await fetch(url);
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                return data.results[0].artworkUrl100?.replace('100x100', '300x300') || null;
              }
            } catch (e) {
              // Ignore errors, fallback to default
            }
            return null;
          }

          if (!artworkUri) {
            artworkUri = await fetchArtworkFromiTunes(metadata.name || file.title, metadata.artist || file.artist);
          }

          // Update the store
          const state = useAudioStore.getState();
          const fileIndex = state.audioFiles.findIndex(f => f.id === file.id);
          
          if (fileIndex !== -1) {
            const updatedFiles = [...state.audioFiles];
            updatedFiles[fileIndex] = {
              ...file,
              album: metadata.album || "Unknown Album",
              artist: metadata.artist || "Unknown Artist",
              title: metadata.name || file.title,
              year: metadata.year || null,
              artwork: artworkUri,
              metadataLoaded: true,
            };
            
            useAudioStore.setState({ audioFiles: updatedFiles });
          }
        } catch (error) {
          console.log("Background metadata error for", file.uri, error);
        }
      })
    );
    
    // Small delay between batches to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

// Add the optimized metadata loader
const loadMetadataOptimized = async (files) => {
  const concurrencyLimit = 5;
  const initialCount = 20;
  // Fetch metadata for the first 20 items immediately
  const firstBatch = files.slice(0, initialCount);
  await Promise.all(firstBatch.map(file => getAudioMetadataForStore(file)));
  // Fetch the rest in the background with concurrency limit
  const rest = files.slice(initialCount);
  let index = 0;
  async function next() {
    if (index >= rest.length) return;
    const batch = rest.slice(index, index + concurrencyLimit);
    await Promise.all(batch.map(file => getAudioMetadataForStore(file)));
    index += concurrencyLimit;
    setTimeout(next, 0); // Yield to UI thread
  }
  next();
};

async function getAudioMetadataForStore(file) {
  try {
    const data = await getAudioMetadata(file.uri, ["album", "artist", "name", "year", "artwork"]);
    let artworkUri = null;
    const metadata = data.metadata || {};
    if (metadata.artwork) {
      if (metadata.artwork.startsWith('data:image')) {
        artworkUri = metadata.artwork;
      } else if (/^[A-Za-z0-9+/=]+$/.test(metadata.artwork)) {
        artworkUri = `data:image/png;base64,${metadata.artwork}`;
      } else {
        artworkUri = metadata.artwork;
      }
    }
    // Update Zustand store with metadata
    useAudioStore.setState(state => {
      const idx = state.audioFiles.findIndex(f => f.id === file.id);
      if (idx === -1) return {};
      const updatedFiles = [...state.audioFiles];
      updatedFiles[idx] = {
        ...updatedFiles[idx],
        album: metadata.album || "Unknown Album",
        artist: metadata.artist || "Unknown Artist",
        title: metadata.name || file.title,
        year: metadata.year || null,
        artwork: artworkUri,
        metadataLoaded: true,
      };
      return { audioFiles: updatedFiles };
    });
  } catch (e) {
    // Ignore errors for individual files
  }
}

export default useAudioStore;
