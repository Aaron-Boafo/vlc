import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import {Music2Icon} from "lucide-react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import AudioControls from "../store/AudioControls";
import AudioList from "../store/AudioHeadStore";
import {router} from "expo-router";

const BottomPlayer = ({height}) => {
  const {play, status, pause, next, currentIndex, playlist} = AudioControls();
  const {audioFiles} = AudioList();

  // Check if playlist and currentIndex are valid
  const currentTrack = playlist?.[currentIndex];

  // Safety check: return nothing if audioFiles or currentTrack is not available
  if (!audioFiles || audioFiles.length === 0 || !currentTrack) {
    return null;
  }

  // Find metadata of the currently playing track
  const isPlayingInfo = audioFiles.find(
    (file) => file.uri === currentTrack.uri
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        height(e.nativeEvent.layout.height);
      }}
    >
      {/* Album art */}
      <View style={styles.picContainer}>
        {currentTrack.artwork ? (
          <Image source={{uri: currentTrack.artwork}} style={styles.albumArt} />
        ) : (
          <Music2Icon size={30} color="#fff" />
        )}
      </View>

      {/* Track info */}
      <TouchableOpacity
        onPress={() => router.push("/player")}
        style={styles.trackInfo}
      >
        <Text style={styles.trackTitle} numberOfLines={1}>
          {isPlayingInfo?.filename || "Unknown Title"}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {isPlayingInfo?.artist || "Unknown Artist"}
        </Text>
      </TouchableOpacity>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={() => (status?.isPlaying ? pause() : play())}
          style={styles.controlButton}
        >
          {status?.isPlaying ? (
            <AntDesign name="pause" size={24} color="#fff" />
          ) : (
            <AntDesign name="play" size={24} color="#fff" />
          )}
        </Pressable>

        <Pressable onPress={next} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#282828",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#121212",
  },
  picContainer: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  albumArt: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  trackInfo: {
    flex: 2,
    marginRight: 10,
  },
  trackTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  trackArtist: {
    color: "#b3b3b3",
    fontSize: 12,
  },
  controls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlButton: {
    padding: 8,
  },
});

export default BottomPlayer;
