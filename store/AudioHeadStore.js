import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import * as MediaLibrary from "expo-media-library";
import {getAudioMetadata} from "@missingcore/audio-metadata";

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
        console.log(`[Sort] Sorting by: ${key}, Direction: ${direction}`);
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
        console.log('[Sort] First item after sort:', sortedFiles[0]?.title);
        set({ audioFiles: sortedFiles, sortOrder: { key, direction } });
      },
      
      // Current track and playlist
      currentTrack: null,
      playlist: [],
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setPlaylist: (tracks) => set({ playlist: tracks }),

      // Load audio files from device with optimization
      loadAudioFiles: async () => {
        try {
          set({ isLoading: true });
      
          // Set a timeout for the loading process
          const loadingTimeout = setTimeout(() => {
            const state = get();
            if (state.isLoading) {
              console.log("Audio loading timed out.");
              set({ isLoading: false }); 
            }
          }, 10000); // 10-second timeout
      
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== "granted") {
            console.log("Media library permission not granted");
            set({ isLoading: false });
            clearTimeout(loadingTimeout);
            return;
          }
      
          const media = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 10000,
          });
      
          clearTimeout(loadingTimeout);
      
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
      
          set({ audioFiles: basicFiles, isLoading: false });
      
          setTimeout(() => {
            loadMetadataInBackground(basicFiles);
          }, 100);
      
        } catch (error) {
          console.error("Error loading audio files:", error);
          set({ isLoading: false });
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

export default useAudioStore;
