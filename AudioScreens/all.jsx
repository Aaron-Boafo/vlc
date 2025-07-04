import React, {useState, useEffect, useCallback, useMemo} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Share,
  StyleSheet,
} from "react-native";
import {Music4, Play, Heart, MoreVertical, ListPlus, Info, Shuffle, PlusSquare, ArrowDownLeftSquare, Smartphone, ArrowLeft, Share2} from "lucide-react-native";
import useThemeStore from "../store/theme";
import useAudioControl from "../store/useAudioControl";
import useAudioStore from "../store/AudioHeadStore";
import {router} from "expo-router";
import useFavouriteStore from '../store/favouriteStore';
import CustomAlert from '../components/CustomAlert';
import BottomSheet from '../components/BottomSheet';

const AllScreen = ({ showSearch = false, onCloseSearch }) => {
  const {themeColors} = useThemeStore();
  const audioControl = useAudioControl();
  const favouriteStore = useFavouriteStore();
  const { audioFiles, isLoading, loadAudioFiles } = useAudioStore();
  const {width} = Dimensions.get("window");
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { currentTrack } = useAudioControl();

  useEffect(() => {
    // Initialize audio control
    audioControl.initialize();
    // Load audio files using the optimized store
    loadAudioFiles();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlaySong = useCallback(async (item) => {
    try {
      await audioControl.setAndPlayPlaylist([item]);
      router.push('/(tabs)/(audio)/player');
    } catch (error) {
      console.error("Error playing song:", error);
      Alert.alert("Error", "Failed to play song");
    }
  }, [audioControl]);

  const handleMoreOptions = (item) => {
    setSelectedTrack(item);
    setOptionsVisible(true);
  };

  const handleViewDetails = () => {
    setOptionsVisible(false);
    setDetailsVisible(true);
  };

  const handleDelete = () => {
    setOptionsVisible(false);
    setDeleteConfirmVisible(true);
  };

  const handlePlay = () => {
    setOptionsVisible(false);
    if (selectedTrack) handlePlaySong(selectedTrack);
  };

  const handleShuffle = () => {
    setOptionsVisible(false);
    // Placeholder: Shuffle logic
  };

  const handleAddToQueue = () => {
    setOptionsVisible(false);
    // Placeholder: Add to play queue logic
  };

  const handleInsertNext = () => {
    setOptionsVisible(false);
    // Placeholder: Insert next logic
  };

  const handleAddToPlaylist = () => {
    setOptionsVisible(false);
    // Placeholder: Add to playlist logic
  };

  const handleCreateShortcut = () => {
    setOptionsVisible(false);
    // Placeholder: Create launcher shortcut logic
  };

  const handleShareTrack = () => {
    if (!selectedTrack) return;
    const text = `Track: ${selectedTrack.title}\nArtist: ${selectedTrack.artist}\nAlbum: ${selectedTrack.album}`;
    Share.share({ message: text });
    setOptionsVisible(false);
  };

  const confirmDelete = () => {
    // Placeholder: Remove from list (not device)
    setDeleteConfirmVisible(false);
  };

  const filteredTracks = useMemo(() => {
    if (!search) return audioFiles;
    return audioFiles.filter(track =>
      track.title.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase()) ||
      track.album.toLowerCase().includes(search.toLowerCase())
    );
  }, [audioFiles, search]);

  const handleCloseSearch = () => {
    setSearch('');
    onCloseSearch?.();
  };

  const renderItem = useCallback(({ item }) => {
    const isPlaying = currentTrack && item.id === currentTrack.id;
    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          { backgroundColor: themeColors.card },
          isPlaying && {backgroundColor: themeColors.primary + '33'}
        ]}
        onPress={() => handlePlaySong(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackInfo}>
          {item.artwork ? (
            <Image 
              source={{ uri: item.artwork }} 
              style={styles.artwork}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.artworkPlaceholder, { backgroundColor: themeColors.primary }]}>
              <Music4 size={24} color="white" />
            </View>
          )}
          <View style={styles.trackDetails}>
            <Text style={[styles.trackTitle, { color: isPlaying ? themeColors.text : themeColors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.trackArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.artist} • {item.album}
            </Text>
          </View>
          {isPlaying && (
            <Music4 size={18} color={themeColors.text} style={{ marginLeft: 8 }} />
          )}
        </View>
        <View style={styles.trackActions}>
          <Text style={[styles.trackDuration, { color: themeColors.textSecondary }]}>
            {formatDuration(item.duration)}
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => favouriteStore.toggleFavourite(item)}
          >
            <Heart
              size={20}
              color={favouriteStore.isFavourite(item.id) ? themeColors.primary : themeColors.textSecondary}
              fill={favouriteStore.isFavourite(item.id) ? themeColors.primary : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMoreOptions(item)}
          >
            <MoreVertical size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [themeColors, favouriteStore, handlePlaySong, handleMoreOptions, currentTrack]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>
          Loading your music library...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: themeColors.sectionBackground }]}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: themeColors.card,
              color: themeColors.text,
              borderColor: themeColors.primary
            }]}
            placeholder="Search songs, artists, albums..."
            placeholderTextColor={themeColors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <TouchableOpacity onPress={handleCloseSearch} style={styles.closeButton}>
            <ArrowLeft size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTracks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 88, // height of each item
          offset: 88 * index,
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Music4 size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {search ? 'No songs found' : 'No songs in your library'}
            </Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              {search ? 'Try adjusting your search' : 'Add some music to get started'}
            </Text>
          </View>
        }
      />

      {/* Modals */}
      <BottomSheet
        visible={optionsVisible}
        title="Track Options"
        options={[
          { label: "Play", icon: Play, onPress: handlePlay },
          { label: "Shuffle", icon: Shuffle, onPress: handleShuffle },
          { label: "Add to Queue", icon: ListPlus, onPress: handleAddToQueue },
          { label: "Insert Next", icon: PlusSquare, onPress: handleInsertNext },
          { label: "Add to Playlist", icon: ListPlus, onPress: handleAddToPlaylist },
          { label: "View Details", icon: Info, onPress: handleViewDetails },
          { label: "Create Shortcut", icon: Smartphone, onPress: handleCreateShortcut },
          { label: "Share", icon: Share2, onPress: handleShareTrack },
          { label: "Delete", icon: ArrowDownLeftSquare, onPress: handleDelete },
        ]}
        onClose={() => setOptionsVisible(false)}
      />

      <CustomAlert
        visible={deleteConfirmVisible}
        title="Delete Track"
        message="Are you sure you want to remove this track from your library?"
        actions={[
          { label: "Cancel", onPress: () => setDeleteConfirmVisible(false) },
          { label: "Delete", onPress: confirmDelete },
        ]}
        onClose={() => setDeleteConfirmVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  artworkPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackDuration: {
    fontSize: 12,
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  closeButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AllScreen;
