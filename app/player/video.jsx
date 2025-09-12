import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text, TouchableWithoutFeedback, BackHandler, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChevronDown, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import useOptimizedVideoStore from '../../store/optimizedVideoStore';
import { useRouter, useFocusEffect } from 'expo-router';
import VideoPlayerFallback from '../../components/VideoPlayerFallback';

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

const VideoPlayer = () => {
  const { currentVideo, playlist, videoFiles, setAndPlayVideo, showMiniPlayer } = useOptimizedVideoStore();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hideTimeout = useRef(null);
  const router = useRouter();

  // Create video player instance
  const player = useVideoPlayer && currentVideo?.uri ?
    useVideoPlayer(currentVideo.uri, (player) => {
      player.loop = false;
      player.muted = isMuted;
      player.play();
    }) : null;

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
      handleNext();
    });

    return () => {
      timeUpdateListener?.remove();
      statusChangeListener?.remove();
      playbackEndListener?.remove();
    };
  }, [player]);

  // Update player mute state
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);

  // Auto-hide controls after 4 seconds
  useEffect(() => {
    if (controlsVisible) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      hideTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [controlsVisible]);

  // Show controls on tap
  const handleScreenPress = () => {
    setControlsVisible(true);
  };

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

  const handleSeek = (value) => {
    if (player && duration > 0) {
      player.currentTime = value;
      setCurrentTime(value);
    }
    setControlsVisible(true);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    setControlsVisible(true);
  };

  const handleSkipForward = () => {
    if (player && duration > 0) {
      const newTime = Math.min(currentTime + 10, duration);
      player.currentTime = newTime;
      setCurrentTime(newTime);
    }
    setControlsVisible(true);
  };

  const handleSkipBackward = () => {
    if (player) {
      const newTime = Math.max(currentTime - 10, 0);
      player.currentTime = newTime;
      setCurrentTime(newTime);
    }
    setControlsVisible(true);
  };

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
      setAndPlayVideo(list[idx - 1], currentSourceTab);
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
      setAndPlayVideo(list[idx + 1], currentSourceTab);
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
          
          {/* Video Controls Overlay */}
          {controlsVisible && (
            <View style={styles.controlsOverlay}>
              {/* Top Controls */}
              <View style={styles.topControls}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <ChevronDown size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={styles.videoTitle} numberOfLines={1}>
                    {currentVideo?.filename || 'Video'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleMuteToggle} style={styles.muteButton}>
                  {isMuted ? (
                    <VolumeX size={24} color="#FFF" />
                  ) : (
                    <Volume2 size={24} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Center Controls */}
              <View style={styles.centerControls}>
                <TouchableOpacity onPress={handleSkipBackward} style={styles.skipButton}>
                  <SkipBack size={32} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                  <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={60} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleSkipForward} style={styles.skipButton}>
                  <SkipForward size={32} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Slider
                    style={styles.progressSlider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={currentTime}
                    onValueChange={handleSeek}
                    minimumTrackTintColor="#FF6B6B"
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbStyle={styles.sliderThumb}
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
                
                <View style={styles.navigationControls}>
                  <TouchableOpacity 
                    onPress={handlePrevious} 
                    style={[styles.navButton, { opacity: getCurrentIndex() > 0 ? 1 : 0.5 }]}
                    disabled={getCurrentIndex() <= 0}
                  >
                    <MaterialIcons name="skip-previous" size={28} color="#FFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleNext} 
                    style={[styles.navButton, { opacity: getCurrentIndex() < getCurrentList().length - 1 ? 1 : 0.5 }]}
                    disabled={getCurrentIndex() >= getCurrentList().length - 1}
                  >
                    <MaterialIcons name="skip-next" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    padding: 12,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  muteButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    padding: 12,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  skipButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 30,
    padding: 16,
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 40,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    gap: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'center',
  },
  progressSlider: {
    flex: 1,
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#FF6B6B',
    width: 16,
    height: 16,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  navButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    padding: 12,
  },
});

export default VideoPlayer; 