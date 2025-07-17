import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { getAudioMetadata } from '@missingcore/audio-metadata';

// Fast media loader with intelligent caching and progressive loading
class FastMediaLoader {
  constructor() {
    this.CACHE_DIR = FileSystem.documentDirectory + 'mediaCache/';
    this.METADATA_CACHE = FileSystem.documentDirectory + 'metadataCache.json';
    this.BATCH_SIZE = 50; // Smaller batches for faster initial load
    this.CONCURRENT_METADATA = 3; // Limit concurrent metadata requests
    this.metadataCache = new Map();
    this.loadingPromises = new Map();
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      
      // Load metadata cache
      const cacheInfo = await FileSystem.getInfoAsync(this.METADATA_CACHE);
      if (cacheInfo.exists) {
        const cacheData = await FileSystem.readAsStringAsync(this.METADATA_CACHE);
        const parsed = JSON.parse(cacheData);
        this.metadataCache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.log('Cache initialization failed:', error);
    }
  }

  // Fast initial load - get basic file info immediately
  async loadMediaFast(mediaType = 'audio', onProgress = null) {
    const startTime = Date.now();
    console.log(`🚀 Starting fast ${mediaType} load...`);
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media permission not granted');
      }

      const allFiles = [];
      let hasNextPage = true;
      let after;
      let batchCount = 0;

      while (hasNextPage && batchCount < 100) { // Safety limit
        const mediaTypeEnum = mediaType === 'audio' 
          ? MediaLibrary.MediaType.audio 
          : MediaLibrary.MediaType.video;

        const assets = await MediaLibrary.getAssetsAsync({
          mediaType: mediaTypeEnum,
          first: this.BATCH_SIZE,
          after,
          sortBy: [MediaLibrary.SortBy.modificationTime],
        });

        if (!assets.assets || assets.assets.length === 0) break;

        // Create basic file objects immediately and filter out null values
        const basicFiles = assets.assets
          .map(asset => this.createBasicFileObject(asset, mediaType))
          .filter(file => file !== null);
        allFiles.push(...basicFiles);

        // Notify progress immediately
        if (onProgress) {
          onProgress(allFiles, false); // false = not complete
        }

        hasNextPage = assets.hasNextPage;
        after = assets.endCursor;
        batchCount++;

        // Small yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ Fast ${mediaType} load complete: ${allFiles.length} files in ${loadTime}ms`);

      // Final progress update
      if (onProgress) {
        onProgress(allFiles, true); // true = complete
      }

      // Start background metadata loading
      this.loadMetadataInBackground(allFiles, mediaType);

      return allFiles;
    } catch (error) {
      console.error(`❌ Fast ${mediaType} load failed:`, error);
      throw error;
    }
  }

  createBasicFileObject(asset, mediaType) {
    const filename = asset.filename || 'Unknown';
    const title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Skip assets without valid URIs
    if (!asset.uri || asset.uri.trim() === '') {
      console.warn('⚠️ Skipping asset without URI:', filename);
      return null;
    }
    
    const baseObject = {
      id: asset.id,
      uri: asset.uri,
      filename,
      duration: asset.duration || 0,
      modificationTime: asset.modificationTime,
      creationTime: asset.creationTime,
      metadataLoaded: false,
    };

    if (mediaType === 'audio') {
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

  // Background metadata loading with intelligent batching
  async loadMetadataInBackground(files, mediaType, onUpdate = null) {
    if (mediaType !== 'audio') return; // Only audio needs metadata

    console.log(`🔄 Starting background metadata for ${files.length} files...`);
    
    // Sort by priority - recently added files first
    const sortedFiles = [...files].sort((a, b) => 
      (b.modificationTime || 0) - (a.modificationTime || 0)
    );

    // Process in small concurrent batches
    const semaphore = new Semaphore(this.CONCURRENT_METADATA);
    const promises = sortedFiles.map(file => 
      semaphore.acquire().then(async (release) => {
        try {
          await this.loadSingleMetadata(file, onUpdate);
        } finally {
          release();
        }
      })
    );

    await Promise.allSettled(promises);
    
    // Save metadata cache
    await this.saveMetadataCache();
    console.log('✅ Background metadata loading complete');
  }

  async loadSingleMetadata(file, onUpdate = null) {
    // Check cache first
    const cacheKey = `${file.id}_${file.modificationTime}`;
    if (this.metadataCache.has(cacheKey)) {
      const cached = this.metadataCache.get(cacheKey);
      if (onUpdate) {
        onUpdate({ ...file, ...cached, metadataLoaded: true });
      }
      return;
    }

    // Prevent duplicate requests
    if (this.loadingPromises.has(file.id)) {
      return this.loadingPromises.get(file.id);
    }

    const promise = this.extractMetadata(file, cacheKey, onUpdate);
    this.loadingPromises.set(file.id, promise);
    
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(file.id);
    }
  }

  async extractMetadata(file, cacheKey, onUpdate) {
    try {
      const metadata = await getAudioMetadata(file.uri, [
        'album', 'artist', 'name', 'year', 'artwork'
      ]);

      const data = metadata.metadata || {};
      let artworkUri = null;

      // Handle artwork efficiently
      if (data.artwork) {
        if (data.artwork.startsWith('data:image')) {
          artworkUri = data.artwork;
        } else if (typeof data.artwork === 'string' && data.artwork.length > 100) {
          artworkUri = `data:image/png;base64,${data.artwork}`;
        }
      }

      const metadataResult = {
        title: data.name || file.title,
        artist: data.artist || 'Unknown Artist',
        album: data.album || 'Unknown Album',
        year: data.year || null,
        artwork: artworkUri,
      };

      // Cache the result
      this.metadataCache.set(cacheKey, metadataResult);

      // Update UI immediately
      if (onUpdate) {
        onUpdate({ ...file, ...metadataResult, metadataLoaded: true });
      }

    } catch (error) {
      console.log(`Metadata extraction failed for ${file.filename}:`, error.message);
      
      // Cache the failure to avoid retrying
      const fallbackResult = {
        title: file.title,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        artwork: null,
      };
      
      this.metadataCache.set(cacheKey, fallbackResult);
      
      if (onUpdate) {
        onUpdate({ ...file, ...fallbackResult, metadataLoaded: true });
      }
    }
  }

  async saveMetadataCache() {
    try {
      const cacheObject = Object.fromEntries(this.metadataCache);
      await FileSystem.writeAsStringAsync(this.METADATA_CACHE, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save metadata cache:', error);
    }
  }

  // Clear old cache entries
  async cleanupCache() {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();
    
    for (const [key, value] of this.metadataCache.entries()) {
      if (value.cachedAt && (now - value.cachedAt) > maxAge) {
        this.metadataCache.delete(key);
      }
    }
    
    await this.saveMetadataCache();
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

export default new FastMediaLoader();