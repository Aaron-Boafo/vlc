import { Audio } from 'expo-av';
import MusicControl, { Command } from 'react-native-music-control';

// Store reference to audio control functions
let audioControlRef = null;

const setupMusicControls = (audioControl) => {
  audioControlRef = audioControl;
  
  try {
    // Enable background audio - wrap in try-catch for safety
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(error => {
      console.warn('Audio mode setup failed:', error);
    });

    // Enable the music control - check if available first
    if (MusicControl && typeof MusicControl.enableBackgroundMode === 'function') {
      MusicControl.enableBackgroundMode(true);
    } else {
      console.warn('MusicControl not available');
      return () => {}; // Return empty cleanup function
    }

    // Enable control center / lock screen controls
    MusicControl.enableControl('play', true);
    MusicControl.enableControl('pause', true);
    MusicControl.enableControl('stop', true);
    MusicControl.enableControl('nextTrack', true);
    MusicControl.enableControl('previousTrack', true);
    MusicControl.enableControl('seekForward', false); // Disable if not needed
    MusicControl.enableControl('seekBackward', false); // Disable if not needed
    MusicControl.enableControl('seek', true); // Enable seek bar
    MusicControl.enableControl('volume', true); // Enable volume control
    MusicControl.enableControl('remoteVolume', false);

    // Register to events
    MusicControl.on(Command.play, () => {
      console.log('🎵 Music Control: Play pressed');
      if (audioControlRef?.play) {
        audioControlRef.play();
      }
    });

    MusicControl.on(Command.pause, () => {
      console.log('🎵 Music Control: Pause pressed');
      if (audioControlRef?.pause) {
        audioControlRef.pause();
      }
    });

    MusicControl.on(Command.stop, () => {
      console.log('🎵 Music Control: Stop pressed');
      if (audioControlRef?.pause) {
        audioControlRef.pause();
      }
    });

    MusicControl.on(Command.nextTrack, () => {
      console.log('🎵 Music Control: Next track pressed');
      if (audioControlRef?.next) {
        audioControlRef.next();
      }
    });

    MusicControl.on(Command.previousTrack, () => {
      console.log('🎵 Music Control: Previous track pressed');
      if (audioControlRef?.previous) {
        audioControlRef.previous();
      }
    });

    MusicControl.on(Command.seek, (position) => {
      console.log('🎵 Music Control: Seek to', position);
      if (audioControlRef?.seek) {
        audioControlRef.seek(position);
      }
    });

    console.log('🎵 Music controls initialized with react-native-music-control');
    
    // Return cleanup function
    return () => {
      try {
        MusicControl.stopControl();
        audioControlRef = null;
        console.log('🎵 Music controls cleaned up');
      } catch (error) {
        console.warn('Error cleaning up music controls:', error);
      }
    };
  } catch (error) {
    console.error('Error setting up music controls:', error);
    return () => {}; // Return empty cleanup function
  }
};

// Update the music control with current track info
const updateNotification = async (track, isPlaying, position = 0, duration = 0) => {
  if (!track) return;

  try {
    // Set the music control info
    MusicControl.setNowPlaying({
      title: track.title || 'Unknown Track',
      artwork: track.artwork || '', // URL to artwork
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      genre: track.genre || '',
      duration: Math.floor(duration / 1000) || 0, // in seconds
      description: '', // Android only
      color: 0x8B5CF6, // Android only - using your purple theme
      colorized: true, // Android only
      date: track.year || '', // Release date, Android only
      rating: false, // Android only (Boolean or Number)
    });

    // Update playback state
    MusicControl.updatePlayback({
      state: isPlaying ? MusicControl.STATE_PLAYING : MusicControl.STATE_PAUSED,
      speed: 1.0,
      elapsedTime: Math.floor(position / 1000) || 0, // in seconds
    });

    console.log('🎵 Music control updated:', track.title, isPlaying ? 'playing' : 'paused');
  } catch (error) {
    console.warn('Error updating music control:', error);
  }
};

export { setupMusicControls, updateNotification };
