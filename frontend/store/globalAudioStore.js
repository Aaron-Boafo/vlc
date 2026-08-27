import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global Audio Store - UI State Only
 * 
 * This store now only manages UI state (activeTab, sortOrder, searchQuery, etc.)
 * Actual media data is queried from SQLite via useSongs hooks.
 * This eliminates duplicate state between SQLite and Zustand.
 */

const useGlobalAudioStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UI state only - NO audioFiles array
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
        name: 'audio-ui-storage',
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

export default useGlobalAudioStore;