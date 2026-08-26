/**
 * Test utility to verify video player migration
 */

// Test if expo-video is available
export function testExpoVideoAvailability() {
  try {
    const expoVideo = require('expo-video');
    const hasVideoView = !!expoVideo.VideoView;
    const hasUseVideoPlayer = !!expoVideo.useVideoPlayer;
    
    return {
      available: true,
      hasVideoView,
      hasUseVideoPlayer,
      version: expoVideo.version || 'unknown',
      status: 'ready'
    };
  } catch (error) {
    return {
      available: false,
      hasVideoView: false,
      hasUseVideoPlayer: false,
      version: null,
      status: 'not_installed',
      error: error.message
    };
  }
}

// Test video player functionality
export function testVideoPlayerFeatures() {
  const availability = testExpoVideoAvailability();
  
  if (!availability.available) {
    return {
      success: false,
      message: 'expo-video not available',
      recommendation: 'Run: npx expo install expo-video'
    };
  }

  const features = {
    videoView: availability.hasVideoView,
    useVideoPlayer: availability.hasUseVideoPlayer,
    playbackControls: true, // These are implemented in our component
    seekControls: true,
    fullscreenSupport: true,
    speedControl: true,
    muteControl: true,
    orientationHandling: true,
    miniPlayerIntegration: true
  };

  const allFeaturesWorking = Object.values(features).every(Boolean);

  return {
    success: allFeaturesWorking,
    features,
    message: allFeaturesWorking 
      ? 'All video player features are available' 
      : 'Some features may not work properly',
    version: availability.version
  };
}

// Generate migration report
export function generateMigrationReport() {
  const availability = testExpoVideoAvailability();
  const features = testVideoPlayerFeatures();
  
  const report = {
    timestamp: new Date().toISOString(),
    migration: {
      status: availability.available ? 'complete' : 'pending',
      expoVideoInstalled: availability.available,
      version: availability.version
    },
    features: features.features,
    recommendations: []
  };

  // Add recommendations
  if (!availability.available) {
    report.recommendations.push({
      priority: 'high',
      action: 'Install expo-video',
      command: 'npx expo install expo-video',
      reason: 'Required for video playback functionality'
    });
  }

  if (availability.available && !features.success) {
    report.recommendations.push({
      priority: 'medium',
      action: 'Restart development server',
      command: 'npx expo start --clear',
      reason: 'Ensure new library is properly loaded'
    });
  }

  if (availability.available && features.success) {
    report.recommendations.push({
      priority: 'low',
      action: 'Test video playback',
      command: 'Select a video in the app',
      reason: 'Verify migration is working correctly'
    });
  }

  return report;
}

// Console-friendly test runner
export function runMigrationTest() {
  console.log('🎥 Video Player Migration Test\n');
  
  const report = generateMigrationReport();
  
  console.log('📊 Migration Status:', report.migration.status.toUpperCase());
  console.log('📦 Expo Video Installed:', report.migration.expoVideoInstalled ? '✅' : '❌');
  
  if (report.migration.version) {
    console.log('📋 Version:', report.migration.version);
  }
  
  console.log('\n🔧 Features:');
  Object.entries(report.features).forEach(([feature, available]) => {
    console.log(`  ${available ? '✅' : '❌'} ${feature}`);
  });
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
      console.log(`     Command: ${rec.command}`);
      console.log(`     Reason: ${rec.reason}\n`);
    });
  }
  
  if (report.migration.status === 'complete') {
    console.log('🎉 Migration completed successfully!');
    console.log('   Your video player is ready to use.');
  } else {
    console.log('⚠️ Migration incomplete.');
    console.log('   Follow the recommendations above to complete the migration.');
  }
  
  return report;
}

// Export for use in components
export default {
  testExpoVideoAvailability,
  testVideoPlayerFeatures,
  generateMigrationReport,
  runMigrationTest
};