import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChevronDown } from 'lucide-react-native';
// Removed Slider import - not needed for minimal player
import useOptimizedVideoStore from '../../store/optimizedVideoStore';
// Removed ScreenOrientation import - not needed for minimal player
// Removed BottomSheet import - not needed for minimal player
import { useRouter, useFocusEffect } from 'expo-router';
import VideoPlayerFallback from '../../components/VideoPlayerFallback';
import { useCallback } from 'react';
// Removed reanimated imports to fix casting error

// Try to import expo-video with fallback
let VideoView, useVideoPlayer;
try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch (error) {
  console.warn('expo-video not available, using fallback');
  VideoView = null;
  useVideoPlayer = null;
}

const MinimalVideoPlayer = () => {
  const { currentVideo, playlist, videoFiles, setAndPlayVideo, showMiniPlayer } = useOptimizedVideoStore();
  const [isPlaying, setIsPlaying] = useState(true);
  // Removed unused state variables for cleaner code
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Removed lock functionality for cleaner experience
  const hideTimeout = useRef(null);
  // Removed more options state - not needed for minimal player
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  // Removed isTransitioning - not needed for minimal player
  const router = useRouter();

  // Create video player instance - always call hook to maintain order
  const player = useVideoPlayer && currentVideo?.uri ?
    useVideoPlayer(currentVideo.uri, (player) => {
      player.loop = loop;
      player.play();
    }) : null;

  // Removed animation values to fix casting error

  // Enhanced orientation change listener for smooth transitions
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsTransitioning(true);

      // Simple transition without complex animations
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    });

    return () => subscription?.remove();
  }, []);

  // Video player event listeners
  useEffect(() => {
    if (!player) return;

    const timeUpdateListener = player.addListener('timeUpdate', (payload) => {
      setCurrentTime(payload.currentTime);
      setIsPlaying(player.playing);
    });

    const statusChangeListener = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        setDuration(player.duration);
      } else if (status.status === 'error') {
        console.error('Video player error:', status.error);
      }
    });

    const playbackEndListener = player.addListener('playbackEnd', () => {
      if (autoplay && !loop) {
        handleNext();
      }
    });

    return () => {
      timeUpdateListener?.remove();
      statusChangeListener?.remove();
      playbackEndListener?.remove();
    };
  }, [player, autoplay, loop]);

  // Update player properties when state changes
  useEffect(() => {
    if (player) {
      player.loop = loop;
    }
  }, [player, loop]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!controlsVisible) return;
    const timeout = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timeout);
  }, [controlsVisible]);

  // Show controls on tap
  const handleScreenPress = () => {
    setControlsVisible(true);
  };

  useEffect(() => {
    // Clean up: always unlock orientation when unmounting or exiting fullscreen
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, []);

  // Check if expo-video is available
  if (!VideoView || !useVideoPlayer) {
    return <VideoPlayerFallback onRetry={() => router.back()} />;
  }

  if (!currentVideo || !currentVideo.uri) {
    console.log('🎥 Video Player Debug:', {
      currentVideo,
      hasCurrentVideo: !!currentVideo,
      currentVideoUri: currentVideo?.uri,
      videoFiles: videoFiles?.length || 0
    });
    return (
      <View style={styles.center}>
        <MaterialIcons name="videocam-off" size={48} color="#888" />
        <Text style={{ color: '#888', marginTop: 16 }}>
          {!currentVideo ? 'No video selected' : 'Video has no URI'}
        </Text>
      </View>
    );
  }

  const handlePlayPause = () => {
    if (player) {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
    setControlsVisible(true);
  };

  // Removed unused control functions for cleaner code

  const handleBack = () => {
    // Show mini player when going back if there's a current video
    if (showMiniPlayer && currentVideo) {
      showMiniPlayer(currentVideo, currentTime * 1000, isPlaying);
    }

    // Navigate back to video tab
    router.replace('/(tabs)/(video)');
  };

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Call the existing handleBack function instead of letting the app close
        handleBack();
        return true; // Prevent default behavior (closing the app)
      };

      // Add the back handler when the screen is focused
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Remove the back handler when the screen loses focus
      return () => backHandler.remove();
    }, [handleBack]) // Include handleBack in dependencies
  );

  // Previous/Next logic
  const getCurrentList = () => (playlist && playlist.length > 0 ? playlist : videoFiles);
  const getCurrentIndex = () => {
    const list = getCurrentList();
    return list.findIndex(v => v.id === currentVideo.id);
  };
  const handlePrevious = () => {
    if (isTransitioning) return;

    const list = getCurrentList();
    const idx = getCurrentIndex();
    if (idx > 0) {
      setIsTransitioning(true);
      const currentSourceTab = useOptimizedVideoStore.getState().sourceTab;
      setAndPlayVideo(list[idx - 1], currentSourceTab); // Preserve current source tab
      setTimeout(() => setIsTransitioning(false), 500);
    }
    setControlsVisible(true);
  };
  const handleNext = () => {
    if (isTransitioning) return;

    const list = getCurrentList();
    const idx = getCurrentIndex();
    if (idx < list.length - 1) {
      setIsTransitioning(true);
      const currentSourceTab = useOptimizedVideoStore.getState().sourceTab;
      setAndPlayVideo(list[idx + 1], currentSourceTab); // Preserve current source tab
      setTimeout(() => setIsTransitioning(false), 500);
    }
    setControlsVisible(true);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Removed more options functions for cleaner experience

  // Removed animated styles to fix casting error

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <View style={styles.videoContainer}>
          {VideoView && player ? (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              showsTimecodes={false}
              requiresLinearPlayback={false}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialIcons name="play-circle-outline" size={64} color="#FFF" />
              <Text style={{ color: '#FFF', marginTop: 16 }}>Video Player Loading...</Text>
            </View>
          )}
          {/* Clean minimal overlay - just back button and play/pause */}
          {controlsVisible && (
            <View style={styles.cleanOverlay}>
              {/* Back button */}
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ChevronDown size={28} color="#FFF" />
              </TouchableOpacity>

              {/* Center play/pause button */}
              <TouchableOpacity style={styles.centerPlayButton} onPress={handlePlayPause}>
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={60} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          {/* Removed BottomSheet - minimal player doesn't need extra options */}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  cleanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 12,
    alignSelf: 'flex-start',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 40,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MinimalVideoPlayer; 