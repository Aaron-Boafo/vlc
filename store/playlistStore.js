import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import uuid from 'react-native-uuid';

const usePlaylistStore = create(persist((set, get) => ({
  playlists: [],
  createPlaylist: (name, tracks = [], artwork = null) => {
    const id = uuid.v4();
    console.log('createPlaylist called', name, tracks, artwork, id);
    set(state => ({
      playlists: [
        ...state.playlists,
        { id, name, tracks, artwork }
      ]
    }));
    return id;
  },
  setPlaylistArtwork: (playlistId, artwork) => set(state => ({
    playlists: state.playlists.map(p =>
      p.id === playlistId
        ? { ...p, artwork }
        : p
    )
  })),
  deletePlaylist: (id) => set(state => ({
    playlists: state.playlists.filter(p => p.id !== id)
  })),
  addTrackToPlaylist: (playlistId, track) => set(state => ({
    playlists: state.playlists.map(p =>
      p.id === playlistId
        ? { ...p, tracks: [...p.tracks, track] }
        : p
    )
  })),
  removeTrackFromPlaylist: (playlistId, trackId) => set(state => ({
    playlists: state.playlists.map(p =>
      p.id === playlistId
        ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) }
        : p
    )
  })),
})), {
  name: 'playlist-storage',
});

export default usePlaylistStore; 