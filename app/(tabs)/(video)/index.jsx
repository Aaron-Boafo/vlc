import useThemeStore from "../../../store/theme";
import { View, Text, StyleSheet, Platform } from "react-native";
import AudioHeader from "../../../AudioComponents/title";
import VideoToggleBar from "../../../VideoComponents/toggleButton";
import useVideoStore from "../../../store/VideoHeadStore";
import VideoAllScreen from "../../../VideoScreens/all";
import VideoPlaylistScreen from "../../../VideoScreens/playlist";
import VideoFavouriteScreen from "../../../VideoScreens/favourite";
import VideoHistoryScreen from "../../../VideoScreens/history";
// import MiniPlayer from '../../../components/MiniPlayer';
import { useState } from 'react';
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import SortOptionsSheet from "../../../components/SortOptionsSheet";
import * as Icons from 'lucide-react-native';

export default function VideoTabScreen() {
  const { activeTab, loadVideoFiles } = useVideoStore();
  const { themeColors } = useThemeStore();
  const [showSort, setShowSort] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const videoSortOptions = [
    { label: 'Filename (A-Z)', key: 'filename', direction: 'asc', icon: Icons.ArrowDownAZ },
    { label: 'Filename (Z-A)', key: 'filename', direction: 'desc', icon: Icons.ArrowUpAZ },
    { label: 'Duration (Shortest)', key: 'duration', direction: 'asc', icon: Icons.Clock },
    { label: 'Duration (Longest)', key: 'duration', direction: 'desc', icon: Icons.Clock },
    { label: 'Date Added (Newest)', key: 'modificationTime', direction: 'desc', icon: Icons.CalendarClock },
    { label: 'Date Added (Oldest)', key: 'modificationTime', direction: 'asc', icon: Icons.CalendarClock },
  ];

  const renderContent = () => {
    const sharedSearchProps = {
      showSearch,
      setShowSearch,
      searchQuery,
      setSearchQuery,
    };
    switch (activeTab) {
      case "all":
        return <VideoAllScreen {...sharedSearchProps} onCloseSearch={() => setShowSearch(false)} />;
      case "playlist":
        return <VideoPlaylistScreen {...sharedSearchProps} />;
      case "favourite":
        return <VideoFavouriteScreen {...sharedSearchProps} />;
      case "history":
        return <VideoHistoryScreen {...sharedSearchProps} />;
      default:
        return <VideoAllScreen {...sharedSearchProps} onCloseSearch={() => setShowSearch(false)} />;
    }
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
        currentSortOrder={useVideoStore.getState().sortOrder}
        onSort={(newSortOrder) => useVideoStore.getState().sortVideoFiles(newSortOrder)}
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
