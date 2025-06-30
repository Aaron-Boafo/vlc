import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, Modal, TextInput, FlatList, Alert, BackHandler, useWindowDimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Lock, Unlock, Clock, Minimize2, Info, Heart, ListPlus, Captions, Maximize2, Minimize, ChevronLeft, ChevronRight, Settings, PictureInPicture, Expand, RotateCcw, RotateCw } from 'lucide-react-native';
import useThemeStore from '../../store/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Gesture, GestureDetector, TapGestureHandler } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import useVideoStore from "../../store/VideoHeadStore";
import * as FileSystem from 'expo-file-system';
import srtParser from 'parse-srt';
import ytdl from 'react-native-ytdl';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

const VideoPlayerScreen = () => {
  const { 
    currentVideo, 
    playNext, 
    playPrevious, 
    showMiniPlayer,
    isMiniPlayerPlaying,
    setMiniPlayerPlaying,
    hideMiniPlayer
  } = useVideoStore();
  const { themeColors } = useThemeStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();

  // All hooks must be called before any return
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isControlsVisible, setControlsVisible] = useState(true);
  const [isLocked, setLocked] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeout = useRef(null);
  const [isInfoModalVisible, setInfoModalVisible] = useState(false);
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [fileSize, setFileSize] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [currentSubtitleLine, setCurrentSubtitleLine] = useState('');
  const [isSubtitleModalVisible, setSubtitleModalVisible] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isFetchingStream, setIsFetchingStream] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeedModalVisible, setSpeedModalVisible] = useState(false);
  const [isMoreModalVisible, setMoreModalVisible] = useState(false);
  const availableSpeeds = [1.0, 1.5, 1.75, 2.0];
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  const loadingTimeoutDuration = 15000; // 15 seconds
  const [bufferingTimeout, setBufferingTimeout] = useState(false);
  const bufferingTimeoutDuration = 10000; // 10 seconds for buffering
  const [showSkipFeedback, setShowSkipFeedback] = useState(null); // 'forward' | 'backward' | null
  const skipFeedbackTimeout = useRef(null);
  const [skipFeedbackAnim] = useState({
    forward: new Animated.Value(0),
    backward: new Animated.Value(0),
  });
  const [skipFeedbackSeconds, setSkipFeedbackSeconds] = useState({
    forward: 0,
    backward: 0,
  });
  const isFavourited = useMemo(() => 
    useVideoStore.getState().favouriteVideos.some(v => v.id === currentVideo?.id),
    [currentVideo?.id]
  );
  const sliderRef = useRef(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const resetLoadingStates = () => {
    setLoadingTimeout(false);
    setLoadingError(null);
    setIsFetchingStream(false);
    setBufferingTimeout(false);
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      resetLoadingStates();
      // Trigger re-processing of video URI
      if (currentVideo && currentVideo.uri) {
        processVideoUri();
      }
    }
  };

  useEffect(() => {
    const processVideoUri = async () => {
      resetLoadingStates();
      
      // Set timeout for loading
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
        setIsFetchingStream(false);
      }, loadingTimeoutDuration);

      if (currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be'))) {
        setIsFetchingStream(true);
        try {
          const videoInfo = await ytdl.getInfo(currentVideo.uri);
          const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest', filter: 'videoandaudio' });
          if (format && format.url) {
            setStreamUrl(format.url);
            clearTimeout(timeoutId);
          } else {
            const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestvideo' });
            if (videoFormat && videoFormat.url) {
              setStreamUrl(videoFormat.url);
              clearTimeout(timeoutId);
            } else {
              console.error('No suitable video format found');
              setStreamUrl(null);
              setLoadingError('No suitable video format found');
              clearTimeout(timeoutId);
            }
          }
        } catch (error) {
          console.error("YTDL Error:", error);
          setStreamUrl(null);
          setLoadingError(`YouTube extraction failed: ${error.message}`);
          clearTimeout(timeoutId);
        } finally {
          setIsFetchingStream(false);
        }
      } else {
        setStreamUrl(currentVideo.uri);
        clearTimeout(timeoutId);
      }
    };

    if (currentVideo && currentVideo.uri) {
      processVideoUri();
    }
    
    return () => {
      // Cleanup timeout on unmount or dependency change
      resetLoadingStates();
    };
  }, [currentVideo.uri, retryCount]);

  useEffect(() => {
    const getFileSize = async () => {
      if (currentVideo.uri && currentVideo.uri.startsWith('file://')) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(currentVideo.uri);
          if (fileInfo.exists) {
            setFileSize(fileInfo.size);
          }
        } catch (error) {
          console.error('Failed to get file size', error);
        }
      }
    };
    if (currentVideo && currentVideo.uri) {
        getFileSize();
    }
  }, [currentVideo.uri]);

  // Handle orientation changes
  const fullscreenAnim = useRef(new Animated.Value(0)).current; // 0 = portrait, 1 = fullscreen
  useEffect(() => {
    if (isFullscreen) {
      Animated.timing(fullscreenAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      });
    } else {
      Animated.timing(fullscreenAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      });
    }
    return () => {
      ScreenOrientation.unlockAsync();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    'worklet';
    runOnJS(setIsFullscreen)(fs => !fs);
  }, []);

  const hideControls = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (!isLocked) {
      controlsTimeout.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  };

  useEffect(() => {
    if (status.isPlaying) hideControls();
    else if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
  }, [status.isPlaying]);

  const toggleControls = useCallback(() => {
    if (isLocked) return;
    setControlsVisible(vis => {
      const newVis = !vis;
      if (newVis) hideControls();
      return newVis;
    });
  }, [isLocked]);
  
  const handleMinimize = () => {
    showMiniPlayer(currentVideo, status.positionMillis, status.isPlaying);
    router.back();
  };
  
  const swipeDown = Gesture.Pan()
    .onEnd((event) => {
      'worklet';
      if (event.translationY > 80) {
        runOnJS(handleMinimize)();
      }
    });

  const singleTap = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(toggleControls)();
  });

  const doubleTapLeft = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      // Handle skip directly in worklet
      runOnJS(async () => videoRef.current?.setPositionAsync((status.positionMillis || 0) - 5000))();
      // Handle animation and feedback
      runOnJS(handleDoubleTap)('backward');
    });

  const doubleTapRight = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      // Handle skip directly in worklet
      runOnJS(async () => videoRef.current?.setPositionAsync((status.positionMillis || 0) + 5000))();
      // Handle animation and feedback
      runOnJS(handleDoubleTap)('forward');
    });

  const longPressGesture = Gesture.LongPress()
    .onStart(_ => {
      'worklet';
      runOnJS(async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.setRateAsync(2.0, true);
          }
        } catch (error) {
          console.error('Error setting 2x speed on long press:', error);
        }
      })();
    })
    .onEnd((_e, _success) => {
      'worklet';
      runOnJS(async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.setRateAsync(playbackRateRef.current, true);
          }
        } catch (error) {
          console.error('Error resetting speed after long press:', error);
        }
      })();
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, singleTap, swipeDown);

  useEffect(() => {
    const findSubtitles = async () => {
      if (currentVideo.uri && currentVideo.uri.startsWith('file://')) {
        try {
          const videoDir = currentVideo.uri.substring(0, currentVideo.uri.lastIndexOf('/'));
          const files = await FileSystem.readDirectoryAsync(videoDir);
          const srtFiles = files
            .filter(file => file.toLowerCase().endsWith('.srt'))
            .map(file => `${videoDir}/${file}`);
          setAvailableSubtitles(srtFiles);
        } catch (error) {
          console.error('Could not find subtitles:', error);
        }
      }
    };
    if(currentVideo && currentVideo.uri) {
        findSubtitles();
    }
  }, [currentVideo.uri]);

  const handlePlaybackStatusUpdate = (newStatus) => {
    console.log('Playback status update:', newStatus);
    setStatus(newStatus);
    
    // Handle buffering timeout
    if (newStatus.isBuffering) {
      // Set a timeout for buffering
      setTimeout(() => {
        if (status.isBuffering) {
          setBufferingTimeout(true);
        }
      }, bufferingTimeoutDuration);
    } else {
      // Clear buffering timeout when not buffering
      setBufferingTimeout(false);
    }
    
    if (newStatus.isPlaying && subtitles.length > 0) {
      const currentMillis = newStatus.positionMillis;
      const activeLine = subtitles.find(line => 
        currentMillis >= line.startTime && currentMillis <= line.endTime
      );
      setCurrentSubtitleLine(activeLine ? activeLine.text : '');
    } else {
      setCurrentSubtitleLine('');
    }
  };
  
  const handlePlayPause = async () => {
    if (videoRef.current) {
      const currentStatus = await videoRef.current.getStatusAsync();
      console.log('Current video status before toggle:', currentStatus);
      await videoRef.current.setStatusAsync({ shouldPlay: !currentStatus.isPlaying });
      const afterStatus = await videoRef.current.getStatusAsync();
      console.log('Current video status after toggle:', afterStatus);
    }
  };

  const handleSeek = useCallback((value) => {
    'worklet';
    runOnJS(async () => {
      if (videoRef.current) {
        await videoRef.current.setPositionAsync(value * (status.durationMillis || 1) * 1000);
        await videoRef.current.setStatusAsync({ shouldPlay: status.isPlaying });
      }
    })();
  }, [status.durationMillis, status.isPlaying]);

  const handleSkip = useCallback((seconds) => {
    'worklet';
    runOnJS(async () => videoRef.current?.setPositionAsync((status.positionMillis || 0) + (seconds * 1000)))();
  }, [status.positionMillis]);

  const toggleLock = useCallback(() => {
    'worklet';
    runOnJS(setLocked)(lock => !lock);
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    'worklet';
    runOnJS(async () => {
      const rates = [1.0, 1.25, 1.5, 2.0, 0.5, 0.75];
      const currentRate = playbackRate;
      const nextRate = rates[(rates.indexOf(currentRate) + 1) % rates.length];
      setPlaybackRate(nextRate);
      await videoRef.current?.setRateAsync(nextRate, true);
    })();
  }, [playbackRate]);

  const formatTime = (ms) => {
    if (isNaN(ms) || ms === null) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return 'N/A';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleToggleFavourite = useCallback(() => {
    'worklet';
    runOnJS(() => useVideoStore.getState().toggleFavouriteVideo(currentVideo))();
  }, [currentVideo]);
  
  const handleAddToPlaylist = useCallback((playlistId) => {
    'worklet';
    runOnJS(() => {
      useVideoStore.getState().addVideoToPlaylist(playlistId, currentVideo);
      Alert.alert('Success', `Added to ${useVideoStore.getState().videoPlaylists.find(p=>p.id === playlistId).name}`);
      setPlaylistModalVisible(false);
    })();
  }, [currentVideo]);

  const handleCreatePlaylist = useCallback(() => {
    'worklet';
    runOnJS(() => {
      if (newPlaylistName.trim()) {
        useVideoStore.getState().createVideoPlaylist(newPlaylistName.trim());
        setNewPlaylistName('');
      }
    })();
  }, [newPlaylistName]);

  const handleSelectSubtitle = useCallback(async (subtitleUri) => {
    'worklet';
    runOnJS(async () => {
      if (!subtitleUri) {
        setSelectedSubtitle(null);
        setSubtitles([]);
      } else {
        try {
          const srtContent = await FileSystem.readAsStringAsync(subtitleUri);
          const parsed = srtParser(srtContent);
          setSubtitles(parsed.map(line => ({ ...line, startTime: line.startTime, endTime: line.endTime })));
          setSelectedSubtitle(subtitleUri);
        } catch (error) {
          console.error('Failed to load or parse SRT file', error);
        }
      }
      setSubtitleModalVisible(false);
    })();
  }, []);

  const handleSelectSpeed = useCallback((speed) => {
    'worklet';
    runOnJS(async () => {
      setPlaybackRate(speed);
      if (videoRef.current) {
        await videoRef.current.setRateAsync(speed, true);
      }
      setSpeedModalVisible(false);
    })();
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  useEffect(() => {
    hideMiniPlayer();
    const backAction = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [handleBack]);

  useEffect(() => {
    // When the component mounts, if the miniplayer was playing, continue playback here.
    if (isMiniPlayerPlaying) {
      setIsPlaying(true);
      // Reset the miniplayer's playing state now that the full player has taken over.
      setMiniPlayerPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo]);

  // Add to video history when a new video is loaded
  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      useVideoStore.getState().addToHistory(currentVideo);
    }
  }, [currentVideo]);

  useEffect(() => {
    if (isFullscreen) {
      navigation?.getParent()?.setOptions?.({ tabBarStyle: { display: 'none' } });
    } else {
      navigation?.getParent()?.setOptions?.({
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.card,
          borderTopWidth: 1,
        }
      });
    }
    return () => {
      navigation?.getParent()?.setOptions?.({
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.card,
          borderTopWidth: 1,
        }
      });
    };
  }, [isFullscreen, themeColors]);

  React.useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('immersive');
    return () => {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    };
  }, []);

  // Always auto-play video when streamUrl changes
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.setStatusAsync({ shouldPlay: true });
    }
  }, [streamUrl]);

  const handleDoubleTap = (direction) => {
    setShowSkipFeedback(direction);
    setSkipFeedbackSeconds(prev => ({
      ...prev,
      [direction]: prev[direction] + 5,
    }));
    // Animate feedback
    skipFeedbackAnim[direction].setValue(0);
    Animated.timing(skipFeedbackAnim[direction], {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setShowSkipFeedback(null);
      setSkipFeedbackSeconds(prev => ({ ...prev, [direction]: 0 }));
    });
  };

  // Render loading state if no currentVideo
  if (!currentVideo) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }]}> 
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: 10 }}>Loading Video...</Text>
      </SafeAreaView>
    );
  }

  if (isFetchingStream) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: 10, fontSize: 16 }}>Preparing stream...</Text>
        <Text style={{ color: themeColors.textSecondary, marginTop: 5, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
          This may take a few moments
        </Text>
      </SafeAreaView>
    );
  }

  if (loadingTimeout) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: themeColors.text, fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
            Loading Timeout
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
            The video is taking too long to load. This could be due to:
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
            • Slow internet connection{'\n'}
            • Large video file{'\n'}
            • Server issues{'\n'}
            • Video format not supported
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {retryCount < maxRetries && (
              <TouchableOpacity 
                style={{ 
                  backgroundColor: themeColors.primary, 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  borderRadius: 8 
                }}
                onPress={handleRetry}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry ({retryCount + 1}/{maxRetries + 1})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={{ 
                backgroundColor: themeColors.sectionBackground, 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: themeColors.primary
              }}
              onPress={() => router.push('/(tabs)/(browse)')}
            >
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Browse Videos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!streamUrl) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: themeColors.text, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
            {loadingError ? 'Failed to load video' : 
              (currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be')) 
                ? 'Unable to load YouTube video'
                : 'No video to play'
              )
            }
          </Text>
          {loadingError && (
            <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
              Error: {loadingError}
            </Text>
          )}
          {currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be')) && (
            <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              YouTube stream extraction failed. This could be due to:\n\n• Private or restricted video\n• Invalid or expired link\n• Network connectivity issues\n• YouTube API changes
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {retryCount < maxRetries && (
              <TouchableOpacity 
                style={{ 
                  backgroundColor: themeColors.primary, 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  borderRadius: 8 
                }}
                onPress={handleRetry}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry ({retryCount + 1}/{maxRetries + 1})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={{ 
                backgroundColor: themeColors.primary, 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                borderRadius: 8 
              }}
              onPress={() => router.push('/(tabs)/(browse)')}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Browse Videos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                backgroundColor: themeColors.sectionBackground, 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: themeColors.primary
              }}
              onPress={() => router.push('/(tabs)/(more)')}
            >
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>More Options</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Animated styles for fullscreen transition
  const animatedVideoContainerStyle = {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    transform: [
      {
        scale: fullscreenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.04], // Slight zoom for effect
        }),
      },
    ],
    opacity: fullscreenAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.98],
    }),
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={isFullscreen} />
      {/* Left side - double tap to rewind */}
      <GestureDetector gesture={doubleTapLeft}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', zIndex: 10 }} />
      </GestureDetector>
      
      {/* Right side - double tap to forward */}
      <GestureDetector gesture={doubleTapRight}>
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', zIndex: 10 }} />
      </GestureDetector>
      
      {/* Center area - main controls */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedVideoContainerStyle}>
          <Video
            ref={videoRef}
            source={{ uri: streamUrl }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay
            isMuted={false}
            volume={1.0}
            rate={playbackRate}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => console.error('Video Error:', error)}
          />
          {currentSubtitleLine ? (
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitleText}>{currentSubtitleLine}</Text>
            </View>
          ) : null}

          {/* Always show lock button when locked, even if controls are hidden */}
          {isLocked && (
            <TouchableOpacity onPress={toggleLock} style={styles.lockButton}>
              <Lock size={28} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Show controls only if visible and not locked */}
          {isControlsVisible && !isLocked && (
            <View style={styles.controlsOverlay}>
              <View style={styles.headerTop}>
                <TouchableOpacity onPress={handleBack} style={styles.controlButton}>
                  <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.titleText} numberOfLines={1}>{currentVideo.title || currentVideo.filename}</Text>
                <View style={{ flex: 1 }} />
              </View>
              <View style={styles.middleContainer}>
                <View style={styles.middleControls}>
                  <TouchableOpacity onPress={() => handleSkip(-10)} style={styles.skipButton}>
                    <RotateCcw size={28} color="#FFF" />
                    <Text style={styles.skipButtonText}>10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseButton}>
                    {status.isPlaying ? (
                      <MaterialIcons name="pause" size={48} color="#FFF" />
                    ) : (
                      <MaterialIcons name="play-arrow" size={48} color="#FFF" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSkip(10)} style={styles.skipButton}>
                    <RotateCw size={28} color="#FFF" />
                    <Text style={styles.skipButtonText}>10</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={toggleLock} style={styles.lockButton}>
                  <Unlock size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <SafeAreaView edges={['bottom']} style={styles.footer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.timeText}>{formatTime(status.positionMillis || 0)}</Text>
                  <Text style={styles.timeText}>{formatTime(status.durationMillis || 1)}</Text>
                </View>
                <View style={{ position: 'relative', width: '100%' }}>
                  <View
                    style={{ width: '100%' }}
                    onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
                  >
                    <Slider
                      ref={sliderRef}
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={status.durationMillis || 1}
                      value={status.positionMillis || 0}
                      onSlidingComplete={value => handleSeek(value / (status.durationMillis || 1))}
                      minimumTrackTintColor={themeColors.primary}
                      maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
                      thumbTintColor={themeColors.primary}
                    />
                    <TouchableOpacity
                      onPress={e => {
                        if (!sliderWidth || !status.durationMillis) return;
                        const { locationX } = e.nativeEvent;
                        let percent = locationX / sliderWidth;
                        percent = Math.max(0, Math.min(1, percent));
                        handleSeek(percent);
                      }}
                    >
                      <View style={{ ...StyleSheet.absoluteFillObject, height: 40, zIndex: 1 }} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.footerActionsBottom}>
                  <TouchableOpacity style={styles.controlButton} onPress={handleMinimize}>
                    <PictureInPicture size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={toggleFullscreen} style={styles.controlButton}>
                    {isFullscreen ? <Minimize size={22} color="#FFF" /> : <Expand size={22} color="#FFF" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSubtitleModalVisible(true)} style={styles.controlButton}>
                    <Captions size={22} color={selectedSubtitle ? themeColors.primary : "#FFF"} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          )}
          {status.isBuffering && !isFetchingStream && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <ActivityIndicator size="large" color="#FFF" />
              {bufferingTimeout && (
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 5 }}>
                    Still buffering...
                  </Text>
                  <Text style={{ color: '#FFF', fontSize: 14, textAlign: 'center', opacity: 0.8, paddingHorizontal: 20 }}>
                    Check your connection or try another video
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Skip feedback */}
          {['backward', 'forward'].map(direction => {
            if (showSkipFeedback !== direction || skipFeedbackSeconds[direction] === 0) return null;
            const isForward = direction === 'forward';
            const anim = skipFeedbackAnim[direction];
            return (
              <Animated.View
                key={direction}
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: isForward ? undefined : '15%',
                  right: isForward ? '15%' : undefined,
                  zIndex: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  transform: [
                    { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.5, 1, 0.7] }) },
                  ],
                  opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 1, 0] }),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                {isForward ? (
                  <ChevronRight size={32} color="#fff" style={{ marginBottom: 4 }} />
                ) : (
                  <ChevronLeft size={32} color="#fff" style={{ marginBottom: 4 }} />
                )}
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                  {isForward ? `+${skipFeedbackSeconds[direction]}s` : `-${skipFeedbackSeconds[direction]}s`}
                </Text>
              </Animated.View>
            );
          })}
        </Animated.View>
      </GestureDetector>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInfoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Video Information</Text>
            <Text style={[styles.infoText, {color: themeColors.text}]}>Filename: {currentVideo.filename || 'N/A'}</Text>
            <Text style={[styles.infoText, {color: themeColors.text}]}>Resolution: {currentVideo.width && currentVideo.height ? `${currentVideo.width}x${currentVideo.height}`: 'N/A'}</Text>
            <Text style={[styles.infoText, {color: themeColors.text}]}>Duration: {formatTime((status.durationMillis || 1) * 1000)}</Text>
            <Text style={[styles.infoText, {color: themeColors.text}]}>File Size: {formatBytes(fileSize)}</Text>
            <Text style={[styles.infoText, {color: themeColors.text}]} numberOfLines={2}>Path: {currentVideo.uri}</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setInfoModalVisible(false)}>
              <Text style={{color: themeColors.primary, fontWeight: 'bold'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPlaylistModalVisible}
        onRequestClose={() => setPlaylistModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Add to Playlist</Text>
            <FlatList 
              data={useVideoStore.getState().videoPlaylists}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.playlistItem} onPress={() => handleAddToPlaylist(item.id)}>
                  <Text style={{color: themeColors.text}}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{color: themeColors.textSecondary, textAlign: 'center'}}>No playlists yet.</Text>}
            />
            <View style={styles.newPlaylistContainer}>
              <TextInput
                style={[styles.newPlaylistInput, {
                  color: themeColors.text,
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.background
                }]}
                placeholder="New playlist name..."
                placeholderTextColor={themeColors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity style={[styles.createPlaylistButton, {backgroundColor: themeColors.primary}]} onPress={handleCreatePlaylist}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Create</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setPlaylistModalVisible(false)}>
              <Text style={{color: themeColors.primary, fontWeight: 'bold'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isSubtitleModalVisible}
        onRequestClose={() => setSubtitleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Select Subtitles</Text>
            <TouchableOpacity style={styles.subtitleItem} onPress={() => handleSelectSubtitle(null)}>
              <Text style={{color: themeColors.text, fontWeight: !selectedSubtitle ? 'bold' : 'normal' }}>
                Off
              </Text>
            </TouchableOpacity>
            <FlatList
              data={availableSubtitles}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.subtitleItem} onPress={() => handleSelectSubtitle(item)}>
                  <Text style={{ color: themeColors.text, fontWeight: selectedSubtitle === item ? 'bold' : 'normal' }}>
                    {item.substring(item.lastIndexOf('/') + 1)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{color: themeColors.textSecondary, textAlign: 'center'}}>No subtitle files found.</Text>}
            />
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSubtitleModalVisible(false)}>
              <Text style={{color: themeColors.primary, fontWeight: 'bold'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isSpeedModalVisible}
        onRequestClose={() => setSpeedModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Select Playback Speed</Text>
            {availableSpeeds.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[styles.speedItem, {backgroundColor: playbackRate === speed ? themeColors.primary : 'transparent'}]}
                onPress={() => handleSelectSpeed(speed)}
              >
                <Text style={{color: playbackRate === speed ? '#FFF' : themeColors.text, fontWeight: 'bold', fontSize: 16}}>
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSpeedModalVisible(false)}>
              <Text style={{color: themeColors.primary, fontWeight: 'bold'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isMoreModalVisible}
        onRequestClose={() => setMoreModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.morePopup, {backgroundColor: themeColors.card}]}> 
            <View style={styles.moreHandle} />
            {/* Playback Speed */}
            <TouchableOpacity style={styles.moreRow} onPress={() => { setSpeedModalVisible(true); setMoreModalVisible(false); }}>
              <Clock size={22} color={themeColors.text} style={styles.moreIcon} />
              <Text style={styles.moreLabel}>Playback speed</Text>
              <Text style={styles.moreValue}>{playbackRate.toFixed(2)}x</Text>
            </TouchableOpacity>
            {/* Captions */}
            <TouchableOpacity style={styles.moreRow} onPress={() => { setSubtitleModalVisible(true); setMoreModalVisible(false); }}>
              <Captions size={22} color={themeColors.text} style={styles.moreIcon} />
              <Text style={styles.moreLabel}>Captions</Text>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
            {/* Lock screen */}
            <TouchableOpacity style={styles.moreRow} onPress={() => { toggleLock(); setMoreModalVisible(false); }}>
              <Lock size={22} color={themeColors.text} style={styles.moreIcon} />
              <Text style={styles.moreLabel}>Lock screen</Text>
              <View style={styles.moreValue}>{isLocked ? <Text style={{color: themeColors.primary}}>On</Text> : <Text style={{color: themeColors.textSecondary}}>Off</Text>}</View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setMoreModalVisible(false)}>
              <Text style={{color: themeColors.primary, fontWeight: 'bold', textAlign: 'center'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  footerActionsBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  titleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  middleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  controlButton: {
    padding: 10,
    zIndex: 100,
    elevation: 10,
  },
  skipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    position: 'absolute',
  },
  playPauseButton: {
    padding: 15,
    borderRadius: 40,
    marginHorizontal: 20,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playbackRateText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 5,
    right: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  closeModalButton: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  playlistItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  newPlaylistContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  newPlaylistInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginRight: 10,
  },
  createPlaylistButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 18,
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    textAlign: 'center',
  },
  subtitleItem: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  speedItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  moreItemText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  morePopup: {
    width: '90%',
    borderRadius: 16,
    padding: 0,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: 60,
    overflow: 'hidden',
  },
  moreHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 10,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  moreIcon: {
    marginRight: 16,
  },
  moreLabel: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  moreValue: {
    fontSize: 15,
    color: '#888',
    minWidth: 40,
    textAlign: 'right',
  },
  moreDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 20,
  },
  lockButton: {
    position: 'absolute',
    right: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    padding: 12,
    zIndex: 10,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideoPlayerScreen; 