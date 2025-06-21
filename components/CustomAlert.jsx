import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useThemeStore from '../store/theme';

const CustomAlert = ({ visible, title, message, onClose, actions = [] }) => {
  const { themeColors } = useThemeStore();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
          {title && <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>}
          {message && <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>}
          <View style={styles.actions}>
            {actions.map((action, idx) => (
              <TouchableOpacity key={idx} style={styles.button} onPress={action.onPress}>
                <Text style={{ color: themeColors.primary }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={{ color: themeColors.textSecondary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    minWidth: 260,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default CustomAlert;
