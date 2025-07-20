import React from 'react';
import { Modal, View, StyleSheet, Dimensions, Text, TouchableOpacity, Platform } from 'react-native';
import useThemeStore from '../store/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BottomSheet = ({ visible, title, options = [], onClose, selectedOption }) => {
  const { themeColors } = useThemeStore();
  
  const renderOptionIcon = (icon) => {
    if (!icon) return null;
    return typeof icon === 'string' 
      ? <MaterialCommunityIcons name={icon} size={22} color={themeColors.textSecondary} />
      : React.createElement(icon, { size: 22, color: themeColors.primary });
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <View style={[styles.sheet, { backgroundColor: themeColors.background }]}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: themeColors.textSecondary + '40' }]} />
        </View>
        
        {/* Title */}
        {title && (
          <Text style={[styles.title, { 
            color: themeColors.text,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border || 'rgba(0,0,0,0.1)',
            paddingBottom: 12,
            marginBottom: 8,
          }]}>
            {title}
          </Text>
        )}
        
        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.filter(opt => opt != null).map((opt, idx) => {
            const isSelected = selectedOption && 
              selectedOption.key === opt.sortKey && 
              selectedOption.direction === opt.direction;
              
            return (
              <TouchableOpacity
                key={opt?.label || `option-${idx}`}
                style={[
                  styles.option,
                  isSelected && { 
                    backgroundColor: themeColors.primary + '15',
                    borderLeftWidth: 3,
                    borderLeftColor: themeColors.primary,
                  },
                ]}
                onPress={() => {
                  opt.onPress?.();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.icon}>
                    {renderOptionIcon(opt.icon)}
                  </View>
                  <Text style={[
                    styles.label, 
                    { 
                      color: isSelected ? themeColors.primary : themeColors.text,
                      fontWeight: isSelected ? '600' : '400',
                    }
                  ]}>
                    {opt.label}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={22} 
                    color={themeColors.primary} 
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 16,
    maxHeight: '80%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionsContainer: {
    paddingTop: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 32,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
});

export default BottomSheet; 