import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Text, Vibration } from 'react-native';
import { Video } from 'expo-av';
import { Play, Pause, X, Trash2, ChevronDown } from 'lucide-react-native';
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
  withSequence
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
  const videoRef = React.useRef(null);
  const [showControls, setShowControls] = useState(false);
  const controlsTimer = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInDeleteZone, setIsInDeleteZone] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

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
    // Reset position and animations when mini player is shown
    if (isMiniPlayerVisible) {
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      rotation.value = 0;
      deleteZoneOpacity.value = 0;
      deleteZoneScale.value = 0.8;
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
      opacity: withTiming(isMiniPlayerVisible ? 1 : 0, { duration: 250 }),
      shadowOpacity: isDragging ? 0.3 : 0.1,
      elevation: isDragging ? 15 : 10,
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
    }
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [isMiniPlayerVisible]);

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
  };

  const handleClose = (e) => {
    e.stopPropagation();
    closeMiniPlayer();
  };

  return (
    <>
      {/* Enhanced delete zone with beautiful animations */}
      <Animated.View 
        style={[styles.deleteZoneContainer, deleteZoneAnimatedStyle]} 
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'rgba(255, 59, 48, 0)',
            'rgba(255, 59, 48, 0.3)',
            'rgba(255, 59, 48, 0.6)',
            'rgba(255, 59, 48, 0.8)'
          ]}
          style={styles.deleteZoneGradient}
        >
          <View style={[
            styles.deleteZoneContent,
            { 
              backgroundColor: isInDeleteZone 
                ? 'rgba(255, 59, 48, 0.9)' 
                : 'rgba(255, 59, 48, 0.7)' 
            }
          ]}>
            <Animated.View style={{
              transform: [
                { scale: isInDeleteZone ? 1.2 : 1 },
                { rotate: isInDeleteZone ? '10deg' : '0deg' }
              ]
            }}>
              <Trash2 
                size={isInDeleteZone ? 42 : 36} 
                color="#fff" 
                strokeWidth={2.5}
              />
            </Animated.View>
            
            <Text style={[
              styles.deleteZoneText,
              { 
                fontSize: isInDeleteZone ? 16 : 14,
                fontWeight: isInDeleteZone ? 'bold' : '600'
              }
            ]}>
              {isInDeleteZone ? 'Release to Delete' : 'Drag here to close'}
            </Text>
            
            {isInDeleteZone && (
              <View style={styles.deleteZoneIndicator}>
                <ChevronDown size={20} color="#fff" />
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
      <PanGestureHandler onGestureEvent={panGesture} enabled={isMiniPlayerVisible}>
        <Animated.View style={[
          styles.container,
          { width: miniPlayerWidth, height: miniPlayerHeight },
          containerAnimatedStyle
        ]}>
          {miniPlayerVideo && miniPlayerVideo.uri && (
            <TouchableOpacity 
              style={styles.pressableArea} 
              onPress={handlePlayerPress}
              activeOpacity={1}
            >
              <Video
                ref={videoRef}
                source={{ uri: miniPlayerVideo.uri }}
                style={styles.video}
                contentFit="cover"
                shouldPlay={isMiniPlayerPlaying}
                positionMillis={miniPlayerPosition}
                isMuted={false}
                volume={1.0}
                isLooping
              />
              <Animated.View style={[styles.overlay, controlsAnimatedStyle]}>
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
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </PanGestureHandler>
    </>
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
  // Enhanced delete zone styles
  deleteZoneContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    zIndex: 999,
  },
  deleteZoneGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteZoneContent: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 12,
  },
  deleteZoneText: {
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deleteZoneIndicator: {
    marginTop: 4,
    opacity: 0.8,
  },
});

export default React.memo(VideoMiniPlayer); 