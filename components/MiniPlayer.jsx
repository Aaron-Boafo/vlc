import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter, useSegments } from 'expo-router';
import PerformanceAnalytics from '../utils/performanceAnalytics';

const MiniPlayer = memo(() => {
  const renderStart = Date.now();

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

  // 🎨 Memoized artwork to prevent blinking
  const artworkUri = useMemo(() => currentTrack?.artwork, [currentTrack?.artwork]);

  // 🎯 Highly optimized values for 60 FPS performance
  const throttledPosition = useMemo(() => {
    // Update position every 2 seconds instead of every 500ms
    return Math.floor(position / 2000) * 2000;
  }, [Math.floor(position / 2000)]);

  const progress = useMemo(() => {
    if (duration === 0) return 0;
    return Math.min(throttledPosition / duration, 1);
  }, [throttledPosition, duration]);

  // 🎯 Memoized callbacks
  const handlePlayPause = useCallback(() => {
    console.log('🎵 Mini player play/pause pressed, isPlaying:', isPlaying);
    const startTime = Date.now();
    isPlaying ? pause() : play();
    PerformanceAnalytics.trackRenderTime('MiniPlayer-PlayPause', Date.now() - startTime);
  }, [isPlaying, pause, play]);

  const handleOpenFullPlayer = useCallback(() => {
    console.log('🎵 Mini player main area pressed - opening full player');
    router.push('/player/audio');
  }, [router]);

  // Cleanup function for proper audio cleanup
  const cleanupAndClose = useCallback(() => {
    console.log('🎵 Mini player close button pressed');
    // Stop and cleanup audio before closing
    if (sound) {
      try {
        sound.pauseAsync();
      } catch (error) {
        console.log('Error stopping audio:', error);
      }
    }

    stop();
    hideMiniPlayer();
  }, [sound, stop, hideMiniPlayer]);



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
    const renderTime = Date.now() - renderStart;
    // Only track significant renders and throttle tracking
    if (renderTime > 100 && Math.random() < 0.1) { // Only track 10% of renders
      PerformanceAnalytics.trackRenderTime('MiniPlayer', renderTime);
    }
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

  // Render with proper touch handling
  const MiniPlayerContent = () => (
    <View style={styles.pressableArea}>
      {/* Main touchable area for opening full player */}
      <TouchableOpacity
        style={styles.mainTouchArea}
        activeOpacity={0.95}
        onPress={handleOpenFullPlayer}
      >
        {currentTrack.artwork ? (
          <Image 
            source={{ uri: artworkUri }} 
            style={styles.artwork}
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.artwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]} />
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

      {/* Play/Pause button - separate from main touch area */}
      <View style={styles.controlsContainer}>
        <View style={{
          width: circleProps.svgSize,
          height: circleProps.svgSize,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          marginLeft: 12,
          marginRight: 8
        }}>
          <Svg width={circleProps.svgSize} height={circleProps.svgSize} style={{ position: 'absolute', top: 0, left: 0 }}>
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
            style={{
              width: circleProps.buttonSize,
              height: circleProps.buttonSize,
              borderRadius: circleProps.buttonSize / 2,
              backgroundColor: themeColors.background,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
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

        {/* Close button - separate from main touch area */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={cleanupAndClose}
          activeOpacity={0.7}
        >
          <X size={22} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[
      styles.container,
      { backgroundColor: themeColors.background, borderColor: themeColors.primary }
    ]}>
      <MiniPlayerContent />
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
  pressableArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
    padding: 8,
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(MiniPlayer);