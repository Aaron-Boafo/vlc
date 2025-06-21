import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useHistoryStore = create(persist((set, get) => ({
  history: [],
  saveHistory: true,
  setSaveHistory: (value) => set({ saveHistory: value }),
  addToHistory: (track) => set(state => {
    // Remove if already exists, then add to front
    const filtered = state.history.filter(t => t.id !== track.id);
    return { history: [track, ...filtered] };
  }),
  removeFromHistory: (id) => set(state => ({
    history: state.history.filter(t => t.id !== id)
  })),
  clearHistory: () => set({ history: [] }),
})), {
  name: 'audio-history',
});

export default useHistoryStore; 