import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanGestureHandler } from 'react-native';
import { Play, Pause, X, SkipForward, SkipBack } from 'lucide-react-native';
import { Image } from 'expo-image';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter } from 'expo-router';
import ImageOptimizer from '../utils/imageOptimizer';

const EnhancedMiniPlayer = memo(() => {
  const { themeColors } = useThemeStore();
  const { 
    currentTrack, 
    isPlaying, 
    isMiniPlayerVisible, 
    hideMiniPlayer, 
    pause, 
    play,
    next,
    previous,
    position,
    duration
  } = useAudioControl();
  const router = useRouter();

  // Memoized values for performance
  const progress = useMemo(() => {
    return duration > 0 ? (position / duration) * 100 : 0;
  }, [position, duration]);

  const optimizedArtwork = useMemo(() => {
    if (!currentTrack?.artwork) return null;
    return ImageOptimizer.getOptimizedImageProps(currentTrack.artwork, 50);
  }, [currentTrack?.artwork]);

  // Memoized callbacks
  const handlePlayPause = useCallback(() => {
    isPlaying ? pause() : play();
  }, [isPlaying, pause, play]);

  const handleNext = useCallback(() => next(), [next]);
  const handlePrevious = useCallback(() => previous(), [previous]);
  const handleClose = useCallback(() => hideMiniPlayer(), [hideMiniPlayer]);
  
  const handlePress = useCallback(() => {
    router.push('/player');
  }, [router]);

  if (!isMiniPlayerVisible || !currentTrack) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: themeColors.background }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: themeColors.primary,
              width: `${progress}%`
            }
          ]} 
        />
      </View>

      <TouchableOpacity 
        style={styles.content} 
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {optimizedArtwork ? (
            <Image {...optimizedArtwork} style={styles.artwork} />
          ) : (
            <View style={[styles.placeholderArtwork, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}
        </View>

        {/* Track info */}
        <View style={styles.trackInfo}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artist, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
            <SkipBack size={20} color={themeColors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            {isPlaying ? (
              <Pause size={24} color={themeColors.text} />
            ) : (
              <Play size={24} color={themeColors.text} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
            <SkipForward size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Close button */}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBar: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  artworkContainer: {
    marginRight: 12,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  placeholderArtwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  closeButton: {
    padding: 8,
  },
});

EnhancedMiniPlayer.displayName = 'EnhancedMiniPlayer';

export default EnhancedMiniPlayer;