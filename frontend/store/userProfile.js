import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { webSocketService } from '../services/websocketService';

const useUserProfileStore = create(
  persist(
    (set) => ({
      // Initial state
      userName: 'User',
      userAvatar: null,
      isWebSocketInitialized: false,
      
      // Actions
      setUserName: (name) => set({ userName: name }),
      setUserAvatar: (uri) => set({ userAvatar: uri }),
      resetProfile: () => set({ 
        userName: 'User', 
        userAvatar: null,
        isWebSocketInitialized: false 
      }),
      
      // Initialize WebSocket connection
      initializeWebSocket: async () => {
        const state = get();
        if (state.isWebSocketInitialized) {
          console.log('WebSocket already initialized');
          return true;
        }

        try {
          console.log('Initializing WebSocket connection...');
          // Get fresh token in case it was updated
          const token = await SecureStore.getItemAsync('auth_token');
          if (!token) {
            console.warn('No auth token available for WebSocket initialization');
            return false;
          }
          
          // Update the auth token in the WebSocket service
          webSocketService.authToken = token;
          
          // Initialize the connection
          await webSocketService.initialize();
          
          set({ isWebSocketInitialized: true });
          console.log('WebSocket initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to initialize WebSocket:', error);
          set({ isWebSocketInitialized: false });
          // Don't throw to allow the app to continue
          return false;
        }
      },
      
      // Update profile and initialize WebSocket
      setUserProfile: async (profileData) => {
        // Update the profile data first
        set({
          userName: profileData.name || 'User',
          userAvatar: profileData.avatar,
        });
        
        // Only initialize WebSocket if we have a valid token
        if (await SecureStore.getItemAsync('auth_token')) {
          try {
            await get().initializeWebSocket();
          } catch (error) {
            console.error('WebSocket initialization failed in setUserProfile:', error);
            // Don't throw here to allow the app to continue
          }
        } else {
          console.warn('Skipping WebSocket initialization - no auth token available');
        }
      },
    }),
    {
      name: 'user-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2, // Increment version for the new field
      partialize: (state) => ({
        userName: state.userName,
        userAvatar: state.userAvatar,
        isWebSocketInitialized: false, // Always reset on app start
      }),
      migrate: (persistedState, version) => {
        // Migration logic if needed when version changes
        if (version === 1) {
          return {
            ...persistedState,
            isWebSocketInitialized: false,
          };
        }
        return persistedState;
      },
    }
  )
);

export default useUserProfileStore;