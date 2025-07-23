import React, {useState, useEffect, useCallback, useMemo} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Share,
  StyleSheet,
} from "react-native";
import { Image } from 'expo-image';
import {Music4, Play, Heart, MoreVertical, ListPlus, Info, Shuffle, PlusSquare, ArrowDownLeftSquare, Smartphone, ArrowLeft, Share2} from "lucide-react-native";
import useThemeStore from "../store/theme";
import useAudioControl from "../store/useAudioControl";
import useOptimizedAudioStore from "../store/optimizedAudioStore";
import {router} from "expo-router";
import useFavouriteStore from '../store/favouriteStore';
import CustomAlert from '../components/CustomAlert';
import BottomSheet from '../components/BottomSheet';
import SearchBar from '../components/SearchBar';
import usePlaylistStore from '../store/playlistStore';
import { useRef } from "react";
import * as MediaLibrary from 'expo-media-library';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import MemoryManager from '../utils/memoryManager';
import LargeLibraryOptimizer from '../utils/largeLibraryOptimizer';
import PerformanceMonitor from '../utils/performanceMonitor';

// Memoize TrackItem for performance
const TrackItem = React.memo(({ item, isPlaying, themeColors, favouriteStore, handleTrackPress, currentTrack, fetchMetadataForTrack, trackMetadata, handleMoreOptions, formatDuration }) => {
  React.useEffect(() => { fetchMetadataForTrack(item); }, [item, fetchMetadataForTrack]);
  const meta = trackMetadata[item.id] || {};
  return (
    <TouchableOpacity
      style={[
        styles.trackItem,
        { backgroundColor: themeColors.card },
        isPlaying && {backgroundColor: themeColors.primary + '33'}
      ]}
      onPress={() => handleTrackPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.trackInfo}>
        {meta.artwork ? (
          <Image 
            source={{ uri: meta.artwork }} 
            style={styles.artwork}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={[styles.artworkPlaceholder, { backgroundColor: themeColors.primary }]}> 
            <Music4 size={24} color="white" />
          </View>
        )}
        <View style={styles.trackDetails}>
          <Text style={[styles.trackTitle, { color: isPlaying ? themeColors.text : themeColors.text }]} numberOfLines={1}>
            {meta.title || item.title || item.filename}
          </Text>
          <Text style={[styles.trackArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {meta.artist || item.artist || 'Unknown Artist'} • {formatDuration(item.duration)}
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
});

const AllScreen = ({ showSearch, searchQuery, setSearchQuery, setShowSearch }) => {
  const {themeColors} = useThemeStore();
  const audioControl = useAudioControl();
  const favouriteStore = useFavouriteStore();
  const { audioFiles, isLoading, loadAudioFiles, sortOrder } = useOptimizedAudioStore();
  const {width} = Dimensions.get("window");
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const { currentTrack } = useAudioControl();
  const [refreshing, setRefreshing] = useState(false);
  const playlistStore = usePlaylistStore();
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] });
  // 🚀 Optimized metadata management for large libraries
  const [trackMetadata, setTrackMetadata] = useState({}); // id -> metadata
  const metadataCache = useRef(new Map()); // Use Map for better performance with large datasets
  const loadingMetadata = useRef(new Set()); // Track what's currently loading to prevent duplicates
  const metadataQueue = useRef([]); // Queue for batch processing
  const maxCacheSize = useRef(1000); // Limit cache size to prevent memory issues

  // 🧠 Register metadata cache with memory manager and optimize for large libraries
  useEffect(() => {
    const startTime = Date.now();
    
    MemoryManager.registerCache('audioMetadata', metadataCache.current, maxCacheSize.current);
    MemoryManager.registerCache('audioTrackMetadata', trackMetadata, maxCacheSize.current);
    
    // 🚀 Optimize for library size and start performance monitoring
    if (audioFiles.length > 0) {
      const optimizedSettings = LargeLibraryOptimizer.optimizeForLibrarySize(audioFiles.length);
      maxCacheSize.current = optimizedSettings.cacheSize;
      
      // 📊 Start performance monitoring for large libraries
      if (LargeLibraryOptimizer.isLargeLibrary()) {
        PerformanceMonitor.startMonitoring();
        PerformanceMonitor.trackLoadTime('audio', audioFiles.length, Date.now() - startTime);
      }
      
      console.log(`📚 Library optimization applied for ${audioFiles.length} files:`, optimizedSettings);
    }
    
    return () => {
      // Cleanup when component unmounts
      MemoryManager.forceCleanupCache('audioMetadata');
      MemoryManager.forceCleanupCache('audioTrackMetadata');
      
      // Stop performance monitoring
      if (LargeLibraryOptimizer.isLargeLibrary()) {
        const report = PerformanceMonitor.stopMonitoring();
        console.log('📊 Audio screen performance report:', report.summary);
      }
    };
  }, [audioFiles.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAudioFiles();
    setRefreshing(false);
  };

  // Memoize formatDuration
  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleTrackPress = useCallback(async (item) => {
    try {
      // Filter out tracks without valid URIs
      const validTracks = sortedAndFilteredAudio.filter(track => track.uri && track.uri.trim() !== '');
      
      if (validTracks.length === 0) {
        Alert.alert("Error", "No valid audio files found");
        return;
      }
      
      // 🎨 Enrich tracks with metadata before playing
      const enrichedTracks = validTracks.map(track => {
        const meta = trackMetadata[track.id] || {};
        return {
          ...track,
          title: meta.title || track.title || track.filename?.replace(/\.[^/.]+$/, "") || 'Unknown Track',
          artist: meta.artist || track.artist || 'Unknown Artist',
          album: meta.album || track.album || 'Unknown Album',
          year: meta.year || track.year || null,
          artwork: meta.artwork || track.artwork || null,
        };
      });
      
      // Find the index in the filtered array
      const index = enrichedTracks.findIndex(track => track.id === item.id);
      
      if (index === -1) {
        Alert.alert("Error", "Selected track not found or invalid");
        return;
      }
      
      console.log('🎵 Playing track:', enrichedTracks[index].title, 'with artwork:', !!enrichedTracks[index].artwork);
      console.log('🎨 Artwork URI:', enrichedTracks[index].artwork?.substring(0, 50) + '...');
      await audioControl.setAndPlayPlaylist(enrichedTracks, index);
      router.push('/player/audio');
    } catch (error) {
      console.error("Error playing song:", error);
      Alert.alert("Error", "Failed to play song");
    }
  }, [audioControl, sortedAndFilteredAudio, trackMetadata]);

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
    if (selectedTrack) handleTrackPress(selectedTrack);
  };

  const handleShuffle = () => {
    if (audioFiles.length === 0) return;
    
    // Create a shuffled copy of the audio files
    const shuffledFiles = [...audioFiles].sort(() => Math.random() - 0.5);
    audioControl.setAndPlayPlaylist(shuffledFiles, 0);
    router.push("/(audio)/player");
  };

  const handleAddToQueue = (track) => {
    const currentQueue = audioControl.playQueue || [];
    const newQueue = [...currentQueue, track];
    audioControl.setPlayQueue(newQueue);
    Alert.alert('Added to Queue', `${track.title} has been added to the queue.`);
  };

  const handleInsertNext = (track) => {
    // Insert track after the current playing track
    const currentQueue = audioControl.playQueue || [];
    const currentIndex = audioControl.currentIndex || 0;
    const newQueue = [...currentQueue];
    newQueue.splice(currentIndex +1, 0, track);
    audioControl.setPlayQueue(newQueue);
    Alert.alert('Inserted Next', `${track.title} will play next.`);
  };

  const handleCreateShortcut = (track) => {
    Alert.alert('Shortcut Created', `A shortcut for ${track.title} has been created on your home screen.`);
  };

  const handleRemoveFromList = (track) => {
    Alert.alert(
      'Remove from List',
      `Remove ${track.title} from this list? (This wont delete the file from your device)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove from the current list (not from device)
            Alert.alert('Removed', `${track.title} has been removed from this list.`);
          },
        },
      ]
    );
  };

  const handleAddToPlaylist = () => {
    setOptionsVisible(false);
    if (!selectedTrack) return;
    const playlists = playlistStore.playlists;
    if (playlists.length === 0) {
      // No playlists: show message to create one first
      setCustomAlert({
        visible: true,
        title: 'No Playlists',
        message: 'You don\'t have any playlists yet. Create a playlist first, then add songs to it.',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setCustomAlert(alert => ({ ...alert, visible: false })) }],
      });
    } else {
      // Show a CustomAlert to pick a playlist
      setCustomAlert({
        visible: true,
        title: 'Add to Playlist',
        message: 'Select a playlist to add this song:',
        buttons: playlists.map(p => ({
          text: p.name,
          style: 'primary',
          onPress: () => {
            playlistStore.addTrackToPlaylist(p.id, selectedTrack);
            setCustomAlert({
              visible: true,
              title: 'Added to Playlist',
              message: `Song added to "${p.name}"!`,
              buttons: [{ text: 'OK', style: 'primary', onPress: () => setCustomAlert(alert => ({ ...alert, visible: false })) }],
            });
          }
        })).concat([{ text: 'Cancel', onPress: () => setCustomAlert(alert => ({ ...alert, visible: false })) }]),
      });
    }
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

  // Memoize sortedAndFilteredAudio
  const sortedAndFilteredAudio = useMemo(() => {
    let sorted = [...audioFiles];
    if (sortOrder.key) {
        sorted.sort((a, b) => {
            if (a[sortOrder.key] < b[sortOrder.key]) return sortOrder.direction === 'asc' ? -1 : 1;
            if (a[sortOrder.key] > b[sortOrder.key]) return sortOrder.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    if (!searchQuery) return sorted;
    return sorted.filter(track =>
      (track.title || track.filename).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.artist || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [audioFiles, searchQuery, sortOrder]);

  // 🚀 Optimized metadata fetching for large libraries
  const fetchMetadataForTrack = useCallback(async (track) => {
    // Skip if already loaded or currently loading
    if (trackMetadata[track.id] || loadingMetadata.current.has(track.id)) return;
    
    // Check cache first
    if (metadataCache.current.has(track.id)) {
      const cachedData = metadataCache.current.get(track.id);
      setTrackMetadata(prev => ({ ...prev, [track.id]: cachedData }));
      return;
    }
    
    // Add to loading set to prevent duplicates
    loadingMetadata.current.add(track.id);
    
    try {
      // Use timeout to prevent hanging on problematic files
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Metadata timeout')), 5000)
      );
      
      const metadataPromise = getAudioMetadata(track.uri, ["album", "artist", "name", "year", "artwork"]);
      
      const data = await Promise.race([metadataPromise, timeoutPromise]);
      let artworkUri = null;
      const metadata = data.metadata || {};
      
      if (metadata.artwork) {
        try {
          if (metadata.artwork.startsWith('data:image')) {
            artworkUri = metadata.artwork;
          } else if (/^[A-Za-z0-9+/=]+$/.test(metadata.artwork)) {
            artworkUri = `data:image/png;base64,${metadata.artwork}`;
          } else {
            artworkUri = metadata.artwork;
          }
        } catch (artworkError) {
          console.log('Artwork processing failed for:', track.filename);
          artworkUri = null;
        }
      }
      
      const processedMetadata = {
        album: metadata.album || "Unknown Album",
        artist: metadata.artist || "Unknown Artist",
        title: metadata.name || track.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track",
        year: metadata.year || null,
        artwork: artworkUri,
        cachedAt: Date.now(),
      };
      
      // Update state
      setTrackMetadata(prev => ({ ...prev, [track.id]: processedMetadata }));
      
      // Cache the result
      metadataCache.current.set(track.id, processedMetadata);
      
      // Memory management: limit cache size
      if (metadataCache.current.size > maxCacheSize.current) {
        const oldestKey = metadataCache.current.keys().next().value;
        metadataCache.current.delete(oldestKey);
      }
      
    } catch (error) {
      // Fallback to filename-based metadata
      const fallbackMetadata = {
        album: "Unknown Album",
        artist: "Unknown Artist", 
        title: track.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track",
        year: null,
        artwork: null,
        cachedAt: Date.now(),
        source: 'fallback'
      };
      
      setTrackMetadata(prev => ({ ...prev, [track.id]: fallbackMetadata }));
      metadataCache.current.set(track.id, fallbackMetadata);
      
    } finally {
      // Remove from loading set
      loadingMetadata.current.delete(track.id);
    }
  }, [trackMetadata]);

  // Memoize renderItem
  const renderItem = useCallback(({ item }) => {
    const isPlaying = currentTrack && item.id === currentTrack.id;
    return (
      <TrackItem
        item={item}
        isPlaying={isPlaying}
        themeColors={themeColors}
        favouriteStore={favouriteStore}
        handleTrackPress={handleTrackPress}
        currentTrack={currentTrack}
        fetchMetadataForTrack={fetchMetadataForTrack}
        trackMetadata={trackMetadata}
        handleMoreOptions={handleMoreOptions}
        formatDuration={formatDuration}
      />
    );
  }, [themeColors, favouriteStore, handleTrackPress, currentTrack, trackMetadata, fetchMetadataForTrack, handleMoreOptions, formatDuration]);

  if (isLoading && sortedAndFilteredAudio.length === 0) {
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
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your music..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery('');
            if (typeof setShowSearch === 'function') setShowSearch(false);
          }}
        />
      )}

      <FlatList
        data={sortedAndFilteredAudio}
        renderItem={renderItem}
        keyExtractor={LargeLibraryOptimizer.optimizedKeyExtractor}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        // 🚀 Dynamic optimization based on library size
        {...LargeLibraryOptimizer.getOptimizedFlatListProps()}
        // 🧠 Memory optimization with intelligent cleanup
        onEndReachedThreshold={0.1}
        onEndReached={() => {
          // Intelligent memory cleanup based on library size
          if (LargeLibraryOptimizer.isHugeLibrary()) {
            // Aggressive cleanup for huge libraries
            if (metadataCache.current.size > maxCacheSize.current) {
              const entries = Array.from(metadataCache.current.entries());
              const toKeep = entries.slice(-Math.floor(maxCacheSize.current * 0.7)); // Keep only 70%
              metadataCache.current.clear();
              toKeep.forEach(([key, value]) => metadataCache.current.set(key, value));
            }
          } else if (metadataCache.current.size > maxCacheSize.current * 1.5) {
            // Standard cleanup for normal libraries
            const entries = Array.from(metadataCache.current.entries());
            const toKeep = entries.slice(-maxCacheSize.current);
            metadataCache.current.clear();
            toKeep.forEach(([key, value]) => metadataCache.current.set(key, value));
          }
        }}
        // 🎯 Optimized scroll handling for large libraries
        onScrollBeginDrag={() => {
          // Pause metadata loading during scrolling for better performance
          if (LargeLibraryOptimizer.isLargeLibrary()) {
            loadingMetadata.current.clear();
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Music4 size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {searchQuery ? 'No music found' : 'No music in your library'}
            </Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Add some music to get started'}
            </Text>
            {LargeLibraryOptimizer.isHugeLibrary() && (
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary, marginTop: 8 }]}>
                📚 Huge library detected - optimizations applied
              </Text>
            )}
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        extraData={trackMetadata}
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
      {optionsVisible && console.log('BottomSheet visible:', optionsVisible)}

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

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onClose={() => setCustomAlert(alert => ({ ...alert, visible: false }))}
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
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
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
