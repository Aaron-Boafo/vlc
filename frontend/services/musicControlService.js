import * as Notifications from "expo-notifications";
import { audioPlayer } from "./AudioPlayer";

// Simple implementation for Expo
let audioControlRef = null;

const setupMusicControls = (audioControl) => {
  audioControlRef = audioControl;
  console.log("Music controls initialized with AudioPlayer singleton");

  // Return cleanup function
  return () => {
    audioControlRef = null;
  };
};

// Update the notification with current track info
const updateNotification = async (track, isPlaying) => {
  if (!track || !audioControlRef) return;

  try {
    // Audio mode is managed by the AudioPlayer singleton.
    // We only need to show the notification here.
    if (isPlaying) {
      // Show a local notification with the current track info
      await Notifications.scheduleNotificationAsync({
        content: {
          title: track.title || "Unknown Track",
          body: track.artist || "Unknown Artist",
          data: { trackId: track.id || "unknown" },
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.warn("Error in updateNotification:", error);
  }
};

export { setupMusicControls, updateNotification };
