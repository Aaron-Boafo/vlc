import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import useVideoStore from '../store/VideoHeadStore';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';

const VideoPlaylistScreen = () => {
  const { themeColors } = useThemeStore();
  const { videoFiles, setCurrentVideo } = useVideoStore();
  const [playlists, setPlaylists] = useState([
    { id: '1', name: 'My Videos', tracks: videoFiles.slice(0, 5) },
    { id: '2', name: 'Favorites', tracks: videoFiles.slice(0, 3) },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);

  const handleCreatePlaylist = () => {
    if (playlistName.trim()) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName,
        tracks: []
      };
      setPlaylists([...playlists, newPlaylist]);
      setPlaylistName('');
      setModalVisible(false);
    }
  };

  const handlePlaylistPress = (playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistModalVisible(true);
  };

  const handleVideoPress = (video) => {
    setCurrentVideo(video);
    router.push({
      pathname: '/(tabs)/(video)/player',
      params: { uri: video.uri }
    });
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: themeColors.card }]}
      onPress={() => handlePlaylistPress(item)}
    >
      <View style={styles.playlistInfo}>
        <MaterialCommunityIcons 
          name="playlist-play" 
          size={48} 
          color={themeColors.primary} 
          style={{ alignSelf: 'center', marginTop: 18 }} 
        />
        <View style={styles.playlistActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="play-arrow" size={22} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="shuffle" size={22} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="more-vert" size={22} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600', marginTop: 8 }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>
          {item.tracks.length} {item.tracks.length === 1 ? 'video' : 'videos'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <Text style={{ color: themeColors.text, textAlign: 'center', marginTop: 32 }}>
            No playlists yet. Create one!
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Playlist Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
              Create Playlist
            </Text>
            <TextInput
              placeholder="Playlist name"
              placeholderTextColor={themeColors.textSecondary}
              style={[styles.input, { 
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderColor: themeColors.primary
              }]}
              value={playlistName}
              onChangeText={setPlaylistName}
            />
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: themeColors.primary }]}
              onPress={handleCreatePlaylist}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: themeColors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Playlist Details Modal */}
      {playlistModalVisible && selectedPlaylist && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <Text style={{ color: themeColors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
              {selectedPlaylist.name}
            </Text>
            <FlatList
              data={selectedPlaylist.tracks}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.trackItem, { 
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.primary + '33'
                  }]}
                  onPress={() => handleVideoPress(item)}
                >
                  <MaterialIcons name="video-file" size={20} color={themeColors.textSecondary} />
                  <View style={styles.trackInfo}>
                    <Text style={{ color: themeColors.text, fontSize: 16 }}>{item.title}</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>
                      {item.width}x{item.height}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 32 }}>
                  No videos in this playlist.
                </Text>
              }
            />
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setPlaylistModalVisible(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playlistInfo: {
    alignItems: 'center',
  },
  playlistActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  createButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});

export default VideoPlaylistScreen; 