import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Video } from 'expo-av';
import { Play, Pause, X } from 'lucide-react-native';
import useVideoStore from '../store/VideoHeadStore';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

const VideoMiniPlayer = () => {
  const { 
    currentVideo, 
    isMiniPlayerVisible, 
    isMiniPlayerPlaying, 
    toggleMiniPlayerPlayback, 
    closeMiniPlayer 
  } = useVideoStore();
  const { width } = useWindowDimensions();
  const videoRef = React.useRef(null);
  const [showControls, setShowControls] = useState(false);
  const controlsTimer = useRef(null);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateY: withTiming(isMiniPlayerVisible ? 0 : 120, { duration: 300 })
        },
      ],
      opacity: withTiming(isMiniPlayerVisible ? 1 : 0, { duration: 250 })
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
    if (currentVideo) {
      router.push('/(tabs)/(video)/player');
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

  const miniPlayerWidth = (width - 48) / 2;
  const miniPlayerHeight = (miniPlayerWidth * 9) / 16;

  return (
    <Animated.View style={[
      styles.container,
      { width: miniPlayerWidth, height: miniPlayerHeight },
      containerAnimatedStyle
    ]}>
      {currentVideo && (
        <TouchableOpacity 
          style={styles.pressableArea} 
          onPress={handlePlayerPress}
          activeOpacity={1}
        >
          <Video
            ref={videoRef}
            source={{ uri: currentVideo.uri }}
            style={styles.video}
            resizeMode="cover"
            shouldPlay={isMiniPlayerPlaying}
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

export default VideoMiniPlayer; 