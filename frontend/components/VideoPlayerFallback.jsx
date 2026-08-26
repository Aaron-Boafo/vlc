import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useThemeStore from '../store/theme';

/**
 * Fallback component when expo-video is not available
 * Shows instructions to install the new video library
 */
const VideoPlayerFallback = ({ onRetry }) => {
  const { themeColors } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <MaterialIcons name="videocam-off" size={64} color={themeColors.textSecondary} />
      
      <Text style={[styles.title, { color: themeColors.text }]}>
        Video Player Unavailable
      </Text>
      
      <Text style={[styles.message, { color: themeColors.textSecondary }]}>
        The video player needs to be updated. Please install the new video library:
      </Text>
      
      <View style={[styles.codeBlock, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.code, { color: themeColors.primary }]}>
          npx expo install expo-video
        </Text>
      </View>
      
      <Text style={[styles.note, { color: themeColors.textSecondary }]}>
        After installation, restart your app to use the new video player.
      </Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  codeBlock: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxWidth: 300,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 32,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoPlayerFallback;