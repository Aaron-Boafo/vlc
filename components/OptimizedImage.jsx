import React, { memo, useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { getOptimizedImageProps } from '../utils/performance';

const OptimizedImage = memo(({ 
  source, 
  width, 
  height, 
  style, 
  showLoader = true,
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const optimizedProps = getOptimizedImageProps(width, height);

  return (
    <View style={[optimizedProps.style, style]}>
      {!error && (
        <Image
          source={source}
          onLoad={handleLoad}
          onError={handleError}
          {...optimizedProps}
          {...props}
        />
      )}
      {loading && showLoader && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          <ActivityIndicator size="small" />
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;