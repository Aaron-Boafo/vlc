import React from 'react';
import BottomSheet from './BottomSheet';
import * as Icons from 'lucide-react-native';

const ReusableSortOptionsSheet = ({
  visible,
  onClose,
  title = "Sort by",
  sortOptions,
  currentSortOrder,
  onSort,
}) => {
  const isSelected = (key, direction) => {
    return currentSortOrder?.key === key && currentSortOrder?.direction === direction;
  };

  const options = sortOptions.map(opt => ({
    label: opt.label,
    icon: opt.icon,
    sortKey: opt.key,
    direction: opt.direction,
    onPress: () => onSort(opt.key, opt.direction),
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
      selectedOption={currentSortOrder}
    />
  );
};

export default ReusableSortOptionsSheet;