import {useMemo, useCallback} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {CircleOff, EllipsisVertical, FileX2, Music4} from "lucide-react-native";
import AudioStore from "../store/AudioHeadStore";
import AudioControls from "../store/AudioControls";
import {router} from "expo-router";

export default function AudioBrowser({
  width,
  onScroll,
  loading,
  handlePermissionRequest,
  heightView,
}) {
  const {audioFiles, permissionGranted} = AudioStore();

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sortedAudioFiles = useMemo(() => {
    return [...audioFiles].sort((a, b) => a.filename.localeCompare(b.filename));
  }, [audioFiles]);

  const HandlePlaySingleMusic = (item) => {
    const song = {
      uri: item.uri,
    };
    AudioControls.getState().setPlaylist([song]);
    AudioControls.getState().play();
  };

  const renderItem = useCallback(
    ({item}) => (
      <View style={styles.itemContainer}>
        <View style={styles.artworkPlaceholder}>
          <Music4 size={20} color="#444" />
        </View>
        <TouchableOpacity
          style={styles.infoContainer}
          onPress={async () => {
            await HandlePlaySingleMusic(item);
            router.push("/player");
          }}
        >
          <Text style={styles.title} numberOfLines={1}>
            {item.filename.replace(/\.[^/.]+$/, "")}
          </Text>
          <Text style={styles.detail}>
            Duration: {formatDuration(item.duration)}
          </Text>
        </TouchableOpacity>
        <View style={styles.optionsContainer}>
          <EllipsisVertical size={20} />
        </View>
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <View style={[styles.centeredContainer, {width}]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={[styles.centeredContainer, {width}]}>
        <CircleOff size={50} color="#444" />
        <Text style={styles.emptyText}>
          Oops! Media permission not granted.
        </Text>

        <TouchableOpacity onPress={handlePermissionRequest}>
          <Text className="text-white">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (audioFiles.length === 0) {
    return (
      <View style={[styles.centeredContainer, {width}]}>
        <FileX2 size={50} color="#444" />
        <Text style={styles.emptyText}>No songs found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {width}]}>
      <FlatList
        contentContainerStyle={{paddingBottom: heightView + 10 || 10}}
        onScroll={onScroll}
        data={sortedAudioFiles}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        windowSize={5}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    padding: 15,
    color: "#fff",
  },
  itemContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    width: "95%",
    alignSelf: "center",
    marginVertical: 3,
    marginHorizontal: "auto",
    borderRadius: 10,
    columnGap: 5,
  },
  artworkPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  detail: {
    fontSize: 12,
    color: "#666",
  },
  optionsContainer: {
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    padding: 20,
  },
});
