import * as FileSystem from 'expo-file-system';
import { getCacheKey } from './performance';

const CACHE_DIR = FileSystem.documentDirectory + 'audioCache/';
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

class AudioCache {
  constructor() {
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    } catch (error) {
      console.log('Cache directory already exists');
    }
  }

  async getCachedAudio(uri, title) {
    const cacheKey = getCacheKey(uri, title);
    const cachedPath = CACHE_DIR + cacheKey;
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      
      if (fileInfo.exists) {
        // Check if cache is expired
        const now = Date.now();
        if (now - fileInfo.modificationTime > CACHE_EXPIRY) {
          await FileSystem.deleteAsync(cachedPath);
          return null;
        }
        return cachedPath;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
    
    return null;
  }

  async cacheAudio(uri, title) {
    const cacheKey = getCacheKey(uri, title);
    const cachedPath = CACHE_DIR + cacheKey;
    
    try {
      // Check cache size before downloading
      await this.cleanupCache();
      
      const downloadResult = await FileSystem.downloadAsync(uri, cachedPath);
      return downloadResult.uri;
    } catch (error) {
      console.error('Error caching audio:', error);
      return uri; // Return original URI if caching fails
    }
  }

  async cleanupCache() {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let totalSize = 0;
      const fileInfos = [];

      // Get file info for all cached files
      for (const file of files) {
        const filePath = CACHE_DIR + file;
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          fileInfos.push({ path: filePath, size: info.size, time: info.modificationTime });
          totalSize += info.size;
        }
      }

      // If cache exceeds max size, delete oldest files
      if (totalSize > MAX_CACHE_SIZE) {
        fileInfos.sort((a, b) => a.time - b.time); // Sort by oldest first
        
        while (totalSize > MAX_CACHE_SIZE * 0.8 && fileInfos.length > 0) {
          const oldestFile = fileInfos.shift();
          await FileSystem.deleteAsync(oldestFile.path);
          totalSize -= oldestFile.size;
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_DIR);
      await this.initializeCache();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default new AudioCache();