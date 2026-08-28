import React from 'react';

// This context is no longer needed as we're using the persistent playlist store
// Keeping this file for backward compatibility but it's essentially a no-op

export const PlaylistProvider = ({ children }) => {
  return <>{children}</>;
};

export const usePlaylist = () => {
  // Return empty values for backward compatibility
  return { playlist: [], dispatch: () => {} };
};