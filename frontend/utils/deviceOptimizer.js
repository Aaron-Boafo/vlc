import { Platform, Dimensions } from 'react-native';

// Device-specific optimizations for better performance on various devices
class DeviceOptimizer {
  constructor() {
    this.deviceInfo = this.getDeviceInfo();
    this.optimizationSettings = this.calculateOptimalSettings();
  }

  getDeviceInfo() {
    const { width, height } = Dimensions.get('window');
    const screenSize = width * height;
    
    return {
      platform: Platform.OS,
      screenWidth: width,
      screenHeight: height,
      screenSize,
      // Estimate device type based on screen size
      deviceType: this.estimateDeviceType(screenSize),
      modelName: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      // Estimate memory based on screen size and platform
      totalMemory: this.estimateMemory(screenSize),
      // Estimate device performance tier
      performanceTier: this.estimatePerformanceTier(screenSize),
    };
  }

  estimateDeviceType(screenSize) {
    // Estimate device type based on screen size
    if (screenSize > 2000000) {
      return Platform.OS === 'ios' ? 'tablet' : 'tablet'; // iPad or Android tablet
    }
    return 'phone';
  }

  estimateMemory(screenSize) {
    // Rough memory estimation based on screen size and platform
    if (Platform.OS === 'ios') {
      if (screenSize > 2000000) return 8192; // iPad Pro estimate
      if (screenSize > 1500000) return 6144; // iPhone Pro estimate
      return 4096; // Standard iPhone estimate
    } else {
      if (screenSize > 2500000) return 8192; // High-end Android
      if (screenSize > 1800000) return 6144; // Mid-range Android
      return 4096; // Budget Android
    }
  }

  estimatePerformanceTier(screenSize) {
    // Rough estimation based on screen size and platform
    if (Platform.OS === 'ios') {
      if (screenSize > 2000000) return 'high'; // iPad Pro, iPhone Pro Max
      if (screenSize > 1500000) return 'medium'; // Standard iPhones
      return 'low'; // Older devices
    } else {
      if (screenSize > 2500000) return 'high'; // High-end Android tablets
      if (screenSize > 1800000) return 'medium'; // Standard Android phones
      return 'low'; // Budget devices
    }
  }

  calculateOptimalSettings() {
    const { performanceTier, platform } = this.deviceInfo;
    
    // Base settings
    let settings = {
      batchSize: 20,
      uiUpdateInterval: 100,
      maxConcurrentMetadata: 2,
      thumbnailCacheSize: 50,
      enableAnimations: true,
      useNativeDriver: true,
    };

    // Adjust based on performance tier
    switch (performanceTier) {
      case 'high':
        settings = {
          ...settings,
          batchSize: 50,
          uiUpdateInterval: 50,
          maxConcurrentMetadata: 4,
          thumbnailCacheSize: 100,
        };
        break;
      
      case 'medium':
        settings = {
          ...settings,
          batchSize: 30,
          uiUpdateInterval: 75,
          maxConcurrentMetadata: 3,
          thumbnailCacheSize: 75,
        };
        break;
      
      case 'low':
        settings = {
          ...settings,
          batchSize: 15,
          uiUpdateInterval: 150,
          maxConcurrentMetadata: 1,
          thumbnailCacheSize: 25,
          enableAnimations: false,
          useNativeDriver: false,
        };
        break;
    }

    // Platform-specific adjustments
    if (platform === 'android') {
      settings.batchSize = Math.max(10, settings.batchSize - 5);
      settings.uiUpdateInterval += 25;
    }

    return settings;
  }

  // Get optimized settings for progressive loading
  getProgressiveLoadingSettings() {
    return {
      microBatchSize: this.optimizationSettings.batchSize,
      uiUpdateInterval: this.optimizationSettings.uiUpdateInterval,
      maxConcurrentMetadata: this.optimizationSettings.maxConcurrentMetadata,
    };
  }

  // Get optimized settings for UI rendering
  getRenderingSettings() {
    return {
      initialNumToRender: Math.max(5, Math.floor(this.optimizationSettings.batchSize / 2)),
      windowSize: this.optimizationSettings.batchSize,
      maxToRenderPerBatch: Math.max(5, Math.floor(this.optimizationSettings.batchSize / 3)),
      updateCellsBatchingPeriod: this.optimizationSettings.uiUpdateInterval,
      removeClippedSubviews: this.deviceInfo.performanceTier !== 'high',
      getItemLayout: this.deviceInfo.performanceTier === 'high' ? this.getItemLayout : null,
    };
  }

  // Optimized item layout for better performance
  getItemLayout = (data, index) => {
    const ITEM_HEIGHT = 80; // Approximate item height
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  };

  // Check if device can handle advanced features
  canHandleAdvancedFeatures() {
    return this.deviceInfo.performanceTier !== 'low';
  }

  // Get memory-optimized cache settings
  getCacheSettings() {
    const { performanceTier } = this.deviceInfo;
    
    switch (performanceTier) {
      case 'high':
        return {
          maxMemoryCache: 200,
          maxDiskCache: 1000,
          cacheCleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        };
      
      case 'medium':
        return {
          maxMemoryCache: 100,
          maxDiskCache: 500,
          cacheCleanupInterval: 12 * 60 * 60 * 1000, // 12 hours
        };
      
      case 'low':
        return {
          maxMemoryCache: 50,
          maxDiskCache: 200,
          cacheCleanupInterval: 6 * 60 * 60 * 1000, // 6 hours
        };
      
      default:
        return {
          maxMemoryCache: 100,
          maxDiskCache: 500,
          cacheCleanupInterval: 12 * 60 * 60 * 1000,
        };
    }
  }

  // Check if device is high-end for performance optimizations
  isHighEndDevice() {
    return this.deviceInfo.performanceTier === 'high';
  }

  // Log device info for debugging
  logDeviceInfo() {
    console.log('📱 Device Optimization Info:', {
      ...this.deviceInfo,
      optimizationSettings: this.optimizationSettings,
    });
  }
}

export default new DeviceOptimizer();