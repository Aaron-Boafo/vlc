import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useUserProfileStore = create(
  persist(
    (set) => ({
      // Initial state
      userName: 'User',
      userAvatar: null,
      
      // Actions
      setUserName: (name) => set({ userName: name }),
      setUserAvatar: (uri) => set({ userAvatar: uri }),
      resetProfile: () => set({ userName: 'User', userAvatar: null }),
    }),
    {
      name: 'user-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        userName: state.userName,
        userAvatar: state.userAvatar,
      }),
    }
  )
);

export default useUserProfileStore;
