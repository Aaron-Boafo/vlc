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
    Modal,
    TextInput,
    Platform,
    Linking,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Shuffle,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    X,
    Music,
    Search,
    Filter,
    MoreVertical,
    Heart,
    ChevronDown
} from "lucide-react-native";
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { getAudioMetadata } from "@missingcore/audio-metadata";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import useThemeStore from "../../../store/theme";
import AudioHeader from "../../../AudioComponents/title";
import ToggleBar from "../../../AudioComponents/toggleButton";
import useGlobalAudioStore from "../../../store/globalAudioStore";
import MusicNotificationService from "../../../services/musicNotificationService";

// Import screen components (excluding AllScreen due to missing dependencies)
import PlaylistScreen from "../../../AudioScreens/playlist";
import Albums from "../../../AudioScreens/albums";
import ArtistScreen from "../../../AudioScreens/artist";
import FavouriteScreen from "../../../AudioScreens/favourite";

const { width, height } = Dimensions.get("window");
const AUDIO_FILE_CACHE = `${FileSystem.documentDirectory}unifiedAudioCache.json`;

/**
 * Unified Audio System - Everything in one file
 */
export default function UnifiedAudioApp() {
    const { themeColors } = useThemeStore();
    const router = useRouter();
    const activeTab = useGlobalAudioStore(state => state.activeTab);

    // ==================== CORE STATE ====================
    const [audioFiles, setAudioFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionGranted, setPermissionGranted] = useState(null);

    // Player state
    const [currentTrack, setCurrentTrack] = useState(null);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showBottomPlayer, setShowBottomPlayer] = useState(false);
    const [showFullPlayer, setShowFullPlayer] = useState(false);
    const [isLoadingTrack, setIsLoadingTrack] = useState(false);

    // UI state - separate search state for each tab
    const [searchStates, setSearchStates] = useState({
        all: { showSearch: false, searchQuery: '' },
        playlist: { showSearch: false, searchQuery: '' },
        album: { showSearch: false, searchQuery: '' },
        artist: { showSearch: false, searchQuery: '' },
        favourite: { showSearch: false, searchQuery: '' },
    });
    const [heightView, setHeightView] = useState(0);

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
        // Reset the flag after a short delay
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
    const bottomPlayerAnim = useRef(new Animated.Value(100)).current;
    const [prevScrollY, setPrevScrollY] = useState(0);

    // Swipe functionality (like video tab)
    const scrollViewRef = useRef(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isSearchingRef = useRef(false);

    // ==================== AUDIO LOADING ====================
    const loadAllAudioFiles = async () => {
        console.log('🎵 Loading audio files in batches...');
        let allAssets = [];
        let after = null;
        let hasNextPage = true;
        const BATCH_SIZE = 10; // Load 10 files per batch

        try {
            // Load files in batches with pagination
            while (hasNextPage) {
                console.log(`📦 Loading batch... (Total so far: ${allAssets.length})`);

                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.audio,
                    first: BATCH_SIZE,
                    after: after, // Pagination cursor
                });

                console.log(`📱 Found ${media.assets.length} audio files in this batch`);

                // Filter out unwanted files 
                const excludedFolders = [
                    '/WhatsApp/Media/WhatsApp Audio/Sent',
                    '/WhatsApp/Media/WhatsApp Audio/Private',
                    '/WhatsApp/Media/WhatsApp Voice Notes',
                    '/WhatsApp/Media/.Statuses',
                    '/WhatsApp/Private',
                    '/Telegram',
                    '/Instagram',
                    '/Snapchat',
                    '/.nomedia',
                    '/Android/data',
                    '/system/',
                    '/cache/',
                ];

                const filtered = media.assets.filter(asset => {
                    return !excludedFolders.some(folder => asset.uri.includes(folder));
                });

                console.log(`🔍 Filtered to ${filtered.length} audio files in this batch`);

                // Process files with metadata in smaller chunks to avoid memory issues
                const batchAssets = await Promise.all(
                    filtered.map(async (asset) => {
                        try {
                            const data = await getAudioMetadata(asset.uri, [
                                "album", "artist", "name", "year", "artwork"
                            ]);
                            const metadata = data.metadata || {};

                            // Handle artwork
                            let artworkUri = null;
                            if (metadata.artwork) {
                                if (metadata.artwork.startsWith('data:image')) {
                                    artworkUri = metadata.artwork;
                                } else if (/^[A-Za-z0-9+/=]+$/.test(metadata.artwork)) {
                                    artworkUri = `data:image/png;base64,${metadata.artwork}`;
                                } else {
                                    artworkUri = metadata.artwork;
                                }
                            }

                            return {
                                id: asset.id,
                                uri: asset.uri,
                                filename: asset.filename,
                                duration: asset.duration,
                                album: metadata.album || "Unknown Album",
                                artist: metadata.artist || "Unknown Artist",
                                title: metadata.name || asset.filename.replace(/\.[^/.]+$/, ""),
                                year: metadata.year || null,
                                artwork: artworkUri,
                                creationTime: asset.creationTime,
                                modificationTime: asset.modificationTime,
                            };
                        } catch {
                            return {
                                id: asset.id,
                                uri: asset.uri,
                                filename: asset.filename,
                                duration: asset.duration,
                                album: "Unknown Album",
                                artist: "Unknown Artist",
                                title: asset.filename.replace(/\.[^/.]+$/, ""),
                                year: null,
                                artwork: null,
                                creationTime: asset.creationTime,
                                modificationTime: asset.modificationTime,
                            };
                        }
                    })
                );

                const validAssets = batchAssets.filter(a => a !== null);
                allAssets = [...allAssets, ...validAssets]; // Accumulate all batches

                // Update UI progressively with each batch
                const sortedAssets = allAssets.sort((a, b) => a.title.localeCompare(b.title));
                setAudioFiles(sortedAssets);

                // Update global store progressively
                const globalStore = useGlobalAudioStore.getState();
                globalStore.setAudioFiles(sortedAssets);

                console.log(`✅ Processed batch. Total files: ${allAssets.length}`);

                // Check if there are more files to load
                hasNextPage = media.hasNextPage;
                after = media.endCursor;

                // Small delay to keep UI responsive
                if (hasNextPage) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Final sort and update
            const finalSortedAssets = allAssets.sort((a, b) => a.title.localeCompare(b.title));
            setAudioFiles(finalSortedAssets);
            setLoading(false);

            // Final update to global store
            const globalStore = useGlobalAudioStore.getState();
            globalStore.setAudioFiles(finalSortedAssets);

            console.log(`🎵 Completed loading ${allAssets.length} audio files in total`);

        } catch (err) {
            console.error('❌ Audio loading failed:', err);
            Alert.alert("Error", err.message);
            setLoading(false);
        }

        return allAssets;
    };

    // ==================== CACHE MANAGEMENT ====================
    const saveAudioFilesToCache = async (data) => {
        try {
            await FileSystem.writeAsStringAsync(AUDIO_FILE_CACHE, JSON.stringify(data));
            console.log(`💾 Cached ${data.length} files`);
        } catch (error) {
            console.log('Cache save error:', error);
        }
    };

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

    // ==================== INITIALIZATION  ====================
    useEffect(() => {
        const initialize = async () => {
            console.log('🚀 Initializing unified audio app...');

            // Step 1: Initialize music notifications
            await MusicNotificationService.initialize();

            // Step 2: Load from cache first (instant UI)
            const cached = await loadAudioFilesFromCache();
            if (cached && cached.length > 0) {
                console.log(`📚 Loaded ${cached.length} files from cache`);
                setAudioFiles(cached);
                setLoading(false);
            }

            // Step 3: Check permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                setPermissionGranted(false);
                showPermissionAlert();
                return;
            }

            setPermissionGranted(true);

            // Step 4: Load fresh files and cache them
            const freshFiles = await loadAllAudioFiles();
            await saveAudioFilesToCache(freshFiles);
        };

        initialize();
    }, []);

    // Background refresh and notification management
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                // Only refresh if we have files and it's been a while
                if (audioFiles.length > 0) {
                    setTimeout(() => {
                        console.log('🔄 Background refresh...');
                        // Light refresh logic here if needed
                    }, 2000);
                }
            } else if (state === "background" || state === "inactive") {
                // App going to background - notification should persist
                console.log('📱 App going to background - notification will persist');
            }
        });

        return () => subscription.remove();
    }, [audioFiles]);

    // Cleanup notifications when component unmounts
    useEffect(() => {
        return () => {
            // Clear notifications when app is closed
            MusicNotificationService.clearAllMusicNotifications();
        };
    }, []);

    // Show bottom player when audio is playing (like your friend's approach)
    useEffect(() => {
        if (isPlaying && currentTrack) {
            setShowBottomPlayer(true);
            // Update notification with current track info
            MusicNotificationService.updateMusicNotification(currentTrack);
        }
    }, [isPlaying, currentTrack]);

    // ==================== AUDIO PLAYER FUNCTIONS ====================
    const playTrack = async (track, playlist = null) => {
        try {
            // Prevent multiple simultaneous audio loading
            if (isLoadingTrack) {
                console.log('⚠️ Already loading a track, ignoring request');
                return;
            }

            // If same track is already playing, just toggle play/pause
            if (currentTrack?.id === track.id && sound) {
                if (isPlaying) {
                    await pauseTrack();
                } else {
                    await resumeTrack();
                }
                return;
            }

            setIsLoadingTrack(true);
            console.log('🎵 Playing track:', track.title);

            // Stop current sound if playing (ensure only one audio plays)
            if (sound) {
                console.log('🛑 Stopping current track to play new one');
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
            }

            // Setup audio mode
            await Audio.setAudioModeAsync({
                staysActiveInBackground: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Create and play new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: track.uri },
                { shouldPlay: true, volume: 1.0 },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setCurrentTrack(track);
            setIsPlaying(true);
            setShowBottomPlayer(true);
            setIsLoadingTrack(false);

            // Show music notification
            await MusicNotificationService.showMusicNotification(track);

            // Animate bottom player in
            Animated.spring(bottomPlayerAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }).start();

        } catch (error) {
            console.error('❌ Error playing track:', error);
            setIsLoadingTrack(false); // Reset loading state on error
            Alert.alert('Error', 'Could not play this track');
        }
    };

    const pauseTrack = async () => {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    const resumeTrack = async () => {
        if (sound) {
            await sound.playAsync();
            setIsPlaying(true);
        }
    };

    const stopTrack = async () => {
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
        }
        setCurrentTrack(null);
        setIsPlaying(false);
        setShowBottomPlayer(false);
        setPosition(0);
        setDuration(0);
        setIsLoadingTrack(false); // Reset loading state

        // Hide music notification
        await MusicNotificationService.hideMusicNotification();

        // Animate bottom player out
        Animated.spring(bottomPlayerAnim, {
            toValue: 100,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                // Auto play next track or stop
                setIsPlaying(false);
            }
        }
    };

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

        const randomTrack = audioFiles[Math.floor(Math.random() * audioFiles.length)];
        playTrack(randomTrack, audioFiles);
    };

    const formatTime = (milliseconds) => {
        if (!milliseconds) return "0:00";
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // ==================== FILTERED DATA ====================
    const filteredAudioFiles = useMemo(() => {
        // Only filter for 'all' tab, other tabs handle their own filtering
        if (activeTab !== 'all' || !searchQuery.trim()) return audioFiles;

        const query = searchQuery.toLowerCase();
        return audioFiles.filter(file =>
            file.title?.toLowerCase().includes(query) ||
            file.artist?.toLowerCase().includes(query) ||
            file.album?.toLowerCase().includes(query)
        );
    }, [audioFiles, searchQuery, activeTab]);

    // ==================== SWIPE FUNCTIONALITY ====================
    // Tab configuration (like video tab)
    const tabs = [
        { name: "all", label: "All" },
        { name: "playlist", label: "Playlist" },
        { name: "album", label: "Album" },
        { name: "artist", label: "Artist" },
        { name: "favourite", label: "Favourite" },
    ];

    // Shared props for all screens - tab-specific search state
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

    // Get current tab index
    const getCurrentTabIndex = useCallback(() => {
        return tabs.findIndex((tab) => tab.name === activeTab);
    }, [activeTab]);

    // Update current index when activeTab changes (but not when search changes)
    useEffect(() => {
        // Don't update scroll position if we're in the middle of a search operation
        if (isSearchingRef.current) return;

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
    const handleScrollEnd = useCallback((event) => {
        // Don't handle scroll events if we're in the middle of a search operation
        if (isSearchingRef.current) return;

        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(contentOffsetX / screenWidth);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tabs.length) {
            setCurrentIndex(newIndex);
            const globalStore = useGlobalAudioStore.getState();
            globalStore.setActiveTab(tabs[newIndex].name);
        }
    }, [screenWidth, currentIndex]);

    // Handle layout to get screen width
    const handleLayout = useCallback((event) => {
        const { width } = event.nativeEvent.layout;
        setScreenWidth(width);
    }, []);

    // Render swipeable content
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
                                contentContainerStyle={{ paddingBottom: showBottomPlayer ? 100 : 20 }}
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
    }, [sharedSearchProps, screenWidth, handleScrollEnd, handleLayout, filteredAudioFiles, showBottomPlayer, searchQuery, themeColors]);

    // ==================== SCREEN RENDERER ====================
    const renderActiveScreen = () => {
        const screenProps = {
            showSearch,
            searchQuery,
            setSearchQuery,
            setShowSearch
        };

        switch (activeTab) {
            case 'all':
                return (
                    <FlatList
                        data={filteredAudioFiles}
                        renderItem={renderTrackItem}
                        keyExtractor={(item) => item.id}
                        onScroll={handleScroll}
                        contentContainerStyle={{ paddingBottom: showBottomPlayer ? 100 : 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Music size={64} color={themeColors.textSecondary} />
                                <Text style={[styles.emptyText, { color: themeColors.text }]}>
                                    {searchQuery ? 'No songs found' : 'No music in your library'}
                                </Text>
                            </View>
                        }
                    />
                );
            case 'playlist':
                return <PlaylistScreen {...screenProps} />;
            case 'album':
                return <Albums {...screenProps} />;
            case 'artist':
                return <ArtistScreen {...screenProps} />;
            case 'favourite':
                return <FavouriteScreen {...screenProps} />;
            default:
                return (
                    <FlatList
                        data={filteredAudioFiles}

                        renderItem={renderTrackItem}
                        keyExtractor={(item) => item.id}
                        onScroll={handleScroll}
                        contentContainerStyle={{ paddingBottom: showBottomPlayer ? 100 : 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Music size={64} color={themeColors.textSecondary} />
                                <Text style={[styles.emptyText, { color: themeColors.text }]}>
                                    {searchQuery ? 'No songs found' : 'No music in your library'}
                                </Text>
                            </View>
                        }
                    />
                );
        }
    };
    // ==================== RENDER FUNCTIONS ====================
    const renderTrackItem = ({ item }) => {
        const isCurrentTrack = currentTrack?.id === item.id;
        const isThisTrackLoading = isLoadingTrack && isCurrentTrack;

        return (
            <TouchableOpacity
                style={[
                    styles.trackItem,
                    {
                        backgroundColor: themeColors.card,
                        opacity: isLoadingTrack && !isCurrentTrack ? 0.5 : 1 // Dim other tracks when loading
                    }
                ]}
                onPress={() => playTrack(item, filteredAudioFiles)}
                activeOpacity={0.7}
                disabled={isLoadingTrack && !isCurrentTrack} // Disable other tracks when loading
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

                {/* Show loading indicator for the track being loaded */}
                {isThisTrackLoading ? (
                    <ActivityIndicator size="small" color={themeColors.primary} />
                ) : isCurrentTrack && isPlaying ? (
                    <MaterialIcons name="equalizer" size={24} color={themeColors.primary} />
                ) : isCurrentTrack && !isPlaying ? (
                    <MaterialIcons name="pause" size={24} color={themeColors.primary} />
                ) : null}
            </TouchableOpacity>
        );
    };

    const renderBottomPlayer = () => {
        if (!currentTrack || !showBottomPlayer) return null;

        return (
            <Animated.View
                style={[
                    styles.bottomPlayer,
                    {
                        backgroundColor: themeColors.background,
                        borderTopColor: themeColors.primary,
                        transform: [{ translateY: bottomPlayerAnim }],
                    }
                ]}
            >
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                backgroundColor: themeColors.primary,
                                width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                            }
                        ]}
                    />
                </View>

                {/* Player Content */}
                <TouchableOpacity
                    style={styles.bottomPlayerContent}
                    onPress={() => {
                        console.log('🎵 Opening full player...');
                        setShowFullPlayer(true);
                    }}
                    activeOpacity={0.9}
                >
                    {currentTrack.artwork ? (
                        <Image source={{ uri: currentTrack.artwork }} style={styles.bottomArtwork} />
                    ) : (
                        <View style={[styles.bottomArtwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Music size={20} color={themeColors.background} />
                        </View>
                    )}

                    <View style={styles.bottomTrackInfo}>
                        <Text style={[styles.bottomTitle, { color: themeColors.text }]} numberOfLines={1}>
                            {currentTrack.title}
                        </Text>
                        <Text style={[styles.bottomArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {currentTrack.artist}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.bottomPlayButton}
                        onPress={isPlaying ? pauseTrack : resumeTrack}
                    >
                        <MaterialIcons
                            name={isPlaying ? "pause" : "play-arrow"}
                            size={28}
                            color={themeColors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.bottomCloseButton} onPress={stopTrack}>
                        <X size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderFullPlayer = () => {
        console.log('🎵 Full player render - visible:', showFullPlayer, 'currentTrack:', currentTrack?.title);
        return (
            <Modal
                visible={showFullPlayer}
                animationType="slide"
                onRequestClose={() => setShowFullPlayer(false)}
            >
                <SafeAreaView style={[styles.fullPlayer, { backgroundColor: themeColors.background }]}>
                    {/* Header */}
                    <View style={styles.fullPlayerHeader}>
                        <TouchableOpacity onPress={() => setShowFullPlayer(false)}>
                            <ChevronDown size={28} color={themeColors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.fullPlayerTitle, { color: themeColors.text }]}>Now Playing</Text>
                        <TouchableOpacity>
                            <MoreVertical size={28} color={themeColors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Artwork */}
                    <View style={styles.fullPlayerArtwork}>
                        {currentTrack?.artwork ? (
                            <Image source={{ uri: currentTrack.artwork }} style={styles.largeArtwork} />
                        ) : (
                            <View style={[styles.largeArtwork, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                <Music size={80} color={themeColors.background} />
                            </View>
                        )}
                    </View>

                    {/* Track Info */}
                    <View style={styles.fullPlayerInfo}>
                        <Text style={[styles.fullPlayerTrackTitle, { color: themeColors.text }]} numberOfLines={2}>
                            {currentTrack?.title}
                        </Text>
                        <Text style={[styles.fullPlayerArtist, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {currentTrack?.artist}
                        </Text>
                    </View>

                    {/* Progress */}
                    <View style={styles.fullPlayerProgress}>
                        <View style={styles.progressSlider}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        backgroundColor: themeColors.primary,
                                        width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                                    }
                                ]}
                            />
                        </View>
                        <View style={styles.timeContainer}>
                            <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
                                {formatTime(position)}
                            </Text>
                            <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
                                {formatTime(duration)}
                            </Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.fullPlayerControls}>
                        <TouchableOpacity style={styles.controlButton}>
                            <SkipBack size={32} color={themeColors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.playButton, { backgroundColor: themeColors.primary }]}
                            onPress={isPlaying ? pauseTrack : resumeTrack}
                        >
                            <MaterialIcons
                                name={isPlaying ? "pause" : "play-arrow"}
                                size={48}
                                color={themeColors.background}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton}>
                            <SkipForward size={32} color={themeColors.text} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    };

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
                onFilter={() => { }} // Placeholder for future filter functionality
                onMore={() => { }} // Placeholder for future more options
                showIcons={{ search: true, filter: false, more: false }}
            />

            {/* Toggle Bar */}
            <ToggleBar />

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
                            bottom: (showBottomPlayer ? 100 : 20) + 10,
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

            {/* Bottom Player */}
            {renderBottomPlayer()}

            {/* Full Player Modal */}
            {renderFullPlayer()}
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
        color: '#fff', // Keep white for contrast on primary button
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15,
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
    bottomPlayer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    progressContainer: {
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    progressBar: {
        height: '100%',
    },
    bottomPlayerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    bottomArtwork: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    bottomTrackInfo: {
        flex: 1,
        marginLeft: 12,
    },
    bottomTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    bottomArtist: {
        fontSize: 13,
        marginTop: 2,
    },
    bottomPlayButton: {
        padding: 8,
        marginRight: 8,
    },
    bottomCloseButton: {
        padding: 8,
    },
    fullPlayer: {
        flex: 1,
    },
    fullPlayerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    fullPlayerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    fullPlayerArtwork: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    largeArtwork: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 20,
    },
    fullPlayerInfo: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    fullPlayerTrackTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    fullPlayerArtist: {
        fontSize: 18,
        textAlign: 'center',
    },
    fullPlayerProgress: {
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    progressSlider: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        fontSize: 12,
    },
    fullPlayerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 40,
        gap: 40,
    },
    controlButton: {
        padding: 10,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});