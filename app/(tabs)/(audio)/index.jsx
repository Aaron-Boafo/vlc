import {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {
  Animated,
  View,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import {Shuffle} from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {PortalProvider} from "@gorhom/portal";
import Swiper from "react-native-swiper";
import {getAudioMetadata} from "@missingcore/audio-metadata";

import Head from "../../../AudioComponents/titleBar";
import NavigationTab from "../../../AudioComponents/navigationTab";
import useThemeStore from "../../../store/useThemeStore";
import useAudioStore from "../../../store/useAudioStore";
import AudioControl from "../../../store/useAudioControl";
import All from "../../../AudioScreens/allScreen";
import PlayList from "../../../AudioScreens/playlistScreen";
import Album from "../../../AudioScreens/albumScreen";
import Artist from "../../../AudioScreens/artistScreen";
import History from "../../../AudioScreens/historyScreen";
import Bottomplayer from "../../../AudioComponents/bottomPlayer";

export default function App() {
  const {
    permissionGranted,
    setAudioFiles,
    audioFiles,
    setPermissionGranted,
    setInitialAudioFiles,
  } = useAudioStore();
  const {themeColors} = useThemeStore();
  const {width} = Dimensions.get("window");
  const swiperRef = useRef(null);
  const playComponentAnim = useRef(new Animated.Value(1)).current;

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBottomPlayer, setShowBottomPlayer] = useState(false);
  const [heightView, setHeightView] = useState(0);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const screens = useMemo(() => [All, PlayList, Album, Artist, History], []);
  const AUDIO_FILE_CACHE = `${FileSystem.documentDirectory}audioFilesCache.json`;

  useEffect(() => {
    const initialize = async () => {
      const cached = await loadAudioFilesFromCache();
      console.log(cached);
      if (cached) {
        setInitialAudioFiles(cached);
        setLoading(false);
      }

      const {status} = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setPermissionGranted(false);
        showPermissionAlert();
        return;
      }

      setPermissionGranted(true);
      const freshFiles = await loadAllAudioFiles();

      console.log(freshFiles);
      await saveAudioFilesToCache(freshFiles);
      setLoading(false);
    };

    initialize();
  }, []);

  const loadAllAudioFiles = async () => {
    let after = null;
    let hasNextPage = true;
    let allAssets = [];

    try {
      while (hasNextPage) {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 10,
          after,
        });

        const batchAssets = await Promise.all(
          media.assets.map(async (asset) => {
            let metadata = {};
            try {
              const data = await getAudioMetadata(asset.uri, [
                "album",
                "artist",
                "name",
                "year",
                "artwork",
              ]);
              metadata = data.metadata || {};
            } catch {
              metadata = {};
            }

            return {
              id: asset.id,
              uri: asset.uri,
              filename: asset.filename,
              duration: asset.duration,
              album: metadata.album ?? "Unknown",
              artist: metadata.artist ?? "Unknown",
              title: metadata.name ?? asset.filename,
              year: metadata.year ?? null,
              artwork: metadata.artwork ?? null,
              creationTime: asset.creationTime,
              modificationTime: asset.modificationTime,
            };
          })
        );

        allAssets = [...allAssets, ...batchAssets];

        // Append to existing audioFiles in Zustand store
        setAudioFiles(batchAssets);

        // Allow user to see files as they're being fetched
        if (loading) {
          setLoading(false);
        }

        hasNextPage = media.hasNextPage;
        after = media.endCursor;
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }

    return allAssets;
  };

  // save audio files to cache
  const saveAudioFilesToCache = async (data) => {
    try {
      await FileSystem.writeAsStringAsync(
        AUDIO_FILE_CACHE,
        JSON.stringify(data)
      );
    } catch (error) {
      console.log(error);
    }
  };

  // load audio files from cache
  const loadAudioFilesFromCache = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(AUDIO_FILE_CACHE);
      if (!fileInfo.exists) return null;

      const json = await FileSystem.readAsStringAsync(AUDIO_FILE_CACHE);
      if (!json || json.trim().length === 0) return null;

      return JSON.parse(json);
    } catch (error) {
      console.log("Cache load error:", error);
      return null;
    }
  };

  const showPermissionAlert = () => {
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
  };

  const onTabPress = (index) => {
    swiperRef.current.scrollBy(index - activeTab);
    setActiveTab(index);
  };

  const onIndexChanged = (index) => {
    setActiveTab(index);
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

  const handleShuffle = () => {
    const songs = audioFiles.map((e) => ({uri: e.uri}));
    AudioControl.getState().setPlaylist(
      songs,
      Math.floor(Math.random() * songs.length)
    );
  };

  //making sure the state has
  const status = AudioControl.getState()?.status;

  useEffect(() => {
    if (AudioControl.getState().status?.isPlaying || false) {
      setShowBottomPlayer(true);
    }
  }, [status]);

  const handlePermissionRequest = async () => {
    setLoading(true);
    const {status} = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      showPermissionAlert();
    }
    setLoading(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    play: {
      position: "absolute",
      right: 20,
      backgroundColor: themeColors.primary,
      padding: 15,
      borderRadius: 50,
    },
  });

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <PortalProvider>
        <Head />
        <View style={styles.container}>
          <NavigationTab
            activePage={activeTab}
            scrollTo={onTabPress}
            setIndex={setActiveTab}
          />
          <Swiper
            ref={swiperRef}
            loop={false}
            onIndexChanged={onIndexChanged}
            showsPagination={false}
          >
            {screens.map((Screen, index) => (
              <Screen
                key={index}
                handlePermissionRequest={handlePermissionRequest}
                width={width}
                onScroll={handleScroll}
                loading={loading}
                audioFiles={audioFiles}
              />
            ))}
          </Swiper>

          {permissionGranted && audioFiles.length > 0 && !loading && (
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
              <TouchableOpacity onPress={handleShuffle}>
                <Shuffle size={30} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {audioFiles.length > 0 &&
            permissionGranted &&
            showBottomPlayer &&
            !loading && <Bottomplayer height={(e) => setHeightView(e)} />}
        </View>
      </PortalProvider>
    </GestureHandlerRootView>
  );
}
