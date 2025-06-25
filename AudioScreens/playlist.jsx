import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Button, Alert, Image, ActivityIndicator, StyleSheet, ScrollView, Share } from "react-native";
import useThemeStore from "../store/theme";
import usePlaylistStore from '../store/playlistStore';
import useAudioControl from '../store/useAudioControl';
import * as MediaLibrary from "expo-media-library";
import { getAudioMetadata } from "@missingcore/audio-metadata";
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import SearchBar from '../components/SearchBar';

const PlaylistScreen = ({ showSearch, searchQuery, setSearchQuery, setShowSearch }) => {
  const { themeColors } = useThemeStore();
  const { playlists, createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, setPlaylistArtwork } = usePlaylistStore();
  const audioControl = useAudioControl();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [allTracks, setAllTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsPlaylist, setOptionsPlaylist] = useState(null);
  const [renameModal, setRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [addTrackModal, setAddTrackModal] = useState(false);

  // Load all tracks from device for create modal
  useEffect(() => {
    if (createModal) {
      loadAllTracks();
    }
  }, [createModal]);

  const loadAllTracks = async () => {
    setLoadingTracks(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setAllTracks([]);
        setLoadingTracks(false);
        return;
      }
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 1000,
      });
      const filesWithMetadata = await Promise.all(
        media.assets.map(async (asset) => {
          let metadata = {};
          try {
            const data = await getAudioMetadata(asset.uri, [
              "album",
              "artist",
              "name",
              "year",
              "artwork",
            ]);
            metadata = data.metadata || {};
          } catch (error) {}
          let artworkUri = null;
          if (metadata.artwork) {
            if (metadata.artwork.startsWith('data:image')) {
              artworkUri = metadata.artwork;
            } else if (/^[A-Za-z0-9+/=]+$/.test(metadata.artwork)) {
              artworkUri = `data:image/png;base64,${metadata.artwork}`;
            } else {
              artworkUri = metadata.artwork;
            }
          }
          return {
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename,
            duration: asset.duration,
            album: metadata.album || "Unknown Album",
            artist: metadata.artist || "Unknown Artist",
            title: metadata.name || asset.filename.replace(/\.[^/.]+$/, ""),
            year: metadata.year || null,
            artwork: artworkUri,
          };
        })
      );
      setAllTracks(filesWithMetadata);
    } catch (e) {
      setAllTracks([]);
    }
    setLoadingTracks(false);
  };

  // Filter playlists based on search query
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open playlist details modal
  const openPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    setModalVisible(true);
  };

  // Remove a playlist
  const handleDeletePlaylist = (id, name) => {
    handleCloseOptions();
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) }
      ]
    );
  };

  // Remove a track from playlist
  const handleRemoveTrack = (playlistId, trackId) => {
    removeTrackFromPlaylist(playlistId, trackId);
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist({
        ...selectedPlaylist,
        tracks: selectedPlaylist.tracks.filter(t => t.id !== trackId)
      });
    }
  };

  // Play a track
  const handlePlayTrack = (track) => {
    audioControl.setAndPlayPlaylist([track]);
  };

  // Multi-select logic
  const toggleTrack = (track) => {
    setSelectedTracks((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [...prev, track]
    );
  };

  // Create playlist with selected tracks
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim() || selectedTracks.length === 0) return;
    const id = createPlaylist(newPlaylistName.trim());
    selectedTracks.forEach(track => addTrackToPlaylist(id, track));
    setNewPlaylistName("");
    setSelectedTracks([]);
    setCreateModal(false);
  };

  const handleOpenOptions = (playlist) => {
    setOptionsPlaylist(playlist);
    setOptionsVisible(true);
  };

  const handleCloseOptions = () => {
    setOptionsVisible(false);
    setOptionsPlaylist(null);
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.tracks.length > 0) {
      audioControl.setAndPlayPlaylist(playlist.tracks);
      router.push('/(tabs)/(audio)/player');
    } else {
      Alert.alert('No tracks', 'This playlist has no tracks to play.');
    }
  };

  const handleShufflePlaylist = (playlist) => {
    if (playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      audioControl.setAndPlayPlaylist(shuffled);
      router.push('/(tabs)/(audio)/player');
    } else {
      Alert.alert('No tracks', 'This playlist has no tracks to play.');
    }
  };

  const handleRenamePlaylist = () => {
    if (!renameValue.trim() || !optionsPlaylist) return;
    // Update playlist name in store
    const { playlists, addTrackToPlaylist, removeTrackFromPlaylist, deletePlaylist } = usePlaylistStore.getState();
    const updated = playlists.map(p => p.id === optionsPlaylist.id ? { ...p, name: renameValue.trim() } : p);
    usePlaylistStore.setState({ playlists: updated });
    setRenameModal(false);
    setOptionsVisible(false);
    setRenameValue("");
  };

  const handleReorderTracks = (data) => {
    if (!selectedPlaylist) return;
    // Update the playlist's tracks order in the store
    const { playlists } = usePlaylistStore.getState();
    const updated = playlists.map(p => p.id === selectedPlaylist.id ? { ...p, tracks: data } : p);
    usePlaylistStore.setState({ playlists: updated });
    setSelectedPlaylist({ ...selectedPlaylist, tracks: data });
  };

  const handleChangeArtwork = async (playlist) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPlaylistArtwork(playlist.id, uri);
    }
    setOptionsVisible(false);
  };

  const handleSharePlaylist = async (playlist) => {
    const text = `Playlist: ${playlist.name}\n\n` +
      playlist.tracks.map((t, i) => `${i + 1}. ${t.title} - ${t.artist}`).join('\n');
    try {
      // Try expo-sharing first
      const fileUri = FileSystem.cacheDirectory + `${playlist.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, text);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: `Share Playlist: ${playlist.name}` });
      } else {
        // Fallback to RN Share
        await Share.share({ message: text });
      }
    } catch (e) {
      await Share.share({ message: text });
    }
    setOptionsVisible(false);
  };

  const filteredTracks = allTracks.filter(f => {
    const q = searchQuery.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.artist.toLowerCase().includes(q) ||
      (f.album || '').toLowerCase().includes(q)
    );
  });

  const getPlaylistArtwork = (playlist) => {
    if (playlist.artwork) return { uri: playlist.artwork };
    if (playlist.tracks && playlist.tracks[0] && playlist.tracks[0].artwork) return { uri: playlist.tracks[0].artwork };
    return null;
  };

  const renderPlaylist = ({ item }) => (
    <View style={styles.cardWrap}>
      <TouchableOpacity
        style={styles.card(themeColors)}
        onPress={() => openPlaylist(item)}
        activeOpacity={0.85}
      >
        {getPlaylistArtwork(item) ? (
          <Image source={getPlaylistArtwork(item)} style={styles.playlistArtwork} />
        ) : (
          <MaterialCommunityIcons name="music-circle" size={48} color={themeColors.primary} style={{ alignSelf: 'center', marginTop: 18 }} />
        )}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={(e) => { e.stopPropagation(); handlePlayPlaylist(item); }}
          activeOpacity={0.8}
        >
          <AntDesign name="play" size={22} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shuffleBtn}
          onPress={(e) => { e.stopPropagation(); handleShufflePlaylist(item); }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="shuffle-variant" size={22} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={(e) => { e.stopPropagation(); handleOpenOptions(item); }}
          activeOpacity={0.7}
        >
          <Feather name="more-vertical" size={22} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
      <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600', marginTop: 8 }} numberOfLines={1}>{item.name}</Text>
      <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>{item.tracks.length} {item.tracks.length === 1 ? 'track' : 'tracks'}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search playlists..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery('');
            if (typeof setShowSearch === 'function') setShowSearch(false);
          }}
        />
      )}
      <FlatList
        data={filteredPlaylists}
        renderItem={renderPlaylist}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <MaterialCommunityIcons name="playlist-music" size={64} color={themeColors.textSecondary} />
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: '600', marginTop: 16 }}>
              {searchQuery ? 'No playlists found' : 'No playlists yet'}
            </Text>
            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first playlist to get started'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: themeColors.primary }]} onPress={() => setCreateModal(true)}>
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      {createModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '90%',
            maxHeight: '80%',
            borderRadius: 16,
            padding: 20,
            backgroundColor: themeColors.background,
            elevation: 5,
          }}>
            <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
              Create Playlist
            </Text>
            <TextInput
              placeholder="Playlist name"
              placeholderTextColor={themeColors.textSecondary}
              style={{
                height: 48,
                borderRadius: 8,
                paddingHorizontal: 16,
                marginBottom: 16,
                borderWidth: 1,
                fontSize: 16,
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderColor: themeColors.primary,
              }}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <Text style={{ color: themeColors.text, marginVertical: 8, fontWeight: '600' }}>Select Tracks</Text>
            {/* Track selection grid here (unchanged) */}
            <ScrollView style={{ maxHeight: 220 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {allTracks.map(track => {
                  const selected = selectedTracks.some(t => t.id === track.id);
                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={[styles.trackBox(themeColors, selected)]}
                      onPress={() => toggleTrack(track)}
                      activeOpacity={0.7}
                    >
                      {track.artwork ? (
                        <Image source={{ uri: track.artwork }} style={styles.artwork} />
                      ) : (
                        <View style={styles.artworkPlaceholder}>
                          <Text style={{ color: themeColors.textSecondary, fontSize: 18 }}>♪</Text>
                        </View>
                      )}
                      <Text numberOfLines={1} style={{ color: themeColors.text, fontSize: 13, marginTop: 4 }}>{track.title}</Text>
                      <Text numberOfLines={1} style={{ color: themeColors.textSecondary, fontSize: 11 }}>{track.artist}</Text>
                      {selected && (
                        <View style={styles.checkCircle}>
                          <AntDesign name="checkcircle" size={20} color={themeColors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: themeColors.primary,
                  marginBottom: 8,
                }}
                onPress={handleCreatePlaylist}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: themeColors.card,
                }}
                onPress={() => setCreateModal(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Playlist Details Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: themeColors.card }}>
            <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold' }}>{selectedPlaylist?.name}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <AntDesign name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
          {selectedPlaylist && (
            <DraggableFlatList
              data={selectedPlaylist.tracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, drag, isActive }) => (
                <TouchableOpacity
                  style={[
                    styles.trackItem,
                    { backgroundColor: isActive ? themeColors.primary + '20' : 'transparent' }
                  ]}
                  onLongPress={drag}
                  onPress={() => handlePlayTrack(item)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ color: themeColors.text, marginRight: 12 }}>⋮⋮</Text>
                    <Text style={{ color: themeColors.text, flex: 1 }}>{item.title}</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>{item.artist}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveTrack(selectedPlaylist.id, item.id)}>
                    <AntDesign name="delete" size={20} color="#FF5722" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              onDragEnd={({ data }) => handleReorderTracks(data)}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      </Modal>

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={handleCloseOptions}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Playlist Options</Text>
            <TouchableOpacity style={styles.optionRow} onPress={() => handlePlayPlaylist(optionsPlaylist)}>
              <AntDesign name="play" size={20} color={themeColors.text} style={styles.optionIcon} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => handleShufflePlaylist(optionsPlaylist)}>
              <MaterialCommunityIcons name="shuffle-variant" size={20} color={themeColors.text} style={styles.optionIcon} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Shuffle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => { setRenameModal(true); setRenameValue(optionsPlaylist.name); }}>
              <AntDesign name="edit" size={20} color={themeColors.text} style={styles.optionIcon} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => handleChangeArtwork(optionsPlaylist)}>
              <AntDesign name="picture" size={20} color={themeColors.text} style={styles.optionIcon} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Change Artwork</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => handleSharePlaylist(optionsPlaylist)}>
              <AntDesign name="sharealt" size={20} color={themeColors.text} style={styles.optionIcon} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => handleDeletePlaylist(optionsPlaylist.id, optionsPlaylist.name)}>
              <AntDesign name="delete" size={20} color="#FF5722" style={styles.optionIcon} />
              <Text style={{ color: '#FF5722', fontSize: 16 }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: themeColors.card, marginTop: 20 }]} onPress={handleCloseOptions}>
              <Text style={{ color: themeColors.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameModal} transparent animationType="fade" onRequestClose={() => setRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Rename Playlist</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="New playlist name"
              placeholderTextColor={themeColors.textSecondary}
              style={styles.input(themeColors)}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: themeColors.card }]} 
                onPress={() => setRenameModal(false)}
              >
                <Text style={{ color: themeColors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: themeColors.primary }]} 
                onPress={handleRenamePlaylist}
              >
                <Text style={{ color: 'white' }}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 18,
    padding: 20,
    elevation: 8,
  },
  input: (themeColors) => ({
    backgroundColor: themeColors.input || themeColors.background,
    color: themeColors.text,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: themeColors.primary + '33',
  }),
  cardWrap: {
    flex: 1,
    margin: 8,
    maxWidth: '48%',
    alignItems: 'center',
  },
  card: (themeColors) => ({
    width: '100%',
    aspectRatio: 1,
    backgroundColor: themeColors.background === '#fff' ? '#f3f3f3' : 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: themeColors.primary + '55',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 18,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  }),
  playBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  shuffleBtn: {
    position: 'absolute',
    right: 12,
    bottom: 52,
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  moreBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistArtwork: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  trackBox: (themeColors, selected) => ({
    width: 80,
    height: 100,
    backgroundColor: selected ? themeColors.primary + '20' : themeColors.card,
    borderRadius: 12,
    padding: 8,
    margin: 4,
    alignItems: 'center',
    borderWidth: selected ? 2 : 0,
    borderColor: selected ? themeColors.primary : 'transparent',
    position: 'relative',
  }),
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  optionIcon: {
    marginRight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
});

export default PlaylistScreen;
