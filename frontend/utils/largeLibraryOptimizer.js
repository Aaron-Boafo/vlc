import { InteractionManager, Platform } from 'react-native';
import MemoryManager from './memoryManager';

// Specialized optimizer for handling very large media libraries (10k+ files)
class LargeLibraryOptimizer {
  constructor() {
    this.LARGE_LIBRARY_THRESHOLD = 5000; // Consider library "large" at 5k+ files
    this.HUGE_LIBRARY_THRESHOLD = 20000; // Consider library "huge" at 20k+ files
    
    // Performance settings based on library size
    this.performanceSettings = {
      small: {
        batchSize: 50,
        metadataConcurrency: 4,
        cacheSize: 1000,
        enableAnimations: true,
        enableThumbnails: true,
        renderBatchSize: 20,
      },
      large: {
        batchSize: 100,
        metadataConcurrency: 2,
        cacheSize: 2000,
        enableAnimations: true,
        enableThumbnails: true,
        renderBatchSize: 15,
      },
      huge: {
        batchSize: 200,
        metadataConcurrency: 1,
        cacheSize: 1000, // Smaller cache for huge libraries
        enableAnimations: false,
        enableThumbnails: false,
        renderBatchSize: 10,
      }
    };
    
    this.currentSettings = this.performanceSettings.small;
    this.librarySize = 0;
    this.isOptimized = false;
  }

  // Analyze library size and optimize settings
  optimizeForLibrarySize(fileCount) {
    this.librarySize = fileCount;
    
    if (fileCount >= this.HUGE_LIBRARY_THRESHOLD) {
      this.currentSettings = this.performanceSettings.huge;
      console.log(`📚 HUGE library detected (${fileCount} files) - applying aggressive optimizations`);
    } else if (fileCount >= this.LARGE_LIBRARY_THRESHOLD) {
      this.currentSettings = this.performanceSettings.large;
      console.log(`📚 Large library detected (${fileCount} files) - applying optimizations`);
    } else {
      this.currentSettings = this.performanceSettings.small;
      console.log(`📚 Standard library size (${fileCount} files) - using default settings`);
    }
    
    // Apply memory optimizations
    this.applyMemoryOptimizations();
    this.isOptimized = true;
    
    return this.currentSettings;
  }

  // Apply memory optimizations based on library size
  applyMemoryOptimizations() {
    // Adjust memory manager settings
    MemoryManager.optimizeCacheSizes();
    
    // For huge libraries, be more aggressive with cleanup
    if (this.librarySize >= this.HUGE_LIBRARY_THRESHOLD) {
      // Force cleanup every 2 minutes for huge libraries
      setInterval(() => {
        InteractionManager.runAfterInteractions(() => {
          MemoryManager.cleanupAllCaches();
        });
      }, 2 * 60 * 1000);
    }
  }

  // Get optimized FlatList props for large libraries
  getOptimizedFlatListProps() {
    const baseProps = {
      removeClippedSubviews: true,
      maxToRenderPerBatch: this.currentSettings.renderBatchSize,
      updateCellsBatchingPeriod: 50,
      windowSize: this.currentSettings.renderBatchSize + 1,
      initialNumToRender: this.currentSettings.renderBatchSize,
      getItemLayout: this.getItemLayout,
    };

    // Additional optimizations for large libraries
    if (this.librarySize >= this.LARGE_LIBRARY_THRESHOLD) {
      return {
        ...baseProps,
        legacyImplementation: false,
        disableVirtualization: false,
        keyExtractor: this.optimizedKeyExtractor,
      };
    }

    return baseProps;
  }

  // Optimized key extractor for better performance
  optimizedKeyExtractor = (item, index) => {
    // Use index for better performance with large lists
    return `${item.id}_${index}`;
  };

  // Optimized item layout for consistent performance
  getItemLayout = (data, index) => {
    const ITEM_HEIGHT = 80;
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  };

  // Batch metadata loading for large libraries
  async batchLoadMetadata(files, metadataLoader, onProgress) {
    if (!files || files.length === 0) return [];

    const batchSize = this.currentSettings.batchSize;
    const concurrency = this.currentSettings.metadataConcurrency;
    const results = [];
    
    console.log(`🔄 Batch loading metadata for ${files.length} files (batch: ${batchSize}, concurrency: ${concurrency})`);

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // Process batch with limited concurrency
      const batchPromises = [];
      for (let j = 0; j < batch.length; j += concurrency) {
        const concurrentBatch = batch.slice(j, j + concurrency);
        const promise = this.processConcurrentBatch(concurrentBatch, metadataLoader);
        batchPromises.push(promise);
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      const flatResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);
      
      results.push(...flatResults);
      
      // Update progress
      if (onProgress) {
        const progress = Math.min(1, (i + batchSize) / files.length);
        onProgress(results, progress);
      }
      
      // Small delay between batches to prevent overwhelming the device
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(`✅ Batch metadata loading complete: ${results.length}/${files.length} files processed`);
    return results;
  }

  // Process a small batch of files concurrently
  async processConcurrentBatch(files, metadataLoader) {
    const promises = files.map(file => 
      metadataLoader(file).catch(error => {
        console.log(`Metadata failed for ${file.filename}:`, error.message);
        return null;
      })
    );
    
    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  // Virtualized search for large libraries
  createVirtualizedSearch(files, searchFields = ['title', 'artist', 'album', 'filename']) {
    // For huge libraries, use more efficient search
    if (this.librarySize >= this.HUGE_LIBRARY_THRESHOLD) {
      return this.createIndexedSearch(files, searchFields);
    }
    
    // Standard search for smaller libraries
    return (query) => {
      if (!query || query.length < 2) return files;
      
      const lowerQuery = query.toLowerCase();
      return files.filter(file => 
        searchFields.some(field => 
          file[field]?.toLowerCase().includes(lowerQuery)
        )
      );
    };
  }

  // Create indexed search for huge libraries
  createIndexedSearch(files, searchFields) {
    // Build search index
    const searchIndex = new Map();
    
    files.forEach((file, index) => {
      searchFields.forEach(field => {
        const value = file[field];
        if (value && typeof value === 'string') {
          const words = value.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length >= 2) {
              if (!searchIndex.has(word)) {
                searchIndex.set(word, new Set());
              }
              searchIndex.get(word).add(index);
            }
          });
        }
      });
    });

    console.log(`🔍 Built search index with ${searchIndex.size} terms for ${files.length} files`);

    // Return optimized search function
    return (query) => {
      if (!query || query.length < 2) return files;
      
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
      if (queryWords.length === 0) return files;
      
      // Find intersection of all query words
      let resultIndices = null;
      
      for (const word of queryWords) {
        const wordIndices = searchIndex.get(word);
        if (!wordIndices) {
          return []; // No results if any word is not found
        }
        
        if (resultIndices === null) {
          resultIndices = new Set(wordIndices);
        } else {
          // Intersection
          resultIndices = new Set([...resultIndices].filter(i => wordIndices.has(i)));
        }
        
        if (resultIndices.size === 0) break;
      }
      
      return resultIndices ? Array.from(resultIndices).map(i => files[i]) : [];
    };
  }

  // Get current optimization status
  getOptimizationStatus() {
    return {
      librarySize: this.librarySize,
      isOptimized: this.isOptimized,
      settings: this.currentSettings,
      memoryStats: MemoryManager.getMemoryStats(),
    };
  }

  // Emergency optimization for when app becomes sluggish
  emergencyOptimization() {
    console.log('🚨 Emergency optimization triggered');
    
    // Force memory cleanup
    MemoryManager.emergencyCleanup();
    
    // Switch to most aggressive settings
    this.currentSettings = {
      ...this.performanceSettings.huge,
      renderBatchSize: 5, // Very small batches
      cacheSize: 500, // Very small cache
    };
    
    // Disable all animations
    this.currentSettings.enableAnimations = false;
    this.currentSettings.enableThumbnails = false;
    
    console.log('🚨 Emergency optimization applied');
    return this.currentSettings;
  }

  // Check if library should be considered large
  isLargeLibrary() {
    return this.librarySize >= this.LARGE_LIBRARY_THRESHOLD;
  }

  // Check if library should be considered huge
  isHugeLibrary() {
    return this.librarySize >= this.HUGE_LIBRARY_THRESHOLD;
  }

  // Get recommended settings for current library size
  getRecommendedSettings() {
    return {
      ...this.currentSettings,
      librarySize: this.librarySize,
      optimizationLevel: this.isHugeLibrary() ? 'aggressive' : this.isLargeLibrary() ? 'moderate' : 'standard'
    };
  }
}

export default new LargeLibraryOptimizer();