import { InteractionManager } from 'react-native';

// Memory management utility for handling large media libraries
class MemoryManager {
  constructor() {
    this.caches = new Map(); // Track all registered caches
    this.maxCacheSize = 1000; // Default max cache size
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.lastCleanup = Date.now();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Register a cache for management
  registerCache(name, cache, maxSize = 1000) {
    this.caches.set(name, {
      cache,
      maxSize,
      lastAccessed: Date.now(),
      type: cache instanceof Map ? 'map' : 'object'
    });
    
    console.log(`📚 Registered cache: ${name} (max: ${maxSize})`);
  }

  // Cleanup old entries from all registered caches
  cleanupAllCaches() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    let totalCleaned = 0;

    for (const [name, cacheInfo] of this.caches.entries()) {
      const cleaned = this.cleanupCache(name, cacheInfo, maxAge);
      totalCleaned += cleaned;
    }

    this.lastCleanup = now;
    
    if (totalCleaned > 0) {
      console.log(`🧹 Memory cleanup: removed ${totalCleaned} old entries`);
    }
    
    return totalCleaned;
  }

  // Cleanup a specific cache
  cleanupCache(name, cacheInfo, maxAge) {
    const { cache, maxSize, type } = cacheInfo;
    const now = Date.now();
    let cleaned = 0;

    try {
      if (type === 'map') {
        // Handle Map caches
        const entries = Array.from(cache.entries());
        
        // Remove old entries
        for (const [key, value] of entries) {
          if (value.cachedAt && (now - value.cachedAt) > maxAge) {
            cache.delete(key);
            cleaned++;
          }
        }
        
        // Limit cache size
        if (cache.size > maxSize) {
          const sortedEntries = entries
            .filter(([key, value]) => value.cachedAt)
            .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
          
          const toRemove = cache.size - maxSize;
          for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
            cache.delete(sortedEntries[i][0]);
            cleaned++;
          }
        }
      } else {
        // Handle object caches
        const keys = Object.keys(cache);
        
        // Remove old entries
        for (const key of keys) {
          const value = cache[key];
          if (value && value.cachedAt && (now - value.cachedAt) > maxAge) {
            delete cache[key];
            cleaned++;
          }
        }
        
        // Limit cache size
        const remainingKeys = Object.keys(cache);
        if (remainingKeys.length > maxSize) {
          const sortedKeys = remainingKeys
            .filter(key => cache[key] && cache[key].cachedAt)
            .sort((a, b) => cache[a].cachedAt - cache[b].cachedAt);
          
          const toRemove = remainingKeys.length - maxSize;
          for (let i = 0; i < toRemove && i < sortedKeys.length; i++) {
            delete cache[sortedKeys[i]];
            cleaned++;
          }
        }
      }
    } catch (error) {
      console.error(`Error cleaning cache ${name}:`, error);
    }

    return cleaned;
  }

  // Force cleanup of a specific cache
  forceCleanupCache(name) {
    const cacheInfo = this.caches.get(name);
    if (!cacheInfo) return 0;
    
    return this.cleanupCache(name, cacheInfo, 0); // Remove all old entries
  }

  // Get memory usage statistics
  getMemoryStats() {
    const stats = {};
    
    for (const [name, cacheInfo] of this.caches.entries()) {
      const { cache, maxSize, type } = cacheInfo;
      const size = type === 'map' ? cache.size : Object.keys(cache).length;
      
      stats[name] = {
        size,
        maxSize,
        utilization: ((size / maxSize) * 100).toFixed(1) + '%',
        type
      };
    }
    
    return stats;
  }

  // Start periodic cleanup
  startPeriodicCleanup() {
    setInterval(() => {
      InteractionManager.runAfterInteractions(() => {
        this.cleanupAllCaches();
      });
    }, this.cleanupInterval);
  }

  // Emergency memory cleanup
  emergencyCleanup() {
    console.log('🚨 Emergency memory cleanup triggered');
    let totalCleaned = 0;
    
    for (const [name, cacheInfo] of this.caches.entries()) {
      const { cache, type } = cacheInfo;
      
      if (type === 'map') {
        const size = cache.size;
        cache.clear();
        totalCleaned += size;
      } else {
        const keys = Object.keys(cache);
        keys.forEach(key => delete cache[key]);
        totalCleaned += keys.length;
      }
    }
    
    console.log(`🧹 Emergency cleanup: cleared ${totalCleaned} entries`);
    return totalCleaned;
  }

  // Check if memory cleanup is needed
  shouldCleanup() {
    const now = Date.now();
    return (now - this.lastCleanup) > this.cleanupInterval;
  }

  // Optimize cache sizes based on available memory
  optimizeCacheSizes() {
    // This is a simplified optimization
    // In a real app, you might use device memory info
    const totalCaches = this.caches.size;
    const baseSize = Math.max(100, Math.floor(2000 / totalCaches));
    
    for (const [name, cacheInfo] of this.caches.entries()) {
      cacheInfo.maxSize = baseSize;
    }
    
    console.log(`📊 Optimized cache sizes to ${baseSize} entries each`);
  }
}

export default new MemoryManager();