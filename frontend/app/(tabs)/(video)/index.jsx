import useThemeStore from "../../../store/theme";
import {
  View,
  StyleSheet,
  Platform,
  ScrollView,
  Text,
  AppState,
} from "react-native";
import AudioHeader from "../../../AudioComponents/title";
import VideoToggleBar from "../../../VideoComponents/toggleButton";
import useOptimizedVideoStore from "../../../store/optimizedVideoStore";
import VideoAllScreen from "../../../VideoScreens/all";
import VideoPlaylistScreen from "../../../VideoScreens/playlist";
import VideoFavouriteScreen from "../../../VideoScreens/favourite";
import VideoHistoryScreen from "../../../VideoScreens/history";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import SortOptionsSheet from "../../../components/SortOptionsSheet";
import LazyScreen from "../../../components/LazyScreen";
import * as Icons from "lucide-react-native";

// SQLite-based scanner
import { initDB, getVideoScanTime } from "../../../services/database";
import {
  scanVideoFiles,
  extractThumbnailsInBackground,
  videoBackgroundSync,
} from "../../../services/videoScanner";

export default function VideoTabScreen() {
  const {
    activeTab,
    isLoading,
    sortOrder,
    toggleTabs,
    setSortOrder,
  } = useOptimizedVideoStore();
  const { themeColors } = useThemeStore();
  const [showSort, setShowSort] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [thumbnailProgress, setThumbnailProgress] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();
  const appStateRef = useRef(AppState.currentState);

  // ─── SQLite-based initialization ──────────────────────────────
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        const lastScan = await getVideoScanTime();

        if (lastScan) {
          // Subsequent launch — load from SQLite instantly
          console.log("📹 Loading videos from SQLite...");
          setIsInitialized(true);
          setReloadKey((k) => k + 1);

          // Background sync for new files
          videoBackgroundSync(() => {
            console.log("📹 New videos found during sync, refreshing...");
            setReloadKey((k) => k + 1);
          });

          // Extract thumbnails for any remaining videos
          extractThumbnailsInBackground(
            (progress) => setThumbnailProgress(progress),
            () => setReloadKey((k) => k + 1)
          ).then(() => setThumbnailProgress(null));
        } else {
          // First launch — full scan
          console.log("📹 First launch: scanning for video files...");
          useOptimizedVideoStore.getState().setLoading(true);

          const { granted, count } = await scanVideoFiles();
          if (!granted) {
            console.warn("📹 Media library permission not granted");
            useOptimizedVideoStore.getState().setLoading(false);
            setIsInitialized(true);
            return;
          }

          console.log(`📹 Scan complete: ${count} videos found`);
          setReloadKey((k) => k + 1);
          useOptimizedVideoStore.getState().setLoading(false);
          setIsInitialized(true);

          // Start background thumbnail extraction
          extractThumbnailsInBackground(
            (progress) => setThumbnailProgress(progress),
            () => setReloadKey((k) => k + 1)
          ).then(() => setThumbnailProgress(null));
        }
      } catch (error) {
        console.error("📹 Video initialization error:", error);
        useOptimizedVideoStore.getState().setLoading(false);
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  // ─── Background sync on app foreground ────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active" &&
        isInitialized
      ) {
        console.log("📹 App foregrounded — running background sync");
        videoBackgroundSync(() => {
          setReloadKey((k) => k + 1);
        });
      }
      appStateRef.current = nextState;
    });

    return () => subscription?.remove();
  }, [isInitialized]);

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

  // Handle refresh — force re-scan
  const handleRefresh = useCallback(async () => {
    useOptimizedVideoStore.getState().setLoading(true);
    try {
      const { count } = await scanVideoFiles();
      setReloadKey((k) => k + 1);

      // Re-extract thumbnails
      extractThumbnailsInBackground(
        (progress) => setThumbnailProgress(progress),
        () => setReloadKey((k) => k + 1)
      ).then(() => setThumbnailProgress(null));
    } catch (error) {
      console.error("📹 Refresh failed:", error);
    }
    useOptimizedVideoStore.getState().setLoading(false);
  }, []);

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
      reloadKey,
    }),
    [showSearch, setShowSearch, searchQuery, setSearchQuery, reloadKey]
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
    // Show loading during initial scan with no files
    if (isLoading && reloadKey === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={{ color: themeColors.textSecondary }}>
            Scanning for videos...
          </Text>
        </View>
      );
    }

    return renderScrollableContent();
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <AudioHeader
        title="Video"
        onSearch={() => setShowSearch((s) => !s)}
        onFilter={() => setShowSort(true)}
        onRefresh={handleRefresh}
        showIcons={{ search: true, filter: true, more: false }}
      />

      <VideoToggleBar />

      {/* Thumbnail extraction progress */}
      {thumbnailProgress && (
        <View style={[styles.progressBar, { backgroundColor: themeColors.card }]}>
          <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>
            📹 Generating thumbnails: {thumbnailProgress.completed}/{thumbnailProgress.total}
          </Text>
        </View>
      )}

      <View style={styles.contentArea}>{renderContent()}</View>

      <SortOptionsSheet
        visible={showSort}
        onClose={() => setShowSort(false)}
        title="Sort Videos"
        sortOptions={videoSortOptions}
        currentSortOrder={sortOrder || { key: "filename", direction: "asc" }}
        onSort={(newSortOrder) =>
          setSortOrder(newSortOrder.key, newSortOrder.direction)
        }
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
    paddingBottom: Platform.OS === "ios" ? 0 : 20,
  },
  scrollContainer: {
    flex: 1,
  },
  tabScreen: {
    flex: 1,
  },
  progressBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
});
