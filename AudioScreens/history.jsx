import {useCallback} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {CircleOff, FileX2, HeartOff, Music4, Trash2} from "lucide-react-native";
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
  const {audioFiles, permissionGranted, favourites, setFavourites} =
    AudioStore();

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlay = useCallback(async (item) => {
    const song = {uri: item.uri};
    AudioControls.getState().setPlaylist([song]);
    AudioControls.getState().play();
    router.push("/player");
  }, []);

  const handleRemoveFavourite = useCallback(
    (uri) => {
      setFavourites(favourites.filter((e) => e.uri !== uri));
    },
    [setFavourites]
  );

  const renderItem = useCallback(
    ({item}) => (
      <View style={styles.itemContainer}>
        <View style={styles.artworkPlaceholder}>
          <Music4 size={20} color="#444" />
        </View>

        <TouchableOpacity
          style={styles.infoContainer}
          onPress={() => handlePlay(item)}
        >
          <Text style={styles.title} numberOfLines={1}>
            {item.filename.replace(/\.[^/.]+$/, "")}
          </Text>
          <Text style={styles.detail}>
            Duration: {formatDuration(item.duration)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRemoveFavourite(item.uri)}
          style={styles.optionsContainer}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    ),
    [handleRemoveFavourite, favourites]
  );

  const renderEmptyState = (icon, message) => (
    <View style={[styles.centeredContainer, {width}]}>
      {icon}
      <Text style={styles.emptyText}>{message}</Text>
      {icon === <CircleOff size={70} color="#444" /> && (
        <TouchableOpacity onPress={handlePermissionRequest}>
          <Text className="text-white">Grant Permission</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading)
    return (
      <View style={[styles.centeredContainer, {width}]}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (!permissionGranted)
    return renderEmptyState(
      <CircleOff size={70} color="#444" />,
      "Oops! Media permission not granted."
    );

  if (!audioFiles.length)
    return renderEmptyState(
      <FileX2 size={80} color="#444" />,
      "No songs found."
    );

  if (!favourites.length)
    return renderEmptyState(
      <HeartOff size={100} color="#444" />,
      "No Favourites found."
    );

  return (
    <View style={[styles.container, {width}]}>
      <FlatList
        contentContainerStyle={{paddingBottom: heightView + 10 || 10}}
        onScroll={onScroll}
        data={favourites || []}
        keyExtractor={(item) => item.id?.toString() ?? item.uri}
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
  itemContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    width: "95%",
    alignSelf: "center",
    marginVertical: 3,
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
