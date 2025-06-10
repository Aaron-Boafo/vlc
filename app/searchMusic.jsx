import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import React, {useState, useCallback} from "react";
import {SafeAreaView} from "react-native-safe-area-context";
import {
  ChevronDown,
  CircleOff,
  EllipsisVertical,
  FileX2,
  Music4,
  Search,
} from "lucide-react-native";
import {router} from "expo-router";
import AudioStore from "../store/AudioHeadStore";
import AudioControls from "../store/AudioControls";

const searchMusic = () => {
  const {audioFiles, permissionGranted} = AudioStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(false);

  const handleSearch = () => {
    const filteredFiles = audioFiles.filter((file) =>
      file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filteredFiles);
    if (filteredFiles.length === 0) {
      setError(true);
    } else {
      setError(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

            setTimeout(() => {
              router.push("/player");
            }, 1000);
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

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: "#121212"}}>
      <View style={styles.container}>
        {/* the header components */}
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
            <ChevronDown size={20} color={"#1DB954"} />
          </TouchableOpacity>

          {/* the search button */}
          <View style={styles.seachContainer}>
            <TextInput
              placeholder="Search..."
              style={styles.input}
              placeholderTextColor={"#5d5d5d"}
              onChangeText={(text) => setSearchQuery(text)}
            />
            <TouchableOpacity
              style={styles.button}
              disabled={
                (!permissionGranted && audioFiles.length === 0) ||
                searchQuery.length === 0
              }
              onPress={handleSearch}
            >
              <Search size={20} color={"#1DB954"} />
            </TouchableOpacity>
          </View>
        </View>

        {!permissionGranted && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CircleOff size={100} color="#444" />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
                width: "80%",
                marginHorizontal: "auto",
              }}
            >
              Oops! Media permission not granted.
            </Text>
            <Text
              style={{fontSize: 12, fontWeight: "normal", color: "#5d5d5d"}}
            >
              Grant permission to the app.
            </Text>
          </View>
        )}
        {audioFiles.length === 0 && (
          <View
            style={{flex: 1, justifyContent: "center", alignItems: "center"}}
          >
            <FileX2 size={100} color="#444" />
            <Text style={{fontSize: 20, fontWeight: "bold", color: "#fff"}}>
              No songs found.
            </Text>
            <Text
              style={{fontSize: 12, fontWeight: "normal", color: "#5d5d5d"}}
            >
              Add songs to your library.
            </Text>
          </View>
        )}

        {/* render the results when found */}
        {permissionGranted &&
          audioFiles.length > 0 &&
          searchResults.length > 0 && (
            <FlatList
              contentContainerStyle={{paddingBottom: 10}}
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              removeClippedSubviews
              windowSize={5}
              renderItem={renderItem}
            />
          )}

        {/* render the not found */}
        {error && (
          <View
            style={{flex: 1, justifyContent: "center", alignItems: "center"}}
          >
            <FileX2 size={100} color="#444" />
            <Text style={{fontSize: 20, fontWeight: "bold", color: "#fff"}}>
              No songs found.
            </Text>
            <Text
              style={{fontSize: 15, fontWeight: "normal", color: "#5d5d5d"}}
            >
              {searchQuery} not found.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 5,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  seachContainer: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    backgroundColor: "#2e2e2e",
    borderRadius: 50,
    paddingLeft: 10,
  },
  input: {
    height: 50,
    borderRadius: 20,
    flex: 1,
    backgroundColor: "#2e2e2e",
    paddingHorizontal: 20,
    color: "#fff",
  },
  button: {
    height: 50,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    backgroundColor: "#585858",
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

export default searchMusic;
