// Performance monitoring and analytics
class PerformanceAnalytics {
  constructor() {
    this.metrics = {
      loadTimes: [],
      searchTimes: [],
      renderTimes: [],
      memoryUsage: [],
      crashReports: [],
    };
    this.startTime = Date.now();
  }

  // Track loading performance
  trackLoadTime(operation, startTime, endTime, itemCount = 0) {
    const duration = endTime - startTime;
    this.metrics.loadTimes.push({
      operation,
      duration,
      itemCount,
      timestamp: Date.now(),
      itemsPerSecond: itemCount > 0 ? itemCount / (duration / 1000) : 0,
    });

    console.log(`📊 ${operation}: ${duration}ms (${itemCount} items, ${(itemCount / (duration / 1000)).toFixed(1)} items/sec)`);
  }

  // Track search performance
  trackSearchTime(query, resultCount, duration) {
    this.metrics.searchTimes.push({
      query,
      resultCount,
      duration,
      timestamp: Date.now(),
    });

    console.log(`🔍 Search "${query}": ${duration}ms (${resultCount} results)`);
  }

  // Track render performance
  trackRenderTime(component, duration) {
    this.metrics.renderTimes.push({
      component,
      duration,
      timestamp: Date.now(),
    });

    if (duration > 16) { // More than one frame at 60fps
      console.warn(`⚠️ Slow render: ${component} took ${duration}ms`);
    }
  }

  // Monitor memory usage
  trackMemoryUsage() {
    if (global.performance && global.performance.memory) {
      const memory = {
        used: global.performance.memory.usedJSHeapSize,
        total: global.performance.memory.totalJSHeapSize,
        limit: global.performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
      
      this.metrics.memoryUsage.push(memory);
      
      // Warn if memory usage is high
      const usagePercent = (memory.used / memory.limit) * 100;
      if (usagePercent > 80) {
        console.warn(`⚠️ High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    }
  }

  // Track errors and crashes
  trackError(error, context = '') {
    this.metrics.crashReports.push({
      error: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
    });

    console.error(`💥 Error in ${context}:`, error);
  }

  // Get performance summary
  getPerformanceSummary() {
    const now = Date.now();
    const uptime = now - this.startTime;

    return {
      uptime,
      averageLoadTime: this.getAverage(this.metrics.loadTimes, 'duration'),
      averageSearchTime: this.getAverage(this.metrics.searchTimes, 'duration'),
      averageRenderTime: this.getAverage(this.metrics.renderTimes, 'duration'),
      slowRenders: this.metrics.renderTimes.filter(r => r.duration > 16).length,
      totalErrors: this.metrics.crashReports.length,
      memoryTrend: this.getMemoryTrend(),
    };
  }

  // Helper methods
  getAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + item[property], 0);
    return sum / array.length;
  }

  getMemoryTrend() {
    if (this.metrics.memoryUsage.length < 2) return 'stable';
    
    const recent = this.metrics.memoryUsage.slice(-5);
    const trend = recent[recent.length - 1].used - recent[0].used;
    
    if (trend > 1024 * 1024) return 'increasing'; // 1MB increase
    if (trend < -1024 * 1024) return 'decreasing';
    return 'stable';
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      ...this.metrics,
      summary: this.getPerformanceSummary(),
      exportedAt: Date.now(),
    };
  }

  // Clear old metrics to prevent memory leaks
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key])) {
        this.metrics[key] = this.metrics[key].filter(
          item => item.timestamp > oneHourAgo
        );
      }
    });
  }
}

export default new PerformanceAnalytics();