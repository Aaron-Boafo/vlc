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

  // Sync player state with mini player state
  useEffect(() => {
    if (player && miniPlayerVideo?.uri) {
      if (isMiniPlayerPlaying) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [player, isMiniPlayerPlaying, miniPlayerVideo?.uri]);

  const miniPlayerWidth = (width - 48) / 2;
  const miniPlayerHeight = (miniPlayerWidth * 9) / 16;



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