import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import { ChevronDown } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import useOptimizedVideoStore from '../../store/optimizedVideoStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomSheet from '../../components/BottomSheet';
import { useRouter } from 'expo-router';
import VideoPlayerFallback from '../../components/VideoPlayerFallback';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const hideTimeout = useRef(null);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  // Create video player instance (with fallback handling)
  const player = useVideoPlayer ? useVideoPlayer(currentVideo?.uri || '', (player) => {
    player.loop = loop;
    player.muted = isMuted;
    player.playbackRate = playbackRate;
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
      player.muted = isMuted;
      player.playbackRate = playbackRate;
    }
  }, [player, loop, isMuted, playbackRate]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!controlsVisible || isLocked) return;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setControlsVisible(false), 6000);
    return () => hideTimeout.current && clearTimeout(hideTimeout.current);
  }, [controlsVisible, isLocked]);

  // Show controls on tap
  const handleScreenPress = () => {
    if (isLocked) return;
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

  const handleSeek = (value) => {
    if (player && duration > 0) {
      player.currentTime = value;
    }
    setControlsVisible(true);
  };

  const handleSkip = (seconds) => {
    if (player) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      player.currentTime = newTime;
    }
    setControlsVisible(true);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    setControlsVisible(true);
  };

  const handleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    setControlsVisible(true);
  };

  const handleFullscreen = async () => {
    setIsTransitioning(true);

    try {
      if (!isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      }

      setIsFullscreen(f => !f);
      setControlsVisible(true);
      
      // Simple transition delay
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    } catch (error) {
      console.log('Orientation change error:', error);
      setIsTransitioning(false);
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setControlsVisible(false);
  };
  const handleUnlock = () => {
    setIsLocked(false);
    setControlsVisible(true);
  };

  const handleBack = () => {
    // Enhanced smooth transition to mini player
    if (showMiniPlayer && currentVideo) {
      // First show mini player with current state
      showMiniPlayer(currentVideo, currentTime * 1000, isPlaying); // Convert to milliseconds

      // Add a small delay to ensure mini player is ready before navigation
      setTimeout(() => {
        router.back();
      }, 100);
    } else {
      router.back();
    }
  };

  // Previous/Next logic
  const getCurrentList = () => (playlist && playlist.length > 0 ? playlist : videoFiles);
  const getCurrentIndex = () => {
    const list = getCurrentList();
    return list.findIndex(v => v.id === currentVideo.id);
  };
  const handlePrevious = () => {
    const list = getCurrentList();
    const idx = getCurrentIndex();
    if (idx > 0) {
      setAndPlayVideo(list[idx - 1]);
    }
    setControlsVisible(true);
  };
  const handleNext = () => {
    const list = getCurrentList();
    const idx = getCurrentIndex();
    if (idx < list.length - 1) {
      setAndPlayVideo(list[idx + 1]);
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

  const handleShowMoreOptions = () => setMoreOptionsVisible(true);
  const handleHideMoreOptions = () => setMoreOptionsVisible(false);
  const handlePlayNext = () => handleNext();
  const handleToggleAutoplay = () => setAutoplay(a => !a);
  const handleToggleLoop = () => setLoop(l => !l);
  const handleShowInfo = () => {
    // You can expand this to show a modal with more info
    alert(`Filename: ${currentVideo.filename || ''}\nDuration: ${formatTime(duration)}\nCurrent Time: ${formatTime(currentTime)}`);
  };

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
          {/* Controls Overlay */}
          {(controlsVisible || isLocked) && (
            <View
              style={styles.controlsOverlay}
              pointerEvents="box-none"
            >
              {/* Top overlay row: Back, Title, More */}
              {controlsVisible && !isLocked && (
                <View style={styles.topOverlay}>
                  <TouchableOpacity onPress={handleBack} style={styles.topIconBtn}>
                    <ChevronDown size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.videoTitle} numberOfLines={1}>{currentVideo.title || ''}</Text>
                  <TouchableOpacity style={styles.topIconBtn} onPress={handleShowMoreOptions}>
                    <Entypo name="dots-three-vertical" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
              {/* Bottom controls group: Seek bar and control bar tightly together */}
              <View style={styles.bottomControlsGroup}>
                {controlsVisible && !isLocked && (
                  <View style={styles.seekBarRow}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={duration || 1}
                      value={currentTime || 0}
                      onSlidingComplete={handleSeek}
                      minimumTrackTintColor="#FFF"
                      maximumTrackTintColor="#888"
                      thumbTintColor="#FFF"
                    />
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                )}
                <View style={styles.bottomControlBar}>
                  {isLocked ? (
                    <TouchableOpacity onPress={handleUnlock} style={styles.iconBtn}>
                      <MaterialIcons name="lock-open" size={28} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity onPress={handleLock} style={styles.iconBtn}>
                        <MaterialIcons name="lock" size={24} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleSkip(-10)} style={styles.iconBtn}>
                        <MaterialIcons name="replay-10" size={28} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handlePrevious} style={styles.iconBtn}>
                        <MaterialIcons name="skip-previous" size={32} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.playPauseLargeBtn} onPress={handlePlayPause}>
                        <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={44} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleNext} style={styles.iconBtn}>
                        <MaterialIcons name="skip-next" size={32} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleSkip(10)} style={styles.iconBtn}>
                        <MaterialIcons name="forward-10" size={28} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleFullscreen} style={styles.iconBtn}>
                        <MaterialIcons name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={28} color="#FFF" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}
          {/* More Options BottomSheet */}
          <BottomSheet
            visible={moreOptionsVisible}
            title="More Options"
            onClose={handleHideMoreOptions}
            options={[
              {
                label: `Autoplay ${autoplay ? '(On)' : '(Off)'}`,
                icon: 'autorenew',
                onPress: handleToggleAutoplay,
              },
              {
                label: 'Play Next Video',
                icon: 'skip-next',
                onPress: handlePlayNext,
              },
              {
                label: `Loop ${loop ? '(On)' : '(Off)'}`,
                icon: 'repeat',
                onPress: handleToggleLoop,
              },
              {
                label: 'Show Video Info',
                icon: 'information-outline',
                onPress: handleShowInfo,
              },
            ]}
          />
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 24,
  },
  controlBarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    paddingVertical: 6,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
    marginHorizontal: 16,
  },
  iconBtn: {
    padding: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeText: {
    color: '#FFF',
    fontSize: 13,
    width: 48,
    textAlign: 'center',
  },
  speedText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 32,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 20,
  },
  topIconBtn: {
    padding: 6,
  },
  videoTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  seekBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 0,
  },
  bottomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    minHeight: 56,
    marginTop: 0,
  },
  playPauseLargeBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 32,
    padding: 10,
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControlsGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 0,
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
});

export default MinimalVideoPlayer; 