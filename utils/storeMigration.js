// Migration utility to switch from old stores to optimized stores
import AsyncStorage from '@react-native-async-storage/async-storage';

class StoreMigration {
  async migrateAudioStore() {
    try {
      console.log('🔄 Migrating audio store...');
      
      // Get old store data
      const oldAudioData = await AsyncStorage.getItem('Audio-storage');
      if (!oldAudioData) {
        console.log('✅ No old audio data to migrate');
        return;
      }

      const parsed = JSON.parse(oldAudioData);
      const oldState = parsed.state || {};

      // Prepare new store data
      const newState = {
        activeTab: oldState.activeTab || 'all',
        sortOrder: oldState.sortOrder || { key: 'title', direction: 'asc' },
        lastLoadTime: null, // Force fresh load
      };

      // Save to new store
      await AsyncStorage.setItem('optimized-audio-storage', JSON.stringify({
        state: newState,
        version: 0,
      }));

      console.log('✅ Audio store migrated successfully');
    } catch (error) {
      console.error('❌ Audio store migration failed:', error);
    }
  }

  async migrateVideoStore() {
    try {
      console.log('🔄 Migrating video store...');
      
      // Get old store data
      const oldVideoData = await AsyncStorage.getItem('Video-storage');
      if (!oldVideoData) {
        console.log('✅ No old video data to migrate');
        return;
      }

      const parsed = JSON.parse(oldVideoData);
      const oldState = parsed.state || {};

      // Prepare new store data
      const newState = {
        activeTab: oldState.activeTab || 'all',
        sortOrder: oldState.sortOrder || { key: 'filename', direction: 'asc' },
        favouriteVideos: oldState.favouriteVideos || [],
        videoHistory: oldState.videoHistory || [],
        videoPlaylists: oldState.videoPlaylists || [],
        lastLoadTime: null, // Force fresh load
      };

      // Save to new store
      await AsyncStorage.setItem('optimized-video-storage', JSON.stringify({
        state: newState,
        version: 0,
      }));

      console.log('✅ Video store migrated successfully');
    } catch (error) {
      console.error('❌ Video store migration failed:', error);
    }
  }

  async migrateAll() {
    console.log('🚀 Starting store migration...');
    await Promise.all([
      this.migrateAudioStore(),
      this.migrateVideoStore(),
    ]);
    console.log('✅ All stores migrated successfully');
  }

  // Clean up old store data after successful migration
  async cleanupOldStores() {
    try {
      await AsyncStorage.multiRemove([
        'Audio-storage',
        'Video-storage',
      ]);
      console.log('✅ Old store data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

export default new StoreMigration();