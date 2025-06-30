import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Play, Pause, X } from 'lucide-react-native';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';

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
    sound,
    position,
    duration
  } = useAudioControl();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isMiniPlayerVisible && sound) {
      sound.getStatusAsync().then(status => {
        console.log('[MiniPlayer] Native sound status:', status);
      }).catch(e => {
        console.log('[MiniPlayer] Error getting sound status:', e);
      });
    }
  }, [isMiniPlayerVisible, sound]);

  // Check if the current screen is the player screen
  const isPlayerScreen = segments.includes('player');

  // Don't render the mini player if there's no track, if it's hidden, or if we are on the player screen
  if (!currentTrack || !isMiniPlayerVisible || isPlayerScreen) {
    return null;
  }

  const handleOpenFullPlayer = () => {
    router.push('/player/audio');
  };

  // Progress for circular indicator
  const buttonSize = 40; // Size of the play/pause button
  const arcThickness = 3; // Thickness of the progress arc (reduced from 7)
  const svgSize = buttonSize + arcThickness * 2; // SVG wraps the button with padding for the arc
  const radius = (svgSize - arcThickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? position / duration : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: themeColors.background, borderColor: themeColors.primary }]}
      activeOpacity={0.95}
      onPress={handleOpenFullPlayer}
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
      <View style={{ width: svgSize, height: svgSize, justifyContent: 'center', alignItems: 'center', position: 'relative', marginLeft: 12, marginRight: 12 }}>
        <Svg width={svgSize} height={svgSize} style={{ position: 'absolute', top: 0, left: 0 }}>
          <G rotation={-90} origin={`${svgSize / 2}, ${svgSize / 2}`}>
            <Circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              stroke={themeColors.primary}
              strokeWidth={arcThickness}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <TouchableOpacity
          style={{
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: themeColors.background,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
          onPress={e => {
            e.stopPropagation();
            isPlaying ? pause() : play();
          }}
          activeOpacity={0.8}
        >
          {isPlaying ? (
            <MaterialIcons name="pause" size={28} color={themeColors.primary} />
          ) : (
            <MaterialIcons name="play-arrow" size={28} color={themeColors.primary} />
          )}
        </TouchableOpacity>
      </View>
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
  closeButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
  },
});

export default MiniPlayer; 