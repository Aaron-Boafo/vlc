import useThemeStore from "../../../store/theme";
import {
  View,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import AudioHeader from "../../../AudioComponents/title";
import VideoToggleBar from "../../../VideoComponents/toggleButton";
import useOptimizedVideoStore from "../../../store/optimizedVideoStore";
import VideoAllScreen from "../../../VideoScreens/all";
import VideoPlaylistScreen from "../../../VideoScreens/playlist";
import VideoFavouriteScreen from "../../../VideoScreens/favourite";
import VideoHistoryScreen from "../../../VideoScreens/history";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import MoreOptionsMenu from "../../../components/MoreOptionsMenu";
import SortOptionsSheet from "../../../components/SortOptionsSheet";
import ProgressiveLoadingIndicator from "../../../components/ProgressiveLoadingIndicator";
import StoreMigration from "../../../utils/storeMigration";
import AdvancedSearch from "../../../utils/advancedSearch";
import PerformanceAnalytics from "../../../utils/performanceAnalytics";
import LazyScreen from "../../../components/LazyScreen";
import ImageOptimizer from "../../../utils/imageOptimizer";
import * as Icons from "lucide-react-native";

export default function VideoTabScreen() {
  const {
    activeTab,
    loadVideoFiles,
    videoFiles,
    isLoading,
    sortOrder,
    sortVideoFiles,
    toggleTabs,
  } = useOptimizedVideoStore();
  const { themeColors } = useThemeStore();
  const [showSort, setShowSort] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const router = useRouter();

  // Run migration on first load
  useEffect(() => {
    const runMigration = async () => {
      try {
        await StoreMigration.migrateVideoStore();
        setMigrationComplete(true);
      } catch (error) {
        console.error("Video migration failed:", error);
        setMigrationComplete(true); // Continue anyway
      }
    };
    runMigration();
  }, []);

  const videoSortOptions = [
    {
      label: "Filename (A-Z)",
      key: "filename",
      direction: "asc",
      icon: Icons.ArrowDownAZ,
    },
    {
      label: "Filename (Z-A)",
      key: "filename",
      direction: "desc",
      icon: Icons.ArrowUpAZ,
    },
    {
      label: "Duration (Shortest)",
      key: "duration",
      direction: "asc",
      icon: Icons.Clock,
    },
    {
      label: "Duration (Longest)",
      key: "duration",
      direction: "desc",
      icon: Icons.Clock,
    },
    {
      label: "Date Added (Newest)",
      key: "modificationTime",
      direction: "desc",
      icon: Icons.CalendarClock,
    },
    {
      label: "Date Added (Oldest)",
      key: "modificationTime",
      direction: "asc",
      icon: Icons.CalendarClock,
    },
  ];

  // Fast loading with the new optimized system
  useFocusEffect(
    useCallback(() => {
      // Only load if migration is complete and we haven't loaded yet
      if (migrationComplete && !hasInitiallyLoaded && videoFiles.length === 0) {
        console.log("🚀 Loading video files with fast loader...");
        const startTime = Date.now();
        setHasInitiallyLoaded(true); // Mark as loaded
        loadVideoFiles().then(() => {
          PerformanceAnalytics.trackLoadTime(
            "VideoFiles",
            startTime,
            Date.now(),
            videoFiles.length
          );
          // 🖼️ Preload video thumbnails for better performance
          ImageOptimizer.preloadArtwork(videoFiles.slice(0, 10));
        });
      }
    }, [
      migrationComplete,
      hasInitiallyLoaded,
      videoFiles.length,
      loadVideoFiles,
    ])
  );

  // 🔍 Build search index when video files change
  useEffect(() => {
    if (videoFiles.length > 0) {
      const startTime = Date.now();
      AdvancedSearch.buildSearchIndex(videoFiles);
      PerformanceAnalytics.trackLoadTime(
        "VideoSearchIndex",
        startTime,
        Date.now(),
        videoFiles.length
      );
      console.log(
        "🔍 Video search index built for",
        videoFiles.length,
        "files"
      );
    }
  }, [videoFiles]);

  // ScrollView ref for programmatic scrolling
  const scrollViewRef = React.useRef(null);
  const [screenWidth, setScreenWidth] = React.useState(0);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Tab configuration
  const tabs = [
    { name: "all", component: VideoAllScreen, preload: true },
    { name: "playlist", component: VideoPlaylistScreen, preload: false },
    { name: "favourite", component: VideoFavouriteScreen, preload: false },
    { name: "history", component: VideoHistoryScreen, preload: false },
  ];

  // Shared props for all screens
  const sharedSearchProps = React.useMemo(
    () => ({
      showSearch,
      setShowSearch,
      searchQuery,
      setSearchQuery,
      onCloseSearch: () => setShowSearch(false),
    }),
    [showSearch, setShowSearch, searchQuery, setSearchQuery]
  );

  // Get current tab index
  const getCurrentTabIndex = useCallback(() => {
    return tabs.findIndex((tab) => tab.name === activeTab);
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
          animated: true,
        });
      }
    }
  }, [activeTab, getCurrentTabIndex, currentIndex, screenWidth]);

  // Handle scroll end to update active tab
  const handleScrollEnd = useCallback(
    (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / screenWidth);

      if (
        newIndex !== currentIndex &&
        newIndex >= 0 &&
        newIndex < tabs.length
      ) {
        setCurrentIndex(newIndex);
        toggleTabs(tabs[newIndex].name);
      }
    },
    [screenWidth, currentIndex, toggleTabs]
  );

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
            <View
              key={tab.name}
              style={[styles.tabScreen, { width: screenWidth }]}
            >
              {tab.preload ? (
                <TabComponent {...sharedSearchProps} />
              ) : (
                <LazyScreen delay={index === currentIndex ? 0 : 50}>
                  <TabComponent {...sharedSearchProps} />
                </LazyScreen>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }, [
    sharedSearchProps,
    screenWidth,
    currentIndex,
    handleScrollEnd,
    handleLayout,
  ]);

  const renderContent = () => {
    // Show progressive loading indicator only during initial load with no files
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

    // If we have files, show them (even if still loading in background)
    if (videoFiles.length > 0) {
      return renderScrollableContent();
    }

    // Show empty state only when not loading and no files
    if (!isLoading && videoFiles.length === 0) {
      return renderScrollableContent(); // This will show the empty state in VideoAllScreen
    }

    // Default fallback - show main content
    return renderScrollableContent();
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={["top"]} // Only apply safe area to top, let bottom be handled by tab bar
    >
      <AudioHeader
        title="Video"
        onSearch={() => setShowSearch((s) => !s)}
        onFilter={() => setShowSort(true)}
        onRefresh={loadVideoFiles}
        showIcons={{ search: true, filter: true, more: false }}
      />

      <VideoToggleBar />

      <View style={styles.contentArea}>{renderContent()}</View>

      {/* <MiniPlayer /> */}

      {/* Modals can stay here */}
      <SortOptionsSheet
        visible={showSort}
        onClose={() => setShowSort(false)}
        title="Sort Videos"
        sortOptions={videoSortOptions}
        currentSortOrder={sortOrder || { key: "filename", direction: "asc" }}
        onSort={(newSortOrder) =>
          sortVideoFiles(newSortOrder.key, newSortOrder.direction)
        }
      />
      <MoreOptionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onSettings={() => router.push("/(tabs)/(more)/settings")}
        onAbout={() => router.push("/(tabs)/(more)/about")}
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
    alignItems: "center",
  },
  contentArea: {
    flex: 1,
    paddingBottom: Platform.OS === "ios" ? 0 : 20, // Extra padding for Android
  },
  scrollContainer: {
    flex: 1,
  },
  tabScreen: {
    flex: 1,
  },
});
