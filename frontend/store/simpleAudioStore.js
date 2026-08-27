import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

const useSimpleAudioStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UI state only - NO audioFiles array (data comes from SQLite via hooks)
        activeTab: 'all',
        sortOrder: { key: 'title', direction: 'asc' },
        
        // Search state per tab
        searchStates: {
          all: { showSearch: false, searchQuery: '' },
          playlist: { showSearch: false, searchQuery: '' },
          album: { showSearch: false, searchQuery: '' },
          artist: { showSearch: false, searchQuery: '' },
          favourite: { showSearch: false, searchQuery: '' },
        },

        // Loading state for UI feedback
        isLoading: false,
        isInitialLoadComplete: false,

        // Permission state
        permissionGranted: null,

        // Tab management
        setActiveTab: (tab) => set({ activeTab: tab }),

        // Sort management
        setSortOrder: (key, direction) => set({ sortOrder: { key, direction } }),

        // Search state management
        setSearchState: (tab, { showSearch, searchQuery }) => set((state) => ({
          searchStates: {
            ...state.searchStates,
            [tab]: {
              ...state.searchStates[tab],
              showSearch: showSearch !== undefined ? showSearch : state.searchStates[tab].showSearch,
              searchQuery: searchQuery !== undefined ? searchQuery : state.searchStates[tab].searchQuery,
            },
          },
        })),

        // Get current tab's search state
        getSearchState: (tab) => get().searchStates[tab] || { showSearch: false, searchQuery: '' },

        // Loading state
        setLoading: (loading) => set({ isLoading: loading }),
        setInitialLoadComplete: (complete) => set({ isInitialLoadComplete: complete }),

        // Permission
        setPermissionGranted: (granted) => set({ permissionGranted: granted }),

        // Reset search for a tab
        clearSearch: (tab) => set((state) => ({
          searchStates: {
            ...state.searchStates,
            [tab]: { showSearch: false, searchQuery: '' },
          },
        })),
      }),
      {
        name: 'simple-audio-ui-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          activeTab: state.activeTab,
          sortOrder: state.sortOrder,
          searchStates: state.searchStates,
          permissionGranted: state.permissionGranted,
        }),
      }
    )
  )
);

// Setup app state listener for background refresh (kept for compatibility)
let appStateSubscription = null;

export const setupBackgroundRefresh = () => {
  if (appStateSubscription) return;
  
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // Background sync is now handled by the scanner service
      // This is kept for any legacy compatibility
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