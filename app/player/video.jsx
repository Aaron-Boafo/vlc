import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text, TouchableWithoutFeedback } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import { ChevronDown } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import useVideoStore from '../../store/VideoHeadStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomSheet from '../../components/BottomSheet';
import { useRouter } from 'expo-router';

const MinimalVideoPlayer = () => {
  const { currentVideo, playlist, currentVideoIndex, videoFiles, setCurrentVideo, setAndPlayVideo, showMiniPlayer } = useVideoStore();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [status, setStatus] = useState({});
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const hideTimeout = useRef(null);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const router = useRouter();

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

  if (!currentVideo || !currentVideo.uri) {
    return <View style={styles.center}><MaterialIcons name="videocam-off" size={48} color="#888" /></View>;
  }

  const handlePlayPause = async () => {
    if (videoRef.current) {
      const s = await videoRef.current.getStatusAsync();
      if (s.isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    }
    setControlsVisible(true);
  };

  const handleSeek = async (value) => {
    if (videoRef.current && status.durationMillis) {
      await videoRef.current.setPositionAsync(value);
    }
    setControlsVisible(true);
  };

  const handleSkip = async (seconds) => {
    if (videoRef.current && status.positionMillis != null) {
      let newPos = status.positionMillis + seconds * 1000;
      newPos = Math.max(0, Math.min(newPos, status.durationMillis));
      await videoRef.current.setPositionAsync(newPos);
    }
    setControlsVisible(true);
  };

  const handleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    }
    setControlsVisible(true);
  };

  const handleSpeed = async () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(next, true);
    }
    setControlsVisible(true);
  };

  const handleFullscreen = async () => {
    if (!isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
    setIsFullscreen(f => !f);
    setControlsVisible(true);
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
    // Show mini player with current video and hide fullscreen player
    if (showMiniPlayer && currentVideo) {
      showMiniPlayer(currentVideo, status.positionMillis, isPlaying);
    }
    // Use expo-router to navigate back
    router.back();
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

  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
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
    alert(`Filename: ${currentVideo.filename || ''}\nDuration: ${formatTime(status.durationMillis)}\nResolution: ${status.naturalSize?.width || ''}x${status.naturalSize?.height || ''}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: currentVideo.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            shouldPlay
            isMuted={isMuted}
            rate={playbackRate}
            onPlaybackStatusUpdate={s => {
              setStatus(s);
              setIsPlaying(s.isPlaying);
              // Autoplay logic: if video just finished
              if (autoplay && s.didJustFinish && !s.isLooping) {
                handleNext();
              }
            }}
            isLooping={loop}
          />
          {/* Controls Overlay */}
          {(controlsVisible || isLocked) && (
            <View style={styles.controlsOverlay} pointerEvents="box-none">
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
                    <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={status.durationMillis || 1}
                      value={status.positionMillis || 0}
                      onSlidingComplete={handleSeek}
                      minimumTrackTintColor="#FFF"
                      maximumTrackTintColor="#888"
                      thumbTintColor="#FFF"
                    />
                    <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>
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