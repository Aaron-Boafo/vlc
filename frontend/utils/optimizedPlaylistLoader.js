import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { getAudioMetadata } from '@missingcore/audio-metadata';

/**
 * Optimized Playlist Creation Loader
 * Fast loading for both audio and video files in playlist creation
 */

const THUMBNAIL_CACHE_DIR = `${FileSystem.documentDirectory}thumbnails/`;
const METADATA_CACHE_FILE = `${FileSystem.documentDirectory}playlistMetadataCache.json`;
const BATCH_SIZE = 50; // Load files in batches
const THUMBNAIL_BATCH_SIZE = 5; // Generate thumbnails in smaller batches

class OptimizedPlaylistLoader {
  static metadataCache = new Map();
  static thumbnailCache = new Map();
  static isInitialized = false;

  // Initialize caches and directories
  static async initialize() {
    if (this.isInitialized) return;

    try {
      // Create thumbnail directory
      const dirInfo = await FileSystem.getInfoAsync(THUMBNAIL_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(THUMBNAIL_CACHE_DIR, { intermediates: true });
      }

      // Load metadata cache
      await this.loadMetadataCache();
      
      this.isInitialized = true;
      console.log('📚 Playlist loader initialized');
    } catch (error) {
      console.log('Initialization error:', error);
      this.isInitialized = true;
    }
  }

  // Load metadata cache
  static async loadMetadataCache() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(METADATA_CACHE_FILE);
      if (fileInfo.exists) {
        const json = await FileSystem.readAsStringAsync(METADATA_CACHE_FILE);
        const data = JSON.parse(json);
        this.metadataCache = new Map(Object.entries(data));
        console.log(`📚 Loaded ${this.metadataCache.size} cached metadata entries`);
      }
    } catch (error) {
      console.log('Metadata cache load error:', error);
    }
  }

  // Save metadata cache
  static async saveMetadataCache() {
    try {
      const data = Object.fromEntries(this.metadataCache);
      await FileSystem.writeAsStringAsync(METADATA_CACHE_FILE, JSON.stringify(data));
    } catch (error) {
      console.log('Metadata cache save error:', error);
    }
  }

  // Fast load audio files for playlist creation
  static async loadAudioFilesForPlaylist(onProgress) {
    if (!this.isInitialized) await this.initialize();

    console.log('⚡ Loading audio files for playlist...');
    let allFiles = [];
    let after = null;
    let hasNextPage = true;
    let totalLoaded = 0;

    try {
      // First, load basic file info quickly
      while (hasNextPage) {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: BATCH_SIZE,
          after: after,
        });

        // Create basic file objects
        const basicFiles = media.assets.map(asset => ({
          id: asset.id,
          uri: asset.uri,
          filename: asset.filename,
          duration: asset.duration,
          title: asset.filename.replace(/\.[^/.]+$/, ""),
          artist: "Loading...",
          album: "Loading...",
          artwork: null,
          metadataLoaded: false,
          type: 'audio'
        }));

        allFiles = [...allFiles, ...basicFiles];
        totalLoaded += basicFiles.length;

        // Report progress immediately
        if (onProgress) {
          onProgress({
            type: 'audio',
            loaded: totalLoaded,
            total: totalLoaded, // We don't know total yet
            phase: 'loading_files'
          });
        }

        hasNextPage = media.hasNextPage;
        after = media.endCursor;
      }

      console.log(`⚡ Loaded ${allFiles.length} audio files, now loading metadata...`);

      // Then, load metadata in background batches
      this.loadMetadataInBackground(allFiles, onProgress);

      return allFiles;
    } catch (error) {
      console.error('❌ Audio loading failed:', error);
      throw error;
    }
  }

  // Fast load video files for playlist creation
  static async loadVideoFilesForPlaylist(onProgress) {
    if (!this.isInitialized) await this.initialize();

    console.log('⚡ Loading video files for playlist...');
    let allFiles = [];
    let after = null;
    let hasNextPage = true;
    let totalLoaded = 0;

    try {
      // Load basic video file info
      while (hasNextPage) {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.video,
          first: BATCH_SIZE,
          after: after,
        });

        // Create basic file objects
        const basicFiles = media.assets.map(asset => ({
          id: asset.id,
          uri: asset.uri,
          filename: asset.filename,
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
          title: asset.filename.replace(/\.[^/.]+$/, ""),
          thumbnail: null,
          thumbnailLoaded: false,
          type: 'video'
        }));

        allFiles = [...allFiles, ...basicFiles];
        totalLoaded += basicFiles.length;

        // Report progress
        if (onProgress) {
          onProgress({
            type: 'video',
            loaded: totalLoaded,
            total: totalLoaded,
            phase: 'loading_files'
          });
        }

        hasNextPage = media.hasNextPage;
        after = media.endCursor;
      }

      console.log(`⚡ Loaded ${allFiles.length} video files, now generating thumbnails...`);

      // Generate thumbnails in background
      this.generateThumbnailsInBackground(allFiles, onProgress);

      return allFiles;
    } catch (error) {
      console.error('❌ Video loading failed:', error);
      throw error;
    }
  }

  // Load metadata in background batches
  static async loadMetadataInBackground(files, onProgress) {
    let processed = 0;

    for (let i = 0; i < files.length; i += 10) {
      const batch = files.slice(i, i + 10);
      
      // Process batch
      const promises = batch.map(async (file, index) => {
        try {
          const cacheKey = `${file.uri}_${file.filename}`;
          
          // Check cache first
          if (this.metadataCache.has(cacheKey)) {
            const cached = this.metadataCache.get(cacheKey);
            Object.assign(files[i + index], cached, { metadataLoaded: true });
            return;
          }

          // Extract metadata
          const data = await getAudioMetadata(file.uri, ["album", "artist", "name", "artwork"]);
          const metadata = data.metadata || {};

          const processedData = {
            title: metadata.name || file.filename.replace(/\.[^/.]+$/, ""),
            artist: metadata.artist || "Unknown Artist",
            album: metadata.album || "Unknown Album",
            artwork: metadata.artwork || null,
            metadataLoaded: true
          };

          // Update file object
          Object.assign(files[i + index], processedData);

          // Cache the result
          this.metadataCache.set(cacheKey, processedData);
        } catch (error) {
          // Fallback data
          Object.assign(files[i + index], {
            title: file.filename.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            album: "Unknown Album",
            artwork: null,
            metadataLoaded: true
          });
        }
      });

      await Promise.allSettled(promises);
      processed += batch.length;

      // Report progress
      if (onProgress) {
        onProgress({
          type: 'audio',
          loaded: processed,
          total: files.length,
          phase: 'loading_metadata'
        });
      }

      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Save cache
    await this.saveMetadataCache();
    console.log(`✅ Metadata loading complete for ${files.length} files`);
  }

  // Generate thumbnails in background batches
  static async generateThumbnailsInBackground(files, onProgress) {
    let processed = 0;

    for (let i = 0; i < files.length; i += THUMBNAIL_BATCH_SIZE) {
      const batch = files.slice(i, i + THUMBNAIL_BATCH_SIZE);
      
      const promises = batch.map(async (file, index) => {
        try {
          const thumbnailPath = `${THUMBNAIL_CACHE_DIR}${file.id}.jpg`;
          
          // Check if thumbnail already exists
          const thumbnailInfo = await FileSystem.getInfoAsync(thumbnailPath);
          if (thumbnailInfo.exists) {
            files[i + index].thumbnail = thumbnailPath;
            files[i + index].thumbnailLoaded = true;
            return;
          }

          // Generate thumbnail
          const { uri } = await VideoThumbnails.getThumbnailAsync(file.uri, {
            time: 1000,
            quality: 0.7,
          });

          // Move to cache directory
          await FileSystem.moveAsync({
            from: uri,
            to: thumbnailPath
          });

          files[i + index].thumbnail = thumbnailPath;
          files[i + index].thumbnailLoaded = true;
        } catch (error) {
          files[i + index].thumbnail = null;
          files[i + index].thumbnailLoaded = true;
        }
      });

      await Promise.allSettled(promises);
      processed += batch.length;

      // Report progress
      if (onProgress) {
        onProgress({
          type: 'video',
          loaded: processed,
          total: files.length,
          phase: 'generating_thumbnails'
        });
      }

      // Delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Thumbnail generation complete for ${files.length} files`);
  }

  // Load both audio and video files
  static async loadAllMediaForPlaylist(onProgress) {
    const results = await Promise.allSettled([
      this.loadAudioFilesForPlaylist(onProgress),
      this.loadVideoFilesForPlaylist(onProgress)
    ]);

    const audioFiles = results[0].status === 'fulfilled' ? results[0].value : [];
    const videoFiles = results[1].status === 'fulfilled' ? results[1].value : [];

    return {
      audio: audioFiles,
      video: videoFiles,
      total: audioFiles.length + videoFiles.length
    };
  }

  // Clear all caches
  static async clearCache() {
    try {
      // Clear metadata cache
      await FileSystem.deleteAsync(METADATA_CACHE_FILE);
      this.metadataCache.clear();

      // Clear thumbnail cache
      await FileSystem.deleteAsync(THUMBNAIL_CACHE_DIR);
      this.thumbnailCache.clear();

      console.log('🗑️ All caches cleared');
    } catch (error) {
      console.log('Cache clear error:', error);
    }
  }
}

export default OptimizedPlaylistLoader;