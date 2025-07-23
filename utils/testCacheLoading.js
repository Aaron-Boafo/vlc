/**
 * Test script to verify the new cache loading behavior
 */

import MediaCacheManager from './MediaCacheManager';

async function testCacheLoadingBehavior() {
  console.log('🧪 Testing cache loading behavior...\n');

  try {
    // Test audio loading with progress tracking
    console.log('Testing audio loading:');
    const audioProgressUpdates = [];
    
    const audioFiles = await MediaCacheManager.loadMediaFiles('audio', (progress) => {
      audioProgressUpdates.push(progress);
      console.log(`📊 Audio: ${progress.phase} - ${progress.message}`);
      
      if (progress.files) {
        console.log(`   Files available: ${progress.files.length}`);
      }
    });

    console.log(`✅ Audio loading complete: ${audioFiles.length} files`);
    console.log(`📈 Progress updates received: ${audioProgressUpdates.length}`);
    
    // Check if we got cache_loaded phase for faster UI response
    const cacheLoadedUpdate = audioProgressUpdates.find(p => p.phase === 'cache_loaded');
    if (cacheLoadedUpdate) {
      console.log(`⚡ Cache loaded phase found - UI should show files immediately`);
    } else {
      console.log(`🔍 No cache found - full scan performed`);
    }

    console.log('\n---\n');

    // Test video loading with progress tracking
    console.log('Testing video loading:');
    const videoProgressUpdates = [];
    
    const videoFiles = await MediaCacheManager.loadMediaFiles('video', (progress) => {
      videoProgressUpdates.push(progress);
      console.log(`📊 Video: ${progress.phase} - ${progress.message}`);
      
      if (progress.files) {
        console.log(`   Files available: ${progress.files.length}`);
      }
    });

    console.log(`✅ Video loading complete: ${videoFiles.length} files`);
    console.log(`📈 Progress updates received: ${videoProgressUpdates.length}`);
    
    // Check if we got cache_loaded phase for faster UI response
    const videoCacheLoadedUpdate = videoProgressUpdates.find(p => p.phase === 'cache_loaded');
    if (videoCacheLoadedUpdate) {
      console.log(`⚡ Cache loaded phase found - UI should show files immediately`);
    } else {
      console.log(`🔍 No cache found - full scan performed`);
    }

    console.log('\n📊 Test Summary:');
    console.log(`- Audio files: ${audioFiles.length}`);
    console.log(`- Video files: ${videoFiles.length}`);
    console.log(`- Audio progress updates: ${audioProgressUpdates.length}`);
    console.log(`- Video progress updates: ${videoProgressUpdates.length}`);
    
    // Verify expected behavior
    const expectedPhases = ['checking_cache'];
    const hasExpectedPhases = expectedPhases.every(phase => 
      audioProgressUpdates.some(p => p.phase === phase) || 
      videoProgressUpdates.some(p => p.phase === phase)
    );
    
    if (hasExpectedPhases) {
      console.log('✅ All expected phases found');
    } else {
      console.log('⚠️ Some expected phases missing');
    }

    return {
      success: true,
      audioFiles: audioFiles.length,
      videoFiles: videoFiles.length,
      audioProgressUpdates: audioProgressUpdates.length,
      videoProgressUpdates: videoProgressUpdates.length
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test the loading behavior
async function runLoadingTest() {
  console.log('🚀 Starting cache loading behavior test...\n');
  
  const result = await testCacheLoadingBehavior();
  
  if (result.success) {
    console.log('\n🎉 Cache loading test completed successfully!');
    console.log('Expected behavior:');
    console.log('1. Files should appear immediately if cached');
    console.log('2. Loading indicators should be minimal');
    console.log('3. No "retry scan" should be needed');
  } else {
    console.log('\n❌ Cache loading test failed:', result.error);
  }
  
  return result;
}

export { testCacheLoadingBehavior, runLoadingTest };

// Run test if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runLoadingTest().catch(console.error);
}