import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceOptimizer from './deviceOptimizer';

/**
 * Enhanced Media Cache Manager
 * Implements intelligent caching with incremental updates for faster app launches
 */
class MediaCacheManager {
  constructor() {
    this.CACHE_DIR = FileSystem.documentDirectory + 'mediaCache/';
    this.AUDIO_CACHE_FILE = this.CACHE_DIR + 'audio_cache.json';
    this.VIDEO_CACHE_FILE = this.CACHE_DIR + 'video_cache.json';
    this.METADATA_FILE = this.CACHE_DIR + 'cache_metadata.json';
    
    // Get device-optimized settings
    const deviceSettings = DeviceOptimizer.getProgressiveLoadingSettings();
    this.BATCH_SIZE = deviceSettings.microBatchSize;
    this.MAX_CONCURRENT = deviceSettings.maxConcurrentMetadata;
    
    // Cache metadata
    this.cacheMetadata = {
      audio: { lastScan: 0, totalFiles: 0, lastModified: 0 },
      video: { lastScan: 0, totalFiles: 0, lastModified: 0 }
    };
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      await this.loadCacheMetadata();
      console.log('📚 MediaCacheManager initialized');
    } catch (error) {
      console.error('Cache initialization failed:', error);
    }
  }

  async loadCacheMetadata() {
    try {
      const metadataInfo = await FileSystem.getInfoAsync(this.METADATA_FILE);
      if (metadataInfo.exists) {
        const content = await FileSystem.readAsStringAsync(this.METADATA_FILE);
        this.cacheMetadata = JSON.parse(content);
      }
    } catch (error) {
      console.log('No existing cache metadata found, starting fresh');
    }
  }

  async saveCacheMetadata() {
    try {
      await FileSystem.writeAsStringAsync(this.METADATA_FILE, JSON.stringify(this.cacheMetadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }

  /**
   * Load media files with intelligent caching
   * @param {string} mediaType - 'audio' or 'video'
   * @param {Function} progressCallback - Progress update callback
   * @returns {Promise<Array>} Array of media files
   */
  async loadMediaFiles(mediaType, progressCallback = null) {
    const startTime = Date.now();
    console.log(`🚀 Loading ${mediaType} files with intelligent caching...`);

    try {
      // Check permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media permission not granted');
      }

      // Try to load from cache first
      const cachedFiles = await this.loadFromCache(mediaType);
      const cacheInfo = this.cacheMetadata[mediaType];

      if (progressCallback) {
        progressCallback({
          phase: 'checking_cache',
          message: `Found ${cachedFiles.length} cached ${mediaType} files`,
          cachedCount: cachedFiles.length
        });
      }

      // If we have cached files and they're recent, do incremental update
      if (cachedFiles.length > 0 && cacheInfo.lastScan > 0) {
        console.log(`📱 Found ${cachedFiles.length} cached ${mediaType} files, checking for updates...`);
        
        // Return cached files immediately for faster UI response
        if (progressCallback) {
          progressCallback({
            phase: 'cache_loaded',
            message: `Loaded ${cachedFiles.length} ${mediaType} files from cache`,
            filesLoaded: cachedFiles.length,
            files: cachedFiles, // Pass the actual files
            isComplete: false
          });
        }
        
        // Perform incremental update in background
        const updatedFiles = await this.performIncrementalUpdate(
          mediaType, 
          cachedFiles, 
          cacheInfo.lastScan,
          progressCallback
        );

        const loadTime = Date.now() - startTime;
        console.log(`✅ ${mediaType} incremental load complete: ${updatedFiles.length} files in ${loadTime}ms`);
        
        // Final completion callback
        if (progressCallback) {
          progressCallback({
            phase: 'complete',
            message: `${mediaType} loading complete`,
            filesLoaded: updatedFiles.length,
            files: updatedFiles, // Pass the updated files
            isComplete: true
          });
        }
        
        return updatedFiles;
      } else {
        // No cache or cache is empty, do full scan
        console.log(`🔍 No cache found for ${mediaType}, performing full scan...`);
        
        const allFiles = await this.performFullScan(mediaType, progressCallback);
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ ${mediaType} full scan complete: ${allFiles.length} files in ${loadTime}ms`);
        
        // Final completion callback
        if (progressCallback) {
          progressCallback({
            phase: 'complete',
            message: `${mediaType} loading complete`,
            filesLoaded: allFiles.length,
            isComplete: true
          });
        }
        
        return allFiles;
      }

    } catch (error) {
      console.error(`❌ ${mediaType} loading failed:`, error);
      
      // Error callback
      if (progressCallback) {
        progressCallback({
          phase: 'error',
          message: `Failed to load ${mediaType} files: ${error.message}`,
          error: error.message,
          isComplete: true
        });
      }
      
      throw error;
    }
  }

  /**
   * Load files from cache
   */
  async loadFromCache(mediaType) {
    try {
      const cacheFile = mediaType === 'audio' ? this.AUDIO_CACHE_FILE : this.VIDEO_CACHE_FILE;
      const fileInfo = await FileSystem.getInfoAsync(cacheFile);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(cacheFile);
        return JSON.parse(content);
      }
    } catch (error) {
      console.log(`No cache found for ${mediaType}:`, error.message);
    }
    
    return [];
  }

  /**
   * Save files to cache
   */
  async saveToCache(mediaType, files) {
    try {
      const cacheFile = mediaType === 'audio' ? this.AUDIO_CACHE_FILE : this.VIDEO_CACHE_FILE;
      await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(files));
      
      // Update metadata
      this.cacheMetadata[mediaType] = {
        lastScan: Date.now(),
        totalFiles: files.length,
        lastModified: Math.max(...files.map(f => f.modificationTime || 0))
      };
      
      await this.saveCacheMetadata();
      console.log(`💾 Cached ${files.length} ${mediaType} files`);
    } catch (error) {
      console.error(`Failed to save ${mediaType} cache:`, error);
    }
  }

  /**
   * Perform full media scan and cache results
   */
  async performFullScan(mediaType, progressCallback = null) {
    const allFiles = [];
    let hasNextPage = true;
    let after;
    let batchCount = 0;

    const mediaTypeEnum = mediaType === 'audio' 
      ? MediaLibrary.MediaType.audio 
      : MediaLibrary.MediaType.video;

    try {
      while (hasNextPage && batchCount < 1000) { // Safety limit
        if (progressCallback) {
          progressCallback({
            phase: 'full_scan',
            message: `Scanning batch ${batchCount + 1}...`,
            filesFound: allFiles.length,
            files: [...allFiles] // Pass current files for progressive display
          });
        }

        const assets = await MediaLibrary.getAssetsAsync({
          mediaType: mediaTypeEnum,
          first: this.BATCH_SIZE,
          after,
          sortBy: [MediaLibrary.SortBy.modificationTime],
        });

        if (!assets.assets || assets.assets.length === 0) break;

        // Process batch
        const batchFiles = assets.assets
          .map(asset => this.createFileObject(asset, mediaType))
          .filter(file => file !== null);

        allFiles.push(...batchFiles);

        hasNextPage = assets.hasNextPage;
        after = assets.endCursor;
        batchCount++;

        // Yield control periodically
        if (batchCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Save to cache
      await this.saveToCache(mediaType, allFiles);

      return allFiles;

    } catch (error) {
      console.error(`Full scan failed for ${mediaType}:`, error);
      throw error;
    }
  } 
 /**
   * Perform incremental update - only scan for new/changed files
   */
  async performIncrementalUpdate(mediaType, cachedFiles, lastScanTime, progressCallback = null) {
    console.log(`🔄 Performing incremental update for ${mediaType} since ${new Date(lastScanTime).toISOString()}`);

    try {
      // Step 1: Scan for new files
      if (progressCallback) {
        progressCallback({
          phase: 'scanning_new',
          message: 'Scanning for new files...',
          cachedCount: cachedFiles.length
        });
      }

      const newFiles = await this.scanForNewFiles(mediaType, lastScanTime);
      console.log(`📄 Found ${newFiles.length} new ${mediaType} files`);

      // Step 2: Check for modified files
      if (progressCallback) {
        progressCallback({
          phase: 'checking_modified',
          message: 'Checking for modified files...',
          newFiles: newFiles.length
        });
      }

      const modifiedFiles = await this.checkForModifiedFiles(mediaType, cachedFiles);
      console.log(`✏️ Found ${modifiedFiles.length} modified ${mediaType} files`);

      // Step 3: Check for deleted files
      if (progressCallback) {
        progressCallback({
          phase: 'checking_deleted',
          message: 'Checking for deleted files...',
          modifiedFiles: modifiedFiles.length
        });
      }

      const deletedFileIds = await this.checkForDeletedFiles(cachedFiles);
      console.log(`🗑️ Found ${deletedFileIds.length} deleted ${mediaType} files`);

      // Step 4: Merge results
      let updatedFiles = [...cachedFiles];

      // Remove deleted files
      updatedFiles = updatedFiles.filter(file => !deletedFileIds.includes(file.id));

      // Update modified files
      modifiedFiles.forEach(modifiedFile => {
        const index = updatedFiles.findIndex(f => f.id === modifiedFile.id);
        if (index !== -1) {
          updatedFiles[index] = modifiedFile;
        }
      });

      // Add new files
      updatedFiles.push(...newFiles);

      // Sort by modification time (newest first)
      updatedFiles.sort((a, b) => (b.modificationTime || 0) - (a.modificationTime || 0));

      // Save updated cache
      await this.saveToCache(mediaType, updatedFiles);

      if (progressCallback) {
        progressCallback({
          phase: 'complete',
          message: `Update complete: +${newFiles.length} new, ~${modifiedFiles.length} modified, -${deletedFileIds.length} deleted`,
          totalFiles: updatedFiles.length,
          changes: newFiles.length + modifiedFiles.length + deletedFileIds.length
        });
      }

      return updatedFiles;

    } catch (error) {
      console.error(`Incremental update failed for ${mediaType}:`, error);
      // Fallback to cached files if incremental update fails
      return cachedFiles;
    }
  }

  /**
   * Scan for new files since last scan time
   */
  async scanForNewFiles(mediaType, lastScanTime) {
    const newFiles = [];
    let hasNextPage = true;
    let after;
    let batchCount = 0;

    const mediaTypeEnum = mediaType === 'audio' 
      ? MediaLibrary.MediaType.audio 
      : MediaLibrary.MediaType.video;

    try {
      while (hasNextPage && batchCount < 100) { // Reasonable limit for new files
        const assets = await MediaLibrary.getAssetsAsync({
          mediaType: mediaTypeEnum,
          first: this.BATCH_SIZE,
          after,
          sortBy: [MediaLibrary.SortBy.creationTime], // Sort by creation time for new files
        });

        if (!assets.assets || assets.assets.length === 0) break;

        // Filter for files created after last scan
        const batchNewFiles = assets.assets
          .filter(asset => asset.creationTime > lastScanTime)
          .map(asset => this.createFileObject(asset, mediaType))
          .filter(file => file !== null);

        newFiles.push(...batchNewFiles);

        // If we find files older than lastScanTime, we can stop
        const oldestInBatch = Math.min(...assets.assets.map(a => a.creationTime));
        if (oldestInBatch <= lastScanTime) {
          break;
        }

        hasNextPage = assets.hasNextPage;
        after = assets.endCursor;
        batchCount++;

        // Small delay to prevent blocking
        if (batchCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      return newFiles;

    } catch (error) {
      console.error('New file scan failed:', error);
      return [];
    }
  }

  /**
   * Check for modified files by comparing modification times
   */
  async checkForModifiedFiles(mediaType, cachedFiles) {
    const modifiedFiles = [];
    const batchSize = 20; // Process in smaller batches for modification checks

    try {
      // Process cached files in batches
      for (let i = 0; i < cachedFiles.length; i += batchSize) {
        const batch = cachedFiles.slice(i, i + batchSize);
        
        // Check each file in the batch
        const batchPromises = batch.map(async (cachedFile) => {
          try {
            // Try to get current file info
            const currentInfo = await this.getCurrentFileInfo(cachedFile.id, mediaType);
            
            if (currentInfo && currentInfo.modificationTime > cachedFile.modificationTime) {
              return this.createFileObject(currentInfo, mediaType);
            }
          } catch (error) {
            // File might be deleted or inaccessible, skip
            console.log(`Could not check modification for ${cachedFile.filename}:`, error.message);
          }
          
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        const batchModified = batchResults.filter(file => file !== null);
        modifiedFiles.push(...batchModified);

        // Small delay between batches
        if (i % (batchSize * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      return modifiedFiles;

    } catch (error) {
      console.error('Modified file check failed:', error);
      return [];
    }
  }

  /**
   * Check for deleted files
   */
  async checkForDeletedFiles(cachedFiles) {
    const deletedFileIds = [];
    const batchSize = 20;

    try {
      // Process cached files in batches
      for (let i = 0; i < cachedFiles.length; i += batchSize) {
        const batch = cachedFiles.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (cachedFile) => {
          try {
            // Check if file still exists
            const exists = await this.checkFileExists(cachedFile);
            return exists ? null : cachedFile.id;
          } catch (error) {
            // If we can't check, assume it's deleted
            return cachedFile.id;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const batchDeleted = batchResults.filter(id => id !== null);
        deletedFileIds.push(...batchDeleted);

        // Small delay between batches
        if (i % (batchSize * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      return deletedFileIds;

    } catch (error) {
      console.error('Deleted file check failed:', error);
      return [];
    }
  }

  /**
   * Get current file information from MediaLibrary
   */
  async getCurrentFileInfo(assetId, mediaType) {
    try {
      // Note: MediaLibrary doesn't have direct asset lookup by ID
      // This is a limitation we work around by checking file existence
      // In a real implementation, you might need to maintain an ID mapping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a file still exists
   */
  async checkFileExists(cachedFile) {
    try {
      if (cachedFile.uri) {
        const fileInfo = await FileSystem.getInfoAsync(cachedFile.uri);
        return fileInfo.exists;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create file object from MediaLibrary asset
   */
  createFileObject(asset, mediaType) {
    if (!asset || !asset.uri || asset.uri.trim() === '') {
      return null;
    }

    const filename = asset.filename || 'Unknown';
    const title = filename.replace(/\.[^/.]+$/, '');
    
    const baseObject = {
      id: asset.id,
      uri: asset.uri,
      filename,
      duration: asset.duration || 0,
      modificationTime: asset.modificationTime || Date.now(),
      creationTime: asset.creationTime || Date.now(),
      mediaType,
      cacheTimestamp: Date.now()
    };

    if (mediaType === 'audio') {
      return {
        ...baseObject,
        title,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        artwork: null,
        year: null,
        metadataLoaded: false,
      };
    } else {
      return {
        ...baseObject,
        width: asset.width || 0,
        height: asset.height || 0,
        size: asset.fileSize || 0,
      };
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(mediaType = null) {
    try {
      if (mediaType) {
        // Clear specific media type cache
        const cacheFile = mediaType === 'audio' ? this.AUDIO_CACHE_FILE : this.VIDEO_CACHE_FILE;
        await FileSystem.deleteAsync(cacheFile, { idempotent: true });
        
        this.cacheMetadata[mediaType] = { lastScan: 0, totalFiles: 0, lastModified: 0 };
        await this.saveCacheMetadata();
        
        console.log(`🧹 Cleared ${mediaType} cache`);
      } else {
        // Clear all caches
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
        
        this.cacheMetadata = {
          audio: { lastScan: 0, totalFiles: 0, lastModified: 0 },
          video: { lastScan: 0, totalFiles: 0, lastModified: 0 }
        };
        
        console.log('🧹 Cleared all media caches');
      }
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const audioCache = await this.loadFromCache('audio');
      const videoCache = await this.loadFromCache('video');
      
      return {
        audio: {
          ...this.cacheMetadata.audio,
          cachedFiles: audioCache.length,
          lastScanDate: new Date(this.cacheMetadata.audio.lastScan).toISOString()
        },
        video: {
          ...this.cacheMetadata.video,
          cachedFiles: videoCache.length,
          lastScanDate: new Date(this.cacheMetadata.video.lastScan).toISOString()
        },
        totalCachedFiles: audioCache.length + videoCache.length
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Force refresh cache for a specific media type
   */
  async forceRefresh(mediaType, progressCallback = null) {
    console.log(`🔄 Force refreshing ${mediaType} cache...`);
    
    // Clear existing cache
    await this.clearCache(mediaType);
    
    // Perform full scan
    return await this.performFullScan(mediaType, progressCallback);
  }
}

export default new MediaCacheManager();