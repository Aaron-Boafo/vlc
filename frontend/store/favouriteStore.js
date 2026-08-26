import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFavouriteStore = create(
  persist(
    (set, get) => ({
      favourites: [],
      addFavourite: (track) => set((state) => ({
        favourites: [...state.favourites, track],
      })),
      removeFavourite: (trackId) => set((state) => ({
        favourites: state.favourites.filter((t) => t.id !== trackId),
      })),
      isFavourite: (trackId) => get().favourites.some((t) => t.id === trackId),
      toggleFavourite: (track) => {
        const { favourites } = get();
        const exists = favourites.some((t) => t.id === track.id);
        if (exists) {
          set({ favourites: favourites.filter((t) => t.id !== track.id) });
        } else {
          set({ favourites: [...favourites, track] });
        }
      },
    }),
    {
      name: 'favourite-storage',
      getStorage: () => AsyncStorage,
    }
  )
);

export default useFavouriteStore; 