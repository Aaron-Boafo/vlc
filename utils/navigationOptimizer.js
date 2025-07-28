import { InteractionManager } from 'react-native';
import DeviceOptimizer from './deviceOptimizer';

// Navigation Performance Optimizer for smooth tab switching
class NavigationOptimizer {
  constructor() {
    this.screenCache = new Map();
    this.isTransitioning = false;
    this.pendingTransitions = [];
    this.deviceSettings = DeviceOptimizer.getRenderingSettings();
    
    // Navigation-specific optimizations
    this.TRANSITION_DELAY = this.deviceSettings.performanceTier === 'low' ? 100 : 50;
    this.CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    this.MAX_CACHED_SCREENS = this.deviceSettings.performanceTier === 'high' ? 5 : 3;
  }

  // Optimize screen transitions
  async optimizeTransition(fromScreen, toScreen, callback) {
    if (this.isTransitioning) {
      // Queue the transition if one is already in progress
      this.pendingTransitions.push({ fromScreen, toScreen, callback });
      return;
    }

    this.isTransitioning = true;

    try {
      // Pre-warm the target screen if possible
      await this.preWarmScreen(toScreen);

      // Use InteractionManager to ensure smooth transition
      await new Promise(resolve => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            if (callback) callback();
            resolve();
          }, this.TRANSITION_DELAY);
        });
      });

      // Cache the previous screen state
      this.cacheScreenState(fromScreen);

    } finally {
      this.isTransitioning = false;
      
      // Process any pending transitions
      if (this.pendingTransitions.length > 0) {
        const next = this.pendingTransitions.shift();
        this.optimizeTransition(next.fromScreen, next.toScreen, next.callback);
      }
    }
  }

  // Pre-warm screen data to reduce loading time
  async preWarmScreen(screenName) {
    const cached = this.screenCache.get(screenName);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TIMEOUT) {
      console.log(`📱 Using cached data for ${screenName}`);
      return cached.data;
    }

    // Pre-load critical data for the screen
    switch (screenName) {
      case 'audio':
        return this.preWarmAudioScreen();
      case 'video':
        return this.preWarmVideoScreen();
      case 'playlist':
        return this.preWarmPlaylistScreen();
      default:
        return null;
    }
  }

  async preWarmAudioScreen() {
    // Pre-warm audio data if not already loaded
    try {
      const { useOptimizedAudioStore } = await import('../store/optimizedAudioStore');
      const store = useOptimizedAudioStore.getState();
      
      if (store.audioFiles.length === 0 && !store.isLoading) {
        // Trigger background loading
        setTimeout(() => {
          store.loadAudioFiles();
        }, 0);
      }
      
      return store.audioFiles;
    } catch (error) {
      console.log('Audio pre-warm failed:', error);
      return null;
    }
  }

  async preWarmVideoScreen() {
    // Pre-warm video data if not already loaded
    try {
      const { useOptimizedVideoStore } = await import('../store/optimizedVideoStore');
      const store = useOptimizedVideoStore.getState();
      
      if (store.videoFiles.length === 0 && !store.isLoading) {
        // Trigger background loading
        setTimeout(() => {
          store.loadVideoFiles();
        }, 0);
      }
      
      return store.videoFiles;
    } catch (error) {
      console.log('Video pre-warm failed:', error);
      return null;
    }
  }

  async preWarmPlaylistScreen() {
    // Pre-warm playlist data
    try {
      const { usePlaylistStore } = await import('../store/playlistStore');
      const store = usePlaylistStore.getState();
      return store.playlists;
    } catch (error) {
      console.log('Playlist pre-warm failed:', error);
      return null;
    }
  }

  // Cache screen state for faster return navigation
  cacheScreenState(screenName, data = null) {
    // Limit cache size
    if (this.screenCache.size >= this.MAX_CACHED_SCREENS) {
      const oldestKey = this.screenCache.keys().next().value;
      this.screenCache.delete(oldestKey);
    }

    this.screenCache.set(screenName, {
      data,
      timestamp: Date.now(),
    });
  }

  // Get optimized FlatList props for smooth scrolling
  getOptimizedFlatListProps() {
    return {
      // Rendering optimizations
      initialNumToRender: this.deviceSettings.initialNumToRender,
      windowSize: this.deviceSettings.windowSize,
      maxToRenderPerBatch: this.deviceSettings.maxToRenderPerBatch,
      updateCellsBatchingPeriod: this.deviceSettings.updateCellsBatchingPeriod,
      removeClippedSubviews: this.deviceSettings.removeClippedSubviews,
      
      // Performance optimizations
      getItemLayout: this.deviceSettings.getItemLayout,
      keyExtractor: (item, index) => item.id?.toString() || index.toString(),
      
      // Interaction optimizations
      scrollEventThrottle: 16,
      onScrollBeginDrag: this.handleScrollStart,
      onScrollEndDrag: this.handleScrollEnd,
      
      // Memory optimizations
      disableVirtualization: false,
      legacyImplementation: false,
    };
  }

  handleScrollStart = () => {
    // Reduce background processing during scroll
    this.isScrolling = true;
  };

  handleScrollEnd = () => {
    // Resume background processing after scroll
    setTimeout(() => {
      this.isScrolling = false;
    }, 100);
  };

  // Optimize component rendering
  shouldComponentUpdate(prevProps, nextProps, criticalProps = []) {
    // Only update if critical props have changed
    if (criticalProps.length === 0) {
      return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
    }

    return criticalProps.some(prop => prevProps[prop] !== nextProps[prop]);
  }

  // Memory cleanup
  clearCache() {
    this.screenCache.clear();
    console.log('📱 Navigation cache cleared');
  }

  // Preload tab data for faster switching
  async preloadTab(tabName) {
    // Don't preload if already transitioning
    if (this.isTransitioning) return;
    
    // Use InteractionManager to avoid blocking UI
    InteractionManager.runAfterInteractions(async () => {
      try {
        await this.preWarmScreen(tabName);
        console.log(`📱 Preloaded tab: ${tabName}`);
      } catch (error) {
        console.log(`Failed to preload tab ${tabName}:`, error);
      }
    });
  }

  // Get performance stats
  getPerformanceStats() {
    return {
      cachedScreens: this.screenCache.size,
      isTransitioning: this.isTransitioning,
      pendingTransitions: this.pendingTransitions.length,
      deviceTier: this.deviceSettings.performanceTier,
    };
  }
}

export default new NavigationOptimizer();