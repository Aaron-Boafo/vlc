// Performance utilities for React Native optimization
import { InteractionManager, Platform } from 'react-native';

// Debounce function to prevent excessive calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Run after interactions for better performance
export const runAfterInteractions = (callback) => {
  InteractionManager.runAfterInteractions(callback);
};

// Platform-specific optimizations
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// Memory optimization for large lists
export const getItemLayout = (data, index, itemHeight = 60) => ({
  length: itemHeight,
  offset: itemHeight * index,
  index,
});

// Image optimization
export const getOptimizedImageProps = (width, height) => ({
  resizeMode: 'cover',
  ...(isAndroid && {
    fadeDuration: 0, // Disable fade on Android for better performance
  }),
  style: {
    width,
    height,
  },
});

// Audio caching optimization
export const getCacheKey = (uri, title) => {
  return `${encodeURIComponent(title || uri.split('/').pop())}_${Date.now()}`;
};