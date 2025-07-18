import React, { memo, useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import NavigationOptimizer from '../utils/navigationOptimizer';

const OptimizedFlatList = memo(({ 
  data, 
  renderItem, 
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.5,
  ...otherProps 
}) => {
  // Get device-optimized settings
  const optimizedProps = useMemo(() => 
    NavigationOptimizer.getOptimizedFlatListProps(), 
    []
  );

  // Optimized key extractor
  const keyExtractorCallback = useCallback(
    (item, index) => keyExtractor ? keyExtractor(item, index) : item.id?.toString() || index.toString(),
    [keyExtractor]
  );

  // Optimized render item with error boundary
  const renderItemCallback = useCallback((itemData) => {
    try {
      return renderItem(itemData);
    } catch (error) {
      console.warn('Render item error:', error);
      return null;
    }
  }, [renderItem]);

  // Optimized onEndReached with throttling
  const onEndReachedCallback = useCallback(() => {
    if (onEndReached && !NavigationOptimizer.isScrolling) {
      onEndReached();
    }
  }, [onEndReached]);

  return (
    <FlatList
      data={data}
      renderItem={renderItemCallback}
      keyExtractor={keyExtractorCallback}
      onEndReached={onEndReachedCallback}
      onEndReachedThreshold={onEndReachedThreshold}
      {...optimizedProps}
      {...otherProps}
    />
  );
});

OptimizedFlatList.displayName = 'OptimizedFlatList';

export default OptimizedFlatList;