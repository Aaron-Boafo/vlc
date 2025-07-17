import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { InteractionManager } from 'react-native';

// ULTIMATE loading procedure - even faster and smarter
class UltimateMediaLoader {
    constructor() {
        this.CACHE_DIR = FileSystem.documentDirectory + 'ultimateCache/';
        this.INDEX_CACHE = FileSystem.documentDirectory + 'mediaIndex.json';
        this.MICRO_BATCH_SIZE = 20; // Smaller batches for instant UI updates
        this.PREFETCH_COUNT = 5; // Prefetch metadata for first 5 files immediately
        this.WORKER_POOL_SIZE = 2; // Optimal for mobile devices

        // Advanced caching
        this.memoryCache = new Map();
        this.indexCache = new Map();
        this.loadingQueue = [];
        this.isProcessing = false;

        this.initializeUltimateCache();
    }

    async initializeUltimateCache() {
        try {
            await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });

            // Load index cache for instant startup
            const indexInfo = await FileSystem.getInfoAsync(this.INDEX_CACHE);
            if (indexInfo.exists) {
                const indexData = await FileSystem.readAsStringAsync(this.INDEX_CACHE);
                const parsed = JSON.parse(indexData);
                this.indexCache = new Map(Object.entries(parsed));
                console.log(`📚 Loaded ${this.indexCache.size} items from index cache`);
            }
        } catch (error) {
            console.log('Ultimate cache initialization:', error);
        }
    }

    // ULTIMATE loading - fastest possible approach
    async loadMediaUltimate(mediaType = 'audio', onProgress = null, onComplete = null) {
        const startTime = Date.now();
        console.log(`🚀 ULTIMATE ${mediaType} loading started...`);

        try {
            // PHASE 1: Instant cache check (0-50ms)
            const cachedFiles = this.getCachedFiles(mediaType);
            if (cachedFiles.length > 0) {
                console.log(`⚡ Instant cache hit: ${cachedFiles.length} files`);
                if (onProgress) onProgress(cachedFiles, false);
            }

            // PHASE 2: Permission check (parallel)
            const permissionPromise = MediaLibrary.requestPermissionsAsync();

            // PHASE 3: Micro-batch scanning with immediate UI updates
            const { status } = await permissionPromise;
            if (status !== 'granted') {
                throw new Error('Media permission not granted');
            }

            const allFiles = [...cachedFiles];
            let hasNextPage = true;
            let after;
            let batchCount = 0;
            let totalProcessTime = 0;

            while (hasNextPage && batchCount < 200) { // Safety limit
                const batchStart = Date.now();

                const mediaTypeEnum = mediaType === 'audio'
                    ? MediaLibrary.MediaType.audio
                    : MediaLibrary.MediaType.video;

                const assets = await MediaLibrary.getAssetsAsync({
                    mediaType: mediaTypeEnum,
                    first: this.MICRO_BATCH_SIZE,
                    after,
                    sortBy: [MediaLibrary.SortBy.modificationTime],
                });

                if (!assets.assets || assets.assets.length === 0) break;

                // Create basic file objects with smart caching
                const newFiles = assets.assets
                    .map(asset => this.createOptimizedFileObject(asset, mediaType))
                    .filter(file => !allFiles.some(existing => existing.id === file.id));

                allFiles.push(...newFiles);

                // IMMEDIATE UI update (non-blocking)
                if (onProgress && newFiles.length > 0) {
                    InteractionManager.runAfterInteractions(() => {
                        onProgress(allFiles, false);
                    });
                }

                // Update index cache incrementally
                this.updateIndexCache(newFiles, mediaType);

                hasNextPage = assets.hasNextPage;
                after = assets.endCursor;
                batchCount++;

                const batchTime = Date.now() - batchStart;
                totalProcessTime += batchTime;

                // Adaptive batching - adjust size based on performance
                if (batchTime > 100) {
                    this.MICRO_BATCH_SIZE = Math.max(10, this.MICRO_BATCH_SIZE - 5);
                } else if (batchTime < 30) {
                    this.MICRO_BATCH_SIZE = Math.min(50, this.MICRO_BATCH_SIZE + 5);
                }

                // Yield to UI thread every few batches
                if (batchCount % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }

            const loadTime = Date.now() - startTime;
            console.log(`✅ ULTIMATE ${mediaType} load: ${allFiles.length} files in ${loadTime}ms (avg: ${totalProcessTime / batchCount}ms/batch)`);

            // Final progress update
            if (onProgress) {
                onProgress(allFiles, true);
            }

            // PHASE 4: Intelligent metadata prefetching
            this.startIntelligentMetadataLoading(allFiles, mediaType, onProgress);

            // Save complete index
            await this.saveIndexCache(mediaType);

            if (onComplete) onComplete(allFiles);
            return allFiles;

        } catch (error) {
            console.error(`❌ ULTIMATE ${mediaType} load failed:`, error);
            throw error;
        }
    }

    createOptimizedFileObject(asset, mediaType) {
        const filename = asset.filename || 'Unknown';
        const cacheKey = `${asset.id}_${asset.modificationTime}`;

        // Check memory cache first
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey);
        }

        const title = filename.replace(/\.[^/.]+$/, '');

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

        let fileObject;
        if (mediaType === 'audio') {
            fileObject = {
                ...baseObject,
                title,
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                artwork: null,
                year: null,
            };
        } else {
            fileObject = {
                ...baseObject,
                width: asset.width || 0,
                height: asset.height || 0,
                size: asset.fileSize || 0,
            };
        }

        // Cache in memory for instant access
        this.memoryCache.set(cacheKey, fileObject);
        return fileObject;
    }

    // Intelligent metadata loading with priority system
    async startIntelligentMetadataLoading(files, mediaType, onUpdate) {
        if (mediaType !== 'audio') return;

        console.log(`🧠 Starting INTELLIGENT metadata for ${files.length} files...`);

        // Priority system: Recent files first, then by play frequency
        const prioritizedFiles = this.prioritizeFiles(files);

        // IMMEDIATE prefetch for first few files
        const immediateFiles = prioritizedFiles.slice(0, this.PREFETCH_COUNT);
        const backgroundFiles = prioritizedFiles.slice(this.PREFETCH_COUNT);

        // Process immediate files first (blocking)
        await Promise.all(
            immediateFiles.map(file => this.loadMetadataWithPriority(file, 'high', onUpdate))
        );

        // Process background files (non-blocking)
        this.processBackgroundMetadata(backgroundFiles, onUpdate);
    }

    prioritizeFiles(files) {
        return [...files].sort((a, b) => {
            // Recent files get higher priority
            const timeScore = (b.modificationTime || 0) - (a.modificationTime || 0);

            // Files with existing metadata cache get lower priority
            const cacheScore = this.indexCache.has(a.cacheKey) ? -1000 : 1000;

            return timeScore + cacheScore;
        });
    }

    async loadMetadataWithPriority(file, priority = 'normal', onUpdate) {
        // Check index cache first
        if (this.indexCache.has(file.cacheKey)) {
            const cached = this.indexCache.get(file.cacheKey);
            if (onUpdate) {
                onUpdate({ ...file, ...cached, metadataLoaded: true });
            }
            return;
        }

        try {
            const metadata = await getAudioMetadata(file.uri, [
                'album', 'artist', 'name', 'year', 'artwork'
            ]);

            const data = metadata.metadata || {};
            let artworkUri = null;

            // Optimized artwork handling
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
                metadataLoadedAt: Date.now(),
            };

            // Cache immediately
            this.indexCache.set(file.cacheKey, metadataResult);
            this.memoryCache.set(file.cacheKey, { ...file, ...metadataResult, metadataLoaded: true });

            // Update UI
            if (onUpdate) {
                onUpdate({ ...file, ...metadataResult, metadataLoaded: true });
            }

        } catch (error) {
            console.log(`Metadata failed for ${file.filename}:`, error.message);

            const fallbackResult = {
                title: file.title,
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                year: null,
                artwork: null,
                metadataLoadedAt: Date.now(),
            };

            this.indexCache.set(file.cacheKey, fallbackResult);

            if (onUpdate) {
                onUpdate({ ...file, ...fallbackResult, metadataLoaded: true });
            }
        }
    }

    async processBackgroundMetadata(files, onUpdate) {
        // Process in small chunks to avoid blocking
        const chunkSize = 3;
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);

            await Promise.all(
                chunk.map(file => this.loadMetadataWithPriority(file, 'normal', onUpdate))
            );

            // Yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 10));

            // Save progress periodically
            if (i % 20 === 0) {
                await this.saveIndexCache('audio');
            }
        }

        console.log('✅ INTELLIGENT metadata loading complete');
    }

    getCachedFiles(mediaType) {
        const cached = [];
        for (const [key, value] of this.indexCache.entries()) {
            if (value.mediaType === mediaType) {
                cached.push(value);
            }
        }
        return cached;
    }

    updateIndexCache(files, mediaType) {
        files.forEach(file => {
            this.indexCache.set(file.cacheKey, { ...file, mediaType });
        });
    }

    async saveIndexCache(mediaType) {
        try {
            const cacheObject = Object.fromEntries(this.indexCache);
            await FileSystem.writeAsStringAsync(this.INDEX_CACHE, JSON.stringify(cacheObject));
        } catch (error) {
            console.error('Failed to save index cache:', error);
        }
    }

    // Memory management
    clearMemoryCache() {
        this.memoryCache.clear();
        console.log('🧹 Memory cache cleared');
    }

    // Performance analytics
    getPerformanceStats() {
        return {
            memoryCacheSize: this.memoryCache.size,
            indexCacheSize: this.indexCache.size,
            currentBatchSize: this.MICRO_BATCH_SIZE,
        };
    }
}

export default new UltimateMediaLoader();