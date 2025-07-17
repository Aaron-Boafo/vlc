import React, { memo, useCallback } from 'react';
import { FlatList } from 'react-native';
import { getItemLayout } from '../utils/performance';

const OptimizedFlatList = memo(({ 
  data, 
  renderItem, 
  keyExtractor,
  itemHeight = 60,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  ...props 
}) => {
  const getItemLayoutCallback = useCallback(
    (data, index) => getItemLayout(data, index, itemHeight),
    [itemHeight]
  );

  const keyExtractorCallback = useCallback(
    (item, index) => keyExtractor ? keyExtractor(item, index) : item.id?.toString() || index.toString(),
    [keyExtractor]
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractorCallback}
      getItemLayout={getItemLayoutCallback}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={true}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      {...props}
    />
  );
});

OptimizedFlatList.displayName = 'OptimizedFlatList';

export default OptimizedFlatList;