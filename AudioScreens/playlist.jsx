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

const PlaylistScreen = () => {
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
  const [search, setSearch] = useState("");
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
    const q = search.toLowerCase();
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
      <FlatList
        data={playlists}
        renderItem={renderPlaylist}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListFooterComponent={<View style={{ height: 80 }} />}
        ListEmptyComponent={<Text style={{ color: themeColors.text, textAlign: 'center', marginTop: 32 }}>No playlists yet. Create one!</Text>}
      />
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary }]}
        onPress={() => setCreateModal(true)}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Create Playlist Modal */}
      <Modal
        visible={createModal}
        animationType="slide"
        onRequestClose={() => setCreateModal(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}> 
            <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Create Playlist</Text>
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Playlist name"
              placeholderTextColor={themeColors.textSecondary}
              style={styles.input(themeColors)}
            />
            <Text style={{ color: themeColors.text, marginVertical: 8, fontWeight: '600' }}>Select Tracks</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tracks..."
              placeholderTextColor={themeColors.textSecondary}
              style={styles.input(themeColors)}
            />
            {loadingTracks ? (
              <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 32 }} />
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {filteredTracks.map(track => {
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
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button title="Cancel" onPress={() => setCreateModal(false)} color="#888" />
              <View style={{ width: 12 }} />
              <Button title="Create" onPress={handleCreatePlaylist} color={themeColors.primary} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Playlist Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}> 
            <Text style={{ color: themeColors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>{selectedPlaylist?.name}</Text>
            <DraggableFlatList
              data={selectedPlaylist?.tracks || []}
              keyExtractor={item => item.id}
              renderItem={({ item, drag, isActive }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderColor: '#ccc', backgroundColor: isActive ? themeColors.primary + '22' : 'transparent' }}>
                  <TouchableOpacity onLongPress={drag} style={{ marginRight: 12 }}>
                    <Feather name="menu" size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePlayTrack(item)} style={{ flex: 1 }}>
                    <Text style={{ color: themeColors.text, fontSize: 16 }}>{item.title}</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>{item.artist}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveTrack(selectedPlaylist.id, item.id)} style={{ marginLeft: 12 }}>
                    <Text style={{ color: 'red', fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              onDragEnd={({ data }) => handleReorderTracks(data)}
              ListEmptyComponent={<Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 32 }}>No tracks in this playlist.</Text>}
            />
            <TouchableOpacity onPress={() => setAddTrackModal(true)} style={{ margin: 16, alignSelf: 'center', padding: 12, backgroundColor: themeColors.primary, borderRadius: 24 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ Add Track</Text>
            </TouchableOpacity>
            <Button title="Close" onPress={() => setModalVisible(false)} color={themeColors.primary} />
          </View>
        </View>
      </Modal>
      {/* More Options Modal */}
      <Modal
        visible={optionsVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseOptions}
      >
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={handleCloseOptions}>
          <View style={[styles.optionsSheet, { backgroundColor: themeColors.background }]}> 
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              onPress={() => { setRenameValue(optionsPlaylist?.name || ''); setRenameModal(true); }}
            >
              <Feather name="edit-2" size={20} color={themeColors.primary} style={{ marginRight: 12 }} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Rename Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              onPress={() => handleDeletePlaylist(optionsPlaylist?.id, optionsPlaylist?.name)}
            >
              <Feather name="trash-2" size={20} color="red" style={{ marginRight: 12 }} />
              <Text style={{ color: 'red', fontSize: 16 }}>Delete Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              onPress={() => handleChangeArtwork(optionsPlaylist)}
            >
              <Feather name="image" size={20} color={themeColors.primary} style={{ marginRight: 12 }} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Change Cover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              onPress={() => handleSharePlaylist(optionsPlaylist)}
            >
              <Feather name="share-2" size={20} color={themeColors.primary} style={{ marginRight: 12 }} />
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Share Playlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Rename Modal */}
      <Modal
        visible={renameModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRenameModal(false)}
      >
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setRenameModal(false)}>
          <View style={[styles.optionsSheet, { backgroundColor: themeColors.background }]}> 
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Rename Playlist</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="New playlist name"
              placeholderTextColor={themeColors.textSecondary}
              style={styles.input(themeColors)}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setRenameModal(false)} color="#888" />
              <View style={{ width: 12 }} />
              <Button title="Save" onPress={handleRenamePlaylist} color={themeColors.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#e754e7',
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
    right: 52,
    bottom: 12,
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
    right: 8,
    top: 8,
    padding: 4,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 12,
    minHeight: 80,
  },
  trackBox: (themeColors, selected) => ({
    width: '30%',
    margin: '1.5%',
    padding: 8,
    borderRadius: 12,
    backgroundColor: selected ? themeColors.primary + '22' : 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    borderWidth: selected ? 2 : 0,
    borderColor: selected ? themeColors.primary : 'transparent',
    position: 'relative',
  }),
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginBottom: 2,
  },
  artworkPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  checkCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  playlistArtwork: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 4,
    resizeMode: 'cover',
  },
});

export default PlaylistScreen;
