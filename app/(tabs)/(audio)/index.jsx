import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet, Platform } from "react-native";
import React, { useEffect, useState } from "react";
import useAudioStore from "../../../store/AudioHeadStore";
import useThemeStore from "../../../store/theme";
import { useNavigation } from "expo-router";
import useAudioControl from "../../../store/useAudioControl";
import { SafeAreaView } from "react-native-safe-area-context";
import { Music4 } from "lucide-react-native";
import AudioHeader from "../../../AudioComponents/title";
import ToggleBar from "../../../AudioComponents/toggleButton";
import AllScreen from "../../../AudioScreens/all";
import PlaylistScreen from "../../../AudioScreens/playlist";
import AlbumsScreen from "../../../AudioScreens/albums";
import ArtistScreen from "../../../AudioScreens/artist";
import FavouriteScreen from "../../../AudioScreens/favourite";
import CustomAlert from '../../../components/CustomAlert';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';

const AudioTabScreen = () => {
  const { audioFiles, loadAudioFiles, isLoading, loadMetadataForFile } = useAudioStore();
  const { themeColors } = useThemeStore();
  const audioControl = useAudioControl();
  const navigation = useNavigation();
  const [visibleItems, setVisibleItems] = useState([]);
  const { activeTab } = useAudioStore();
  const [showSort, setShowSort] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isMoreMenuVisible, setMoreMenuVisible] = useState(false);

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
        return <AllScreen />;
    }
  };

  if (isLoading && audioFiles.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.text }}>Loading music...</Text>
      </View>
    );
  }

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
      <CustomAlert
        visible={showSort}
        title="Sort & Filter"
        message={"(Sort/filter options go here)"}
        onClose={() => setShowSort(false)}
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
  }
});

export default AudioTabScreen;
