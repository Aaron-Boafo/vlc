import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Button,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoOff, Play, Heart, Share2, Trash2, Info, Clock, Star, Edit3 } from 'lucide-react-native';
import useOptimizedVideoStore from '../store/optimizedVideoStore';
import useThemeStore from '../store/theme';
import useFavouriteStore from '../store/favouriteStore';
import useHistoryStore from '../store/historyStore';
import { router } from 'expo-router';
import VideoCard from '../components/VideoCard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomAlert from '../components/CustomAlert';
import MemoryManager from '../utils/memoryManager';
import LargeLibraryOptimizer from '../utils/largeLibraryOptimizer';
import PerformanceMonitor from '../utils/performanceMonitor';

const VideoAllScreen = ({ showSearch, onCloseSearch }) => {
  const { videoFiles, isLoading, loadVideoFiles, setAndPlayVideo, removeVideo, renameVideo, toggleFavouriteVideo, forceReloadVideos } = useOptimizedVideoStore();
  const { themeColors } = useThemeStore();
  const favouriteStore = useFavouriteStore();
  const historyStore = useHistoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [loadingError, setLoadingError] = useState(null);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const [videoThumbnails, setVideoThumbnails] = useState({});
  
  // 🚀 Optimized thumbnail management for large libraries
  const thumbnailCache = useRef(new Map());
  const maxThumbnailCache = useRef(500); // Limit thumbnail cache size

  useEffect(() => {
    if (!videoFiles || !Array.isArray(videoFiles) || videoFiles.length === 0) {
      loadVideoFiles().catch(error => {
        console.error('Error loading videos:', error);
        setLoadingError(error.message);
      });
    }
  }, [loadVideoFiles]);

  // 🧠 Register thumbnail cache with memory manager and optimize for large libraries
  useEffect(() => {
    const startTime = Date.now();
    
    MemoryManager.registerCache('videoThumbnails', thumbnailCache.current, maxThumbnailCache.current);
    MemoryManager.registerCache('videoThumbnailState', videoThumbnails, maxThumbnailCache.current);
    
    // 🚀 Optimize for library size and start performance monitoring
    if (videoFiles.length > 0) {
      const optimizedSettings = LargeLibraryOptimizer.optimizeForLibrarySize(videoFiles.length);
      maxThumbnailCache.current = Math.floor(optimizedSettings.cacheSize / 2); // Thumbnails use more memory
      
      // 📊 Start performance monitoring for large libraries
      if (LargeLibraryOptimizer.isLargeLibrary()) {
        PerformanceMonitor.startMonitoring();
        PerformanceMonitor.trackLoadTime('video', videoFiles.length, Date.now() - startTime);
      }
      
      console.log(`🎥 Video library optimization applied for ${videoFiles.length} files:`, optimizedSettings);
    }
    
    return () => {
      // Cleanup when component unmounts
      MemoryManager.forceCleanupCache('videoThumbnails');
      MemoryManager.forceCleanupCache('videoThumbnailState');
      
      // Stop performance monitoring
      if (LargeLibraryOptimizer.isLargeLibrary()) {
        const report = PerformanceMonitor.stopMonitoring();
        console.log('📊 Video screen performance report:', report.summary);
      }
    };
  }, [videoFiles.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    setLoadingError(null);
    try {
      await forceReloadVideos();
    } catch (error) {
      console.error('Error refreshing videos:', error);
      setLoadingError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryLoad = async () => {
    setLoadingError(null);
    try {
      await forceReloadVideos();
    } catch (error) {
      console.error('Error retrying video load:', error);
      setLoadingError(error.message);
    }
  };
  
  const filteredVideos = useMemo(() => {
    if (!videoFiles || !Array.isArray(videoFiles)) return [];
    if (!searchQuery) return videoFiles;
    return videoFiles.filter(video =>
      (video.title || video.filename).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [videoFiles, searchQuery]);

  // Callback to receive thumbnail from VideoCard
  const handleThumbnailReady = useCallback((uri, video) => {
    setVideoThumbnails(prev => {
      if (prev[video.id] === uri) return prev;
      return { ...prev, [video.id]: uri };
    });
  }, []);

  const handleVideoPress = (video) => {
    // Check for invalid characters in filename
    if (video.filename && (video.filename.includes('?') || video.filename.includes('#'))) {
      setCustomAlert({
        visible: true,
        title: '⚠️ Invalid Filename',
        message: "This video cannot be played because its filename contains invalid characters ('?' or '#'). Please rename the file before playing.",
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setCustomAlert(alert => ({ ...alert, visible: false })) }],
      });
      return;
    }
    // Attach thumbnail if available
    const videoWithThumb = videoThumbnails[video.id] ? { ...video, thumbnail: videoThumbnails[video.id] } : video;
    setAndPlayVideo(videoWithThumb);
    setTimeout(() => {
      router.push('/player/video');
    }, 50);
  };

  const handleMoreOptions = (video) => {
    setSelectedVideo(video);
    setShowMoreModal(true);
  };

  const handlePlay = () => {
    if (selectedVideo) {
      const videoWithThumb = videoThumbnails[selectedVideo.id] ? { ...selectedVideo, thumbnail: videoThumbnails[selectedVideo.id] } : selectedVideo;
      setAndPlayVideo(videoWithThumb);
      setShowMoreModal(false);
      setTimeout(() => {
        router.push('/player/video');
      }, 50);
    }
  };

  const handleAddToFavorites = () => {
    if (selectedVideo) {
      const videoWithThumb = videoThumbnails[selectedVideo.id] ? { ...selectedVideo, thumbnail: videoThumbnails[selectedVideo.id] } : selectedVideo;
      toggleFavouriteVideo(videoWithThumb);
      setShowMoreModal(false);
    }
  };

  const handleShare = async () => {
    if (selectedVideo) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(selectedVideo.uri, {
            mimeType: 'video/mp4',
            dialogTitle: `Share ${selectedVideo.filename}`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to share video.');
      }
      setShowMoreModal(false);
    }
  };

  const handleRename = () => {
    if (selectedVideo) {
      setShowMoreModal(false);
      Alert.alert(
        'Rename Video',
        'To rename a video file, please use your device\'s file manager.'
      );
    }
  };

  const handleDelete = () => {
    if (selectedVideo) {
      Alert.alert(
        'Delete Video',
        `Are you sure you want to delete "${selectedVideo.filename}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeVideo(selectedVideo.id);
                setShowMoreModal(false);
                Alert.alert('Success', 'Video deleted successfully.');
              } catch (error) {
                Alert.alert('Error', 'Failed to delete video.');
              }
            },
          },
        ]
      );
    }
  };

  const handleInfo = () => {
    if (selectedVideo) {
      Alert.alert(
        'Video Information',
        `Title: ${selectedVideo.filename}\n` +
        `Duration: ${Math.floor(selectedVideo.duration / 60)}:${(selectedVideo.duration % 60).toString().padStart(2, '0')}\n` +
        `Size: ${(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB\n` +
        `Path: ${selectedVideo.uri}`,
        [{ text: 'OK' }]
      );
      setShowMoreModal(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderItem = useCallback(({ item }) => (
    <VideoCard
      video={item}
      onPress={() => handleVideoPress(item)}
      onMoreOptions={() => handleMoreOptions(item)}
      onThumbnailReady={handleThumbnailReady}
    />
  ), [handleVideoPress, handleMoreOptions, handleThumbnailReady]);

  // Only show loading screen if we're loading AND have no files
  if (isLoading && (!videoFiles || videoFiles.length === 0)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}> 
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}> 
          Loading your video library...
        </Text>
        {loadingError && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: themeColors.error || '#ff6b6b' }]}>
              {loadingError}
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
              onPress={handleRetryLoad}
            >
              <Text style={[styles.retryButtonText, { color: 'white' }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
            placeholder="Search videos..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={onCloseSearch} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredVideos}
        renderItem={renderItem}
        keyExtractor={LargeLibraryOptimizer.optimizedKeyExtractor}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        // 🚀 Dynamic optimization based on library size
        {...LargeLibraryOptimizer.getOptimizedFlatListProps()}
        // Override some settings for video grid layout
        maxToRenderPerBatch={LargeLibraryOptimizer.isHugeLibrary() ? 6 : 10} // Fewer items for huge libraries
        initialNumToRender={LargeLibraryOptimizer.isHugeLibrary() ? 6 : 10}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate height of each card
          offset: 200 * Math.floor(index / 2),
          index,
        })}
        // 🧠 Memory optimization with intelligent cleanup
        onEndReachedThreshold={0.1}
        onEndReached={() => {
          // Intelligent thumbnail cleanup based on library size
          if (LargeLibraryOptimizer.isHugeLibrary()) {
            // Aggressive cleanup for huge libraries
            if (thumbnailCache.current.size > maxThumbnailCache.current) {
              const entries = Array.from(thumbnailCache.current.entries());
              const toKeep = entries.slice(-Math.floor(maxThumbnailCache.current * 0.6)); // Keep only 60%
              thumbnailCache.current.clear();
              toKeep.forEach(([key, value]) => thumbnailCache.current.set(key, value));
            }
          } else if (thumbnailCache.current.size > maxThumbnailCache.current * 1.5) {
            // Standard cleanup for normal libraries
            const entries = Array.from(thumbnailCache.current.entries());
            const toKeep = entries.slice(-maxThumbnailCache.current);
            thumbnailCache.current.clear();
            toKeep.forEach(([key, value]) => thumbnailCache.current.set(key, value));
          }
        }}
        // 🎯 Optimized scroll handling for large video libraries
        onScrollBeginDrag={() => {
          // Pause thumbnail generation during scrolling for better performance
          if (LargeLibraryOptimizer.isLargeLibrary()) {
            // Could implement thumbnail loading pause here
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <VideoOff 
              size={64} 
              color={themeColors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {searchQuery ? 'No videos found' : 'No videos in your library'}
            </Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Add some videos to get started'}
            </Text>
            {LargeLibraryOptimizer.isHugeLibrary() && (
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary, marginTop: 8 }]}>
                🎥 Huge video library detected - optimizations applied
              </Text>
            )}
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* More Options Modal */}
      <Modal
        visible={showMoreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowMoreModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: themeColors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedVideo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    {selectedVideo.filename.replace(/\.mp4$/, '')}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowMoreModal(false)}
                    style={styles.closeModalButton}
                  >
                    <MaterialIcons name="close" size={24} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalOptions}>
                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={handlePlay}
                  >
                    <Play size={22} color={themeColors.primary} style={styles.optionIcon} />
                    <Text style={[styles.optionText, { color: themeColors.text }]}>Play</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={handleAddToFavorites}
                  >
                    <Heart 
                      size={22} 
                      color={favouriteStore.isFavourite(selectedVideo.id) ? themeColors.primary : themeColors.text} 
                      style={styles.optionIcon} 
                    />
                    <Text style={[styles.optionText, { color: themeColors.text }]}>
                      {favouriteStore.isFavourite(selectedVideo.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={handleShare}
                  >
                    <Share2 size={22} color={themeColors.text} style={styles.optionIcon} />
                    <Text style={[styles.optionText, { color: themeColors.text }]}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={handleInfo}
                  >
                    <Info size={22} color={themeColors.text} style={styles.optionIcon} />
                    <Text style={[styles.optionText, { color: themeColors.text }]}>Info</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={handleDelete}
                  >
                    <Trash2 size={22} color={themeColors.error} style={styles.optionIcon} />
                    <Text style={[styles.optionText, { color: themeColors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  closeButton: {
    padding: 8,
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-around',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  closeModalButton: {
    padding: 4,
  },
  modalOptions: {
    paddingTop: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  renameModalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  renameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  renameModalBody: {
    marginBottom: 20,
  },
  renameLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  renameInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  renameHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  renameModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  renameButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  confirmButton: {
    // backgroundColor is set dynamically
  },
  renameButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    flex: 1,
    marginRight: 16,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoAllScreen; 