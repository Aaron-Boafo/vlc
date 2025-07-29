import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Text } from 'react-native';
import { Play, Pause, X } from 'lucide-react-native';

// Try to import expo-video with fallback
let VideoView, useVideoPlayer;
try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch (error) {
  console.warn('expo-video not available in mini player, using fallback');
  VideoView = null;
  useVideoPlayer = null;
}
import useOptimizedVideoStore from '../store/optimizedVideoStore';
import { router } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue, 
  useAnimatedGestureHandler, 
  runOnJS,
  withSpring,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VideoMiniPlayer = () => {
  const { 
    miniPlayerVideo,
    miniPlayerPosition,
    isMiniPlayerVisible, 
    isMiniPlayerPlaying, 
    toggleMiniPlayerPlayback, 
    closeMiniPlayer 
  } = useOptimizedVideoStore();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(false);

  // Create video player instance for expo-video (always call hook)
  const player = useVideoPlayer ? useVideoPlayer(
    miniPlayerVideo?.uri || '', 
    (player) => {
      if (miniPlayerVideo?.uri) {
        player.loop = true;
        player.muted = false;
        if (isMiniPlayerPlaying) {
          player.play();
        } else {
          player.pause();
        }
      }
    }
  ) : null;
  const controlsTimer = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInDeleteZone, setIsInDeleteZone] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  
  // Add video opacity for smooth content transitions
  const videoOpacity = useSharedValue(0);

  const miniPlayerWidth = (width - 48) / 2;
  const miniPlayerHeight = (miniPlayerWidth * 9) / 16;

  // Enhanced animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const deleteZoneOpacity = useSharedValue(0);
  const deleteZoneScale = useSharedValue(0.8);

  // Delete zone configuration
  const DELETE_ZONE_HEIGHT = 120;
  const DELETE_THRESHOLD = height - DELETE_ZONE_HEIGHT;

  useEffect(() => {
    // Enhanced smooth entrance/exit animations
    if (isMiniPlayerVisible) {
      // Smooth entrance animation from bottom-right
      translateX.value = withSpring(0, { 
        damping: 20, 
        stiffness: 150,
        mass: 1
      });
      translateY.value = withSpring(0, { 
        damping: 20, 
        stiffness: 150,
        mass: 1
      });
      scale.value = withSequence(
        withTiming(0.8, { duration: 0 }),
        withSpring(1, { 
          damping: 15, 
          stiffness: 200 
        })
      );
      rotation.value = withSpring(0, { damping: 20 });
      deleteZoneOpacity.value = 0;
      deleteZoneScale.value = 0.8;
    } else {
      // Smooth exit animation
      scale.value = withTiming(0.8, { 
        duration: 200,
        easing: Easing.out(Easing.cubic)
      });
      translateY.value = withTiming(100, { 
        duration: 250,
        easing: Easing.out(Easing.cubic)
      });
    }
  }, [isMiniPlayerVisible, width, height]);

  // Enhanced haptic feedback function
  const triggerHapticFeedback = (type = 'light') => {
    try {
      if (type === 'enter') {
        Vibration.vibrate(50); // Light vibration when entering delete zone
      } else if (type === 'delete') {
        Vibration.vibrate([0, 100, 50, 100]); // Pattern for deletion
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  const panGesture = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      
      // Start drag animations
      scale.value = withSpring(1.1, { damping: 15 });
      rotation.value = withSpring(2, { damping: 15 });
      deleteZoneOpacity.value = withTiming(1, { duration: 200 });
      deleteZoneScale.value = withSpring(1, { damping: 15 });
      
      runOnJS(setIsDragging)(true);
      runOnJS(setHasTriggeredHaptic)(false);
    },
    
    onActive: (event, ctx) => {
      const newX = ctx.startX + event.translationX;
      const newY = ctx.startY + event.translationY;
      
      translateX.value = newX;
      translateY.value = newY;
      
      // Calculate current absolute position
      const currentAbsoluteY = height - 65 - miniPlayerHeight + newY;
      const isInZone = currentAbsoluteY > DELETE_THRESHOLD;
      
      // Enhanced visual feedback based on proximity to delete zone
      const distanceToZone = Math.max(0, DELETE_THRESHOLD - currentAbsoluteY);
      const proximityFactor = Math.max(0, 1 - distanceToZone / 100);
      
      // Dynamic scaling and rotation based on proximity
      scale.value = 1.1 + (proximityFactor * 0.2);
      rotation.value = 2 + (proximityFactor * 8);
      
      // Update delete zone appearance
      if (isInZone) {
        deleteZoneScale.value = withSpring(1.2, { damping: 10 });
        if (!hasTriggeredHaptic) {
          runOnJS(triggerHapticFeedback)('enter');
          runOnJS(setHasTriggeredHaptic)(true);
        }
        runOnJS(setIsInDeleteZone)(true);
      } else {
        deleteZoneScale.value = withSpring(1, { damping: 15 });
        runOnJS(setIsInDeleteZone)(false);
        runOnJS(setHasTriggeredHaptic)(false);
      }
    },
    
    onEnd: (event) => {
      const finalY = translateY.value;
      const currentAbsoluteY = height - 65 - miniPlayerHeight + finalY;
      const shouldDelete = currentAbsoluteY > DELETE_THRESHOLD;
      
      if (shouldDelete) {
        // Enhanced delete animation
        scale.value = withSequence(
          withSpring(1.3, { damping: 10 }),
          withTiming(0, { duration: 200 })
        );
        rotation.value = withTiming(15, { duration: 200 });
        translateY.value = withTiming(height, { duration: 300 });
        
        runOnJS(triggerHapticFeedback)('delete');
        runOnJS(setTimeout)(() => {
          runOnJS(closeMiniPlayer)();
        }, 250);
      } else {
        // Snap to nearest corner with enhanced animation
        const corners = [
          { x: 0, y: 0 }, // top-right
          { x: 0, y: -(height - miniPlayerHeight - 65) }, // bottom-right
          { x: -(width - miniPlayerWidth - 16), y: 0 }, // top-left
          { x: -(width - miniPlayerWidth - 16), y: -(height - miniPlayerHeight - 65) }, // bottom-left
        ];
        
        const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        const current = { x: translateX.value, y: translateY.value };
        let minDist = Infinity;
        let nearest = corners[0];
        
        for (let c of corners) {
          const d = dist(current, c);
          if (d < minDist) {
            minDist = d;
            nearest = c;
          }
        }
        
        // Smooth return animation
        translateX.value = withSpring(nearest.x, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(nearest.y, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1, { damping: 15 });
        rotation.value = withSpring(0, { damping: 15 });
      }
      
      // Hide delete zone
      deleteZoneOpacity.value = withTiming(0, { duration: 300 });
      deleteZoneScale.value = withSpring(0.8, { damping: 15 });
      
      runOnJS(setIsDragging)(false);
      runOnJS(setIsInDeleteZone)(false);
      runOnJS(setHasTriggeredHaptic)(false);
    },
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ],
      opacity: withTiming(isMiniPlayerVisible ? 1 : 0, { 
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Smooth easing curve
      }),
      shadowOpacity: withTiming(isDragging ? 0.3 : 0.15, { duration: 200 }),
      elevation: isDragging ? 15 : 10,
      // Prevent flickering during transitions
      zIndex: isMiniPlayerVisible ? 1000 : -1,
    };
  });

  const deleteZoneAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteZoneOpacity.value,
      transform: [{ scale: deleteZoneScale.value }],
    };
  });
  
  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showControls ? 1 : 0, { duration: 200 })
    };
  });

  useEffect(() => {
    if (isMiniPlayerVisible) {
      setShowControls(true);
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(false);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      
      // Cleanup video player when mini player becomes invisible
      if (player && miniPlayerVideo?.uri) {
        try {
          player.pause();
          player.currentTime = 0;
        } catch (error) {
          console.log('Error cleaning up video player:', error);
        }
      }
    }
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [isMiniPlayerVisible, player, miniPlayerVideo?.uri]);

  const handleOpenFullScreen = () => {
    if (miniPlayerVideo) {
      router.push('/player/video');
    }
  };

  const handlePlayerPress = () => {
    if (showControls) {
      handleOpenFullScreen();
    } else {
      setShowControls(true);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleTogglePlayback = (e) => {
    e.stopPropagation();
    toggleMiniPlayerPlayback();
    
    // Control expo-video player
    if (player && miniPlayerVideo?.uri) {
      if (isMiniPlayerPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  // Cleanup function for proper video player cleanup
  const cleanupAndClose = () => {
    // Stop and cleanup video player before closing
    if (player && miniPlayerVideo?.uri) {
      try {
        player.pause();
        // Reset player position
        player.currentTime = 0;
      } catch (error) {
        console.log('Error stopping video player:', error);
      }
    }
    
    closeMiniPlayer();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    cleanupAndClose();
  };

  if (!isMiniPlayerVisible) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { width: miniPlayerWidth, height: miniPlayerHeight }
    ]}>
      {miniPlayerVideo && miniPlayerVideo.uri && (
        <TouchableOpacity 
          style={styles.pressableArea} 
          onPress={handlePlayerPress}
          activeOpacity={1}
        >
          {VideoView && player ? (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              showsTimecodes={false}
            />
          ) : (
            <View style={[styles.video, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <Play size={24} color="#FFF" />
            </View>
          )}
          <View style={[styles.overlay, { opacity: showControls ? 1 : 0 }]}>
            <TouchableOpacity onPress={handleTogglePlayback} style={[styles.controlButton, { left: 8 }]}> 
              {isMiniPlayerPlaying ? (
                <Pause size={18} color="white" fill="white" />
              ) : (
                <Play size={18} color="white" fill="white" style={{ marginLeft: 2 }}/>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={[styles.controlButton, { right: 8 }]}> 
              <X size={18} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 65, 
    right: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#000',
  },
  pressableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlButton: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(VideoMiniPlayer); 