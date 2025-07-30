import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import useOptimizedVideoStore from '../store/optimizedVideoStore';
import usePlaylistStore from '../store/playlistStore';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';
import SearchBar from '../components/SearchBar';
import useOptimizedPlaylistLoader from '../hooks/useOptimizedPlaylistLoader';

const VideoPlaylistScreen = ({ showSearch, setShowSearch, searchQuery, setSearchQuery }) => {
  const { themeColors } = useThemeStore();
  const { videoFiles, setCurrentVideo } = useOptimizedVideoStore();
  
  // Use optimized loader for playlist creation
  const {
    videoFiles: optimizedVideoFiles,
    loading: optimizedLoading,
    progress: videoProgress,
    loadVideoFiles: loadOptimizedVideos
  } = useOptimizedPlaylistLoader();
  const { playlists, createPlaylist, addTrackToPlaylist, clearPlaylists } = usePlaylistStore();
  
  // Filter playlists to only show video playlists
  const videoPlaylists = useMemo(() => 
    playlists.filter(playlist => playlist.type === 'video'),
    [playlists]
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsPlaylist, setOptionsPlaylist] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load optimized video files when modal opens
  useEffect(() => {
    if (modalVisible) {
      console.log('⚡ Loading optimized video files for playlist...');
      loadOptimizedVideos();
    }
  }, [modalVisible, loadOptimizedVideos]);

  const handleClearAllPlaylists = () => {
    Alert.alert(
      'Clear All Playlists',
      'Are you sure you want to delete all video playlists? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearPlaylists() }
      ]
    );
  };

  const handleCreatePlaylist = () => {
    if (playlistName.trim() && selectedVideos.length > 0) {
      // Create a new playlist in the main playlist store
      const newPlaylistId = createPlaylist(playlistName, 'video', selectedVideos);
      
      // Reset the form
      setPlaylistName('');
      setSelectedVideos([]);
      setModalVisible(false);
      
      // Navigate to the main playlist screen with the video tab active
      // The playlist will be selected there
      router.push({
        pathname: "/(tabs)/(playlist)/",
        params: { 
          tab: 'video',
          playlistId: newPlaylistId
        }
      });
    }
  };

  const handlePlaylistPress = (playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistModalVisible(true);
  };

  const handleVideoPress = useCallback((video) => {
    // Prevent multiple rapid clicks
    if (isTransitioning) return;
    
    setCurrentVideo(video);
    router.replace('/player/video');
  }, [isTransitioning, setCurrentVideo, router]);

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
      // Remove playlist from store
      const updatedPlaylists = videoPlaylists.filter(p => p.id !== optionsPlaylist.id);
      useOptimizedVideoStore.setState({ videoPlaylists: updatedPlaylists });
      setOptionsVisible(false);
      setOptionsPlaylist(null);
    }
  };

  // Filter playlists and videos by searchQuery
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return videoPlaylists;
    return videoPlaylists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [videoPlaylists, searchQuery]);

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
          {(Array.isArray(item.tracks) ? item.tracks.length : 0)} {(Array.isArray(item.tracks) && item.tracks.length === 1) ? 'video' : 'videos'}
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
      
      {/* Clear All Button - only show when there are playlists */}
      {videoPlaylists.length > 0 && !searchQuery && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.card,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: themeColors.primary,
            }}
            onPress={handleClearAllPlaylists}
            activeOpacity={0.8}
          >
            <Text style={{ color: themeColors.primary, fontWeight: '600', fontSize: 14 }}>
              Clear All Playlists
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={filteredPlaylists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
              <View style={styles.iconGlow(themeColors)}>
                <MaterialIcons 
                  name="playlist-add" 
                  size={64} 
                  color={themeColors.primary} 
                  style={styles.emptyIcon}
                />
              </View>
            </View>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {searchQuery ? 'No matching playlists' : 'No video playlists yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create a new playlist to get started'}
            </Text>
          </View>
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
        <View style={styles.modalOverlay(themeColors)}>
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
            <View style={{ flex: 1, marginTop: 16, marginBottom: 16 }}>
              {optimizedLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                  <Text style={{ color: themeColors.textSecondary, marginTop: 12, fontSize: 16 }}>
                    Loading videos... {videoProgress.loaded}/{videoProgress.total || '?'}
                  </Text>
                  {videoProgress.phase === 'generating_thumbnails' && (
                    <Text style={{ color: themeColors.textSecondary, marginTop: 4, fontSize: 14, fontStyle: 'italic' }}>
                      Generating thumbnails...
                    </Text>
                  )}
                </View>
              ) : (
                <FlatList
                  data={optimizedVideoFiles}
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
                        {/* Optimized thumbnail */}
                        {item.thumbnail ? (
                          <Image source={{ uri: item.thumbnail }} style={{ width: 56, height: 56, borderRadius: 8, marginBottom: 2 }} />
                        ) : item.thumbnailLoaded ? (
                          <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
                            <MaterialIcons name="video-library" size={28} color={themeColors.primary} />
                          </View>
                        ) : (
                          <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
                            <ActivityIndicator size="small" color={themeColors.primary} />
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
              )}
            </View>
            <View style={{ gap: 12, marginTop: 'auto', paddingTop: 16 }}>
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
        <View style={styles.modalOverlay(themeColors)}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}> 
            <Text style={{ color: themeColors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
              {selectedPlaylist.name}
            </Text>
            <FlatList
              data={Array.isArray(selectedPlaylist.tracks) ? selectedPlaylist.tracks : []}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  emptyIcon: {
    opacity: 0.9,
  },
  iconGlow: (themeColors) => ({
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 5,
  }),
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    opacity: 0.9,
    maxWidth: 280,
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
  modalOverlay: (themeColors) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: themeColors.background,
    flex: 1,
  }),
  modalContent: {
    flex: 1,
    width: '100%',
    padding: 20,
    paddingTop: 50,
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