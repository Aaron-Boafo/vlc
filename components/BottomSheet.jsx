import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import useThemeStore from '../store/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BottomSheet = ({ visible, title, options = [], onClose }) => {
  const { themeColors } = useThemeStore();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: themeColors.background }]}> 
        {title && <Text style={[styles.title, { color: themeColors.text }]} weight="Bold">{title}</Text>}
        {options.filter(opt => opt != null).map((opt, idx) => (
          <TouchableOpacity
            key={opt?.label || `option-${idx}`}
            style={styles.option}
            onPress={() => {
              opt.onPress();
              onClose();
            }}
          >
            {opt.icon && (
              <View style={styles.icon}>
                {typeof opt.icon === 'string'
                  ? <MaterialCommunityIcons name={opt.icon} size={20} color={themeColors.textSecondary} />
                  : React.createElement(opt.icon, { size: 20, color: themeColors.textSecondary })}
              </View>
            )}
            <Text style={[styles.label, { color: themeColors.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
    minHeight: 60,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'left',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  icon: {
    width: 28,
    alignItems: 'center',
    marginRight: 16,
  },
  label: {
    fontSize: 16,
  },
});

export default BottomSheet; 