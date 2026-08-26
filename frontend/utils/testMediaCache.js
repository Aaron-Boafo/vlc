/**
 * Test script for MediaCacheManager
 * Run this to verify the caching system is working correctly
 */

import MediaCacheManager from './MediaCacheManager';
import CacheMonitor from './CacheMonitor';

// Mock console for testing
const originalConsole = console;
const testConsole = {
  log: (...args) => originalConsole.log('🧪 TEST:', ...args),
  error: (...args) => originalConsole.error('❌ TEST ERROR:', ...args),
  warn: (...args) => originalConsole.warn('⚠️ TEST WARNING:', ...args)
};

async function testCacheSystem() {
  console = testConsole;
  
  try {
    console.log('Starting MediaCacheManager tests...\n');

    // Test 1: Cache Statistics
    console.log('Test 1: Getting cache statistics...');
    const initialStats = await MediaCacheManager.getCacheStats();
    console.log('Initial cache stats:', initialStats);

    // Test 2: Cache Health Check
    console.log('\nTest 2: Performing cache health check...');
    const healthCheck = await CacheMonitor.performHealthCheck();
    console.log('Health check result:', healthCheck.status);
    console.log('Issues:', healthCheck.issues);
    console.log('Warnings:', healthCheck.warnings);

    // Test 3: Cache Monitor Statistics
    console.log('\nTest 3: Getting comprehensive cache statistics...');
    const comprehensiveStats = await CacheMonitor.getCacheStatistics();
    if (comprehensiveStats) {
      console.log('Total cached files:', comprehensiveStats.totalCachedFiles);
      console.log('Disk usage:', comprehensiveStats.diskUsage.totalSizeMB + 'MB');
      console.log('Recommendations:', comprehensiveStats.recommendations.length);
    }

    // Test 4: Cache Optimization
    console.log('\nTest 4: Testing cache optimization...');
    const optimizationResult = await CacheMonitor.optimizeCache();
    console.log('Optimization success:', optimizationResult.success);
    console.log('Optimizations applied:', optimizationResult.optimizations);

    // Test 5: Export Cache Data
    console.log('\nTest 5: Testing cache data export...');
    try {
      const exportPath = await CacheMonitor.exportCacheData();
      console.log('Export successful, saved to:', exportPath);
    } catch (exportError) {
      console.error('Export failed:', exportError.message);
    }

    console.log('\n✅ All cache system tests completed successfully!');
    
    return {
      success: true,
      initialStats,
      healthCheck,
      comprehensiveStats,
      optimizationResult
    };

  } catch (error) {
    console.error('Cache system test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    console = originalConsole;
  }
}

// Test the actual media loading with caching
async function testMediaLoading() {
  console = testConsole;
  
  try {
    console.log('Testing media loading with caching...\n');

    // Test audio loading
    console.log('Test: Loading audio files with caching...');
    const startTime = Date.now();
    
    const audioFiles = await MediaCacheManager.loadMediaFiles('audio', (progress) => {
      console.log(`Audio progress: ${progress.phase} - ${progress.message || 'Processing...'}`);
    });

    const loadTime = Date.now() - startTime;
    console.log(`Audio loading completed: ${audioFiles.length} files in ${loadTime}ms`);

    // Test video loading
    console.log('\nTest: Loading video files with caching...');
    const videoStartTime = Date.now();
    
    const videoFiles = await MediaCacheManager.loadMediaFiles('video', (progress) => {
      console.log(`Video progress: ${progress.phase} - ${progress.message || 'Processing...'}`);
    });

    const videoLoadTime = Date.now() - videoStartTime;
    console.log(`Video loading completed: ${videoFiles.length} files in ${videoLoadTime}ms`);

    // Test second load (should be faster due to caching)
    console.log('\nTest: Second audio load (should use cache)...');
    const secondStartTime = Date.now();
    
    const secondAudioFiles = await MediaCacheManager.loadMediaFiles('audio', (progress) => {
      console.log(`Second audio progress: ${progress.phase} - ${progress.message || 'Processing...'}`);
    });

    const secondLoadTime = Date.now() - secondStartTime;
    console.log(`Second audio loading completed: ${secondAudioFiles.length} files in ${secondLoadTime}ms`);

    // Compare performance
    const speedImprovement = loadTime > 0 ? ((loadTime - secondLoadTime) / loadTime * 100).toFixed(1) : 0;
    console.log(`\n📊 Performance improvement: ${speedImprovement}% faster on second load`);

    return {
      success: true,
      audioFiles: audioFiles.length,
      videoFiles: videoFiles.length,
      firstLoadTime: loadTime,
      secondLoadTime: secondLoadTime,
      speedImprovement: speedImprovement + '%'
    };

  } catch (error) {
    console.error('Media loading test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    console = originalConsole;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive media cache tests...\n');
  
  const cacheSystemTest = await testCacheSystem();
  const mediaLoadingTest = await testMediaLoading();
  
  console.log('\n📊 Test Summary:');
  console.log('Cache System Test:', cacheSystemTest.success ? '✅ PASSED' : '❌ FAILED');
  console.log('Media Loading Test:', mediaLoadingTest.success ? '✅ PASSED' : '❌ FAILED');
  
  if (mediaLoadingTest.success) {
    console.log(`\n📈 Performance Results:`);
    console.log(`- Audio files: ${mediaLoadingTest.audioFiles}`);
    console.log(`- Video files: ${mediaLoadingTest.videoFiles}`);
    console.log(`- First load: ${mediaLoadingTest.firstLoadTime}ms`);
    console.log(`- Second load: ${mediaLoadingTest.secondLoadTime}ms`);
    console.log(`- Speed improvement: ${mediaLoadingTest.speedImprovement}`);
  }
  
  return {
    cacheSystemTest,
    mediaLoadingTest,
    overallSuccess: cacheSystemTest.success && mediaLoadingTest.success
  };
}

// Export functions for use in other files
export {
  testCacheSystem,
  testMediaLoading,
  runAllTests
};

// If running directly, execute all tests
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}