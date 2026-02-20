import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Animated,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    Dimensions,
    AppState,
    StyleSheet,
    Image,
    ActivityIndicator,
    TextInput,
    Platform,
    Linking,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Shuffle,
    Music,
} from "lucide-react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import useThemeStore from "../../../store/theme";
import AudioHeader from "../../../AudioComponents/title";
import ToggleBar from "../../../AudioComponents/toggleButton";
import useGlobalAudioStore from "../../../store/globalAudioStore";
import useAudioControl from "../../../store/useAudioControl";
import MusicNotificationService from "../../../services/musicNotificationService";
import { scanMusicFiles, getSongsForUI, extractMetadataInBackground, backgroundSync } from "../../../services/musicScanner";
import { initDB, getLastScanTime } from "../../../services/database";

// Import screen components
import PlaylistScreen from "../../../AudioScreens/playlist";
import Albums from "../../../AudioScreens/albums";
import ArtistScreen from "../../../AudioScreens/artist";
import FavouriteScreen from "../../../AudioScreens/favourite";

const { width, height } = Dimensions.get("window");

/**
 * Unified Audio System — powered by SQLite + AudioPlayer singleton
 */
export default function UnifiedAudioApp() {
    const { themeColors } = useThemeStore();
    const router = useRouter();
    const activeTab = useGlobalAudioStore(state => state.activeTab);

    // ==================== CORE STATE ====================
    const [audioFiles, setAudioFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionGranted, setPermissionGranted] = useState(null);
    const [metadataProgress, setMetadataProgress] = useState(null); // { completed, total }

    // ==================== AUDIO CONTROL (from global store) ====================
    const {
        currentTrack,
        isPlaying,
        position,
        duration,
        isLoading: isLoadingTrack,
        isBottomPlayerVisible,
        setAndPlayPlaylist,
        play: resumeTrack,
        pause: pauseTrack,
        stop: stopTrack,
        next: nextTrack,
        previous: prevTrack,
    } = useAudioControl();

    // UI state - separate search state for each tab
    const [searchStates, setSearchStates] = useState({
        all: { showSearch: false, searchQuery: '' },
        playlist: { showSearch: false, searchQuery: '' },
        album: { showSearch: false, searchQuery: '' },
        artist: { showSearch: false, searchQuery: '' },
        favourite: { showSearch: false, searchQuery: '' },
    });

    // Get current tab's search state
    const currentSearchState = searchStates[activeTab] || { showSearch: false, searchQuery: '' };
    const showSearch = currentSearchState.showSearch;
    const searchQuery = currentSearchState.searchQuery;

    // Functions to update search state for current tab
    const setShowSearch = useCallback((show) => {
        isSearchingRef.current = true;
        setSearchStates(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                showSearch: show
            }
        }));
        setTimeout(() => {
            isSearchingRef.current = false;
        }, 100);
    }, [activeTab]);

    const setSearchQuery = useCallback((query) => {
        setSearchStates(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                searchQuery: query
            }
        }));
    }, [activeTab]);

    // Animations
    const playComponentAnim = useRef(new Animated.Value(1)).current;
    const [prevScrollY, setPrevScrollY] = useState(0);

    // Swipe functionality
    const scrollViewRef = useRef(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isSearchingRef = useRef(false);

    // ==================== INITIALIZATION (SQLite-based) ====================
    useEffect(() => {
        const initialize = async () => {
            console.log('🚀 Initializing audio app with SQLite...');

            // Step 1: Initialize music notifications
            await MusicNotificationService.initialize();

            // Step 2: Initialize the database
            await initDB();

            // Step 3: Check if we already have songs in the database
            const lastScan = await getLastScanTime();
            if (lastScan) {
                // We have scanned before — load instantly from SQLite
                console.log('📚 Loading songs from SQLite (instant)...');
                const songs = await getSongsForUI();
                setAudioFiles(songs);
                setLoading(false);
                setPermissionGranted(true);

                // Update global store for other screens
                const globalStore = useGlobalAudioStore.getState();
                globalStore.setAudioFiles(songs);

                // Background sync: find any new files silently
                backgroundSync(() => {
                    // Refresh song list when new files are found
                    getSongsForUI().then(updatedSongs => {
                        setAudioFiles(updatedSongs);
                        globalStore.setAudioFiles(updatedSongs);
                    });
                });

                // Phase 2: extract metadata for any songs that don't have it yet
                extractMetadataInBackground(
                    (progress) => setMetadataProgress(progress),
                    () => {
                        // Refresh UI after each batch
                        getSongsForUI().then(updatedSongs => {
                            setAudioFiles(updatedSongs);
                            globalStore.setAudioFiles(updatedSongs);
                        });
                    }
                ).then(() => setMetadataProgress(null));

                return;
            }

            // First launch — run Phase 1 scan
            console.log('🔍 First launch — scanning device for music...');
            const { granted, count } = await scanMusicFiles((progress) => {
                console.log(`📦 Scanned ${progress.loaded} files...`);
            });

            if (!granted) {
                setPermissionGranted(false);
                showPermissionAlert();
                return;
            }

            setPermissionGranted(true);

            // Load the fast results (basic file info, no metadata yet)
            const songs = await getSongsForUI();
            setAudioFiles(songs);
            setLoading(false);

            // Update global store
            const globalStore = useGlobalAudioStore.getState();
            globalStore.setAudioFiles(songs);

            console.log(`🎵 Phase 1 complete — ${count} files in SQLite`);

            // Phase 2: Extract metadata in background
            extractMetadataInBackground(
                (progress) => setMetadataProgress(progress),
                () => {
                    // Refresh UI after each batch
                    getSongsForUI().then(updatedSongs => {
                        setAudioFiles(updatedSongs);
                        globalStore.setAudioFiles(updatedSongs);
                    });
                }
            ).then(() => {
                setMetadataProgress(null);
                console.log('🎨 Phase 2 complete — all metadata extracted');
            });
        };

        initialize();
    }, []);

    // Background refresh when app returns to foreground
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active" && audioFiles.length > 0) {
                // Silent background sync
                setTimeout(() => {
                    backgroundSync(() => {
                        getSongsForUI().then(updatedSongs => {
                            setAudioFiles(updatedSongs);
                            const globalStore = useGlobalAudioStore.getState();
                            globalStore.setAudioFiles(updatedSongs);
                        });
                    });
                }, 2000);
            }
        });

        return () => subscription.remove();
    }, [audioFiles.length]);

    // Cleanup notifications when component unmounts
    useEffect(() => {
        return () => {
            MusicNotificationService.clearAllMusicNotifications();
        };
    }, []);

    // ==================== UI FUNCTIONS ====================
    const showPermissionAlert = () => {
        Alert.alert(
            "Permission Required",
            "Please grant media library access in settings to continue.",
            [
                { text: "Cancel", style: "cancel" },
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

    const handleScroll = useCallback((e) => {
        const currentY = e.nativeEvent.contentOffset.y;
        const goingDown = currentY > prevScrollY;

        Animated.timing(playComponentAnim, {
            toValue: goingDown ? 1 : 0,
            duration: 100,
            useNativeDriver: true,
        }).start();

        setPrevScrollY(currentY);
    }, [prevScrollY, playComponentAnim]);

    const handleShuffle = () => {
        if (audioFiles.length === 0) return;
        const randomIndex = Math.floor(Math.random() * audioFiles.length);
        // Use the global audio control store
        setAndPlayPlaylist(audioFiles, randomIndex, true);
    };

    const handlePlayTrack = useCallback((track, playlist) => {
        const index = playlist.findIndex(t => t.id === track.id);
        setAndPlayPlaylist(playlist, index >= 0 ? index : 0, true);
    }, [setAndPlayPlaylist]);

    const formatTime = (milliseconds) => {
        if (!milliseconds) return "0:00";
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // ==================== FILTERED DATA ====================
    const filteredAudioFiles = useMemo(() => {
        if (activeTab !== 'all' || !searchQuery.trim()) return audioFiles;

        const query = searchQuery.toLowerCase();
        return audioFiles.filter(file =>
            file.title?.toLowerCase().includes(query) ||
            file.artist?.toLowerCase().includes(query) ||
            file.album?.toLowerCase().includes(query)
        );
    }, [audioFiles, searchQuery, activeTab]);

    // ==================== SWIPE FUNCTIONALITY ====================
    const tabs = [
        { name: "all", label: "All" },
        { name: "playlist", label: "Playlist" },
        { name: "album", label: "Album" },
        { name: "artist", label: "Artist" },
        { name: "favourite", label: "Favourite" },
    ];

    const sharedSearchProps = useMemo(() => ({
        showSearch: searchStates[activeTab]?.showSearch || false,
        setShowSearch: (show) => {
            setSearchStates(prev => ({
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    showSearch: show
                }
            }));
        },
        searchQuery: searchStates[activeTab]?.searchQuery || '',
        setSearchQuery: (query) => {
            setSearchStates(prev => ({
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    searchQuery: query
                }
            }));
        },
    }), [searchStates, activeTab]);

    const getCurrentTabIndex = useCallback(() => {
        return tabs.findIndex((tab) => tab.name === activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (isSearchingRef.current) return;
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

    const handleScrollEnd = useCallback((event) => {
        if (isSearchingRef.current) return;
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(contentOffsetX / screenWidth);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tabs.length) {
            setCurrentIndex(newIndex);
            const globalStore = useGlobalAudioStore.getState();
            globalStore.setActiveTab(tabs[newIndex].name);
        }
    }, [screenWidth, currentIndex]);

    const handleLayout = useCallback((event) => {
        const { width } = event.nativeEvent.layout;
        setScreenWidth(width);
    }, []);

    // ==================== RENDER FUNCTIONS ====================
    const renderTrackItem = useCallback(({ item }) => {
        const isCurrentTrack = currentTrack?.id === item.id;
        const isThisTrackLoading = isLoadingTrack && isCurrentTrack;

        return (
            <TouchableOpacity
                style={[
                    styles.trackItem,
                    {
                        backgroundColor: themeColors.card,
                        opacity: isLoadingTrack && !isCurrentTrack ? 0.5 : 1
                    }
                ]}
                onPress={() => handlePlayTrack(item, filteredAudioFiles)}
                activeOpacity={0.7}
                disabled={isLoadingTrack && !isCurrentTrack}
            >
                {item.artwork ? (
                    <Image source={{ uri: item.artwork }} style={styles.artwork} />
                ) : (
                    <View style={[styles.artwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Music size={24} color={themeColors.background} />
                    </View>
                )}

                <View style={styles.trackInfo}>
                    <Text style={[styles.title, { color: isCurrentTrack ? themeColors.primary : themeColors.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.artist, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.artist}
                    </Text>
                </View>

                {isThisTrackLoading ? (
                    <ActivityIndicator size="small" color={themeColors.primary} />
                ) : isCurrentTrack && isPlaying ? (
                    <MaterialIcons name="equalizer" size={24} color={themeColors.primary} />
                ) : isCurrentTrack && !isPlaying ? (
                    <MaterialIcons name="pause" size={24} color={themeColors.primary} />
                ) : null}
            </TouchableOpacity>
        );
    }, [currentTrack, isPlaying, isLoadingTrack, themeColors, handlePlayTrack, filteredAudioFiles]);

    const renderSwipeableContent = useCallback(() => {
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
                {tabs.map((tab, index) => (
                    <View
                        key={tab.name}
                        style={[styles.tabScreen, { width: screenWidth }]}
                    >
                        {tab.name === 'all' ? (
                            <FlatList
                                data={filteredAudioFiles}
                                renderItem={renderTrackItem}
                                keyExtractor={(item) => item.id}
                                onScroll={handleScroll}
                                contentContainerStyle={{ paddingBottom: isBottomPlayerVisible ? 100 : 20 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Music size={64} color={themeColors.textSecondary} />
                                        <Text style={[styles.emptyText, { color: themeColors.text }]}>
                                            {searchQuery ? 'No songs found' : 'No music in your library'}
                                        </Text>
                                    </View>
                                }
                            />
                        ) : tab.name === 'playlist' ? (
                            <PlaylistScreen {...sharedSearchProps} />
                        ) : tab.name === 'album' ? (
                            <Albums {...sharedSearchProps} />
                        ) : tab.name === 'artist' ? (
                            <ArtistScreen {...sharedSearchProps} />
                        ) : tab.name === 'favourite' ? (
                            <FavouriteScreen {...sharedSearchProps} />
                        ) : null}
                    </View>
                ))}
            </ScrollView>
        );
    }, [sharedSearchProps, screenWidth, handleScrollEnd, handleLayout, filteredAudioFiles, isBottomPlayerVisible, searchQuery, themeColors, renderTrackItem, handleScroll]);

    // ==================== MAIN RENDER ====================
    if (loading && audioFiles.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                    <Text style={[styles.loadingText, { color: themeColors.text }]}>
                        Loading your music...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (permissionGranted === false) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
                <View style={styles.permissionContainer}>
                    <Music size={64} color={themeColors.primary} />
                    <Text style={[styles.permissionTitle, { color: themeColors.text }]}>
                        Permission Required
                    </Text>
                    <Text style={[styles.permissionText, { color: themeColors.textSecondary }]}>
                        Please grant media library access to view your music
                    </Text>
                    <TouchableOpacity
                        style={[styles.permissionButton, { backgroundColor: themeColors.primary }]}
                        onPress={showPermissionAlert}
                    >
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <AudioHeader
                onSearch={() => setShowSearch(!showSearch)}
                onFilter={() => { }}
                onMore={() => { }}
                showIcons={{ search: true, filter: false, more: false }}
            />

            {/* Toggle Bar */}
            <ToggleBar />

            {/* Metadata Loading Indicator */}
            {metadataProgress && (
                <View style={[styles.metadataProgress, { backgroundColor: themeColors.card }]}>
                    <Text style={[styles.metadataText, { color: themeColors.textSecondary }]}>
                        Loading metadata: {metadataProgress.completed}/{metadataProgress.total}
                    </Text>
                    <View style={[styles.metadataBar, { backgroundColor: themeColors.border }]}>
                        <View
                            style={[
                                styles.metadataFill,
                                {
                                    backgroundColor: themeColors.primary,
                                    width: `${(metadataProgress.completed / metadataProgress.total) * 100}%`,
                                }
                            ]}
                        />
                    </View>
                </View>
            )}

            {/* Search Bar */}
            {showSearch && (
                <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
                    <TextInput
                        style={[styles.searchInput, { color: themeColors.text }]}
                        placeholder="Search music..."
                        placeholderTextColor={themeColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            )}

            {/* Dynamic Screen Content */}
            <View style={styles.contentArea}>
                {renderSwipeableContent()}
            </View>

            {/* Floating Shuffle Button */}
            {permissionGranted && audioFiles.length > 0 && !loading && (
                <Animated.View
                    style={[
                        styles.shuffleButton,
                        {
                            backgroundColor: themeColors.primary,
                            bottom: (isBottomPlayerVisible ? 100 : 20) + 10,
                            transform: [{
                                translateY: playComponentAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [100, 0],
                                }),
                            }],
                            opacity: playComponentAnim,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={handleShuffle}>
                        <Shuffle size={30} color={themeColors.background} />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentArea: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    tabScreen: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    permissionButton: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 10,
        paddingHorizontal: 15,
    },
    searchInput: {
        paddingVertical: 12,
        fontSize: 16,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 20,
        marginVertical: 4,
        borderRadius: 12,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        marginTop: 16,
    },
    shuffleButton: {
        position: 'absolute',
        right: 20,
        padding: 15,
        borderRadius: 50,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    metadataProgress: {
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 10,
        borderRadius: 8,
    },
    metadataText: {
        fontSize: 12,
        marginBottom: 4,
    },
    metadataBar: {
        height: 3,
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    metadataFill: {
        height: '100%',
    },
});