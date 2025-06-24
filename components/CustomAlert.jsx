import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ActivityIndicator, Text } from 'react-native';
import useThemeStore from '../store/theme';

const CustomAlert = ({
  visible,
  title,
  message,
  onClose,
  buttons = [],
  isLoading = false,
}) => {
  const { themeColors } = useThemeStore();

  const getButtonTextStyle = (style) => {
    switch (style) {
      case 'destructive':
        return { color: themeColors.red || '#EF4444' };
      case 'primary':
        return { color: themeColors.primary, fontWeight: 'bold' };
      default:
        return { color: themeColors.textSecondary };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.card }]}>
          {isLoading ? (
            <ActivityIndicator size="large" color={themeColors.primary} />
          ) : (
            <>
              {title && <Text style={[styles.title, { color: themeColors.text }]} weight="Bold">{title}</Text>}
              {message && <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.button, index > 0 && styles.buttonSeparator]}
                    onPress={button.onPress}
                  >
                    <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    borderRadius: 24, // Increased border radius
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSeparator: {
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 17,
  },
});

export default CustomAlert;
