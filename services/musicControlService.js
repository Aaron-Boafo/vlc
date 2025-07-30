import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

// Simple implementation for Expo
let audioControlRef = null;

const setupMusicControls = (audioControl) => {
  audioControlRef = audioControl;
  console.log('Music controls initialized with Expo Audio');
  
  // Return cleanup function
  return () => {
    audioControlRef = null;
  };
};

// Update the notification with current track info
const updateNotification = async (track, isPlaying) => {
  if (!track || !audioControlRef) return;

  try {
    // For Expo, we'll use the built-in notification system
    // This is a simplified version - you might want to enhance it
    if (isPlaying) {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Show a local notification with the current track info
      await Notifications.scheduleNotificationAsync({
        content: {
          title: track.title || 'Unknown Track',
          body: track.artist || 'Unknown Artist',
          data: { trackId: track.id || 'unknown' },
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.warn('Error in updateNotification:', error);
  }
};

export { setupMusicControls, updateNotification };