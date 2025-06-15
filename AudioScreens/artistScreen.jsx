import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {CircleOff, FileX2} from "lucide-react-native";
import AudioStore from "../store/useAudioStore";

export default function AudioBrowser({
  onScroll,
  loading,
  handlePermissionRequest,
}) {
  const {audioFiles, permissionGranted} = AudioStore();

  if (loading) {
    return (
      <View style={[styles.centeredContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={[styles.centeredContainer]}>
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
      <View style={[styles.centeredContainer]}>
        <FileX2 size={50} color="#444" />
        <Text style={styles.emptyText}>No songs found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <Text style={styles.header}>Artist Screen</Text>
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
    padding: 15,
    backgroundColor: "#fff",
    width: "95%",
    alignSelf: "center",
    marginVertical: 5,
    borderRadius: 10,
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
