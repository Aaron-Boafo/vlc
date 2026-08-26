import * as FileSystem from 'expo-file-system';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { InteractionManager, Platform } from 'react-native';
import DeviceOptimizer from './deviceOptimizer';

// Optimized metadata loader for real devices with fallback strategies
class RealDeviceMetadataLoader {
  constructor() {
    this.METADATA_CACHE_FILE = FileSystem.documentDirectory + 'realDeviceMetadata.json';
    this.FALLBACK_CACHE_FILE = FileSystem.documentDirectory + 'fallbackMetadata.json';
    
    // Real device optimized settings
    const deviceSettings = DeviceOptimizer.getProgressiveLoadingSettings();
    this.MAX_CONCURRENT = Math.max(1, Math.floor(deviceSettings.maxConcurrentMetadata / 2)); // More conservative
    this.TIMEOUT_MS = Platform.OS === 'android' ? 8000 : 5000; // Longer timeout for Android
    this.RETRY_ATTEMPTS = 2;
    this.BATCH_DELAY = Platform.OS === 'android' ? 200 : 100; // Longer delay for Android
    
    // Caching
    this.metadataCache = new Map();
    this.fallbackCache = new Map();
    this.failedFiles = new Set();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Statistics
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      cached: 0,
      fallback: 0
    };
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      // Load main metadata cache
      const cacheInfo = await FileSystem.getInfoAsync(this.METADATA_CACHE_FILE);
      if (cacheInfo.exists) {
        const cacheData = await FileSystem.readAsStringAsync(this.METADATA_CACHE_FILE);
        const parsed = JSON.parse(cacheData);
        this.metadataCache = new Map(Object.entries(parsed));
        console.log(`📚 Loaded ${this.metadataCache.size} metadata entries from cache`);
      }

      // Load fallback cache
      const fallbackInfo = await FileSystem.getInfoAsync(this.FALLBACK_CACHE_FILE);
      if (fallbackInfo.exists) {
        const fallbackData = await FileSystem.readAsStringAsync(this.FALLBACK_CACHE_FILE);
        const parsed = JSON.parse(fallbackData);
        this.fallbackCache = new Map(Object.entries(parsed));
        console.log(`📚 Loaded ${this.fallbackCache.size} fallback entries from cache`);
      }
    } catch (error) {
      console.log('Real device metadata cache initialization failed:', error);
    }
  }

  // Enhanced metadata loading with multiple fallback strategies
  async loadMetadataForFiles(files, onProgress = null) {
    if (!files || files.length === 0) return [];

    console.log(`🔄 Starting REAL DEVICE metadata loading for ${files.length} files...`);
    this.stats.total = files.length;

    // Filter files that need metadata
    const filesNeedingMetadata = files.filter(file => {
      const cacheKey = this.getCacheKey(file);
      return !this.metadataCache.has(cacheKey) && !this.failedFiles.has(cacheKey);
    });

    if (filesNeedingMetadata.length === 0) {
      console.log('✅ All files already have metadata or failed previously');
      return this.applyMetadataToFiles(files);
    }

    // Process files with multiple strategies
    await this.processFilesWithFallbacks(filesNeedingMetadata, onProgress);
    
    // Apply metadata to all files
    const enhancedFiles = this.applyMetadataToFiles(files);
    
    // Save caches
    await this.saveCaches();
    
    console.log(`✅ Real device metadata complete:`, this.stats);
    return enhancedFiles;
  }

  async processFilesWithFallbacks(files, onProgress) {
    // Strategy 1: Try standard metadata extraction with timeout
    console.log('📱 Strategy 1: Standard metadata extraction...');
    await this.processWithStandardExtraction(files, onProgress);

    // Strategy 2: Filename-based fallback for failed files
    const remainingFiles = files.filter(file => {
      const cacheKey = this.getCacheKey(file);
      return !this.metadataCache.has(cacheKey);
    });

    if (remainingFiles.length > 0) {
      console.log(`📱 Strategy 2: Filename-based fallback for ${remainingFiles.length} files...`);
      await this.processWithFilenameFallback(remainingFiles, onProgress);
    }

    // Strategy 3: Basic info extraction for still failed files
    const stillFailedFiles = files.filter(file => {
      const cacheKey = this.getCacheKey(file);
      return !this.metadataCache.has(cacheKey) && !this.fallbackCache.has(cacheKey);
    });

    if (stillFailedFiles.length > 0) {
      console.log(`📱 Strategy 3: Basic info for ${stillFailedFiles.length} files...`);
      this.processWithBasicInfo(stillFailedFiles, onProgress);
    }
  }

  async processWithStandardExtraction(files, onProgress) {
    const semaphore = new Semaphore(this.MAX_CONCURRENT);
    const batchSize = 3; // Small batches for real devices
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const promises = batch.map(file => 
        semaphore.acquire().then(async (release) => {
          try {
            await this.extractMetadataWithTimeout(file);
            this.stats.successful++;
          } catch (error) {
            console.log(`Metadata extraction failed for ${file.filename}:`, error.message);
            this.stats.failed++;
          } finally {
            release();
          }
        })
      );

      await Promise.allSettled(promises);

      // Update UI periodically
      if (onProgress && i % (batchSize * 2) === 0) {
        const enhancedFiles = this.applyMetadataToFiles(files);
        InteractionManager.runAfterInteractions(() => {
          onProgress(enhancedFiles, false);
        });
      }

      // Delay between batches to prevent overwhelming the device
      await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
    }
  }

  async extractMetadataWithTimeout(file) {
    const cacheKey = this.getCacheKey(file);
    
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Metadata extraction timeout for ${file.filename}`));
      }, this.TIMEOUT_MS);

      try {
        // Try to extract metadata with timeout
        const metadata = await getAudioMetadata(file.uri, [
          'album', 'artist', 'name', 'year', 'artwork'
        ]);

        clearTimeout(timeout);

        const data = metadata.metadata || {};
        let artworkUri = null;

        // Handle artwork more safely for real devices
        if (data.artwork) {
          try {
            if (typeof data.artwork === 'string') {
              if (data.artwork.startsWith('data:image')) {
                artworkUri = data.artwork;
              } else if (data.artwork.length > 50 && data.artwork.length < 1000000) { // Size limits
                artworkUri = `data:image/png;base64,${data.artwork}`;
              }
            }
          } catch (artworkError) {
            console.log('Artwork processing failed:', artworkError.message);
            artworkUri = null;
          }
        }

        const metadataResult = {
          title: data.name || this.extractTitleFromFilename(file.filename),
          artist: data.artist || 'Unknown Artist',
          album: data.album || 'Unknown Album',
          year: data.year || null,
          artwork: artworkUri,
          cachedAt: Date.now(),
          source: 'metadata'
        };

        this.metadataCache.set(cacheKey, metadataResult);
        resolve(metadataResult);

      } catch (error) {
        clearTimeout(timeout);
        this.failedFiles.add(cacheKey);
        reject(error);
      }
    });
  }

  async processWithFilenameFallback(files, onProgress) {
    for (const file of files) {
      const cacheKey = this.getCacheKey(file);
      const fallbackMetadata = this.extractMetadataFromFilename(file);
      
      this.fallbackCache.set(cacheKey, {
        ...fallbackMetadata,
        cachedAt: Date.now(),
        source: 'filename'
      });
      
      this.stats.fallback++;
    }

    if (onProgress) {
      const enhancedFiles = this.applyMetadataToFiles(files);
      InteractionManager.runAfterInteractions(() => {
        onProgress(enhancedFiles, false);
      });
    }
  }

  processWithBasicInfo(files, onProgress) {
    for (const file of files) {
      const cacheKey = this.getCacheKey(file);
      const basicInfo = {
        title: this.extractTitleFromFilename(file.filename),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        artwork: null,
        cachedAt: Date.now(),
        source: 'basic'
      };
      
      this.fallbackCache.set(cacheKey, basicInfo);
      this.stats.fallback++;
    }

    if (onProgress) {
      const enhancedFiles = this.applyMetadataToFiles(files);
      InteractionManager.runAfterInteractions(() => {
        onProgress(enhancedFiles, true);
      });
    }
  }

  // Smart filename parsing for metadata extraction
  extractMetadataFromFilename(file) {
    const filename = file.filename || '';
    let title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';

    // Common patterns: "Artist - Title", "Artist - Album - Title", etc.
    const patterns = [
      /^(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/, // Artist - Album - Title
      /^(.+?)\s*-\s*(.+)$/, // Artist - Title
      /^(\d+)\.\s*(.+?)\s*-\s*(.+)$/, // Track# Artist - Title
      /^(\d+)\s*-\s*(.+)$/, // Track# - Title
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        if (match.length === 4) { // Artist - Album - Title
          artist = match[1].trim();
          album = match[2].trim();
          title = match[3].trim();
        } else if (match.length === 3) { // Artist - Title or Track# Artist - Title
          if (isNaN(match[1])) { // Artist - Title
            artist = match[1].trim();
            title = match[2].trim();
          } else { // Track# Artist - Title
            artist = match[2].trim();
            title = match[3].trim();
          }
        }
        break;
      }
    }

    return { title, artist, album, year: null, artwork: null };
  }

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

  applyMetadataToFiles(files) {
    return files.map(file => {
      const cacheKey = this.getCacheKey(file);
      
      // Try main cache first
      let metadata = this.metadataCache.get(cacheKey);
      if (metadata) {
        this.stats.cached++;
        return { ...file, ...metadata, metadataLoaded: true };
      }
      
      // Try fallback cache
      metadata = this.fallbackCache.get(cacheKey);
      if (metadata) {
        return { ...file, ...metadata, metadataLoaded: true };
      }
      
      // Return file with basic info
      return {
        ...file,
        title: this.extractTitleFromFilename(file.filename),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        artwork: null,
        metadataLoaded: true,
        source: 'fallback'
      };
    });
  }

  getCacheKey(file) {
    return `${file.id}_${file.modificationTime || file.creationTime}`;
  }

  async saveCaches() {
    try {
      // Save main metadata cache
      const metadataObject = Object.fromEntries(this.metadataCache);
      await FileSystem.writeAsStringAsync(this.METADATA_CACHE_FILE, JSON.stringify(metadataObject));
      
      // Save fallback cache
      const fallbackObject = Object.fromEntries(this.fallbackCache);
      await FileSystem.writeAsStringAsync(this.FALLBACK_CACHE_FILE, JSON.stringify(fallbackObject));
      
      console.log('💾 Real device metadata caches saved');
    } catch (error) {
      console.error('Failed to save real device metadata caches:', error);
    }
  }

  // Get loading statistics
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.metadataCache.size,
      fallbackCacheSize: this.fallbackCache.size,
      failedFiles: this.failedFiles.size,
      successRate: this.stats.total > 0 ? (this.stats.successful / this.stats.total * 100).toFixed(1) : 0
    };
  }

  // Clear all caches and reset
  async clearCache() {
    this.metadataCache.clear();
    this.fallbackCache.clear();
    this.failedFiles.clear();
    
    try {
      await FileSystem.deleteAsync(this.METADATA_CACHE_FILE, { idempotent: true });
      await FileSystem.deleteAsync(this.FALLBACK_CACHE_FILE, { idempotent: true });
      console.log('🧹 Real device metadata cache cleared');
    } catch (error) {
      console.log('Cache clear failed:', error);
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

export default new RealDeviceMetadataLoader();