import MediaCacheManager from './MediaCacheManager';
import * as FileSystem from 'expo-file-system';

/**
 * Cache Monitor - Provides utilities to monitor and manage media cache
 */
class CacheMonitor {
  constructor() {
    this.isMonitoring = false;
    this.stats = {
      audio: { loadTime: 0, cacheHitRate: 0, filesScanned: 0 },
      video: { loadTime: 0, cacheHitRate: 0, filesScanned: 0 }
    };
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStatistics() {
    try {
      const cacheStats = await MediaCacheManager.getCacheStats();
      const diskUsage = await this.calculateDiskUsage();
      
      return {
        ...cacheStats,
        diskUsage,
        performance: this.stats,
        recommendations: this.generateRecommendations(cacheStats, diskUsage)
      };
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return null;
    }
  }

  /**
   * Calculate disk usage of cache files
   */
  async calculateDiskUsage() {
    try {
      const cacheDir = FileSystem.documentDirectory + 'mediaCache/';
      const files = ['audio_cache.json', 'video_cache.json', 'cache_metadata.json'];
      
      let totalSize = 0;
      const fileStats = {};

      for (const file of files) {
        try {
          const filePath = cacheDir + file;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            fileStats[file] = {
              size: fileInfo.size || 0,
              lastModified: fileInfo.modificationTime || 0
            };
            totalSize += fileInfo.size || 0;
          }
        } catch (error) {
          fileStats[file] = { size: 0, lastModified: 0 };
        }
      }

      return {
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        files: fileStats
      };
    } catch (error) {
      console.error('Failed to calculate disk usage:', error);
      return { totalSize: 0, totalSizeMB: '0.00', files: {} };
    }
  }

  /**
   * Generate cache optimization recommendations
   */
  generateRecommendations(cacheStats, diskUsage) {
    const recommendations = [];

    if (!cacheStats) return recommendations;

    // Check cache age
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;

    if (cacheStats.audio.lastScan > 0 && (now - cacheStats.audio.lastScan) > oneWeekMs) {
      recommendations.push({
        type: 'refresh',
        priority: 'medium',
        message: 'Audio cache is over a week old. Consider refreshing to find new files.',
        action: 'refresh_audio'
      });
    }

    if (cacheStats.video.lastScan > 0 && (now - cacheStats.video.lastScan) > oneWeekMs) {
      recommendations.push({
        type: 'refresh',
        priority: 'medium',
        message: 'Video cache is over a week old. Consider refreshing to find new files.',
        action: 'refresh_video'
      });
    }

    // Check disk usage
    if (diskUsage.totalSize > 10 * 1024 * 1024) { // 10MB
      recommendations.push({
        type: 'cleanup',
        priority: 'low',
        message: `Cache is using ${diskUsage.totalSizeMB}MB of storage. Consider clearing if space is needed.`,
        action: 'clear_cache'
      });
    }

    // Check for empty caches
    if (cacheStats.audio.cachedFiles === 0 && cacheStats.audio.lastScan === 0) {
      recommendations.push({
        type: 'scan',
        priority: 'high',
        message: 'No audio files cached. Perform initial scan to improve loading speed.',
        action: 'scan_audio'
      });
    }

    if (cacheStats.video.cachedFiles === 0 && cacheStats.video.lastScan === 0) {
      recommendations.push({
        type: 'scan',
        priority: 'high',
        message: 'No video files cached. Perform initial scan to improve loading speed.',
        action: 'scan_video'
      });
    }

    return recommendations;
  }

  /**
   * Perform cache health check
   */
  async performHealthCheck() {
    console.log('🔍 Performing cache health check...');
    
    const results = {
      status: 'healthy',
      issues: [],
      warnings: [],
      info: []
    };

    try {
      // Check if cache directory exists
      const cacheDir = FileSystem.documentDirectory + 'mediaCache/';
      const cacheDirInfo = await FileSystem.getInfoAsync(cacheDir);
      
      if (!cacheDirInfo.exists) {
        results.issues.push('Cache directory does not exist');
        results.status = 'unhealthy';
      } else {
        results.info.push('Cache directory exists');
      }

      // Check cache files
      const cacheStats = await MediaCacheManager.getCacheStats();
      if (cacheStats) {
        if (cacheStats.audio.cachedFiles > 0) {
          results.info.push(`Audio cache: ${cacheStats.audio.cachedFiles} files`);
        } else {
          results.warnings.push('Audio cache is empty');
        }

        if (cacheStats.video.cachedFiles > 0) {
          results.info.push(`Video cache: ${cacheStats.video.cachedFiles} files`);
        } else {
          results.warnings.push('Video cache is empty');
        }
      } else {
        results.issues.push('Unable to read cache statistics');
        results.status = 'unhealthy';
      }

      // Check disk usage
      const diskUsage = await this.calculateDiskUsage();
      if (diskUsage.totalSize > 50 * 1024 * 1024) { // 50MB
        results.warnings.push(`Cache using ${diskUsage.totalSizeMB}MB of storage`);
      } else {
        results.info.push(`Cache using ${diskUsage.totalSizeMB}MB of storage`);
      }

      if (results.issues.length > 0) {
        results.status = 'unhealthy';
      } else if (results.warnings.length > 0) {
        results.status = 'warning';
      }

      console.log(`✅ Cache health check complete: ${results.status}`);
      return results;

    } catch (error) {
      console.error('Cache health check failed:', error);
      return {
        status: 'error',
        issues: ['Health check failed: ' + error.message],
        warnings: [],
        info: []
      };
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache() {
    console.log('⚡ Optimizing cache performance...');
    
    const optimizations = [];

    try {
      // Get current stats
      const stats = await this.getCacheStatistics();
      if (!stats) {
        throw new Error('Unable to get cache statistics');
      }

      // Clean up old cache files if needed
      const now = Date.now();
      const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

      if (stats.audio.lastScan > 0 && (now - stats.audio.lastScan) > oneMonthMs) {
        await MediaCacheManager.clearCache('audio');
        optimizations.push('Cleared old audio cache');
      }

      if (stats.video.lastScan > 0 && (now - stats.video.lastScan) > oneMonthMs) {
        await MediaCacheManager.clearCache('video');
        optimizations.push('Cleared old video cache');
      }

      // Compact cache if it's too large
      if (stats.diskUsage.totalSize > 100 * 1024 * 1024) { // 100MB
        // This is where you could implement cache compaction logic
        optimizations.push('Cache size is large, consider manual cleanup');
      }

      console.log(`✅ Cache optimization complete: ${optimizations.length} optimizations applied`);
      return {
        success: true,
        optimizations,
        newStats: await this.getCacheStatistics()
      };

    } catch (error) {
      console.error('Cache optimization failed:', error);
      return {
        success: false,
        error: error.message,
        optimizations: []
      };
    }
  }

  /**
   * Start monitoring cache performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Started cache performance monitoring');
    
    // Monitor cache hits/misses and performance
    // This could be expanded to track more detailed metrics
  }

  /**
   * Stop monitoring cache performance
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 Stopped cache performance monitoring');
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return {
      isMonitoring: this.isMonitoring,
      stats: this.stats
    };
  }

  /**
   * Export cache data for backup
   */
  async exportCacheData() {
    try {
      const stats = await this.getCacheStatistics();
      const healthCheck = await this.performHealthCheck();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        statistics: stats,
        healthCheck,
        recommendations: stats?.recommendations || []
      };

      const exportPath = FileSystem.documentDirectory + 'cache_export.json';
      await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(exportData, null, 2));
      
      console.log('📤 Cache data exported to:', exportPath);
      return exportPath;

    } catch (error) {
      console.error('Cache export failed:', error);
      throw error;
    }
  }
}

export default new CacheMonitor();