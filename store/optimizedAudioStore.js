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
        cachedFiles: null,
        isLoading: false,
        isInitialLoadComplete: false,
        lastLoadTime: null,
        activeTab: 'all',
        sortOrder: { key: 'title', direction: 'asc' },
        
        // Cache maintenance
        updateCache: (files) => {
          set({ 
            cachedFiles: files,
            lastLoadTime: Date.now()
          });
        },



        // Simplified loading like video system - proven to work on real devices
        loadAudioFiles: async (forceRefresh = false) => {
          const state = get();
          
          // Enhanced caching: Skip if files exist and not forcing refresh
          if (!forceRefresh && state.audioFiles.length > 0) {
            // Only reload if files are very old (30 minutes) or explicitly forced
            if (state.lastLoadTime) {
              const timeSinceLoad = Date.now() - state.lastLoadTime;
              if (timeSinceLoad < 30 * 60 * 1000) { // 30 minutes
                console.log('⚡ Audio files cached, skipping reload');
                return state.audioFiles;
              }
            } else {
              // If we have files but no timestamp, assume they're fresh
              console.log('⚡ Audio files exist, skipping reload');
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
            console.error('❌ Audio loading failed:', error);
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
          // Don't persist audioFiles - let them load fresh for better performance like video
        }),
      }
    )
  )
);

export default useOptimizedAudioStore;