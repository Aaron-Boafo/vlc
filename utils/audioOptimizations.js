// Advanced audio optimizations for better performance
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class AudioOptimizer {
  constructor() {
    this.audioCache = new Map();
    this.preloadQueue = [];
    this.maxCacheSize = 10; // Keep 10 audio files in memory
  }

  // Preload next tracks for instant playback
  async preloadNextTracks(currentIndex, playlist) {
    const nextTracks = playlist.slice(currentIndex + 1, currentIndex + 4); // Preload next 3
    
    for (const track of nextTracks) {
      if (!this.audioCache.has(track.id)) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: track.uri },
            { shouldPlay: false, volume: 0 }
          );
          
          this.audioCache.set(track.id, sound);
          
          // Manage cache size
          if (this.audioCache.size > this.maxCacheSize) {
            const firstKey = this.audioCache.keys().next().value;
            const oldSound = this.audioCache.get(firstKey);
            await oldSound.unloadAsync();
            this.audioCache.delete(firstKey);
          }
        } catch (error) {
          console.log('Preload failed for:', track.title);
        }
      }
    }
  }

  // Get preloaded sound or create new one
  async getOptimizedSound(track) {
    if (this.audioCache.has(track.id)) {
      return this.audioCache.get(track.id);
    }
    
    const { sound } = await Audio.Sound.createAsync({ uri: track.uri });
    return sound;
  }

  // Cleanup cache
  async cleanup() {
    for (const sound of this.audioCache.values()) {
      await sound.unloadAsync();
    }
    this.audioCache.clear();
  }
}

export default new AudioOptimizer();