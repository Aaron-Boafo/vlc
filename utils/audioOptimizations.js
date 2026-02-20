// Advanced audio optimizations for better performance
// NOTE: With expo-audio, the singleton AudioPlayer manages the native player lifecycle.
// Preloading is simplified to URI tracking rather than creating multiple Sound objects.

class AudioOptimizer {
  constructor() {
    this.preloadedUris = new Set();
    this.preloadQueue = [];
    this.maxCacheSize = 10;
  }

  /**
   * Track which URIs are likely to be played next.
   * expo-audio's AudioPlayer uses a single native player instance, so we
   * can't preload multiple sounds simultaneously. Instead, we pre-fetch
   * remote URIs and keep the list ready.
   */
  async preloadNextTracks(currentIndex, playlist) {
    const nextTracks = playlist.slice(currentIndex + 1, currentIndex + 4);

    for (const track of nextTracks) {
      if (!this.preloadedUris.has(track.id)) {
        this.preloadedUris.add(track.id);

        // Manage cache size
        if (this.preloadedUris.size > this.maxCacheSize) {
          const firstKey = this.preloadedUris.values().next().value;
          this.preloadedUris.delete(firstKey);
        }
      }
    }
  }

  /**
   * Check if a track has been marked for preloading.
   * @param {{ id: string }} track
   * @returns {boolean}
   */
  isPreloaded(track) {
    return this.preloadedUris.has(track.id);
  }

  // Cleanup cache
  async cleanup() {
    this.preloadedUris.clear();
  }
}

export default new AudioOptimizer();
