import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { InteractionManager } from 'react-native';
import DeviceOptimizer from './deviceOptimizer';
import RealDeviceMetadataLoader from './realDeviceMetadataLoader';

// Progressive Media Loader - Shows files as they're loaded in real-time
class ProgressiveMediaLoader {
  constructor() {
    this.CACHE_DIR = FileSystem.documentDirectory + 'progressiveCache/';
    this.METADATA_CACHE_FILE = FileSystem.documentDirectory + 'progressiveMetadata.json';
    
    // Get device-optimized settings
    const deviceSettings = DeviceOptimizer.getProgressiveLoadingSettings();
    
    // Progressive loading settings optimized for device
    this.MICRO_BATCH_SIZE = deviceSettings.microBatchSize;
    this.UI_UPDATE_INTERVAL = deviceSettings.uiUpdateInterval;
    this.MAX_CONCURRENT_METADATA = deviceSettings.maxConcurrentMetadata;
    this.METADATA_DELAY = 100; // Small delay before starting metadata loading
    
    // Caching
    this.metadataCache = new Map();
    this.loadedFiles = [];
    this.isLoading = false;
    
    // Log device optimization info
    DeviceOptimizer.logDeviceInfo();
    console.log(`📱 Progressive loader optimized for device: batch=${this.MICRO_BATCH_SIZE}, interval=${this.UI_UPDATE_INTERVAL}ms`);
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      
      // Load metadata cache
      const cacheInfo = await FileSystem.getInfoAsync(this.METADATA_CACHE_FILE);
      if (cacheInfo.exists) {
        const cacheData = await FileSystem.readAsStringAsync(this.METADATA_CACHE_FILE);
        const parsed = JSON.parse(cacheData);
        this.metadataCache = new Map(Object.entries(parsed));
        console.log(`📚 Loaded ${this.metadataCache.size} metadata entries from cache`);
      }
    } catch (error) {
      console.log('Progressive cache initialization failed:', error);
    }
  }

  // Progressive loading - files appear as they're discovered
  async loadMediaProgressively(mediaType = 'audio', onProgress = null) {
    if (this.isLoading) {
      console.log('⚠️ Loading already in progress, skipping...');
      return this.loadedFiles;
    }

    this.isLoading = true;
    this.loadedFiles = [];
    
    const startTime = Date.now();
    console.log(`🚀 Starting PROGRESSIVE ${mediaType} loading...`);

    try {
      // Check permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media permission not granted');
      }

      // Start progressive loading with real-time UI updates
      await this.loadWithRealTimeUpdates(mediaType, onProgress);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ PROGRESSIVE ${mediaType} load complete: ${this.loadedFiles.length} files in ${loadTime}ms`);

      // Start background metadata loading after a short delay
      setTimeout(() => {
        this.startBackgroundMetadataLoading(mediaType, onProgress);
      }, this.METADATA_DELAY);

      return this.loadedFiles;

    } catch (error) {
      console.error(`❌ PROGRESSIVE ${mediaType} load failed:`, error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async loadWithRealTimeUpdates(mediaType, onProgress) {
    let hasNextPage = true;
    let after;
    let batchCount = 0;
    let uiUpdateTimer = null;
    let pendingFiles = [];

    // Setup real-time UI updates
    const flushPendingFiles = () => {
      if (pendingFiles.length > 0 && onProgress) {
        this.loadedFiles.push(...pendingFiles);
        
        // Update UI immediately (non-blocking)
        InteractionManager.runAfterInteractions(() => {
          onProgress([...this.loadedFiles], false);
        });
        
        pendingFiles = [];
      }
    };

    // Start UI update timer for smooth flow
    uiUpdateTimer = setInterval(flushPendingFiles, this.UI_UPDATE_INTERVAL);

    try {
      while (hasNextPage && batchCount < 1000) { // Safety limit for very large libraries
        const mediaTypeEnum = mediaType === 'audio' 
          ? MediaLibrary.MediaType.audio 
          : MediaLibrary.MediaType.video;

        // Load micro-batch
        const assets = await MediaLibrary.getAssetsAsync({
          mediaType: mediaTypeEnum,
          first: this.MICRO_BATCH_SIZE,
          after,
          sortBy: [MediaLibrary.SortBy.modificationTime],
        });

        if (!assets.assets || assets.assets.length === 0) break;

        // Process files immediately
        const newFiles = assets.assets
          .map(asset => this.createBasicFileObject(asset, mediaType))
          .filter(file => file !== null);

        // Add to pending files for UI update
        pendingFiles.push(...newFiles);

        // If we have enough files, flush immediately for better responsiveness
        if (pendingFiles.length >= this.MICRO_BATCH_SIZE) {
          flushPendingFiles();
        }

        hasNextPage = assets.hasNextPage;
        after = assets.endCursor;
        batchCount++;

        // Very small yield to keep UI responsive
        if (batchCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Flush any remaining files
      flushPendingFiles();

      // Final update to mark as complete
      if (onProgress) {
        onProgress([...this.loadedFiles], true);
      }

    } finally {
      // Clean up timer
      if (uiUpdateTimer) {
        clearInterval(uiUpdateTimer);
      }
    }
  }

  createBasicFileObject(asset, mediaType) {
    if (!asset || !asset.uri || asset.uri.trim() === '') {
      return null;
    }

    const filename = asset.filename || 'Unknown';
    const title = filename.replace(/\.[^/.]+$/, '');
    const cacheKey = `${asset.id}_${asset.modificationTime}`;
    
    const baseObject = {
      id: asset.id,
      uri: asset.uri,
      filename,
      duration: asset.duration || 0,
      modificationTime: asset.modificationTime,
      creationTime: asset.creationTime,
      metadataLoaded: false,
      cacheKey,
    };

    if (mediaType === 'audio') {
      // Check if we have cached metadata
      const cachedMetadata = this.metadataCache.get(cacheKey);
      if (cachedMetadata) {
        return {
          ...baseObject,
          ...cachedMetadata,
          metadataLoaded: true,
        };
      }

      return {
        ...baseObject,
        title,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        artwork: null,
        year: null,
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

  // Background metadata loading with real device optimization
  async startBackgroundMetadataLoading(mediaType, onProgress) {
    if (mediaType !== 'audio' || this.loadedFiles.length === 0) return;

    console.log(`🔄 Starting REAL DEVICE metadata for ${this.loadedFiles.length} files...`);

    try {
      // Use the real device metadata loader with fallback strategies
      const enhancedFiles = await RealDeviceMetadataLoader.loadMetadataForFiles(
        this.loadedFiles,
        (updatedFiles, isComplete) => {
          // Update our loaded files array
          this.loadedFiles = updatedFiles;
          
          // Update UI with enhanced files
          if (onProgress) {
            InteractionManager.runAfterInteractions(() => {
              onProgress(updatedFiles, isComplete);
            });
          }
        }
      );

      // Update our loaded files with the enhanced metadata
      this.loadedFiles = enhancedFiles;
      
      // Log statistics
      const stats = RealDeviceMetadataLoader.getStats();
      console.log('📊 Real device metadata stats:', stats);

    } catch (error) {
      console.error('Real device metadata loading failed:', error);
      
      // Fallback to basic filename parsing
      this.loadedFiles = this.loadedFiles.map(file => ({
        ...file,
        title: this.extractTitleFromFilename(file.filename),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        artwork: null,
        metadataLoaded: true,
        source: 'fallback'
      }));

      if (onProgress) {
        onProgress(this.loadedFiles, true);
      }
    }
  }

  // Helper function to extract title from filename
  extractTitleFromFilename(filename) {
    if (!filename) return 'Unknown Track';
    
    let title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Remove common prefixes
    title = title.replace(/^\d+\.\s*/, ''); // Remove track numbers
    title = title.replace(/^\d+\s*-\s*/, ''); // Remove track numbers with dash
    
    // Clean up the title
    title = title.trim();
    
    return title || 'Unknown Track';
  }

  async saveMetadataCache() {
    try {
      const cacheObject = Object.fromEntries(this.metadataCache);
      await FileSystem.writeAsStringAsync(this.METADATA_CACHE_FILE, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save metadata cache:', error);
    }
  }

  // Get current loading stats
  getLoadingStats() {
    return {
      totalFiles: this.loadedFiles.length,
      metadataLoaded: this.loadedFiles.filter(f => f.metadataLoaded).length,
      cacheSize: this.metadataCache.size,
      isLoading: this.isLoading,
    };
  }

  // Clear all caches
  async clearCache() {
    this.metadataCache.clear();
    this.loadedFiles = [];
    
    try {
      await FileSystem.deleteAsync(this.METADATA_CACHE_FILE, { idempotent: true });
      console.log('🧹 Progressive cache cleared');
    } catch (error) {
      console.log('Cache clear failed:', error);
    }
  }

  // Memory management
  optimizeMemory() {
    // Clear old metadata cache entries
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    let cleared = 0;

    for (const [key, value] of this.metadataCache.entries()) {
      if (value.cachedAt && (now - value.cachedAt) > maxAge) {
        this.metadataCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old metadata entries`);
    }
  }
}

// Semaphore for controlling concurrency
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.max) {
        this.current++;
        resolve(() => this.release());
      } else {
        this.queue.push(() => {
          this.current++;
          resolve(() => this.release());
        });
      }
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

export default new ProgressiveMediaLoader();