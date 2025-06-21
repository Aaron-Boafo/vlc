import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Play, Pause, X } from 'lucide-react-native';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter, useSegments } from 'expo-router';

const MiniPlayer = () => {
  const { themeColors } = useThemeStore();
  const { 
    currentTrack, 
    isPlaying, 
    isMiniPlayerVisible, 
    hideMiniPlayer, 
    pause, 
    play,
    stop,
  } = useAudioControl();
  const router = useRouter();
  const segments = useSegments();

  // Check if the current screen is the player screen
  const isPlayerScreen = segments.includes('player');

  // Don't render the mini player if there's no track, if it's hidden, or if we are on the player screen
  if (!currentTrack || !isMiniPlayerVisible || isPlayerScreen) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: themeColors.background, borderColor: themeColors.primary }]}
      activeOpacity={0.95}
      onPress={() => router.push('/(tabs)/(audio)/player')}
    >
      {currentTrack.artwork ? (
        <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
      ) : (
        <View style={[styles.artwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}/>
      )}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {currentTrack.title || 'Unknown Track'}
        </Text>
        <Text style={[styles.artist, { color: themeColors.textSecondary }]} numberOfLines={1}>
          {currentTrack.artist || 'Unknown Artist'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.playPauseButton}
        onPress={e => {
          e.stopPropagation();
          isPlaying ? pause() : play();
        }}
      >
        {isPlaying ? (
          <Pause size={24} color={themeColors.primary} />
        ) : (
          <Play size={24} color={themeColors.primary} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={e => {
          e.stopPropagation();
          stop();
          hideMiniPlayer();
        }}
      >
        <X size={22} color={themeColors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 100 : 90, // Position above tab bar
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    padding: 8,
    zIndex: 100,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    fontSize: 13,
    marginTop: 2,
  },
  playPauseButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
  },
});

export default MiniPlayer; 