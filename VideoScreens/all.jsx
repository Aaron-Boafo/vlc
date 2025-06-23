import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoOff } from 'lucide-react-native';
import useVideoStore from '../store/VideoHeadStore';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';
import VideoCard from '../components/VideoCard';

const VideoAllScreen = ({ showSearch, onCloseSearch }) => {
  const { videoFiles, isLoading, loadVideoFiles, setAndPlayVideo } = useVideoStore();
  const { themeColors } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideoFiles();
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

  const handleVideoPress = (video) => {
    setAndPlayVideo(video);
    setTimeout(() => {
      router.push('/(tabs)/(video)/player');
    }, 50);
  };

  const handleMoreOptions = (video) => {
    console.log('More options for video:', video);
  };

  const renderItem = useCallback(({ item }) => (
    <VideoCard
      video={item}
      onPress={() => handleVideoPress(item)}
      onMoreOptions={() => handleMoreOptions(item)}
    />
  ), [handleVideoPress, handleMoreOptions]);

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
});

export default VideoAllScreen; 