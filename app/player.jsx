import {View, StyleSheet, Text, TouchableOpacity, Image} from "react-native";
import Slider from "@react-native-community/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Music2,
  ChevronDown,
  Shuffle,
  Repeat,
  Repeat1,
} from "lucide-react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {router} from "expo-router";
import AudioControls from "../store/useAudioControl";
import AudioList from "../store/useAudioStore";
import {useEffect, useState} from "react";
import {fetchMetadata} from "../store/mmkvStorage";

const MusicPlayerUI = () => {
  const {audioFiles, musicFavourite, setFavourites} = AudioList();

  const {
    play,
    pause,
    next,
    toggleShuffle,
    toggleLoop,
    seek,
    isLooping,
    isShuffling,
    previous,
    currentIndex,
    status,
    playlist,
  } = AudioControls();

  const [isFav, setFav] = useState(false);
  const currentTrack = playlist?.[currentIndex];
  const activeSongInfo = audioFiles.find((e) => e.uri === currentTrack?.uri);

  const currentPosition = status?.positionMillis ?? 0;
  const duration = status?.durationMillis ?? 1;

  const currentTime = new Date(currentPosition).toISOString().substr(11, 8);
  const durationTime = new Date(duration).toISOString().substr(11, 8);

  const isPlaying = status?.isPlaying ?? false;

  useEffect(() => {
    if (currentTrack) {
      setFav(musicFavourite.some((e) => e.uri === currentTrack.uri));
    }
  }, [musicFavourite, currentTrack]);

  const handleFav = () => {
    const alreadyFav = musicFavourite.some(
      (e) => e.uri === activeSongInfo?.uri
    );
    if (alreadyFav) {
      setFavourites(musicFavourite.filter((e) => e.uri !== activeSongInfo.uri));
    } else {
      setFavourites([...musicFavourite, activeSongInfo]);
    }
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              height: 50,
              width: 50,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 50,
              backgroundColor: "#2e2e2e",
            }}
          >
            <ChevronDown size={20} color={"#fff"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFav}
            style={{
              height: 50,
              width: 50,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Heart
              size={20}
              color={isFav ? "#1DB954" : "#FFFFFF"}
              fill={isFav ? "#1DB954" : ""}
            />
          </TouchableOpacity>
        </View>

        {/* Album Art */}

        <View style={styles.albumArtContainer}>
          {fetchMetadata(activeSongInfo?.uri) ? (
            <Image
              source={{uri: activeSongInfo?.artwork}}
              style={styles.albumArt}
            />
          ) : (
            <Music2 size={100} color={"#fff"} style={styles.albumArt} />
          )}
        </View>

        {/* Song Info */}
        <View style={styles.songInfoContainer}>
          <Text style={styles.songTitle}>
            {activeSongInfo?.title || "Unknown"}
          </Text>
          <Text style={styles.songArtist}>{activeSongInfo?.artist}</Text>
        </View>

        {/* Slider */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10000}
          step={1}
          value={(currentPosition / duration) * 10000 || 0}
          thumbTintColor="#FFFFFF"
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#535353"
          onSlidingComplete={(value) => {
            seek((value / 10000) * duration);
          }}
        />

        {/* Time */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <Text style={styles.timeText}>{durationTime}</Text>
        </View>
        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleShuffle}>
            {isShuffling ? (
              <Shuffle size={24} color={"#1DB954"} />
            ) : (
              <Shuffle size={24} color={"#FFFFFF"} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={previous}>
            <SkipBack size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => (isPlaying ? pause() : play())}
          >
            {isPlaying ? (
              <Pause size={30} color="#000" fill={"#000"} />
            ) : (
              <Play size={30} color="#000" fill={"#000"} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={next}>
            <SkipForward size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={toggleLoop}>
            {isLooping ? (
              <Repeat1 size={24} color={"#1DB954"} />
            ) : (
              <Repeat size={24} color={"#FFFFFF"} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
  },
  albumArtContainer: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  albumArt: {
    width: "90%",
    resizeMode: "cover",
    marginHorizontal: "auto",
    height: "90%",
    borderRadius: 10,
  },
  songInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  songArtist: {
    color: "#B3B3B3",
    fontSize: 16,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    color: "#B3B3B3",
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
  },
  iconButton: {
    padding: 15,
  },
  playButton: {
    backgroundColor: "#1DB954",
    borderRadius: 50,
    padding: 20,
    marginHorizontal: 15,
  },
});

export default MusicPlayerUI;
