import {Stack} from "expo-router";

import React, { useState } from 'react';

const Playlist = () => {
  const [playlist, setPlaylist] = useState([]);

  const addTrack = (track) => {
    setPlaylist([...playlist, track]);
  };

  const removeTrack = (index) => {
    setPlaylist(playlist.filter((_, i) => i !== index));
  };

  const clearPlaylist = () => {
    setPlaylist([]);
  };

  return (
      <div>
        <h2>Playlist</h2>
        <ul>
          {playlist.map((track, index) => (
              <li key={index}>
                <strong>{track.title}</strong> ({track.duration})
                <button onClick={() => removeTrack(index)}>Remove</button>
              </li>
          ))}
        </ul>

        <button
            onClick={() =>
                addTrack({
                  title: 'New Track',
                  path: 'file:///C:/Music/newtrack.mp3',
                  duration: '3:45',
                })
            }
        >
          Add Sample Track
        </button>
        <button onClick={clearPlaylist}>Clear Playlist</button>
      </div>
  );
};

export default Playlist;
