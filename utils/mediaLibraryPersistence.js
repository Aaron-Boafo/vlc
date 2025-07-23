import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const MEDIA_CACHE_KEY = 'media_library_cache';
const MEDIA_CACHE_FILE = `${FileSystem.documentDirectory}mediaLibrary.json`;

class MediaLibraryPersistence {
  static async saveToCache(mediaFiles) {
    try {
      const mediaData = {
        timestamp: Date.now(),
        files: mediaFiles.map(file => ({
          id: file.id,
          uri: file.uri,
          filename: file.filename,
          modificationTime: file.modificationTime,
          duration: file.duration,
          size: file.size,
        }))
      };

      await FileSystem.writeAsStringAsync(
        MEDIA_CACHE_FILE,
        JSON.stringify(mediaData),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log('📝 Media library cached successfully');
    } catch (error) {
      console.error('❌ Failed to cache media library:', error);
    }
  }

  static async loadFromCache() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(MEDIA_CACHE_FILE);
      if (!fileInfo.exists) {
        return null;
      }

      const content = await FileSystem.readAsStringAsync(MEDIA_CACHE_FILE);
      const cached = JSON.parse(content);

      // Check if cache is older than 24 hours
      if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
        console.log('🕒 Cache is too old, will refresh');
        return null;
      }

      console.log('📖 Loaded media library from cache');
      return cached.files;
    } catch (error) {
      console.error('❌ Failed to load media library cache:', error);
      return null;
    }
  }

  static async findNewFiles(cachedFiles, currentFiles) {
    if (!cachedFiles || !Array.isArray(cachedFiles)) {
      return currentFiles;
    }

    const cachedIds = new Set(cachedFiles.map(file => file.id));
    const newFiles = currentFiles.filter(file => !cachedIds.has(file.id));

    console.log(`🔍 Found ${newFiles.length} new files`);
    return newFiles;
  }

  static async findChangedFiles(cachedFiles, currentFiles) {
    if (!cachedFiles || !Array.isArray(cachedFiles)) {
      return [];
    }

    const cachedFilesMap = new Map(
      cachedFiles.map(file => [file.id, file])
    );

    const changedFiles = currentFiles.filter(file => {
      const cached = cachedFilesMap.get(file.id);
      return cached && cached.modificationTime !== file.modificationTime;
    });

    console.log(`🔄 Found ${changedFiles.length} changed files`);
    return changedFiles;
  }

  static async getMergedFiles(cachedFiles, newFiles, changedFiles) {
    if (!cachedFiles || !Array.isArray(cachedFiles)) {
      return newFiles;
    }

    const changedIds = new Set(changedFiles.map(file => file.id));
    const unchangedFiles = cachedFiles.filter(file => !changedIds.has(file.id));

    return [...unchangedFiles, ...newFiles, ...changedFiles];
  }
}

export default MediaLibraryPersistence;
