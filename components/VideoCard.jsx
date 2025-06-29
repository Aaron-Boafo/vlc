import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { MoreVertical } from 'lucide-react-native';
import useThemeStore from '../store/theme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 16px padding on sides, 16px gap

// Thumbnail cache to avoid regenerating thumbnails
const thumbnailCache = new Map();

const VideoCard = ({ video, onPress, onMoreOptions, onThumbnailReady }) => {
  const { themeColors } = useThemeStore();
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  // Generate a cache key based on video URI and modification time
  const getCacheKey = useCallback(() => {
    return `${video.uri}_${video.modificationTime || video.creationTime}`;
  }, [video.uri, video.modificationTime, video.creationTime]);

  // Check if thumbnail exists in cache
  const getCachedThumbnail = useCallback(async () => {
    const cacheKey = getCacheKey();
    const cachedUri = thumbnailCache.get(cacheKey);
    
    if (cachedUri) {
      // Verify the cached file still exists
      try {
        const fileInfo = await FileSystem.getInfoAsync(cachedUri);
        if (fileInfo.exists) {
          return cachedUri;
        }
      } catch (error) {
        console.warn('Cached thumbnail file not found, will regenerate');
      }
    }
    return null;
  }, [getCacheKey]);

  // Generate and cache thumbnail
  const generateThumbnail = useCallback(async () => {
    if (isLoadingThumbnail) return;
    
    setIsLoadingThumbnail(true);
    const cacheKey = getCacheKey();
    
    try {
      // Check cache first
      const cachedUri = await getCachedThumbnail();
      if (cachedUri) {
        setThumbnailUri(cachedUri);
        if (onThumbnailReady) {
          onThumbnailReady(cachedUri, video);
        }
        setIsLoadingThumbnail(false);
        return;
      }

      // Generate new thumbnail
      const { uri } = await VideoThumbnails.getThumbnailAsync(
        video.uri,
        {
          time: 1500, // 1.5 seconds into the video
          quality: 0.5
        }
      );
      
      // Cache the thumbnail
      thumbnailCache.set(cacheKey, uri);
      
      setThumbnailUri(uri);
      if (onThumbnailReady) {
        onThumbnailReady(uri, video);
      }
    } catch (e) {
      console.warn('Could not generate thumbnail for', video.filename, e);
    } finally {
      setIsLoadingThumbnail(false);
    }
  }, [video.uri, video.filename, getCacheKey, getCachedThumbnail, onThumbnailReady, isLoadingThumbnail]);

  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnail = async () => {
      if (!isMounted) return;
      
      // Check cache first
      const cachedUri = await getCachedThumbnail();
      if (cachedUri && isMounted) {
        setThumbnailUri(cachedUri);
        if (onThumbnailReady) {
          onThumbnailReady(cachedUri, video);
        }
        return;
      }
      
      // Generate thumbnail with a small delay to avoid blocking UI
      setTimeout(() => {
        if (isMounted) {
          generateThumbnail();
        }
      }, 100);
    };

    loadThumbnail();
    
    return () => {
      isMounted = false;
    };
  }, [video.uri, getCachedThumbnail, generateThumbnail]);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumbnailWrapper}>
        <View style={[styles.thumbnail, { backgroundColor: themeColors.sectionBackground }]}>
          {thumbnailUri && (
            <Image 
              source={{ uri: thumbnailUri }} 
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          )}
          {isLoadingThumbnail && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>...</Text>
            </View>
          )}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HD</Text>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={onMoreOptions}>
          <MoreVertical size={18} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {video.filename.replace(/\.mp4$/, '')}
        </Text>
        <Text style={[styles.duration, { color: themeColors.textSecondary }]}>
          {formatDuration(video.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: cardWidth,
    marginBottom: 24,
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  moreButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  infoContainer: {
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default VideoCard; 