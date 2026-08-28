import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter } from 'expo-router';

const SimpleBottomPlayer = () => {
  const { themeColors } = useThemeStore();
  const router = useRouter();

  // Test if we can access the store
  const audioControl = useAudioControl();

  const {
    currentTrack,
    isPlaying,
    isBottomPlayerVisible,
    hideBottomPlayer,
    pause,
    play,
  } = audioControl;

  // Don't render if no track or not visible
  if (!currentTrack || !isBottomPlayerVisible) {
    return null;
  }

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleClose = () => {
    try {
      hideBottomPlayer();
    } catch (error) {
      console.error('Error hiding bottom player:', error);
    }
  };

  const handleOpenFullPlayer = () => {
    router.push('/player/audio');
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 90,
      backgroundColor: themeColors.background,
      borderTopWidth: 1,
      borderTopColor: themeColors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      zIndex: 1000,
    },
    trackInfo: {
      flex: 1,
      marginLeft: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
    },
    artist: {
      fontSize: 13,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    button: {
      padding: 8,
      marginHorizontal: 4,
    },
    playButton: {
      backgroundColor: themeColors.primary,
      borderRadius: 20,
      padding: 8,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={handleOpenFullPlayer} activeOpacity={0.9}>
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title || 'Unknown Track'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist || 'Unknown Artist'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={24}
            color={themeColors.background}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleClose}>
          <MaterialIcons name="close" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default SimpleBottomPlayer;