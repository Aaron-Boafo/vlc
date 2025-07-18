import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, ScrollView, Image } from "react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import useOptimizedAudioStore from "../../../store/optimizedAudioStore";
import useThemeStore from "../../../store/theme";
import { useRouter, useFocusEffect } from "expo-router";
import useAudioControl from "../../../store/useAudioControl";
import { SafeAreaView } from "react-native-safe-area-context";
import { Music, Music4 } from "lucide-react-native";
import ToggleBar from "../../../AudioComponents/toggleButton";
import AudioHeader from "../../../AudioComponents/title";
import AllScreen from "../../../AudioScreens/all";
import PlaylistScreen from "../../../AudioScreens/playlist";
import AlbumsScreen from "../../../AudioScreens/albums";
import ArtistScreen from "../../../AudioScreens/artist";
import FavouriteScreen from "../../../AudioScreens/favourite";
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import SortOptionsSheet from "../../../components/SortOptionsSheet";
import ProgressiveLoadingIndicator from "../../../components/ProgressiveLoadingIndicator";
import MetadataLoadingIndicator from "../../../components/MetadataLoadingIndicator";
import StoreMigration from "../../../utils/storeMigration";
import AdvancedSearch from "../../../utils/advancedSearch";
import PerformanceAnalytics from "../../../utils/performanceAnalytics";
import NavigationOptimizer from "../../../utils/navigationOptimizer";
import LazyScreen from "../../../components/LazyScreen";
import * as Icons from 'lucide-react-native';

const AudioTabScreen = () => {
  const { 
    audioFiles, 
    loadAudioFiles, 
    isLoading, 
    isInitialLoadComplete,
    sortOrder, 
    sortAudioFiles,
    activeTab,
    toggleTabs 
  } = useOptimizedAudioStore();
  const { themeColors } = useThemeStore();
  const audioControl = useAudioControl();
  const router = useRouter();
  const [visibleItems, setVisibleItems] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showMetadataLoading, setShowMetadataLoading] = useState(false);

  // Run migration on first load
  useEffect(() => {
    const runMigration = async () => {
      try {
        await StoreMigration.migrateAudioStore();
        setMigrationComplete(true);
      } catch (error) {
        console.error('Migration failed:', error);
        setMigrationComplete(true); // Continue anyway
      }
    };
    runMigration();
  }, []);

  const audioSortOptions = [
    { label: 'Title (A-Z)', key: 'title', direction: 'asc', icon: Icons.ArrowDownAZ },
    { label: 'Title (Z-A)', key: 'title', direction: 'desc', icon: Icons.ArrowUpAZ },
    { label: 'Artist (A-Z)', key: 'artist', direction: 'asc', icon: Icons.Users },
    { label: 'Artist (Z-A)', key: 'artist', direction: 'desc', icon: Icons.Users },
    { label: 'Duration (Shortest)', key: 'duration', direction: 'asc', icon: Icons.Clock },
    { label: 'Duration (Longest)', key: 'duration', direction: 'desc', icon: Icons.Clock },
    { label: 'Date Added (Newest)', key: 'modificationTime', direction: 'desc', icon: Icons.CalendarClock },
    { label: 'Date Added (Oldest)', key: 'modificationTime', direction: 'asc', icon: Icons.CalendarClock },
  ];

  // Fast loading with the new optimized system
  useFocusEffect(
    useCallback(() => {
      // Only load if migration is complete and we don't have data
      if (migrationComplete && audioFiles.length === 0) {
        console.log('🚀 Loading audio files with fast loader...');
        const startTime = Date.now();
        loadAudioFiles().then(() => {
          PerformanceAnalytics.trackLoadTime('AudioFiles', startTime, Date.now(), audioFiles.length);
          // Show metadata loading indicator when files are loaded
          if (audioFiles.length > 0) {
            setShowMetadataLoading(true);
          }
        });
      }
    }, [migrationComplete, audioFiles.length, loadAudioFiles])
  );

  // Show metadata loading when files are initially loaded
  useEffect(() => {
    if (isInitialLoadComplete && audioFiles.length > 0 && !showMetadataLoading) {
      setShowMetadataLoading(true);
    }
  }, [isInitialLoadComplete, audioFiles.length, showMetadataLoading]);

  // 🔍 Build search index when audio files change
  useEffect(() => {
    if (audioFiles.length > 0) {
      const startTime = Date.now();
      AdvancedSearch.buildSearchIndex(audioFiles);
      PerformanceAnalytics.trackLoadTime('SearchIndex', startTime, Date.now(), audioFiles.length);
      console.log('🔍 Search index built for', audioFiles.length, 'files');
    }
  }, [audioFiles]);

  const handleTrackPress = async (item) => {
    // Use the full playlist starting from the selected track
    const allTracks = audioFiles;
    const startIndex = allTracks.findIndex(track => track.id === item.id);
    await audioControl.setAndPlayPlaylist(allTracks, startIndex);
    router.push("/player/audio");
  };
  
  const handleViewableItemsChanged = ({ viewableItems }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setVisibleItems(visibleIds);
    
    // Note: Metadata loading is now handled automatically in the background
    // by the fast loading system, so no manual intervention needed
  };
  
  const renderItem = ({ item }) => {
    const isPlaying = audioControl.currentTrack?.id === item.id && audioControl.isPlaying;
    const { primary, text, textSecondary, card } = themeColors;

    return (
      <TouchableOpacity
        style={[styles.trackItem, { backgroundColor: card }]}
        onPress={() => handleTrackPress(item)}
      >
        <Image
          source={item.artwork ? { uri: item.artwork } : require('../../../assets/images/icon.png')}
          style={styles.artwork}
        />
        <View style={styles.trackInfo}>
          <Text style={[styles.title, { color: isPlaying ? primary : text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.artist, { color: textSecondary }]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <Music4 size={24} color={primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Memoize shared props to prevent unnecessary re-renders
  const sharedProps = useMemo(() => ({ 
    showSearch, 
    searchQuery, 
    setSearchQuery, 
    setShowSearch 
  }), [showSearch, searchQuery, setSearchQuery, setShowSearch]);

  const renderMainContent = useCallback(() => {
    switch (activeTab) {
      case "all":
        return (
          <LazyScreen preload={true} delay={0}>
            <AllScreen {...sharedProps} />
          </LazyScreen>
        );
      case "playlist":
        return (
          <LazyScreen delay={50}>
            <PlaylistScreen {...sharedProps} />
          </LazyScreen>
        );
      case "album":
        return (
          <LazyScreen delay={50}>
            <AlbumsScreen {...sharedProps} />
          </LazyScreen>
        );
      case "artist":
        return (
          <LazyScreen delay={50}>
            <ArtistScreen {...sharedProps} />
          </LazyScreen>
        );
      case "favourite":
        return (
          <LazyScreen delay={50}>
            <FavouriteScreen {...sharedProps} />
          </LazyScreen>
        );
      default:
        return (
          <LazyScreen preload={true} delay={0}>
            <AllScreen {...sharedProps} />
          </LazyScreen>
        );
    }
  }, [activeTab, sharedProps]);

  const renderContent = () => {
    // Show progressive loading indicator during initial load
    if (isLoading && audioFiles.length === 0) {
      return (
        <ProgressiveLoadingIndicator
          isLoading={isLoading}
          totalFiles={0}
          loadedFiles={0}
          isComplete={false}
          mediaType="audio files"
        />
      );
    }

    // Show progressive loading with content
    if (isLoading || !isInitialLoadComplete) {
      return (
        <>
          <ProgressiveLoadingIndicator
            isLoading={isLoading}
            totalFiles={audioFiles.length}
            loadedFiles={audioFiles.length}
            isComplete={isInitialLoadComplete}
            mediaType="audio files"
          />
          {/* Show metadata loading indicator when files are loaded but metadata is processing */}
          {isInitialLoadComplete && audioFiles.length > 0 && (
            <MetadataLoadingIndicator
              visible={showMetadataLoading}
              totalFiles={audioFiles.length}
              onStatsUpdate={(stats) => {
                // Hide metadata loading when complete
                if (stats.total > 0 && (stats.successful + stats.fallback + stats.failed) >= stats.total) {
                  setShowMetadataLoading(false);
                }
              }}
            />
          )}
          {/* Show loaded files while still loading */}
          {audioFiles.length > 0 && renderMainContent()}
        </>
      );
    }
  
    if (!isLoading && audioFiles.length === 0) {
      return (
        <View style={styles.centered}>
          <Music size={64} color={themeColors.textSecondary} />
          <Text style={[styles.emptyText, { color: themeColors.text }]}>No music found</Text>
          <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
            Make sure you have granted storage permissions and have music on your device.
          </Text>
          <TouchableOpacity onPress={loadAudioFiles} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.retryButtonText}>Retry Scan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show main content when loading is complete
    return renderMainContent();
  };

  return (
    <SafeAreaView 
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <AudioHeader
        onSearch={() => setShowSearch(s => !s)}
        onFilter={() => setShowSort(true)}
        onMore={() => setShowMore(true)}
      />
      <ToggleBar />
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
      <MoreOptionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onSettings={() => router.push('/(tabs)/(more)/settings')}
        onAbout={() => router.push('/(tabs)/(more)/about')}
        onRefresh={loadAudioFiles}
      />
      <SortOptionsSheet
        visible={showSort}
        onClose={() => setShowSort(false)}
        sortOptions={audioSortOptions}
        currentSortOrder={sortOrder}
        onSort={sortAudioFiles}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  playingIndicator: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
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
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default AudioTabScreen;
