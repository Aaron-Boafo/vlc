import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Modal, TextInput, FlatList, Alert, BackHandler, useWindowDimensions, TouchableWithoutFeedback } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Lock, Unlock, Clock, Minimize2, Info, Heart, ListPlus, Captions, Maximize2, Minimize, ChevronLeft, ChevronRight, Settings, PictureInPicture, Expand, RotateCcw, RotateCw } from 'lucide-react-native';
import useThemeStore from '../../../store/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import useVideoStore from '../../../store/VideoHeadStore';
import * as FileSystem from 'expo-file-system';
import srtParser from 'parse-srt';
import ytdl from 'react-native-ytdl';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from 'expo-router';

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

  if (!currentVideo) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: 10 }}>Loading Video...</Text>
      </SafeAreaView>
    );
  }

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

  const isFavourited = useMemo(() => 
    useVideoStore.getState().favouriteVideos.some(v => v.id === currentVideo.id),
    [currentVideo.id]
  );

  const sliderRef = useRef(null);
  const [sliderWidth, setSliderWidth] = useState(0);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const processVideoUri = async () => {
      if (currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be'))) {
        setIsFetchingStream(true);
        try {
          const videoInfo = await ytdl.getInfo(currentVideo.uri);
          const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest', filter: 'videoandaudio' });
          if (format && format.url) {
            setStreamUrl(format.url);
          } else {
            const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestvideo' });
            if (videoFormat && videoFormat.url) {
              setStreamUrl(videoFormat.url);
            } else {
              console.error('No suitable video format found');
              setStreamUrl(null);
            }
          }
        } catch (error) {
          console.error("YTDL Error:", error);
          setStreamUrl(null);
        } finally {
          setIsFetchingStream(false);
        }
      } else {
        setStreamUrl(currentVideo.uri);
      }
    };

    if (currentVideo && currentVideo.uri) {
      processVideoUri();
    }
  }, [currentVideo.uri]);

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
  useEffect(() => {
    if (isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
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
    setStatus(newStatus);
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
  
  const handlePlayPause = useCallback(() => {
    'worklet';
    runOnJS(async () => videoRef.current?.setStatusAsync({ shouldPlay: !status.isPlaying }))();
  }, [status.isPlaying]);

  const handleSeek = useCallback((value) => {
    'worklet';
    runOnJS(async () => {
      if (videoRef.current) {
        await videoRef.current.setPositionAsync(value * status.durationMillis);
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

  if (isFetchingStream) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: 10 }}>Preparing stream...</Text>
      </SafeAreaView>
    );
  }

  if (!streamUrl) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: themeColors.text, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
            {currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be')) 
              ? 'Unable to load YouTube video'
              : 'No video to play'
            }
          </Text>
          {currentVideo.uri && (currentVideo.uri.includes('youtube.com') || currentVideo.uri.includes('youtu.be')) && (
            <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              YouTube stream extraction failed. This could be due to:\n\n• Private or restricted video\n• Invalid or expired link\n• Network connectivity issues\n• YouTube API changes
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={isFullscreen} />
      <GestureDetector gesture={composedGesture}>
        <View style={styles.videoContainer}>
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
                    {status.isPlaying ? <Pause size={38} color="#FFF" /> : <Play size={38} color="#FFF" />}
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
                  <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>
                  <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>
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
                      maximumValue={100}
                      value={status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0}
                      onSlidingComplete={value => handleSeek(value / 100)}
                      minimumTrackTintColor={themeColors.primary}
                      maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
                      thumbTintColor={themeColors.primary}
                    />
                    <TouchableWithoutFeedback
                      onPress={e => {
                        if (!sliderWidth || !status.durationMillis) return;
                        const { locationX } = e.nativeEvent;
                        let percent = locationX / sliderWidth;
                        percent = Math.max(0, Math.min(1, percent));
                        handleSeek(percent);
                      }}
                    >
                      <View style={{ ...StyleSheet.absoluteFillObject, height: 40, zIndex: 1 }} />
                    </TouchableWithoutFeedback>
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
          {status.isBuffering && !isFetchingStream && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#FFF" />}
        </View>
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
            <Text style={[styles.infoText, {color: themeColors.text}]}>Duration: {formatTime(currentVideo.duration * 1000)}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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