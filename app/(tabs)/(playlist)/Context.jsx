import React, { createContext, useReducer, useContext } from 'react';

const PlaylistContext = createContext();

const playlistReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TRACK':
      if (state.some(track => (track.id && action.payload.id && track.id === action.payload.id) || 
          (track.title && action.payload.title && track.title === action.payload.title))) {
        return state;
      }
      return [...state, action.payload];
    case 'REMOVE_TRACK':
      return state.filter((_, i) => i !== action.payload);
    case 'CLEAR_PLAYLIST':
      return [];
    default:
      return state;
  }
};

const PlaylistProvider = ({ children }) => {
  const [playlist, dispatch] = useReducer(playlistReducer, []);

  return (
    <PlaylistContext.Provider value={{ playlist, dispatch }}>
      {children}
    </PlaylistContext.Provider>
  );
};

const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};

export { PlaylistProvider, usePlaylist };
export default PlaylistProvider;