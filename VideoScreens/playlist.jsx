import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import useVideoStore from '../store/VideoHeadStore';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';
import SearchBar from '../components/SearchBar';

const VideoPlaylistScreen = ({ showSearch, setShowSearch, searchQuery, setSearchQuery }) => {
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
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsPlaylist, setOptionsPlaylist] = useState(null);
  const [videoThumbnails, setVideoThumbnails] = useState({});

  useEffect(() => {
    const generateThumbnails = async () => {
      const thumbs = {};
      for (const video of videoFiles) {
        if (!videoThumbnails[video.id]) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, { time: 1000 });
            thumbs[video.id] = uri;
          } catch (e) {
            thumbs[video.id] = null;
          }
        } else {
          thumbs[video.id] = videoThumbnails[video.id];
        }
      }
      setVideoThumbnails(thumbs);
    };
    if (modalVisible && videoFiles.length > 0) {
      generateThumbnails();
    }
  }, [modalVisible, videoFiles]);

  const handleCreatePlaylist = () => {
    if (playlistName.trim() && selectedVideos.length > 0) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName,
        tracks: selectedVideos,
      };
      setPlaylists([...playlists, newPlaylist]);
      setPlaylistName('');
      setSelectedVideos([]);
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

  const handleToggleVideo = (video) => {
    setSelectedVideos((prev) =>
      prev.some((v) => v.id === video.id)
        ? prev.filter((v) => v.id !== video.id)
        : [...prev, video]
    );
  };

  const handleOpenOptions = (playlist) => {
    setOptionsPlaylist(playlist);
    setOptionsVisible(true);
  };

  const handleDeletePlaylist = () => {
    if (optionsPlaylist) {
      setPlaylists(playlists.filter(p => p.id !== optionsPlaylist.id));
      setOptionsVisible(false);
      setOptionsPlaylist(null);
    }
  };

  // Filter playlists and videos by searchQuery
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return playlists;
    return playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [playlists, searchQuery]);

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
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenOptions(item)}>
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
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search playlists..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery("");
            setShowSearch(false);
          }}
        />
      )}
      <FlatList
        data={filteredPlaylists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <Text style={{ color: themeColors.text, textAlign: 'center', marginTop: 32 }}>
            No playlists found.
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary, left: 24 }]}
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
            <Text style={{ color: themeColors.text, marginVertical: 8, fontWeight: '600' }}>Select Videos</Text>
            <View style={{ maxHeight: 220 }}>
              <FlatList
                data={videoFiles}
                keyExtractor={item => item.id}
                numColumns={3}
                renderItem={({ item }) => {
                  const selected = selectedVideos.some(v => v.id === item.id);
                  return (
                    <TouchableOpacity
                      style={{
                        width: '30%',
                        margin: '1.5%',
                        borderRadius: 12,
                        backgroundColor: selected ? themeColors.primary + '22' : 'rgba(255,255,255,0.08)',
                        alignItems: 'center',
                        borderWidth: selected ? 2 : 0,
                        borderColor: selected ? themeColors.primary : 'transparent',
                        position: 'relative',
                        padding: 8,
                      }}
                      onPress={() => handleToggleVideo(item)}
                      activeOpacity={0.7}
                    >
                      {/* Thumbnail or icon */}
                      {videoThumbnails[item.id] ? (
                        <Image source={{ uri: videoThumbnails[item.id] }} style={{ width: 56, height: 56, borderRadius: 8, marginBottom: 2 }} />
                      ) : (
                        <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
                          <MaterialIcons name="video-library" size={28} color={themeColors.primary} />
                        </View>
                      )}
                      <Text numberOfLines={1} style={{ color: themeColors.text, fontSize: 13, marginTop: 4 }}>{item.title || item.filename}</Text>
                      <Text numberOfLines={1} style={{ color: themeColors.textSecondary, fontSize: 11 }}>{item.artist || ''}</Text>
                      {selected && (
                        <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 10 }}>
                          <MaterialIcons name="check-circle" size={20} color={themeColors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={{ color: themeColors.textSecondary, textAlign: 'center' }}>No videos found.</Text>}
              />
            </View>
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
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* More Options Modal */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setOptionsVisible(false)}>
          <View style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 24, minWidth: 220 }}>
            <TouchableOpacity onPress={handleDeletePlaylist} style={{ paddingVertical: 12 }}>
              <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>Delete Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOptionsVisible(false)} style={{ paddingVertical: 12 }}>
              <Text style={{ color: themeColors.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
    left: 24,
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