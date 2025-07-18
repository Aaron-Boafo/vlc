import useThemeStore from "../../../store/theme";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import AudioHeader from "../../../AudioComponents/title";
import VideoToggleBar from "../../../VideoComponents/toggleButton";
import useOptimizedVideoStore from "../../../store/optimizedVideoStore";
import VideoAllScreen from "../../../VideoScreens/all";
import VideoPlaylistScreen from "../../../VideoScreens/playlist";
import VideoFavouriteScreen from "../../../VideoScreens/favourite";
import VideoHistoryScreen from "../../../VideoScreens/history";
// import MiniPlayer from '../../../components/MiniPlayer';
import React, { useState, useEffect, useCallback } from 'react';
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from 'expo-router';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import SortOptionsSheet from "../../../components/SortOptionsSheet";
import ProgressiveLoadingIndicator from "../../../components/ProgressiveLoadingIndicator";
import StoreMigration from "../../../utils/storeMigration";
import AdvancedSearch from "../../../utils/advancedSearch";
import PerformanceAnalytics from "../../../utils/performanceAnalytics";
import NavigationOptimizer from "../../../utils/navigationOptimizer";
import LazyScreen from "../../../components/LazyScreen";
import ImageOptimizer from "../../../utils/imageOptimizer";
import * as Icons from 'lucide-react-native';

export default function VideoTabScreen() {
  const { 
    activeTab, 
    loadVideoFiles, 
    videoFiles, 
    isLoading,
    isInitialLoadComplete,
    sortOrder,
    sortVideoFiles,
    toggleTabs 
  } = useOptimizedVideoStore();
  const { themeColors } = useThemeStore();
  const [showSort, setShowSort] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [migrationComplete, setMigrationComplete] = useState(false);
  const router = useRouter();

  // Run migration on first load
  useEffect(() => {
    const runMigration = async () => {
      try {
        await StoreMigration.migrateVideoStore();
        setMigrationComplete(true);
      } catch (error) {
        console.error('Video migration failed:', error);
        setMigrationComplete(true); // Continue anyway
      }
    };
    runMigration();
  }, []);

  const videoSortOptions = [
    { label: 'Filename (A-Z)', key: 'filename', direction: 'asc', icon: Icons.ArrowDownAZ },
    { label: 'Filename (Z-A)', key: 'filename', direction: 'desc', icon: Icons.ArrowUpAZ },
    { label: 'Duration (Shortest)', key: 'duration', direction: 'asc', icon: Icons.Clock },
    { label: 'Duration (Longest)', key: 'duration', direction: 'desc', icon: Icons.Clock },
    { label: 'Date Added (Newest)', key: 'modificationTime', direction: 'desc', icon: Icons.CalendarClock },
    { label: 'Date Added (Oldest)', key: 'modificationTime', direction: 'asc', icon: Icons.CalendarClock },
  ];

  // Fast loading with the new optimized system
  useFocusEffect(
    useCallback(() => {
      // Only load if migration is complete and we don't have data
      if (migrationComplete && videoFiles.length === 0) {
        console.log('🚀 Loading video files with fast loader...');
        const startTime = Date.now();
        loadVideoFiles().then(() => {
          PerformanceAnalytics.trackLoadTime('VideoFiles', startTime, Date.now(), videoFiles.length);
          // 🖼️ Preload video thumbnails for better performance
          ImageOptimizer.preloadArtwork(videoFiles.slice(0, 10));
        });
      }
    }, [migrationComplete, videoFiles.length, loadVideoFiles])
  );

  // 🔍 Build search index when video files change
  useEffect(() => {
    if (videoFiles.length > 0) {
      const startTime = Date.now();
      AdvancedSearch.buildSearchIndex(videoFiles);
      PerformanceAnalytics.trackLoadTime('VideoSearchIndex', startTime, Date.now(), videoFiles.length);
      console.log('🔍 Video search index built for', videoFiles.length, 'files');
    }
  }, [videoFiles]);

  const renderMainContent = () => {
    const sharedSearchProps = {
      showSearch,
      setShowSearch,
      searchQuery,
      setSearchQuery,
    };
    
    switch (activeTab) {
      case "all":
        return (
          <LazyScreen preload={true} delay={0}>
            <VideoAllScreen {...sharedSearchProps} onCloseSearch={() => setShowSearch(false)} />
          </LazyScreen>
        );
      case "playlist":
        return (
          <LazyScreen delay={50}>
            <VideoPlaylistScreen {...sharedSearchProps} />
          </LazyScreen>
        );
      case "favourite":
        return (
          <LazyScreen delay={50}>
            <VideoFavouriteScreen {...sharedSearchProps} />
          </LazyScreen>
        );
      case "history":
        return (
          <LazyScreen delay={50}>
            <VideoHistoryScreen {...sharedSearchProps} />
          </LazyScreen>
        );
      default:
        return (
          <LazyScreen preload={true} delay={0}>
            <VideoAllScreen {...sharedSearchProps} onCloseSearch={() => setShowSearch(false)} />
          </LazyScreen>
        );
    }
  };

  const renderContent = () => {
    // Show progressive loading indicator during initial load
    if (isLoading && videoFiles.length === 0) {
      return (
        <ProgressiveLoadingIndicator
          isLoading={isLoading}
          totalFiles={0}
          loadedFiles={0}
          isComplete={false}
          mediaType="video files"
        />
      );
    }

    // Show progressive loading with content
    if (isLoading || !isInitialLoadComplete) {
      return (
        <>
          <ProgressiveLoadingIndicator
            isLoading={isLoading}
            totalFiles={videoFiles.length}
            loadedFiles={videoFiles.length}
            isComplete={isInitialLoadComplete}
            mediaType="video files"
          />
          {/* Show loaded files while still loading */}
          {videoFiles.length > 0 && renderMainContent()}
        </>
      );
    }

    // Show main content when loading is complete
    return renderMainContent();
  };

  return (
    <SafeAreaView 
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={['top']} // Only apply safe area to top, let bottom be handled by tab bar
    >
      <AudioHeader
        title="Video"
        onSearch={() => setShowSearch(s => !s)}
        onFilter={() => setShowSort(true)}
        onMore={() => setShowMore(true)}
        onRefresh={loadVideoFiles}
      />
      
      <VideoToggleBar />

      <View style={styles.contentArea}>
        {renderContent()}
      </View>

      {/* <MiniPlayer /> */}

      {/* Modals can stay here */}
      <SortOptionsSheet
        visible={showSort}
        onClose={() => setShowSort(false)}
        title="Sort Videos"
        sortOptions={videoSortOptions}
        currentSortOrder={sortOrder || { key: "filename", direction: "asc" }}
        onSort={(newSortOrder) => sortVideoFiles(newSortOrder.key, newSortOrder.direction)}
      />
      <MoreOptionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onSettings={() => router.push('/(tabs)/(more)/settings')}
        onAbout={() => router.push('/(tabs)/(more)/about')}
        onRefresh={loadVideoFiles}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center"
  },
  contentArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20, // Extra padding for Android
  }
});
