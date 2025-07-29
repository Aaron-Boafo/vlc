import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Image, ActivityIndicator, ScrollView } from "react-native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import useThemeStore from "../../../store/theme";
import usePlaylistStore from '../../../store/playlistStore';
import useAudioControl from '../../../store/useAudioControl';
import useOptimizedAudioStore from '../../../store/optimizedAudioStore';
import useOptimizedVideoStore from '../../../store/optimizedVideoStore';
import { Plus, Trash2, Music4, Play, Shuffle, MoreVertical, Edit3, Video as VideoIcon, FileAudio, ListMusic } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AudioHeader from '../../../AudioComponents/title';
import { SafeAreaView as SafeAreaViewSafeAreaContext } from 'react-native-safe-area-context';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import SearchBar from '../../../components/SearchBar';
import { useRef } from "react";

const SegmentedControl = ({ value, onChange }) => {
  const { themeColors } = useThemeStore();
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: themeColors.primary + '60', height: 36 }}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: value === 'audio' ? themeColors.primary : themeColors.background, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
        onPress={() => onChange('audio')}
        activeOpacity={0.8}
      >
        <FileAudio size={16} color={value === 'audio' ? themeColors.background : themeColors.primary} />
        <Text style={{ color: value === 'audio' ? themeColors.background : themeColors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 14 }}>Audio</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: value === 'video' ? themeColors.primary : themeColors.background, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
        onPress={() => onChange('video')}
        activeOpacity={0.8}
      >
        <VideoIcon size={16} color={value === 'video' ? themeColors.background : themeColors.primary} />
        <Text style={{ color: value === 'video' ? themeColors.background : themeColors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 14 }}>Video</Text>
      </TouchableOpacity>
    </View>
  );
};

const PlaylistCard = React.memo(({ playlist, onPress, onOptions, onPlay, onShuffle, themeColors }) => {
  const getPlaylistArtwork = (playlist) => {
    if (playlist.artwork) return playlist.artwork;
    if (playlist.tracks.length > 0) {
      return playlist.tracks[0]?.artwork || null;
    }
    return null;
  };

  const artwork = getPlaylistArtwork(playlist);

  return (
    <TouchableOpacity
      style={[styles.playlistCard, { backgroundColor: themeColors.card, shadowColor: themeColors.shadow }]}
      onPress={onPress}
    >
      <View style={styles.playlistArtwork}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.artworkImage} />
        ) : (
          <View style={[styles.artworkPlaceholder, { backgroundColor: themeColors.primary + '20' }]}>
            {playlist.type === 'audio' ? <Music4 size={32} color={themeColors.primary} /> : <VideoIcon size={32} color={themeColors.primary} />}
          </View>
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: themeColors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.trackCount, { color: themeColors.textSecondary }]}>
          {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
          {playlist.type === 'audio' ? ' • Audio' : ' • Video'}
        </Text>
      </View>
      <View style={styles.playlistActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary + '20' }]}
          onPress={onPlay}
        >
          <Play size={16} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary + '20' }]}
          onPress={onShuffle}
        >
          <Shuffle size={16} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.card }]}
          onPress={onOptions}
        >
          <MoreVertical size={16} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const TrackSelectItem = ({ item, selected, onToggle, themeColors, playlistType }) => {
  return (
    <TouchableOpacity
      style={[styles.trackSelectCard, {
        backgroundColor: selected
          ? themeColors.primary + '20'
          : themeColors.card
      }]}
      onPress={() => onToggle(item)}
    >
      {/* Track artwork */}
      <View style={styles.trackSelectArtwork}>
        {item.artwork ? (
          <Image source={{ uri: item.artwork }} style={styles.trackSelectArtworkImage} />
        ) : (
          <View style={[styles.trackSelectArtworkPlaceholder, { backgroundColor: themeColors.primary + '20' }]}>
            {playlistType === 'audio' ? <Music4 size={16} color={themeColors.primary} /> : <VideoIcon size={16} color={themeColors.primary} />}
          </View>
        )}
      </View>
      
      <View style={styles.trackSelectInfo}>
        <Text style={[styles.trackSelectTitle, { color: themeColors.text }]} numberOfLines={1}>
          {item.title || item.filename?.replace(/\.[^/.]+$/, "") || 'Unknown Track'}
        </Text>
        <Text style={[styles.trackSelectArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
          {item.artist || "Unknown Artist"}
        </Text>
      </View>
      {selected && (
        <View style={[styles.checkmark, { backgroundColor: themeColors.primary }]}>
          <Text style={{ color: themeColors.background, fontSize: 12, fontWeight: 'bold' }}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const PlaylistScreen = () => {
  const { themeColors } = useThemeStore();
  const { playlists, createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, clearPlaylists } = usePlaylistStore();
  const audioControl = useAudioControl();
  const router = useRouter();
  
  // Get cached data from stores
  const { audioFiles, loadAudioFiles, isLoading: audioLoading } = useOptimizedAudioStore();
  const { videoFiles, loadVideoFiles, isLoading: videoLoading } = useOptimizedVideoStore();

  // State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistType, setPlaylistType] = useState('audio');
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsPlaylist, setOptionsPlaylist] = useState(null);
  const [renameModal, setRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [sortOrder, setSortOrder] = useState('az'); // 'az', 'za', 'tracks'
  const [trackSearchQuery, setTrackSearchQuery] = useState(''); // Search within tracks modal

  // Get tracks from cached stores instead of reloading
  const availableTracks = useMemo(() => {
    return playlistType === 'audio' ? audioFiles : videoFiles;
  }, [playlistType, audioFiles, videoFiles]);

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!trackSearchQuery.trim()) return availableTracks;
    
    const query = trackSearchQuery.toLowerCase();
    return availableTracks.filter(track => {
      const title = track.title || track.filename || '';
      const artist = track.artist || '';
      const album = track.album || '';
      
      return title.toLowerCase().includes(query) ||
             artist.toLowerCase().includes(query) ||
             album.toLowerCase().includes(query);
    });
  }, [availableTracks, trackSearchQuery]);

  // Load tracks from stores when modal opens or type changes
  useEffect(() => {
    if (createModal) {
      if (playlistType === 'audio' && audioFiles.length === 0) {
        console.log('🎵 Loading audio files for playlist creation...');
        loadAudioFiles();
      } else if (playlistType === 'video' && videoFiles.length === 0) {
        console.log('🎥 Loading video files for playlist creation...');
        loadVideoFiles();
      }
    }
  }, [createModal, playlistType, audioFiles.length, videoFiles.length, loadAudioFiles, loadVideoFiles]);

  // Check if we're currently loading
  const isLoadingTracks = useMemo(() => {
    return playlistType === 'audio' ? audioLoading : videoLoading;
  }, [playlistType, audioLoading, videoLoading]);

  // Handlers
  const openPlaylist = useCallback((playlist) => {
    setSelectedPlaylist(playlist);
    setModalVisible(true);
  }, []);

  const handleDeletePlaylist = useCallback((id, name) => {
    handleCloseOptions();
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) }
      ]
    );
  }, [deletePlaylist]);

  const handleRemoveTrack = useCallback((playlistId, trackId) => {
    removeTrackFromPlaylist(playlistId, trackId);
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist({
        ...selectedPlaylist,
        tracks: selectedPlaylist.tracks.filter(t => t.id !== trackId)
      });
    }
  }, [removeTrackFromPlaylist, selectedPlaylist]);

  const handlePlayTrack = useCallback((track) => {
    audioControl.setAndPlayPlaylist([track], 0, true); // Show mini player for individual tracks
  }, [audioControl]);

  const toggleTrack = useCallback((track) => {
    setSelectedTracks((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [...prev, track]
    );
  }, []);

  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim() || selectedTracks.length === 0) return;
    const id = createPlaylist(newPlaylistName.trim(), playlistType);
    selectedTracks.forEach(track => addTrackToPlaylist(id, track));
    
    // Reset modal state
    setNewPlaylistName("");
    setSelectedTracks([]);
    setTrackSearchQuery('');
    setPlaylistType('audio');
    setCreateModal(false);
  }, [newPlaylistName, selectedTracks, createPlaylist, addTrackToPlaylist, playlistType]);

  const handleCloseCreateModal = useCallback(() => {
    // Reset all modal state when closing
    setNewPlaylistName("");
    setSelectedTracks([]);
    setTrackSearchQuery('');
    setPlaylistType('audio');
    setCreateModal(false);
  }, []);

  const handleOpenOptions = useCallback((playlist) => {
    setOptionsPlaylist(playlist);
    setOptionsVisible(true);
  }, []);

  const handleCloseOptions = useCallback(() => {
    setOptionsVisible(false);
    setOptionsPlaylist(null);
  }, []);

  const handlePlayPlaylist = useCallback((playlist) => {
    if (playlist.tracks.length > 0) {
      audioControl.setAndPlayPlaylist(playlist.tracks, 0, false); // Don't show mini player
      router.push(playlist.type === 'audio' ? '/player/audio' : '/player/video');
    } else {
      Alert.alert('No tracks', 'This playlist has no tracks to play.');
    }
  }, [audioControl, router]);

  const handleShufflePlaylist = useCallback((playlist) => {
    if (playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      audioControl.setAndPlayPlaylist(shuffled, 0, false); // Don't show mini player
      router.push(playlist.type === 'audio' ? '/player/audio' : '/player/video');
    } else {
      Alert.alert('No tracks', 'This playlist has no tracks to play.');
    }
  }, [audioControl, router]);

  const handleRenamePlaylist = useCallback(() => {
    // Instead of renaming, show an alert to use file manager
    Alert.alert(
      'Rename Playlist',
      'To rename a playlist or file, please use your device\'s file manager.'
    );
    setOptionsVisible(false);
  }, []);

  const handleClearAllPlaylists = useCallback(() => {
    Alert.alert(
      'Clear All Playlists',
      'Are you sure you want to delete all playlists? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearPlaylists() }
      ]
    );
  }, [clearPlaylists]);

  // Filter and sort playlists
  const filteredPlaylists = playlists
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name);
      if (sortOrder === 'za') return b.name.localeCompare(a.name);
      if (sortOrder === 'tracks') return b.tracks.length - a.tracks.length;
      return 0;
    });

  const renderPlaylist = useCallback(({ item }) => (
    <PlaylistCard
      playlist={item}
      onPress={() => openPlaylist(item)}
      onOptions={() => handleOpenOptions(item)}
      onPlay={() => handlePlayPlaylist(item)}
      onShuffle={() => handleShufflePlaylist(item)}
      themeColors={themeColors}
    />
  ), [openPlaylist, handleOpenOptions, handlePlayPlaylist, handleShufflePlaylist, themeColors]);

  const renderTrack = useCallback(({ item, index }) => (
    <View style={[styles.trackCard, { backgroundColor: themeColors.card, shadowColor: themeColors.shadow }]}>
      <TouchableOpacity
        style={styles.trackInfo}
        onPress={() => handlePlayTrack(item)}
      >
        <View style={styles.trackArtwork}>
          {item.artwork ? (
            <Image source={{ uri: item.artwork }} style={styles.trackArtworkImage} />
          ) : (
            <View style={[styles.trackArtworkPlaceholder, { backgroundColor: themeColors.primary + '20' }]}>
              {playlistType === 'audio' ? <Music4 size={20} color={themeColors.primary} /> : <VideoIcon size={20} color={themeColors.primary} />}
            </View>
          )}
        </View>
        <View style={styles.trackDetails}>
          <Text style={[styles.trackTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.trackArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleRemoveTrack(selectedPlaylist.id, item.id)}
        style={styles.removeButton}
      >
        <Trash2 size={18} color={themeColors.error || '#EF4444'} />
      </TouchableOpacity>
    </View>
  ), [handlePlayTrack, handleRemoveTrack, selectedPlaylist, themeColors, playlistType]);

  // Handler for refresh (reload playlists)
  const handleRefresh = useCallback(() => {
    // If you have a function to reload playlists, call it here
    // For now, just close the menu
    setShowMore(false);
  }, []);

  return (
    <SafeAreaViewSafeAreaContext style={{ flex: 1, backgroundColor: themeColors.background }} edges={['top']}>
      <AudioHeader
        onSearch={() => setShowSearch(s => !s)}
        onMore={() => setShowMore(true)}
      />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Playlists</Text>
        <View style={styles.headerActions}>
          {playlists.length > 0 && (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: themeColors.card }]}
              onPress={handleClearAllPlaylists}
            >
              <Trash2 size={18} color={themeColors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search playlists..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery('');
            setShowSearch(false);
          }}
        />
      )}

      {/* Playlists List */}
      <FlatList
        data={filteredPlaylists}
        keyExtractor={item => item.id}
        renderItem={renderPlaylist}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ListMusic size={48} color={themeColors.primary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No playlists yet. Create your first playlist!</Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setCreateModal(true)}
            >
              <Plus size={20} color={themeColors.background} />
              <Text style={[styles.createButtonText, { color: themeColors.background }]}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1, padding: 16 }}
        style={{ width: '100%' }}
        initialNumToRender={10}
        windowSize={10}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
      />

      {/* More Options Menu (shared component) */}
      <MoreOptionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onSettings={() => router.push('/(tabs)/(more)/settings')}
        onAbout={() => router.push('/(tabs)/(more)/about')}
        onRefresh={handleRefresh}
      />

      {/* FAB at bottom left */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: themeColors.primary }]} onPress={() => setCreateModal(true)}>
        <Plus size={28} color={'#fff'} />
      </TouchableOpacity>

      {/* Create Playlist Modal */}
      <Modal
        visible={createModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCreateModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Create Playlist</Text>
            <TouchableOpacity onPress={handleCloseCreateModal}>
              <Text style={[styles.closeButton, { color: themeColors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Type Toggle */}
          <SegmentedControl value={playlistType} onChange={setPlaylistType} />

          <TextInput
            style={[styles.input, {
              backgroundColor: themeColors.card,
              color: themeColors.text,
              borderColor: themeColors.border
            }]}
            placeholder="Playlist name"
            placeholderTextColor={themeColors.textSecondary}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Select {playlistType === 'audio' ? 'Audio' : 'Video'} Tracks ({filteredTracks.length})
            </Text>
            
            {/* Search input for tracks */}
            <View style={[styles.trackSearchContainer, { 
              backgroundColor: themeColors.sectionBackground,
              borderColor: themeColors.border || 'rgba(255,255,255,0.1)'
            }]}>
              <TextInput
                style={[styles.trackSearchInput, { color: themeColors.text }]}
                placeholder={`Search ${playlistType} tracks...`}
                placeholderTextColor={themeColors.textSecondary}
                value={trackSearchQuery}
                onChangeText={setTrackSearchQuery}
              />
            </View>
          </View>

          {isLoadingTracks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                Loading {playlistType} tracks...
              </Text>
            </View>
          ) : filteredTracks.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                {trackSearchQuery.trim() 
                  ? `No ${playlistType} tracks found matching "${trackSearchQuery}"`
                  : `No ${playlistType} tracks available`
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTracks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TrackSelectItem
                  item={item}
                  selected={selectedTracks.some(t => t.id === item.id)}
                  onToggle={toggleTrack}
                  themeColors={themeColors}
                  playlistType={playlistType}
                />
              )}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              initialNumToRender={20}
              windowSize={10}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 70, // Approximate item height
                offset: 70 * index,
                index,
              })}
            />
          )}

          <TouchableOpacity
            style={[
              styles.createPlaylistButton,
              {
                backgroundColor: newPlaylistName.trim() && selectedTracks.length > 0
                  ? themeColors.primary
                  : themeColors.card
              }
            ]}
            onPress={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || selectedTracks.length === 0}
          >
            <Text style={[
              styles.createPlaylistButtonText,
              {
                color: newPlaylistName.trim() && selectedTracks.length > 0
                  ? themeColors.background
                  : themeColors.textSecondary
              }
            ]}>
              Create Playlist ({selectedTracks.length} tracks)
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Playlist Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]} numberOfLines={1}>{selectedPlaylist?.name}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.closeButton, { color: themeColors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {selectedPlaylist && (
            <FlatList
              data={selectedPlaylist.tracks}
              keyExtractor={item => item.id}
              renderItem={renderTrack}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <ListMusic size={48} color={themeColors.primary} />
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No tracks in this playlist.</Text>
                </View>
              }
              contentContainerStyle={{ flexGrow: 1, padding: 16 }}
            />
          )}
        </View>
      </Modal>

      {/* Playlist Options Modal */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseOptions}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleCloseOptions}>
          <View style={[styles.optionsContainer, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.optionText, { color: themeColors.text, fontWeight: 'bold', fontSize: 18, marginBottom: 12 }]}>Playlist Options</Text>
            <TouchableOpacity style={styles.optionItem} onPress={handleRenamePlaylist}>
              <Edit3 size={20} color={themeColors.text} />
              <Text style={[styles.optionText, { color: themeColors.text }]}>Rename Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderTopColor: themeColors.border }]} onPress={() => handleDeletePlaylist(optionsPlaylist.id, optionsPlaylist.name)}>
              <Trash2 size={20} color={themeColors.error || '#EF4444'} />
              <Text style={[styles.optionText, { color: themeColors.error || '#EF4444' }]}>Delete Playlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaViewSafeAreaContext>
  );
};

PlaylistScreen.displayName = 'PlaylistScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  playlistArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackCount: {
    fontSize: 14,
    fontWeight: '400',
  },
  playlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackArtwork: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  trackArtworkImage: {
    width: '100%',
    height: '100%',
  },
  trackArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
    fontWeight: '400',
  },
  removeButton: {
    padding: 8,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  trackSearchContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  trackSearchInput: {
    fontSize: 16,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  trackSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trackSelectArtwork: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  trackSelectArtworkImage: {
    width: '100%',
    height: '100%',
  },
  trackSelectArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackSelectInfo: {
    flex: 1,
  },
  trackSelectTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackSelectArtist: {
    fontSize: 14,
    fontWeight: '400',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  createPlaylistButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createPlaylistButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  renameContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  renameButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  renameButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default PlaylistScreen; 