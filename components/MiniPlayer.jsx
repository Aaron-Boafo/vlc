import React, { memo, useCallback, useMemo } from 'react';
import PerformanceAnalytics from '../utils/performanceAnalytics';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { X } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter, useSegments } from 'expo-router';
import useAudioStore from '../store/AudioHeadStore';

const MiniPlayer = memo(() => {
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

  // 🎨 Stable artwork URI to prevent blinking
  const artworkUri = useMemo(() => {
    return currentTrack?.artwork || null;
  }, [currentTrack?.id, currentTrack?.artwork]);

  // Progress calculation
  const progress = useMemo(() => {
    if (duration === 0) return 0;
    return Math.min(position / duration, 1);
  }, [position, duration]);

  // 🎯 Memoized callbacks
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  
  const handlePlayPause = useCallback(async (e) => {
    e.stopPropagation(); // Prevent opening full player
    if (isTransitioning) return;
    
    console.log('🎵 Mini player play/pause pressed, isPlaying:', isPlaying);
    setIsTransitioning(true);
    
    try {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [isPlaying, pause, play, isTransitioning]);

  const [isNavigating, setIsNavigating] = React.useState(false);
  
  const handleOpenFullPlayer = useCallback(() => {
    if (isNavigating) return; // Prevent multiple presses
    
    console.log('🎵 Mini player main area pressed - opening full player');
    setIsNavigating(true);
    
    const state = useAudioStore.getState();
    router.push({
      pathname: '/player/audio',
      params: { activeTab: state.activeTab }
    });
    
    // Reset navigation state after a delay
    setTimeout(() => setIsNavigating(false), 1000);
  }, [router, isNavigating]);

  // Cleanup function for proper audio cleanup
  const cleanupAndClose = useCallback(async (e) => {
    e.stopPropagation(); // Prevent opening full player
    if (isTransitioning) return;
    
    console.log('🎵 Mini player close button pressed');
    setIsTransitioning(true);
    
    try {
      // First stop the playback
      await stop();
      // Then hide the mini player
      hideMiniPlayer();
    } catch (error) {
      console.error('Error closing mini player:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [stop, hideMiniPlayer, isTransitioning]);



  React.useEffect(() => {
    if (isMiniPlayerVisible && sound) {
      sound.getStatusAsync().then(status => {
        console.log('[MiniPlayer] Native sound status:', status);
      }).catch(e => {
        console.log('[MiniPlayer] Error getting sound status:', e);
      });
    }
  }, [isMiniPlayerVisible, sound]);

  // 📊 Optimized performance tracking - reduce overhead
  React.useEffect(() => {
    const renderStart = Date.now();
    return () => {
      const renderTime = Date.now() - renderStart;
      // Only track significant renders and throttle tracking
      if (renderTime > 100 && Math.random() < 0.1) { // Only track 10% of renders
        PerformanceAnalytics.trackRenderTime('MiniPlayer', renderTime);
      }
    };
  });

  // Check if the current screen is the player screen
  const isPlayerScreen = segments.includes('player');

  // 🚀 Optimized progress circle calculations - memoized for performance
  const circleProps = useMemo(() => {
    const buttonSize = 40;
    const arcThickness = 3;
    const svgSize = buttonSize + arcThickness * 2;
    const radius = (svgSize - arcThickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return {
      buttonSize,
      arcThickness,
      svgSize,
      radius,
      circumference,
      strokeDashoffset
    };
  }, [progress]);



  // Don't render the mini player if there's no track, if it's hidden, or if we are on the player screen
  if (!currentTrack || !isMiniPlayerVisible || isPlayerScreen) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: themeColors.background, borderColor: themeColors.primary }
    ]}>
      {/* Artwork and Info - Touchable to open full player */}
      <TouchableOpacity
        style={styles.mainTouchArea}
        activeOpacity={0.95}
        onPress={handleOpenFullPlayer}
        disabled={isTransitioning || isNavigating}
      >
        {artworkUri ? (
          <Image 
            source={{ uri: artworkUri }} 
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialIcons name="music-note" size={24} color={themeColors.background} />
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {currentTrack.title || 'Unknown Track'}
          </Text>
          <Text style={[styles.artist, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Play/Pause Button */}
      <View style={styles.playButtonContainer}>
        <Svg width={circleProps.svgSize} height={circleProps.svgSize} style={{ position: 'absolute' }}>
          <G rotation={-90} origin={`${circleProps.svgSize / 2}, ${circleProps.svgSize / 2}`}>
            <Circle
              cx={circleProps.svgSize / 2}
              cy={circleProps.svgSize / 2}
              r={circleProps.radius}
              stroke={themeColors.primary}
              strokeWidth={circleProps.arcThickness}
              fill="none"
              strokeDasharray={circleProps.circumference}
              strokeDashoffset={circleProps.strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: themeColors.background }]}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          {isPlaying ? (
            <MaterialIcons name="pause" size={28} color={themeColors.primary} />
          ) : (
            <MaterialIcons name="play-arrow" size={28} color={themeColors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={cleanupAndClose}
        activeOpacity={0.7}
      >
        <X size={22} color={themeColors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

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
  mainTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  playButtonContainer: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(MiniPlayer);