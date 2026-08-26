import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Music Notification Service
 * Handles persistent music notifications that stay until app is closed
 */

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Don't show popup alerts for music notifications
    shouldPlaySound: false, // Don't play notification sounds
    shouldSetBadge: false,  // Don't set app badge
  }),
});

class MusicNotificationService {
  static notificationId = null;
  static isInitialized = false;

  // Initialize notification permissions
  static async initialize() {
    if (this.isInitialized) return true;

    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('music-playback', {
          name: 'Music Playback',
          importance: Notifications.AndroidImportance.LOW, // Low importance = no sound/vibration
          vibrationPattern: [0], // No vibration
          sound: false, // No sound
          showBadge: false,
          description: 'Music playback controls and information',
        });
      }

      this.isInitialized = true;
      console.log('✅ Music notifications initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  // Show persistent music notification
  static async showMusicNotification(track) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      // Cancel existing notification if any
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
      }

      // Ensure we have valid track data
      if (!track || !track.title) {
        console.log('⚠️ Invalid track data for notification');
        return null;
      }

      // Create notification content
      const notificationContent = {
        title: track.title || 'Unknown Track',
        body: `${track.artist || 'Unknown Artist'} • Now Playing`,
        data: {
          type: 'music-playback',
          trackId: track.id,
          trackUri: track.uri,
        },
        sticky: true, // Make notification persistent
        priority: Notifications.AndroidNotificationPriority.LOW,
        sound: false,
        vibrate: false,
      };

      // Add channel for Android
      if (Platform.OS === 'android') {
        notificationContent.channelId = 'music-playback';
      }

      // Show notification
      const notificationRequest = {
        content: notificationContent,
        trigger: null, // Show immediately
      };

      const identifier = await Notifications.scheduleNotificationAsync(notificationRequest);
      this.notificationId = identifier;

      console.log('🎵 Music notification shown:', track.title);
      return identifier;
    } catch (error) {
      console.error('❌ Failed to show music notification:', error);
      return null;
    }
  }

  // Update existing notification with new track info
  static async updateMusicNotification(track) {
    // For simplicity, just show a new notification
    return await this.showMusicNotification(track);
  }

  // Hide music notification
  static async hideMusicNotification() {
    try {
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
        this.notificationId = null;
        console.log('🔕 Music notification hidden');
      }
    } catch (error) {
      console.error('❌ Failed to hide music notification:', error);
    }
  }

  // Clear all music notifications
  static async clearAllMusicNotifications() {
    try {
      // Get all notifications and dismiss music-related ones
      const notifications = await Notifications.getPresentedNotificationsAsync();

      for (const notification of notifications) {
        if (notification.request.content.data?.type === 'music-playback') {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }

      this.notificationId = null;
      console.log('🧹 All music notifications cleared');
    } catch (error) {
      console.error('❌ Failed to clear music notifications:', error);
    }
  }

  // Check if music notification is currently shown
  static async isMusicNotificationShown() {
    try {
      if (!this.notificationId) return false;

      const notifications = await Notifications.getPresentedNotificationsAsync();
      return notifications.some(n => n.request.identifier === this.notificationId);
    } catch (error) {
      console.error('❌ Failed to check notification status:', error);
      return false;
    }
  }
}

export default MusicNotificationService;