import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet, Platform, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import useAudioStore from "../../../store/AudioHeadStore";
import useThemeStore from "../../../store/theme";
import { useNavigation } from "expo-router";
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
import * as Icons from 'lucide-react-native';

const AudioTabScreen = () => {
  const { audioFiles, loadAudioFiles, isLoading, loadMetadataForFile, sortOrder, sortAudioFiles } = useAudioStore();
  const { themeColors } = useThemeStore();
  const audioControl = useAudioControl();
  const navigation = useNavigation();
  const [visibleItems, setVisibleItems] = useState([]);
  const { activeTab } = useAudioStore();
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);

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

  useEffect(() => {
    loadAudioFiles();
  }, []);

  const handleTrackPress = async (item) => {
    // Use the full playlist starting from the selected track
    const allTracks = audioFiles;
    const startIndex = allTracks.findIndex(track => track.id === item.id);
    await audioControl.setAndPlayPlaylist(allTracks, startIndex);
    navigation.navigate("(audio)/player");
  };
  
  const handleViewableItemsChanged = ({ viewableItems }) => {
    const visibleIds = viewableItems.map(item => item.item.id);
    setVisibleItems(visibleIds);
    
    // Lazy load metadata for visible items
    viewableItems.forEach(viewable => {
      if (!viewable.item.metadataLoaded) {
        loadMetadataForFile(viewable.item.id);
      }
    });
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

  const renderContent = () => {
    if (isLoading && audioFiles.length === 0) {
      return (
        <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={{ color: themeColors.text, marginTop: 16 }}>Loading music...</Text>
        </View>
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

    switch (activeTab) {
      case "all":
        return <AllScreen showSearch={showSearch} onCloseSearch={() => setShowSearch(false)} />;
      case "playlist":
        return <PlaylistScreen />;
      case "album":
        return <AlbumsScreen />;
      case "artist":
        return <ArtistScreen />;
      case "favourite":
        return <FavouriteScreen />;
      default:
        return <AllScreen showSearch={showSearch} onCloseSearch={() => setShowSearch(false)} />;
    }
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
        onSettings={() => navigation.push('(tabs)/(more)/settings')}
        onAbout={() => navigation.push('(tabs)/(more)/about')}
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
