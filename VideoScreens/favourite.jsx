import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import useVideoStore from '../store/VideoHeadStore';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';
import SearchBar from '../components/SearchBar';
import { VideoOff } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const VideoFavouriteScreen = ({ showSearch, setShowSearch, searchQuery, setSearchQuery }) => {
  const { favouriteVideos, setCurrentVideo, removeFromFavourites } = useVideoStore();
  const { themeColors } = useThemeStore();

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoPress = (video) => {
    setCurrentVideo(video);
    router.push('/player/video');
  };

  const handleRemoveFromFavourites = (videoId) => {
    removeFromFavourites(videoId);
  };

  // Filter favouriteVideos by searchQuery
  const filteredFavourites = useMemo(() => {
    if (!searchQuery) return favouriteVideos;
    return favouriteVideos.filter(video => (video.title || video.filename).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [favouriteVideos, searchQuery]);

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.videoItem, { backgroundColor: themeColors.card }]}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.videoThumbnail}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.artwork} />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <VideoOff size={24} color={themeColors.text} />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={[styles.durationText, { color: themeColors.background }]}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
      
      <View style={styles.videoInfo}>
        <Text 
          style={[styles.videoTitle, { color: themeColors.text }]} 
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={[styles.videoDetails, { color: themeColors.textSecondary }]}>
          {item.width}x{item.height} • {formatDuration(item.duration)}
        </Text>
        <Text style={[styles.videoDate, { color: themeColors.textSecondary }]}>
          {new Date(item.creationTime).toLocaleDateString()}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.favouriteButton}
        onPress={() => handleRemoveFromFavourites(item.id)}
      >
        <MaterialIcons 
          name="favorite" 
          size={20} 
          color={themeColors.primary} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search favourites..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery("");
            setShowSearch(false);
          }}
        />
      )}
      <FlatList
        data={filteredFavourites}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons 
              name="favorite-border" 
              size={64} 
              color={themeColors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              No favourite videos found
            </Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              Try adjusting your search
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  videoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDetails: {
    fontSize: 12,
    marginBottom: 2,
  },
  videoDate: {
    fontSize: 11,
  },
  favouriteButton: {
    padding: 8,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default VideoFavouriteScreen; 