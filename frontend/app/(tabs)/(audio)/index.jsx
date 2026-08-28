import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Animated,
    View,
    Text,
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
import { FlashList } from "@shopify/flash-list";
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
import { scanMusicFiles, extractMetadataInBackground, incrementalSync } from "../../../services/musicScanner";
import { initDB, getLastScanTime } from "../../../services/database";
import { useSongs } from "../../../hooks/useSongs";
import { useSongSearch } from "../../../hooks/useSearch";

// Import screen components
import PlaylistScreen from "../../../AudioScreens/playlist";
import Albums from "../../../AudioScreens/albums";
import ArtistScreen from "../../../AudioScreens/artist";
import FavouriteScreen from "../../../AudioScreens/favourite";

const { width, height } = Dimensions.get("window");

/**
 * Unified Audio System — powered by SQLite + AudioPlayer singleton
 * Now uses FlashList for virtualized rendering and hooks for data fetching
 */
export default function UnifiedAudioApp() {
    const { themeColors } = useThemeStore();
    const router = useRouter();
    const activeTab = useGlobalAudioStore(state => state.activeTab);
    const sortOrder = useGlobalAudioStore(state => state.sortOrder);
    const setSortOrder = useGlobalAudioStore(state => state.setSortOrder);
    const searchStates = useGlobalAudioStore(state => state.searchStates);
    const setSearchState = useGlobalAudioStore(state => state.setSearchState);
    const permissionGranted = useGlobalAudioStore(state => state.permissionGranted);
    const setPermissionGranted = useGlobalAudioStore(state => state.setPermissionGranted);
    const isLoading = useGlobalAudioStore(state => state.isLoading);
    const setLoading = useGlobalAudioStore(state => state.setLoading);
    const isInitialLoadComplete = useGlobalAudioStore(state => state.isInitialLoadComplete);
    const setInitialLoadComplete = useGlobalAudioStore(state => state.setInitialLoadComplete);

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

    // Get current tab's search state
    const currentSearchState = searchStates[activeTab] || { showSearch: false, searchQuery: '' };
    const showSearch = currentSearchState.showSearch;
    const searchQuery = currentSearchState.searchQuery;

    // Functions to update search state for current tab
    const setShowSearch = useCallback((show) => {
        setSearchState(activeTab, { showSearch: show });
    }, [activeTab, setSearchState]);

    const setSearchQuery = useCallback((query) => {
        setSearchState(activeTab, { searchQuery: query });
    }, [activeTab, setSearchState]);

    // Animations
    const playComponentAnim = useRef(new Animated.Value(1)).current;
    const [prevScrollY, setPrevScrollY] = useState(0);

    // Swipe functionality
    const scrollViewRef = useRef(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isSearchingRef = useRef(false);
    const [metadataProgress, setMetadataProgress] = useState(null);

    // ==================== DATA FETCHING HOOKS ====================
    // Main songs list (for 'all' tab)
    const {
        songs,
        loading: songsLoading,
        hasMore: songsHasMore,
        loadMore: loadMoreSongs,
        refresh: refreshSongs,
        error: songsError,
    } = useSongs({
        sort: { key: sortOrder.key, dir: sortOrder.direction.toUpperCase() },
        pageSize: 50,
        enabled: activeTab === 'all',
    });

    // Search hook for 'all' tab
    const {
        songs: searchSongs,
        loading: searchLoading,
        hasMore: searchHasMore,
        loadMore: loadMoreSearch,
        refresh: refreshSearch,
    } = useSongSearch(searchQuery, {
        pageSize: 50,
        enabled: activeTab === 'all' && showSearch && searchQuery.trim().length > 0,
    });

    // Use search results when searching, otherwise use main list
    const displaySongs = (showSearch && searchQuery.trim()) ? searchSongs : songs;
    const displayLoading = (showSearch && searchQuery.trim()) ? searchLoading : songsLoading;
    const displayHasMore = (showSearch && searchQuery.trim()) ? searchHasMore : songsHasMore;
    const displayLoadMore = (showSearch && searchQuery.trim()) ? loadMoreSearch : loadMoreSongs;

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
                console.log('📚 Database has data — hooks will load from SQLite');

                // Set permission granted
                setPermissionGranted(true);
                setInitialLoadComplete(true);
                setLoading(false);

                // Background sync: find any new files silently
                incrementalSync(
                    (progress) => {
                        console.log(`🔄 Incremental sync: +${progress.new} new, ~${progress.modified} modified, -${progress.deleted} deleted`);
                    },
                    () => {
                        // Refresh song list when new files are found
                        refreshSongs();
                    }
                );

                // Phase 2: extract metadata for any songs that don't have it yet
                extractMetadataInBackground(
                    (progress) => setMetadataProgress(progress),
                    () => {
                        // Refresh UI after each batch
                        refreshSongs();
                    }
                ).then(() => setMetadataProgress(null));

                return;
            }

            // First launch — run Phase 1 scan
            console.log('🔍 First launch — scanning device for music...');
            setLoading(true);
            const { granted, count } = await scanMusicFiles((progress) => {
                console.log(`📦 Scanned ${progress.loaded} files...`);
            });

            if (!granted) {
                setPermissionGranted(false);
                showPermissionAlert();
                setLoading(false);
                setInitialLoadComplete(true);
                return;
            }

            setPermissionGranted(true);
            setInitialLoadComplete(true);
            setLoading(false);

            console.log(`🎵 Phase 1 complete — ${count} files in SQLite`);

            // Phase 2: Extract metadata in background
            extractMetadataInBackground(
                (progress) => setMetadataProgress(progress),
                () => {
                    refreshSongs();
                }
            ).then(() => {
                setMetadataProgress(null);
                console.log('🎨 Phase 2 complete — all metadata extracted');
            });
        };

        initialize();
    }, []); // Only run once on mount

    // Background refresh when app returns to foreground
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                // Silent background sync
                setTimeout(() => {
                    incrementalSync(
                        (progress) => {
                            if (progress.new > 0 || progress.modified > 0) {
                                refreshSongs();
                            }
                        }
                    );
                }, 2000);
            }
        });

        return () => subscription.remove();
    }, []);

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
        // For shuffle, we need to get all songs - use a larger fetch
        // For now, shuffle from current displaySongs
        if (displaySongs.length === 0) return;
        const randomIndex = Math.floor(Math.random() * displaySongs.length);
        setAndPlayPlaylist(displaySongs, randomIndex, true);
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
            setSearchState(activeTab, { showSearch: show });
        },
        searchQuery: searchStates[activeTab]?.searchQuery || '',
        setSearchQuery: (query) => {
            setSearchState(activeTab, { searchQuery: query });
        },
    }), [searchStates, activeTab, setSearchState]);

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
            setSearchState(tabs[newIndex].name, {}); // This will trigger setActiveTab via the store
            useGlobalAudioStore.getState().setActiveTab(tabs[newIndex].name);
        }
    }, [screenWidth, currentIndex, setSearchState]);

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
                onPress={() => handlePlayTrack(item, displaySongs)}
                activeOpacity={0.7}
                disabled={isLoadingTrack && !isCurrentTrack}
            >
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.artwork} />
                ) : item.artwork ? (
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
    }, [currentTrack, isPlaying, isLoadingTrack, themeColors, handlePlayTrack, displaySongs]);

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
                            <FlashList
                                data={displaySongs}
                                renderItem={renderTrackItem}
                                keyExtractor={(item) => item.id}
                                onScroll={handleScroll}
                                contentContainerStyle={{ paddingBottom: isBottomPlayerVisible ? 100 : 20 }}
                                estimatedItemSize={72}
                                initialNumToRender={20}
                                maxToRenderPerBatch={10}
                                windowSize={21}
                                removeClippedSubviews={true}
                                onEndReached={displayLoadMore}
                                onEndReachedThreshold={0.3}
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
    }, [sharedSearchProps, screenWidth, handleScrollEnd, handleLayout, displaySongs, isBottomPlayerVisible, searchQuery, themeColors, renderTrackItem, handleScroll, displayLoadMore]);

    // ==================== MAIN RENDER ====================
    // Show loading only on initial load with no data
    if (isLoading && !isInitialLoadComplete) {
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
            {permissionGranted && displaySongs.length > 0 && !displayLoading && (
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