import React, { memo, useState, useEffect, Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { InteractionManager } from 'react-native';
import useThemeStore from '../store/theme';

// Lazy loading wrapper for screens to improve navigation performance
const LazyScreen = memo(({ 
  children, 
  fallback = null, 
  delay = 0,
  preload = false 
}) => {
  const [isReady, setIsReady] = useState(preload);
  const { themeColors } = useThemeStore();

  useEffect(() => {
    if (!isReady) {
      const timer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          setIsReady(true);
        });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isReady, delay]);

  // Create fallback component
  const fallbackComponent = fallback || (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: themeColors.background 
    }}>
      <ActivityIndicator size="large" color={themeColors.primary} />
    </View>
  );

  // Always return JSX, never return early after hooks
  return (
    <Suspense fallback={fallbackComponent}>
      {isReady ? children : fallbackComponent}
    </Suspense>
  );
});

LazyScreen.displayName = 'LazyScreen';

export default LazyScreen;