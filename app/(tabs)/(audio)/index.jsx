import {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {
  Animated,
  FlatList,
  View,
  Linking,
  Platform,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import {Shuffle} from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {PortalProvider} from "@gorhom/portal";

import Head from "../../../AudioComponents/title";
import ToggleBar from "../../../AudioComponents/toggleButton";
import useThemeStore from "../../../store/theme";
import useAudioStore from "../../../store/AudioHeadStore";
import AudioControl from "../../../store/AudioControls";

import All from "../../../AudioScreens/all";
import PlayList from "../../../AudioScreens/playlist";
import Albulm from "../../../AudioScreens/albums";
import Artist from "../../../AudioScreens/artist";
import History from "../../../AudioScreens/history";
import BottomPlayer from "../../../AudioComponents/BottomPlayer";

export default function App() {
  const {
    activeTab,
    index,
    toggleTabs,
    permissionGranted,
    setAudioFiles,
    audioFiles,
    setPermissionGranted,
  } = useAudioStore();

  const [loading, setLoading] = useState(true);
  const [showBottomPlayer, setShowBottomPlayer] = useState(false);
  const [heightView, setheightView] = useState(0);

  const {themeColors} = useThemeStore();
  const {width} = Dimensions.get("window");
  const listRef = useRef(null);

  const playComponentAnim = useRef(new Animated.Value(1)).current;
  const [prevScrollY, setPrevScrollY] = useState(0);

  // Request permission and load audio files
  useEffect(() => {
    const fetchData = async () => {
      const {status} = await MediaLibrary.requestPermissionsAsync();

      if (status === "granted") {
        setPermissionGranted(true);
        const files = await loadAllAudioFiles();
        setAudioFiles(files);
      } else {
        setPermissionGranted(false);
        Alert.alert(
          "Permission not granted",
          "Please grant permission to access media files."
        );
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Handle permission request if the permission is not granted
  const handlePermissionRequest = async () => {
    const {status, canAskAgain} = await MediaLibrary.requestPermissionsAsync();

    if (status === "granted") {
      setPermissionGranted(true);
      setLoading(true);
      const files = await loadAllAudioFiles();
      setAudioFiles(files);
      setLoading(false);
    } else if (!canAskAgain || status === "denied") {
      Alert.alert(
        "Permission Required",
        "Please grant media library access in settings to continue.",
        [
          {text: "Cancel", style: "cancel"},
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  const loadAllAudioFiles = async () => {
    let allAssets = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 100,
          after,
        });

        const simplifiedAssets = media.assets.map((asset) => ({
          id: asset.id,
          filename: asset.filename,
          uri: asset.uri,
          duration: asset.duration,
          album: asset.albumId,
          creationTime: asset.creationTime,
          modificationTime: asset.modificationTime,
        }));

        allAssets = [...allAssets, ...simplifiedAssets];
        hasNextPage = media.hasNextPage;
        after = media.endCursor;
      }

      return allAssets;
    } catch (error) {
      Alert.alert("Error", error.message);
      return [];
    }
  };

  const screen = useMemo(
    () => [
      {name: All, key: "All"},
      {name: PlayList, key: "Playlist"},
      {name: Albulm, key: "Album"},
      {name: Artist, key: "Artist"},
      {name: History, key: "History"},
    ],
    []
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
      position: "relative",
    },
    play: {
      position: "absolute",
      right: 20,
      backgroundColor: themeColors.primary,
      padding: 15,
      borderRadius: 50,
    },
  });

  //for the scroll tabs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (listRef.current && screen[index]) {
        listRef.current.scrollToIndex({
          index,
          animated: true,
        });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [index, screen]);

  const handleScrollFail = useCallback(
    ({index}) => {
      setTimeout(() => {
        if (listRef.current && screen[index]) {
          listRef.current.scrollToIndex({index, animated: true});
        }
      }, 300);
    },
    [screen]
  );

  const scrollTo = (index) => {
    if (!listRef.current || index >= screen.length) return;
    listRef.current.scrollToIndex({index});
  };

  const handleScroll = useCallback(
    (e) => {
      const currentY = e.nativeEvent.contentOffset.y;
      const goingDown = currentY > prevScrollY;

      Animated.timing(playComponentAnim, {
        toValue: goingDown ? 1 : 0,
        duration: 100,
        useNativeDriver: true,
      }).start();

      setPrevScrollY(currentY);
    },
    [prevScrollY, playComponentAnim]
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width]
  );

  useEffect(() => {
    AudioControl.getState().backgroundPlaySetup();
  }, []);

  const handleShuffle = () => {
    const songs = audioFiles.map((e) => {
      return {
        uri: e.uri,
      };
    });
    AudioControl.getState().setPlaylist(
      songs,
      Math.floor(Math.random() * songs.length)
    );
  };

  useEffect(() => {
    if (AudioControl.getState().status?.isPlaying || false) {
      setShowBottomPlayer(true);
    }
  }, [AudioControl.getState().status]);

  return (
    <>
      <GestureHandlerRootView style={{flex: 1}}>
        <PortalProvider>
          <Head />
          <View style={styles.container}>
            <ToggleBar activePage={activeTab} scrollTo={scrollTo} />

            <FlatList
              ref={listRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate={0.95}
              pagingEnabled
              bounces={false}
              snapToInterval={width}
              snapToAlignment="center"
              data={screen}
              renderItem={({item}) => (
                <item.name
                  width={width}
                  onScroll={handleScroll}
                  loading={loading}
                  handlePermissionRequest={handlePermissionRequest}
                  heightView={heightView}
                />
              )}
              keyExtractor={(item) => item.key}
              getItemLayout={getItemLayout}
              initialScrollIndex={index}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const currentX = e.nativeEvent.contentOffset.x;
                const newIndex = Math.floor(currentX / width);
                if (newIndex !== index && screen[newIndex]) {
                  toggleTabs(screen[newIndex].key, newIndex);
                }
              }}
              onScrollToIndexFailed={handleScrollFail}
            />

            <View>
              {permissionGranted && audioFiles.length > 0 && (
                <Animated.View
                  style={[
                    styles.play,
                    {bottom: heightView + 5},
                    {
                      transform: [
                        {
                          translateY: playComponentAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0],
                          }),
                        },
                      ],
                      opacity: playComponentAnim,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      handleShuffle();
                      AudioControl.getState().toggleShuffle();
                    }}
                    className="flex items-center justify-center"
                  >
                    <Shuffle size={30} color={"#FFF"} />
                  </TouchableOpacity>
                </Animated.View>
              )}
              {audioFiles.length > 0 &&
                permissionGranted &&
                showBottomPlayer && (
                  <BottomPlayer height={(e) => setheightView(e)} />
                )}
            </View>
          </View>
        </PortalProvider>
      </GestureHandlerRootView>
    </>
  );
}
