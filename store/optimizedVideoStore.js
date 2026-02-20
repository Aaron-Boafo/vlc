import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

const useOptimizedVideoStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Core state
        videoFiles: [],
        isLoading: false,
        isInitialLoadComplete: false,
        lastLoadTime: null,
        activeTab: "all",
        sortOrder: { key: "filename", direction: "asc" },

        // Video-specific state
        favouriteVideos: [],
        videoHistory: [],
        videoPlaylists: [],
        currentVideo: null,
        currentVideoIndex: -1,

        // Mini player state
        isMiniPlayerVisible: false,
        isMiniPlayerPlaying: false,
        miniPlayerPosition: 0,
        miniPlayerVideo: null,

        // Navigation context tracking
        sourceTab: null, // Track which tab the user came from

        // Set video files (called by videoScanner)
        setVideoFiles: (files) => {
          set({
            videoFiles: files,
            isLoading: false,
            isInitialLoadComplete: true,
            lastLoadTime: Date.now(),
          });
        },

        // Set loading state (used during scanning)
        setLoading: (loading) => set({ isLoading: loading }),

        // Optimized sorting
        sortVideoFiles: (key, direction) => {
          const files = get().videoFiles;
          const sortedFiles = [...files].sort((a, b) => {
            const valA = a[key] || "";
            const valB = b[key] || "";

            if (key === "filename") {
              return direction === "asc"
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
            }
            return direction === "asc" ? valA - valB : valB - valA;
          });

          set({ videoFiles: sortedFiles, sortOrder: { key, direction } });
        },

        // Tab management
        toggleTabs: (tab) => set({ activeTab: tab }),

        // Video playback management
        setAndPlayVideo: (video, sourceTab = null) => {
          // Validate input
          if (!video || !video.uri) {
            console.error("Invalid video provided to setAndPlayVideo:", video);
            return;
          }

          console.log("🎥 setAndPlayVideo called with:", {
            video: video,
            hasUri: !!video?.uri,
            uri: video?.uri,
            filename: video?.filename,
            sourceTab: sourceTab,
          });

          const videoFiles = get().videoFiles || [];
          const index = videoFiles.findIndex((v) => v.id === video.id);

          set({
            currentVideo: video,
            currentVideoIndex: index,
            isMiniPlayerVisible: false,
            sourceTab: sourceTab, // Store the source tab
          });

          console.log(
            "🎥 Video store updated. Current video:",
            get().currentVideo,
            "Source tab:",
            sourceTab
          );

          // Add to history
          get().addToHistory(video);
        },

        setCurrentVideo: (video) => {
          const videoFiles = get().videoFiles || [];
          const index = videoFiles.findIndex((v) => v.id === video.id);
          set({
            currentVideo: video,
            currentVideoIndex: index,
          });
        },

        // Favorites management
        toggleFavouriteVideo: (video) => {
          set((state) => {
            const isFavourite = state.favouriteVideos.some(
              (v) => v.id === video.id
            );
            if (isFavourite) {
              return {
                favouriteVideos: state.favouriteVideos.filter(
                  (v) => v.id !== video.id
                ),
              };
            } else {
              return {
                favouriteVideos: [...state.favouriteVideos, video],
              };
            }
          });
        },

        addToFavourites: (video) => {
          set((state) => ({
            favouriteVideos: [
              ...state.favouriteVideos.filter((v) => v.id !== video.id),
              video,
            ],
          }));
        },

        removeFromFavourites: (videoId) => {
          set((state) => ({
            favouriteVideos: state.favouriteVideos.filter(
              (v) => v.id !== videoId
            ),
          }));
        },

        // History management
        addToHistory: (video) => {
          set((state) => ({
            videoHistory: [
              {
                ...video,
                playedAt: Date.now(), // Add timestamp for when video was actually played
              },
              ...state.videoHistory.filter((v) => v.id !== video.id),
            ].slice(0, 100), // Keep only last 100 items
          }));
        },

        removeFromHistory: (videoId) => {
          set((state) => ({
            videoHistory: state.videoHistory.filter((v) => v.id !== videoId),
          }));
        },

        clearHistory: () => set({ videoHistory: [] }),

        // Playlist management
        createVideoPlaylist: (playlistName) => {
          set((state) => ({
            videoPlaylists: [
              ...state.videoPlaylists,
              {
                id: Date.now().toString(),
                name: playlistName,
                videos: [],
                createdAt: Date.now(),
              },
            ],
          }));
        },

        addVideoToPlaylist: (playlistId, video) => {
          set((state) => ({
            videoPlaylists: state.videoPlaylists.map((p) =>
              p.id === playlistId
                ? {
                    ...p,
                    videos: [
                      ...p.videos.filter((v) => v.id !== video.id),
                      video,
                    ],
                  }
                : p
            ),
          }));
        },

        removeVideoFromPlaylist: (playlistId, videoId) => {
          set((state) => ({
            videoPlaylists: state.videoPlaylists.map((p) =>
              p.id === playlistId
                ? { ...p, videos: p.videos.filter((v) => v.id !== videoId) }
                : p
            ),
          }));
        },

        deletePlaylist: (playlistId) => {
          set((state) => ({
            videoPlaylists: state.videoPlaylists.filter(
              (p) => p.id !== playlistId
            ),
          }));
        },

        clearVideoPlaylists: () => {
          set({ videoPlaylists: [] });
        },

        // Mini player controls
        showMiniPlayer: (video, position = 0, isPlaying = true) => {
          set({
            isMiniPlayerVisible: true,
            isMiniPlayerPlaying: isPlaying,
            miniPlayerVideo: video,
            miniPlayerPosition: position,
          });
        },

        hideMiniPlayer: () => set({ isMiniPlayerVisible: false }),

        closeMiniPlayer: () => {
          // Ensure complete cleanup of mini player state
          set({
            isMiniPlayerVisible: false,
            isMiniPlayerPlaying: false,
            miniPlayerVideo: null,
            miniPlayerPosition: 0,
          });

          // Force a small delay to ensure UI updates
          setTimeout(() => {
            const state = get();
            if (state.isMiniPlayerVisible) {
              // Force set to false if still visible
              set({ isMiniPlayerVisible: false });
            }
          }, 100);
        },

        toggleMiniPlayerPlayback: () => {
          set((state) => ({ isMiniPlayerPlaying: !state.isMiniPlayerPlaying }));
        },

        // Navigation controls
        playNext: () => {
          const { currentVideoIndex, videoFiles } = get();
          if (!videoFiles?.length) return;

          const nextIndex = (currentVideoIndex + 1) % videoFiles.length;
          const nextVideo = videoFiles[nextIndex];

          set({
            currentVideo: nextVideo,
            currentVideoIndex: nextIndex,
          });

          get().addToHistory(nextVideo);
        },

        playPrevious: () => {
          const { currentVideoIndex, videoFiles } = get();
          if (!videoFiles?.length) return;

          const prevIndex =
            (currentVideoIndex - 1 + videoFiles.length) % videoFiles.length;
          const prevVideo = videoFiles[prevIndex];

          set({
            currentVideo: prevVideo,
            currentVideoIndex: prevIndex,
          });

          get().addToHistory(prevVideo);
        },

        // Navigation helper
        getReturnRoute: () => {
          const { sourceTab, activeTab } = get();

          // If we have a specific source tab, return to the appropriate tab
          if (sourceTab) {
            switch (sourceTab) {
              case "video":
                return "/(tabs)/(video)";
              case "browse":
                return "/(tabs)/(browse)";
              case "playlist":
                return "/(tabs)/(playlist)";
              case "stream":
                return "/(tabs)/(browse)"; // Stream modal is typically accessed from browse
              default:
                return "/(tabs)/(video)";
            }
          }

          // If we have an active tab, return to video tab
          if (activeTab) {
            return "/(tabs)/(video)";
          }

          // Default fallback to video tab (changed from browse)
          return "/(tabs)/(video)";
        },

        // Utility functions
        getVideoById: (id) => get().videoFiles.find((v) => v.id === id),

        searchVideos: (query) => {
          if (!query.trim()) return get().videoFiles;

          const lowerQuery = query.toLowerCase();
          return get().videoFiles.filter((video) =>
            video.filename?.toLowerCase().includes(lowerQuery)
          );
        },

        // Video management functions (for compatibility with VideoAllScreen)
        removeVideo: async (videoId) => {
          set((state) => ({
            videoFiles: state.videoFiles.filter((v) => v.id !== videoId),
            favouriteVideos: state.favouriteVideos.filter(
              (v) => v.id !== videoId
            ),
            videoHistory: state.videoHistory.filter((v) => v.id !== videoId),
          }));
        },

        renameVideo: async (videoId, newFileName) => {
          // This is a placeholder - actual file renaming would need native implementation
          console.log("Rename video:", videoId, "to:", newFileName);
          // For now, just update the filename in the store
          set((state) => ({
            videoFiles: state.videoFiles.map((v) =>
              v.id === videoId ? { ...v, filename: newFileName } : v
            ),
          }));
        },

        // Reset all state
        resetVideoStore: () => {
          set({
            videoFiles: [],
            isLoading: false,
            isInitialLoadComplete: false,
            lastLoadTime: null,
            currentVideo: null,
            currentVideoIndex: -1,
            isMiniPlayerVisible: false,
            isMiniPlayerPlaying: false,
            miniPlayerVideo: null,
            miniPlayerPosition: 0,
          });
        },
      }),
      {
        name: "optimized-video-storage",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          activeTab: state.activeTab,
          sortOrder: state.sortOrder,
          favouriteVideos: state.favouriteVideos,
          videoHistory: state.videoHistory,
          videoPlaylists: state.videoPlaylists,
          lastLoadTime: state.lastLoadTime,
          // Don't persist videoFiles - let them load fresh for better performance
        }),
      }
    )
  )
);

export default useOptimizedVideoStore;
