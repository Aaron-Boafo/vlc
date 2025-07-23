import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import ProgressiveMediaLoader from '../utils/progressiveMediaLoader';
import MediaLibraryPersistence from '../utils/mediaLibraryPersistence';

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

        // Fast loading with progressive updates and persistent caching
        loadAudioFiles: async (forceRefresh = false) => {
          const state = get();
          
          try {
            set({ isLoading: true, isInitialLoadComplete: false });

            // First, try to load from cache
            let cachedFiles = null;
            if (!forceRefresh) {
              cachedFiles = await MediaLibraryPersistence.loadFromCache();
              if (cachedFiles && cachedFiles.length > 0) {
                set({ 
                  audioFiles: cachedFiles,
                  isInitialLoadComplete: true,
                  isLoading: false,
                  lastLoadTime: Date.now()
                });
              }
            }

            // Load current files from the device
            const currentFiles = await ProgressiveMediaLoader.loadMediaProgressively('audio', (progressFiles, isComplete) => {
              // Update UI immediately as files are loaded progressively
              set({ 
                audioFiles: progressFiles,
                isInitialLoadComplete: isComplete,
                isLoading: !isComplete,
              });
            });

            // Find new and changed files
            const newFiles = await MediaLibraryPersistence.findNewFiles(cachedFiles, currentFiles);
            const changedFiles = await MediaLibraryPersistence.findChangedFiles(cachedFiles, currentFiles);

            // Merge cached files with new and changed files
            const mergedFiles = await MediaLibraryPersistence.getMergedFiles(cachedFiles, newFiles, changedFiles);

            // Save the updated library to cache
            await MediaLibraryPersistence.saveToCache(mergedFiles);

            set({ 
              lastLoadTime: Date.now(),
              isLoading: false,
              isInitialLoadComplete: true,
              audioFiles: mergedFiles
            });

            return mergedFiles;
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