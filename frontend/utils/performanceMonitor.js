import { InteractionManager } from 'react-native';

// Performance monitoring utility for large media libraries
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      renderTimes: [],
      memoryUsage: [],
      scrollPerformance: [],
      metadataLoadTimes: [],
    };
    
    this.thresholds = {
      loadTime: 5000, // 5 seconds
      renderTime: 100, // 100ms
      scrollLag: 16, // 16ms (60fps)
      metadataLoad: 3000, // 3 seconds
    };
    
    this.isMonitoring = false;
    this.startTime = null;
  }

  // Start monitoring performance
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = Date.now();
    console.log('📊 Performance monitoring started');
  }

  // Stop monitoring performance
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
    return this.getPerformanceReport();
  }

  // Track library loading time
  trackLoadTime(libraryType, fileCount, duration) {
    if (!this.isMonitoring) return;
    
    const metric = {
      type: libraryType,
      fileCount,
      duration,
      timestamp: Date.now(),
      performance: duration < this.thresholds.loadTime ? 'good' : 'poor'
    };
    
    this.metrics.loadTimes.push(metric);
    
    if (duration > this.thresholds.loadTime) {
      console.warn(`⚠️ Slow ${libraryType} loading: ${duration}ms for ${fileCount} files`);
    } else {
      console.log(`✅ Fast ${libraryType} loading: ${duration}ms for ${fileCount} files`);
    }
  }

  // Track component render time
  trackRenderTime(componentName, duration) {
    if (!this.isMonitoring) return;
    
    const metric = {
      component: componentName,
      duration,
      timestamp: Date.now(),
      performance: duration < this.thresholds.renderTime ? 'good' : 'poor'
    };
    
    this.metrics.renderTimes.push(metric);
    
    if (duration > this.thresholds.renderTime) {
      console.warn(`⚠️ Slow render: ${componentName} took ${duration}ms`);
    }
  }

  // Track metadata loading performance
  trackMetadataLoad(fileCount, duration, successCount) {
    if (!this.isMonitoring) return;
    
    const metric = {
      fileCount,
      duration,
      successCount,
      successRate: (successCount / fileCount) * 100,
      timestamp: Date.now(),
      performance: duration < this.thresholds.metadataLoad ? 'good' : 'poor'
    };
    
    this.metrics.metadataLoadTimes.push(metric);
    
    console.log(`📊 Metadata loading: ${successCount}/${fileCount} files in ${duration}ms (${metric.successRate.toFixed(1)}% success)`);
  }

  // Track scroll performance
  trackScrollPerformance(scrollEvent) {
    if (!this.isMonitoring) return;
    
    const now = Date.now();
    if (this.lastScrollTime) {
      const timeDiff = now - this.lastScrollTime;
      
      const metric = {
        timeDiff,
        timestamp: now,
        performance: timeDiff < this.thresholds.scrollLag ? 'good' : 'poor'
      };
      
      this.metrics.scrollPerformance.push(metric);
      
      if (timeDiff > this.thresholds.scrollLag * 2) {
        console.warn(`⚠️ Scroll lag detected: ${timeDiff}ms`);
      }
    }
    
    this.lastScrollTime = now;
  }

  // Track memory usage (estimated)
  trackMemoryUsage(cacheSize, librarySize) {
    if (!this.isMonitoring) return;
    
    const estimatedMemoryMB = (cacheSize * 0.001) + (librarySize * 0.0001); // Rough estimate
    
    const metric = {
      cacheSize,
      librarySize,
      estimatedMemoryMB,
      timestamp: Date.now(),
    };
    
    this.metrics.memoryUsage.push(metric);
    
    if (estimatedMemoryMB > 100) { // Over 100MB estimated
      console.warn(`⚠️ High memory usage estimated: ${estimatedMemoryMB.toFixed(1)}MB`);
    }
  }

  // Get performance report
  getPerformanceReport() {
    const report = {
      summary: this.generateSummary(),
      details: {
        loadTimes: this.metrics.loadTimes,
        renderTimes: this.metrics.renderTimes,
        metadataLoadTimes: this.metrics.metadataLoadTimes,
        scrollPerformance: this.metrics.scrollPerformance,
        memoryUsage: this.metrics.memoryUsage,
      },
      recommendations: this.generateRecommendations(),
    };
    
    console.log('📊 Performance Report:', report.summary);
    return report;
  }

  // Generate performance summary
  generateSummary() {
    const summary = {
      totalLoadTimes: this.metrics.loadTimes.length,
      averageLoadTime: this.calculateAverage(this.metrics.loadTimes, 'duration'),
      totalRenderTimes: this.metrics.renderTimes.length,
      averageRenderTime: this.calculateAverage(this.metrics.renderTimes, 'duration'),
      slowRenders: this.metrics.renderTimes.filter(m => m.performance === 'poor').length,
      scrollLagEvents: this.metrics.scrollPerformance.filter(m => m.performance === 'poor').length,
      averageMetadataLoadTime: this.calculateAverage(this.metrics.metadataLoadTimes, 'duration'),
      averageMetadataSuccessRate: this.calculateAverage(this.metrics.metadataLoadTimes, 'successRate'),
    };
    
    // Overall performance score (0-100)
    let score = 100;
    if (summary.averageLoadTime > this.thresholds.loadTime) score -= 20;
    if (summary.averageRenderTime > this.thresholds.renderTime) score -= 15;
    if (summary.slowRenders > 5) score -= 15;
    if (summary.scrollLagEvents > 10) score -= 20;
    if (summary.averageMetadataSuccessRate < 80) score -= 10;
    
    summary.overallScore = Math.max(0, score);
    summary.performanceGrade = this.getPerformanceGrade(summary.overallScore);
    
    return summary;
  }

  // Calculate average of a metric
  calculateAverage(metrics, field) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[field] || 0), 0);
    return sum / metrics.length;
  }

  // Get performance grade
  getPerformanceGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();
    
    if (summary.averageLoadTime > this.thresholds.loadTime) {
      recommendations.push({
        issue: 'Slow library loading',
        suggestion: 'Consider implementing progressive loading or reducing batch sizes',
        priority: 'high'
      });
    }
    
    if (summary.slowRenders > 5) {
      recommendations.push({
        issue: 'Frequent slow renders',
        suggestion: 'Optimize component memoization and reduce re-renders',
        priority: 'high'
      });
    }
    
    if (summary.scrollLagEvents > 10) {
      recommendations.push({
        issue: 'Scroll performance issues',
        suggestion: 'Reduce FlatList batch sizes and enable removeClippedSubviews',
        priority: 'medium'
      });
    }
    
    if (summary.averageMetadataSuccessRate < 80) {
      recommendations.push({
        issue: 'Low metadata loading success rate',
        suggestion: 'Implement better error handling and fallback strategies',
        priority: 'medium'
      });
    }
    
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    if (latestMemory && latestMemory.estimatedMemoryMB > 100) {
      recommendations.push({
        issue: 'High memory usage',
        suggestion: 'Implement more aggressive cache cleanup and memory management',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = {
      loadTimes: [],
      renderTimes: [],
      memoryUsage: [],
      scrollPerformance: [],
      metadataLoadTimes: [],
    };
    console.log('📊 Performance metrics cleared');
  }

  // Get real-time performance status
  getRealTimeStatus() {
    const recentRenders = this.metrics.renderTimes.slice(-10);
    const recentScrolls = this.metrics.scrollPerformance.slice(-20);
    
    return {
      isHealthy: recentRenders.filter(r => r.performance === 'poor').length < 3,
      recentSlowRenders: recentRenders.filter(r => r.performance === 'poor').length,
      recentScrollLag: recentScrolls.filter(s => s.performance === 'poor').length,
      monitoringActive: this.isMonitoring,
    };
  }

  // Auto-optimize based on performance
  autoOptimize() {
    const summary = this.generateSummary();
    const optimizations = [];
    
    if (summary.overallScore < 70) {
      console.log('🚨 Poor performance detected, applying auto-optimizations...');
      
      // Suggest emergency optimizations
      if (summary.averageRenderTime > this.thresholds.renderTime * 2) {
        optimizations.push('reduce_batch_sizes');
      }
      
      if (summary.scrollLagEvents > 20) {
        optimizations.push('enable_aggressive_clipping');
      }
      
      if (summary.averageLoadTime > this.thresholds.loadTime * 2) {
        optimizations.push('reduce_concurrent_operations');
      }
    }
    
    return optimizations;
  }
}

export default new PerformanceMonitor();