import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoOff, Play, Heart, Share2, Trash2, Info, Clock, Star, Edit3 } from 'lucide-react-native';
import useVideoStore from '../store/VideoHeadStore';
import useThemeStore from '../store/theme';
import useFavouriteStore from '../store/favouriteStore';
import useHistoryStore from '../store/historyStore';
import { router } from 'expo-router';
import VideoCard from '../components/VideoCard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomAlert from '../components/CustomAlert';

const VideoAllScreen = ({ showSearch, onCloseSearch }) => {
  const { videoFiles, isLoading, loadVideoFiles, setAndPlayVideo, removeVideo, renameVideo, toggleFavouriteVideo } = useVideoStore();
  const { themeColors } = useThemeStore();
  const favouriteStore = useFavouriteStore();
  const historyStore = useHistoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const [videoThumbnails, setVideoThumbnails] = useState({});

  useEffect(() => {
    if (!videoFiles || videoFiles.length === 0) {
      loadVideoFiles();
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideoFiles();
    setRefreshing(false);
  };
  
  const filteredVideos = useMemo(() => {
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
      router.push('/(tabs)/(video)/player');
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
        router.push('/(tabs)/(video)/player');
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
      setNewFileName(selectedVideo.filename.replace(/\.mp4$/, ''));
      setShowMoreModal(false);
      setShowRenameModal(true);
    }
  };

  const handleRenameConfirm = async () => {
    if (selectedVideo && newFileName.trim()) {
      try {
        const finalFileName = newFileName.trim() + '.mp4';
        await renameVideo(selectedVideo.id, finalFileName);
        setShowRenameModal(false);
        setNewFileName('');
        Alert.alert('Success', 'Video renamed successfully.');
      } catch (error) {
        if (error.code === 'RESTRICTED_LOCATION') {
          setCustomAlert({
            visible: true,
            title: '🚫 Cannot Rename File',
            message: "This file cannot be renamed from within the app due to Android restrictions. Please use your device's file manager to rename it.",
            buttons: [{ text: 'OK', style: 'primary', onPress: () => setCustomAlert(alert => ({ ...alert, visible: false })) }],
          });
        } else {
          Alert.alert('Error', 'Failed to rename video.');
        }
      }
    } else {
      Alert.alert('Error', 'Please enter a valid file name.');
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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>
          Loading your video library...
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
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate height of each card
          offset: 200 * Math.floor(index / 2),
          index,
        })}
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
                    onPress={handleRename}
                  >
                    <Edit3 size={22} color={themeColors.text} style={styles.optionIcon} />
                    <Text style={[styles.optionText, { color: themeColors.text }]}>Rename</Text>
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

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowRenameModal(false)}
        >
          <Pressable 
            style={[styles.renameModalContent, { backgroundColor: themeColors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.renameModalHeader}>
              <Text style={[styles.renameModalTitle, { color: themeColors.text }]}>
                Rename Video
              </Text>
              <TouchableOpacity 
                onPress={() => setShowRenameModal(false)}
                style={styles.closeModalButton}
              >
                <MaterialIcons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.renameModalBody}>
              <Text style={[styles.renameLabel, { color: themeColors.text }]}>
                Enter new name:
              </Text>
              <TextInput
                style={[styles.renameInput, { 
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: themeColors.primary
                }]}
                value={newFileName}
                onChangeText={setNewFileName}
                placeholder="Enter video name"
                placeholderTextColor={themeColors.textSecondary}
                autoFocus
                maxLength={100}
              />
              <Text style={[styles.renameHint, { color: themeColors.textSecondary }]}>
                The .mp4 extension will be added automatically
              </Text>
            </View>

            <View style={styles.renameModalActions}>
              <TouchableOpacity 
                style={[styles.renameButton, styles.cancelButton]} 
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={[styles.renameButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.renameButton, styles.confirmButton, { backgroundColor: themeColors.primary }]} 
                onPress={handleRenameConfirm}
              >
                <Text style={[styles.renameButtonText, { color: themeColors.background }]}>Rename</Text>
              </TouchableOpacity>
            </View>
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
});

export default VideoAllScreen; 