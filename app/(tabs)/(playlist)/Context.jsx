import React, { createContext, useReducer, useContext } from 'react';

const PlaylistContext = createContext();

const playlistReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TRACK':
      return [...state, action.payload];
    case 'REMOVE_TRACK':
      return state.filter((_, i) => i !== action.payload);
    case 'CLEAR_PLAYLIST':
      return [];
    default:
      return state;
  }
};

export const PlaylistProvider = ({ children }) => {
  const [playlist, dispatch] = useReducer(playlistReducer, []);

  return (
    <PlaylistContext.Provider value={{ playlist, dispatch }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => useContext(PlaylistContext);
import * as MediaLibrary from 'expo-media-library';
import { usePlaylist } from '../context/PlaylistContext';

const pickAudio = async () => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return;

  const assets = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.audio,
    first: 20,
  });

  if (assets.assets.length > 0) {
    dispatch({ type: 'ADD_TRACK', payload: assets.assets[0] }); // or show a picker
  }
};