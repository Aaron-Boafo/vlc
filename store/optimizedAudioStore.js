import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import ProgressiveMediaLoader from '../utils/progressiveMediaLoader';

const useOptimizedAudioStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Core state
        audioFiles: [],
        isLoading: false,
        isInitialLoadComplete: false,
        lastLoadTime: null,
        activeTab: 'all',
        sortOrder: { key: 'title', direction: 'asc' },

        // Fast loading with progressive updates
        loadAudioFiles: async (forceRefresh = false) => {
          const state = get();
          
          // Skip if recently loaded and not forcing refresh
          if (!forceRefresh && state.audioFiles.length > 0 && state.lastLoadTime) {
            const timeSinceLoad = Date.now() - state.lastLoadTime;
            if (timeSinceLoad < 5 * 60 * 1000) { // 5 minutes
              console.log('⚡ Audio files already loaded, skipping');
              return state.audioFiles;
            }
          }

          set({ isLoading: true, isInitialLoadComplete: false });

          try {
            const files = await ProgressiveMediaLoader.loadMediaProgressively('audio', (progressFiles, isComplete) => {
              // Update UI immediately as files are loaded progressively
              set({ 
                audioFiles: progressFiles,
                isInitialLoadComplete: isComplete,
                isLoading: !isComplete,
              });
            });

            set({ 
              lastLoadTime: Date.now(),
              isLoading: false,
              isInitialLoadComplete: true,
            });

            return files;
          } catch (error) {
            console.error('❌ Fast audio loading failed:', error);
            set({ isLoading: false, isInitialLoadComplete: true });
            throw error;
          }
        },

        // Optimized sorting
        sortAudioFiles: (key, direction) => {
          const files = get().audioFiles;
          const sortedFiles = [...files].sort((a, b) => {
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
        toggleTabs: (tab) => set({ activeTab: tab }),

        // Utility functions
        getFileById: (id) => get().audioFiles.find(f => f.id === id),
        
        getFilesByArtist: (artist) => 
          get().audioFiles.filter(f => f.artist === artist),
        
        getFilesByAlbum: (album) => 
          get().audioFiles.filter(f => f.album === album),

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

        // Clear cache and force reload
        clearCache: () => {
          set({ 
            audioFiles: [], 
            isLoading: false, 
            isInitialLoadComplete: false,
            lastLoadTime: null 
          });
        },
      }),
      {
        name: 'optimized-audio-storage',
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

export default useOptimizedAudioStore;