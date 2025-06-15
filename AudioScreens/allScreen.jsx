import {useMemo, useState} from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import {CircleOff, EllipsisVertical, FileX2, Music4} from "lucide-react-native";
import AudioStore from "../store/useAudioStore";
import AudioControls from "../store/useAudioControl";
import {router} from "expo-router";

export default function AudioBrowser({
  onScroll,
  loading,
  handlePermissionRequest,
  heightView,
}) {
  const {audioFiles, permissionGranted} = AudioStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await handlePermissionRequest();
    } catch (error) {
      console.error("Failed refreshing audio", error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Group audio files by first letter
  const groupedAudioFiles = useMemo(() => {
    if (!Array.isArray(audioFiles)) return [];

    const groups = {};
    audioFiles.forEach((item) => {
      const firstChar = item?.title?.charAt(0)?.toUpperCase() || "#";
      const key = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "#") return -1;
      if (b === "#") return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => ({
      title: key,
      data: groups[key].sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [audioFiles]);

  const handlePlaySingleMusic = async (item) => {
    const song = {uri: item.uri};
    AudioControls.getState().setPlaylist([song]);
    AudioControls.getState().play();
  };

  const renderItem = ({item}) => (
    <View style={styles.itemContainer}>
      {item?.artwork ? (
        <Image
          source={{uri: item?.artwork}}
          style={styles.artwork}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.artworkPlaceholder}>
          <Music4 size={20} color="#444" />
        </View>
      )}
      <TouchableOpacity
        style={styles.infoContainer}
        onPress={async () => {
          await handlePlaySingleMusic(item);
          router.push("/player");
        }}
      >
        <Text style={styles.title} numberOfLines={1}>
          {item?.title}
        </Text>
        <Text style={styles.detail}>
          Duration: {formatDuration(item.duration)}
        </Text>
      </TouchableOpacity>
      <View style={styles.optionsContainer}>
        <EllipsisVertical size={20} />
      </View>
    </View>
  );

  const renderSectionHeader = ({section: {title}}) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.emptyText}>Loading all media files...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.centeredContainer}>
        <CircleOff size={100} color="#444" />
        <Text style={styles.emptyText}>
          Oops! Media permission not granted.
        </Text>
        <TouchableOpacity onPress={handlePermissionRequest}>
          <Text style={{color: "white"}}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!audioFiles || audioFiles.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <FileX2 size={50} color="#444" />
        <Text style={styles.emptyText}>No songs found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        contentContainerStyle={{paddingBottom: heightView + 10 || 10}}
        onScroll={onScroll}
        sections={groupedAudioFiles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "transparent"},
  centeredContainer: {flex: 1, justifyContent: "center", alignItems: "center"},
  itemContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    width: "95%",
    alignSelf: "center",
    marginVertical: 3,
    borderRadius: 10,
  },
  artwork: {width: 50, height: 50, borderRadius: 10, marginRight: 15},
  artworkPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContainer: {flex: 1, justifyContent: "center"},
  title: {fontWeight: "bold", fontSize: 16, marginBottom: 5},
  detail: {fontSize: 12, color: "#666"},
  optionsContainer: {justifyContent: "center"},
  sectionHeader: {backgroundColor: "#282828", padding: 8, paddingLeft: 15},
  sectionHeaderText: {fontWeight: "bold", fontSize: 16, color: "#fff"},
  emptyText: {fontSize: 16, color: "#999", textAlign: "center", padding: 20},
});
