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
import CustomAlert from '../../../components/CustomAlert';
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';

export default function VideoTabScreen() {
  const { activeTab } = useVideoStore();
  const { themeColors } = useThemeStore();
  const [showSort, setShowSort] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();

  const renderContent = () => {
    switch (activeTab) {
      case "all":
        return <VideoAllScreen showSearch={showSearch} onCloseSearch={() => setShowSearch(false)} />;
      case "playlist":
        return <VideoPlaylistScreen />;
      case "favourite":
        return <VideoFavouriteScreen />;
      case "history":
        return <VideoHistoryScreen />;
      default:
        return <VideoAllScreen />;
    }
  };

  return (
    <SafeAreaView 
      style={[styles.screen, { backgroundColor: themeColors.background }]}
      edges={['top']} // Only apply safe area to top, let bottom be handled by tab bar
    >
      <AudioHeader
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
      <CustomAlert
        visible={showSort}
        title="Sort & Filter"
        message={"(Sort/filter options go here)"}
        onClose={() => setShowSort(false)}
      />
      <MoreOptionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onSettings={() => router.push('/(tabs)/(more)/settings')}
        onAbout={() => router.push('/(tabs)/(more)/about')}
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
