import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, ScrollView, Image } from "react-native";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

const AudioTabScreen = React.memo(() => {
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

  // Prevent unnecessary reloading on tab switches
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Run migration on first load
  useEffect(() => {
    const runMigration = async () => {
      try {
        await StoreMigration.migrateAudioStore();
        setMigrationComplete(true);
      } catch (error) {
        console.error('Audio migration failed:', error);
        setMigrationComplete(true); // Continue anyway
      }
    };
    runMigration();
  }, []);

  const audioSortOptions = [
    { label: 'Title (A-Z)', key: 'title', direction: 'asc', icon: Icons.ArrowDownAZ },
    { label: 'Artist (A-Z)', key: 'artist', direction: 'asc', icon: Icons.Users },
    { label: 'Duration (Shortest first)', key: 'duration', direction: 'asc', icon: Icons.Clock },
    { label: 'Date Added (Newest first)', key: 'modificationTime', direction: 'desc', icon: Icons.CalendarClock },
  ];

  // Optimized loading - prevent unnecessary reloads on tab switches
  useFocusEffect(
    useCallback(() => {
      // Only load if migration is complete and we haven't loaded yet
      if (migrationComplete && !hasInitiallyLoaded && audioFiles.length === 0) {
        console.log('🚀 Loading audio files with fast loader...');
        const startTime = Date.now();
        setHasInitiallyLoaded(true);
        loadAudioFiles().then(() => {
          PerformanceAnalytics.trackLoadTime('AudioFiles', startTime, Date.now(), audioFiles.length);
          // Show metadata loading indicator when files are loaded
          if (audioFiles.length > 0) {
            setShowMetadataLoading(true);
          }
        });
      }
    }, [migrationComplete, hasInitiallyLoaded, audioFiles.length, loadAudioFiles])
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

  const handleTrackPress = useCallback(async (item) => {
    // Prevent multiple rapid clicks
    if (audioControl.isTransitioning || audioControl.isLoading) {
      console.log('🎵 Audio control busy, skipping track press');
      return;
    }
    
    console.log('🎵 Track pressed:', item.title);
    
    // Use the full playlist starting from the selected track
    const allTracks = audioFiles;
    const startIndex = allTracks.findIndex(track => track.id === item.id);
    
    console.log('🎵 Starting playlist with', allTracks.length, 'tracks at index', startIndex);
    
    try {
      await audioControl.setAndPlayPlaylist(allTracks, startIndex, true); // Show mini player
      console.log('🎵 Playlist set and playback started');
      
      // Use replace for smoother navigation
      router.replace("/player/audio");
    } catch (error) {
      console.error('🎵 Error starting playback:', error);
    }
  }, [audioFiles, audioControl, router]);
  
  const handleViewableItemsChanged = ({ viewableItems }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setVisibleItems(visibleIds);
    
    // Note: Metadata loading is now handled automatically in the background
    // by the fast loading system, so no manual intervention needed
  };
  
  const renderItem = useCallback(({ item }) => {
    const isPlaying = audioControl.currentTrack?.id === item.id && audioControl.isPlaying;
    const isTransitioning = audioControl.isTransitioning && audioControl.currentTrack?.id === item.id;
    const { primary, text, textSecondary, card } = themeColors;

    return (
      <TouchableOpacity
        style={[
          styles.trackItem, 
          { backgroundColor: card },
          isTransitioning && { opacity: 0.7 }
        ]}
        onPress={() => handleTrackPress(item)}
        disabled={audioControl.isTransitioning || audioControl.isLoading}
        activeOpacity={0.7}
      >
        <Image
          source={item.artwork ? { uri: item.artwork } : require('../../../assets/images/adaptive-icon.png')}
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
        {(isPlaying || isTransitioning) && (
          <View style={styles.playingIndicator}>
            <Music4 size={24} color={primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [audioControl.currentTrack?.id, audioControl.isPlaying, audioControl.isTransitioning, audioControl.isLoading, themeColors, handleTrackPress]);

  // Memoize shared props to prevent unnecessary re-renders
  const sharedProps = useMemo(() => ({ 
    showSearch, 
    searchQuery, 
    setSearchQuery, 
    setShowSearch 
  }), [showSearch, searchQuery, setSearchQuery, setShowSearch]);

  // ScrollView ref for programmatic scrolling
  const scrollViewRef = React.useRef(null);
  const [screenWidth, setScreenWidth] = React.useState(0);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Tab configuration
  const tabs = [
    { name: "all", component: AllScreen, preload: true },
    { name: "playlist", component: PlaylistScreen, preload: false },
    { name: "album", component: AlbumsScreen, preload: false },
    { name: "artist", component: ArtistScreen, preload: false },
    { name: "favourite", component: FavouriteScreen, preload: false },
  ];

  // Get current tab index
  const getCurrentTabIndex = useCallback(() => {
    return tabs.findIndex(tab => tab.name === activeTab);
  }, [activeTab]);

  // Update current index when activeTab changes
  React.useEffect(() => {
    const newIndex = getCurrentTabIndex();
    if (newIndex !== -1 && newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      // Scroll to the new tab
      if (scrollViewRef.current && screenWidth > 0) {
        scrollViewRef.current.scrollTo({
          x: newIndex * screenWidth,
          animated: true
        });
      }
    }
  }, [activeTab, getCurrentTabIndex, currentIndex, screenWidth]);

  // Handle scroll end to update active tab
  const handleScrollEnd = useCallback((event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tabs.length) {
      setCurrentIndex(newIndex);
      toggleTabs(tabs[newIndex].name);
    }
  }, [screenWidth, currentIndex, toggleTabs]);

  // Handle layout to get screen width
  const handleLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    setScreenWidth(width);
  }, []);

  const renderScrollableContent = useCallback(() => {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={handleLayout}
        scrollEventThrottle={16}
        style={styles.scrollContainer}
      >
        {tabs.map((tab, index) => {
          const TabComponent = tab.component;
          return (
            <View key={tab.name} style={[styles.tabScreen, { width: screenWidth }]}>
              {tab.preload ? (
                <TabComponent {...sharedProps} />
              ) : (
                <LazyScreen delay={index === currentIndex ? 0 : 50}>
                  <TabComponent {...sharedProps} />
                </LazyScreen>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }, [sharedProps, screenWidth, currentIndex, handleScrollEnd, handleLayout]);

  const renderContent = () => {
    // If we have files, show them immediately (even if still loading in background)
    if (audioFiles.length > 0) {
      return renderScrollableContent();
    }

    // Show progressive loading indicator only during initial load with no files
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

    // Show progressive loading with content only if actually loading
    if (isLoading && !isInitialLoadComplete) {
      return (
        <>
          <ProgressiveLoadingIndicator
            isLoading={isLoading}
            totalFiles={audioFiles.length}
            loadedFiles={audioFiles.length}
            isComplete={isInitialLoadComplete}
            mediaType="audio files"
          />
          {/* Show loaded files while still loading */}
          {audioFiles.length > 0 && renderScrollableContent()}
        </>
      );
    }

    // Metadata loading happens in background - no UI needed
  
    if (!isLoading && audioFiles.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
            <View style={[styles.iconGlow(themeColors)]}>
              <Music 
                size={64} 
                color={themeColors.primary} 
                style={styles.emptyIcon}
              />
            </View>
          </View>
          <Text style={[styles.emptyText, { color: themeColors.text }]}>
            {searchQuery ? 'No songs found' : 'No music in your library'}
          </Text>
          <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
            {searchQuery ? 'Try adjusting your search' : 'Add some music to get started'}
          </Text>
          <TouchableOpacity onPress={loadAudioFiles} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.retryButtonText}>Retry Scan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show main content when loading is complete
    return renderScrollableContent();
  };

  return (
    <SafeAreaView 
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <AudioHeader
        onSearch={() => setShowSearch(s => !s)}
        onFilter={() => setShowSort(true)}
        showIcons={{ search: true, filter: true }}
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
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    opacity: 0.9,
  },
  retryButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});

export default AudioTabScreen;
