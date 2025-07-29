import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

// Store reference to audio control functions
let audioControlRef = null;
let currentNotificationId = null;

const setupMusicControls = (audioControl) => {
  audioControlRef = audioControl;
  
  try {
    // Enable background audio
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(error => {
      console.warn('Audio mode setup failed:', error);
    });

    console.log('🎵 Simple notification system initialized');
    
    // Return cleanup function
    return () => {
      if (currentNotificationId) {
        Notifications.dismissNotificationAsync(currentNotificationId);
        currentNotificationId = null;
      }
      audioControlRef = null;
      console.log('🎵 Notification system cleaned up');
    };
    
  } catch (error) {
    console.error('Error setting up notification system:', error);
    return () => {}; // Return empty cleanup function
  }
};

// Update the notification with current track info
const updateNotification = async (track, isPlaying, position = 0, duration = 0) => {
  if (!track) return;

  try {
    // Dismiss previous notification if exists
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    }

    // Format time for display
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Create notification content
    const notificationContent = {
      title: `${isPlaying ? '🎵' : '⏸️'} ${track.title || 'Unknown Track'}`,
      body: `${track.artist || 'Unknown Artist'}${duration > 0 ? ` • ${formatTime(position)} / ${formatTime(duration)}` : ''}`,
      data: { 
        trackId: track.id || 'unknown',
        isPlaying: isPlaying,
        position: position,
        duration: duration
      },
      sound: false, // Don't play sound for music notifications
      priority: Notifications.AndroidNotificationPriority.LOW,
      sticky: true, // Keep notification visible
    };

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Show immediately
    });

    currentNotificationId = notificationId;
    console.log('🎵 Notification updated:', track.title, isPlaying ? 'playing' : 'paused');
    
  } catch (error) {
    console.warn('Error updating notification:', error);
  }
};

export { setupMusicControls, updateNotification };