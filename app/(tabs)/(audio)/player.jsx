import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Alert
} from "react-native";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  ListMusic,
  X,
  SlidersHorizontal,
  Shuffle,
  Repeat,
  RefreshCw,
  MoreVertical,
  Heart,
  ListPlus,
  Info
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import useThemeStore from "../../../store/theme";
import useAudioControl from "../../../store/useAudioControl";
import useFavouriteStore from "../../../store/favouriteStore";
import usePlaybackStore from "../../../store/playbackStore";
import * as NavigationBar from 'expo-navigation-bar';

const { width } = Dimensions.get("window");

const PlayerScreen = () => {
  const { themeColors } = useThemeStore();
  const {
    currentTrack,
    isPlaying,
    duration,
    position,
    pause,
    play,
    next,
    previous,
    seek,
    isShuffleOn,
    toggleShuffle,
    sleepTimerId,
    setSleepTimer,
    clearSleepTimer,
    setPlaybackSpeed,
  } = useAudioControl();
  const { playbackRate } = usePlaybackStore();

  const albumArtRotation = useRef(new Animated.Value(0)).current;
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [isMoreModalVisible, setMoreModalVisible] = useState(false);
  const [isLyricsVisible, setLyricsVisible] = useState(false);
  const [isEQModalVisible, setEQModalVisible] = useState(false);
  const [isInfoModalVisible, setInfoModalVisible] = useState(false);
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [isSpeedModalVisible, setSpeedModalVisible] = useState(false);
  const favouriteStore = useFavouriteStore();

  const formatTime = (milliseconds) => {
    if (!milliseconds) return "0:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = async () => {
    if (isPlaying) await pause();
    else await play();
  };

  const handleSeek = async (value) => {
    await seek((value / 100) * duration);
  };

  const handleClose = () => {
    router.back();
  };

  React.useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('immersive');
    return () => {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    };
  }, []);

  if (!currentTrack) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }] }>
        <View style={styles.centeredContainer}>
          <Text style={[styles.noTrackText, { color: themeColors.text }]}>No track playing</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }] }>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <ChevronDown size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>NOW PLAYING</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>{currentTrack.album || 'Unknown Album'}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => setMoreModalVisible(true)}>
          <MoreVertical size={28} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.albumArtContainer}>
        {currentTrack.artwork ? (
          <Image source={{ uri: currentTrack.artwork }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArtPlaceholder, { backgroundColor: themeColors.primary }] }>
            <Text style={styles.defaultIconText}>♪</Text>
          </View>
        )}
      </View>

      <View style={styles.trackInfoContainer}>
        <Text style={[styles.trackTitle, { color: themeColors.text }]} numberOfLines={2}>{currentTrack.title || "Unknown Track"}</Text>
        <Text style={[styles.trackArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>{currentTrack.artist || "Unknown Artist"}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressSlider}
          minimumValue={0}
          maximumValue={100}
          value={duration > 0 ? (position / duration) * 100 : 0}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={themeColors.primary}
          maximumTrackTintColor={themeColors.textSecondary}
          thumbTintColor={themeColors.primary}
        />
        <View style={styles.progressTimeContainer}>
          <Text style={[styles.progressTimeText, { color: themeColors.textSecondary }]}>{formatTime(position)}</Text>
          <Text style={[styles.progressTimeText, { color: themeColors.textSecondary }]}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.mainControlsContainer}>
        <TouchableOpacity style={styles.mainControlButton} onPress={toggleShuffle}>
          <Shuffle size={24} color={isShuffleOn ? themeColors.primary : themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton} onPress={previous}>
          <SkipBack size={32} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playPauseButton, { backgroundColor: themeColors.primary }]} onPress={handlePlayPause}>
          {isPlaying ? <Pause size={40} color={themeColors.background} /> : <Play size={40} color={themeColors.background} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton} onPress={next}>
          <SkipForward size={32} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton}>
          <Repeat size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sleep Timer Modal */}
      <Modal animationType="slide" transparent={true} visible={isTimerModalVisible} onRequestClose={() => setTimerModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTimerModalVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Sleep Timer</Text>
            <View style={styles.timerOptions}>
              {[15, 30, 45, 60].map(minutes => (
                <TouchableOpacity key={minutes} style={[styles.timerButton, {backgroundColor: themeColors.background}]} onPress={() => { setSleepTimer(minutes); setTimerModalVisible(false); }}>
                  <Text style={[styles.timerButtonText, {color: themeColors.text}]}>{minutes} minutes</Text>
                </TouchableOpacity>
              ))}
            </View>
            {sleepTimerId && (
              <TouchableOpacity style={[styles.timerButton, styles.cancelTimerButton, {backgroundColor: themeColors.error}]} onPress={() => { clearSleepTimer(); setTimerModalVisible(false); }}>
                <Text style={[styles.timerButtonText, {color: '#fff'}]}>Cancel Timer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setTimerModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* More Options Modal */}
      <Modal animationType="slide" transparent={true} visible={isMoreModalVisible} onRequestClose={() => setMoreModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMoreModalVisible(false)}>
          <Pressable style={[styles.moreModalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>More Options</Text>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setLyricsVisible(v => !v); }}>
              <ListMusic size={22} color={themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Show Lyrics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setEQModalVisible(true); }}>
              <SlidersHorizontal size={22} color={themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Equalizer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setPlaylistModalVisible(true); }}>
              <ListPlus size={22} color={themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Add to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setInfoModalVisible(true); }}>
              <Info size={22} color={themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Track Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); favouriteStore.toggleFavourite(currentTrack); }}>
              <Heart size={22} color={favouriteStore.isFavourite(currentTrack?.id) ? themeColors.primary : themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Favourite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setSpeedModalVisible(true); }}>
              <Text style={[styles.speedLabel, {color: themeColors.text}]}>{playbackRate}x</Text>
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Playback Speed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreOptionRow} onPress={() => { setMoreModalVisible(false); setTimerModalVisible(true); }}>
              <Clock size={22} color={sleepTimerId ? themeColors.primary : themeColors.text} style={styles.moreOptionIcon} />
              <Text style={[styles.moreOptionLabel, {color: themeColors.text}]}>Sleep Timer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setMoreModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Playback Speed Modal */}
      <Modal animationType="slide" transparent={true} visible={isSpeedModalVisible} onRequestClose={() => setSpeedModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSpeedModalVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Playback Speed</Text>
            <View style={styles.speedOptions}>
              {[0.75, 1.0, 1.5, 2.0].map(rate => (
                <TouchableOpacity key={rate} style={[styles.speedButton, playbackRate === rate && {backgroundColor: themeColors.primary}]} onPress={() => { setPlaybackSpeed(rate); setSpeedModalVisible(false); }}>
                  <Text style={[styles.speedButtonText, {color: themeColors.text}]}>{rate}x</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSpeedModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lyrics Modal (simple toggle for now) */}
      <Modal animationType="slide" transparent={true} visible={isLyricsVisible} onRequestClose={() => setLyricsVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLyricsVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Lyrics</Text>
            <ScrollView style={{maxHeight: 300}}>
              <Text style={{color: themeColors.text}}>{currentTrack.lyrics || 'No lyrics available.'}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setLyricsVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* EQ Modal (placeholder) */}
      <Modal animationType="slide" transparent={true} visible={isEQModalVisible} onRequestClose={() => setEQModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEQModalVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Equalizer</Text>
            <Text style={{color: themeColors.textSecondary, marginBottom: 20}}>EQ controls coming soon!</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setEQModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Playlist Modal (placeholder) */}
      <Modal animationType="slide" transparent={true} visible={isPlaylistModalVisible} onRequestClose={() => setPlaylistModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPlaylistModalVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Add to Playlist</Text>
            <Text style={{color: themeColors.textSecondary, marginBottom: 20}}>Playlist controls coming soon!</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setPlaylistModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Track Info Modal */}
      <Modal animationType="slide" transparent={true} visible={isInfoModalVisible} onRequestClose={() => setInfoModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModalVisible(false)}>
          <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}> 
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Track Info</Text>
            <Text style={{color: themeColors.text}}>Title: {currentTrack.title}</Text>
            <Text style={{color: themeColors.text}}>Artist: {currentTrack.artist}</Text>
            <Text style={{color: themeColors.text}}>Album: {currentTrack.album}</Text>
            <Text style={{color: themeColors.text}}>Duration: {formatTime(duration)}</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setInfoModalVisible(false)}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  noTrackText: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10 },
  headerButton: { padding: 5 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 12, fontWeight: "bold", textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  albumArtContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingVertical: 20 },
  albumArt: { width: width * 0.75, height: width * 0.75, borderRadius: 20 },
  albumArtPlaceholder: { width: width * 0.75, height: width * 0.75, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  defaultIconText: { fontSize: 80, color: "rgba(255, 255, 255, 0.5)" },
  trackInfoContainer: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 20 },
  trackTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  trackArtist: { fontSize: 18, textAlign: "center" },
  progressContainer: { paddingHorizontal: 30, paddingVertical: 15 },
  progressSlider: { width: "100%", height: 40 },
  progressTimeContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: -10 },
  progressTimeText: { fontSize: 12 },
  mainControlsContainer: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingHorizontal: 40, paddingVertical: 20 },
  mainControlButton: { padding: 10 },
  playPauseButton: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  timerOptions: { marginBottom: 10 },
  timerButton: { padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  timerButtonText: { fontSize: 16, fontWeight: '500' },
  cancelTimerButton: { marginTop: 10 },
  closeModalButton: { position: 'absolute', top: 15, right: 15 },
  moreModalContent: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, minHeight: 320 },
  moreOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 10 },
  moreOptionIcon: { marginRight: 15 },
  moreOptionLabel: { fontSize: 16 },
  speedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 15,
    minWidth: 50,
    textAlign: 'center',
  },
  speedOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
  },
  speedButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'gray',
  },
  speedButtonText: {
    fontSize: 16,
  },
});

export default PlayerScreen; 