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
  
  // Performance optimization - track if screen is focused
  const [isFocused, setIsFocused] = useState(true);
  
  // Track if we've ever successfully loaded to prevent reloading when coming back from player
  const hasLoadedRef = useRef(false);

  // Run migration on first load (simplified like video)
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
    { label: 'Title (Z-A)', key: 'title', direction: 'desc', icon: Icons.ArrowUpAZ },
    { label: 'Artist (A-Z)', key: 'artist', direction: 'asc', icon: Icons.Users },
    { label: 'Artist (Z-A)', key: 'artist', direction: 'desc', icon: Icons.Users },
    { label: 'Duration (Shortest)', key: 'duration', direction: 'asc', icon: Icons.Clock },
    { label: 'Duration (Longest)', key: 'duration', direction: 'desc', icon: Icons.Clock },
    { label: 'Date Added (Newest)', key: 'modificationTime', direction: 'desc', icon: Icons.CalendarClock },
    { label: 'Date Added (Oldest)', key: 'modificationTime', direction: 'asc', icon: Icons.CalendarClock },
  ];

  // Optimized loading - prevent unnecessary reloads on tab switches (like video)
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      
      // Only load if migration is complete and we haven't loaded yet
      // Use ref to persist across navigation to prevent reloading when coming back from player
      // Also check if we already have files in the store
      if (migrationComplete && !hasInitiallyLoaded && !hasLoadedRef.current && audioFiles.length === 0) {
        console.log('🚀 Loading audio files with fast loader...');
        const startTime = Date.now();
        setHasInitiallyLoaded(true);
        hasLoadedRef.current = true; // Mark as loaded permanently
        
        loadAudioFiles().then(() => {
          PerformanceAnalytics.trackLoadTime('AudioFiles', startTime, Date.now(), audioFiles.length);
          // Show metadata loading indicator when files are loaded
          if (audioFiles.length > 0) {
            setShowMetadataLoading(true);
          }
        });
      } else if (audioFiles.length > 0 && !hasLoadedRef.current) {
        // If we already have files (from cache/persistence), mark as loaded
        console.log('⚡ Audio files already available, marking as loaded');
        setHasInitiallyLoaded(true);
        hasLoadedRef.current = true;
      }
      
      return () => {
        setIsFocused(false);
      };
    }, [migrationComplete, hasInitiallyLoaded, loadAudioFiles, audioFiles.length])
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

  // Ultra-fast scroll handling with immediate feedback
  const handleScrollEnd = useCallback((event) => {
    if (!isFocused) return; // Skip if not focused
    
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tabs.length) {
      setCurrentIndex(newIndex);
      
      // Immediate state update for instant feedback
      toggleTabs(tabs[newIndex].name);
      
      // Preload next likely tab
      const nextTabIndex = (newIndex + 1) % tabs.length;
      if (tabs[nextTabIndex]) {
        NavigationOptimizer.preloadTab(tabs[nextTabIndex].name);
      }
    }
  }, [screenWidth, currentIndex, toggleTabs, isFocused]);

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
        scrollEventThrottle={8} // Faster scroll updates
        style={styles.scrollContainer}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        // Performance optimizations
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        // Faster scrolling
        snapToInterval={screenWidth}
        snapToAlignment="start"
        directionalLockEnabled={true}
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
  
    // Show empty state only when not loading, migration complete, and no files
    if (!isLoading && migrationComplete && audioFiles.length === 0) {
      return (
        <View style={styles.centered}>
          <Music size={64} color={themeColors.textSecondary} />
          <Text style={[styles.emptyText, { color: themeColors.text }]}>No music found</Text>
          <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
            Make sure you have granted storage permissions and have music on your device.
          </Text>
          <TouchableOpacity onPress={() => loadAudioFiles(true)} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.retryButtonText}>Retry Scan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Default fallback - show main content
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
});

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
  },
  scrollContainer: {
    flex: 1,
  },
  tabScreen: {
    flex: 1,
  },
});

export default AudioTabScreen;
