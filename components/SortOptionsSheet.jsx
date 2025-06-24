import React from 'react';
import BottomSheet from './BottomSheet';
import * as Icons from 'lucide-react-native';

const ReusableSortOptionsSheet = ({
  visible,
  onClose,
  title = "Sort and Filter",
  sortOptions,
  currentSortOrder,
  onSort,
}) => {
  const isSelected = (key, direction) => {
    return currentSortOrder?.key === key && currentSortOrder?.direction === direction;
  };

  const options = sortOptions.map(opt => ({
    label: opt.label,
    icon: isSelected(opt.key, opt.direction) ? Icons.CheckCircle2 : opt.icon,
    onPress: () => onSort(opt.key, opt.direction),
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
    />
  );
};

export default ReusableSortOptionsSheet; 