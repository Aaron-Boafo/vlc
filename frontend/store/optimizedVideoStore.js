import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

const useOptimizedVideoStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UI state only - NO videoFiles array (data comes from SQLite via hooks)
        isLoading: false,
        isInitialLoadComplete: false,
        activeTab: "all",
        sortOrder: { key: "filename", direction: "asc" },

        // Video-specific user state (keep these - user created)
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
        sourceTab: null,

        // Loading state
        setLoading: (loading) => set({ isLoading: loading }),
        setInitialLoadComplete: (complete) => set({ isInitialLoadComplete: complete }),

        // Sort management (UI only - actual sorting done in SQL)
        setSortOrder: (key, direction) => set({ sortOrder: { key, direction } }),

        // Tab management
        toggleTabs: (tab) => set({ activeTab: tab }),

        // Video playback management (currentVideo comes from player, not from videoFiles array)
        setAndPlayVideo: (video, sourceTab = null) => {
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

          set({
            currentVideo: video,
            currentVideoIndex: -1, // Not from a list anymore
            isMiniPlayerVisible: false,
            sourceTab: sourceTab,
          });

          console.log(
            "🎥 Video store updated. Current video:",
            get().currentVideo,
            "Source tab:",
            sourceTab
          );

          get().addToHistory(video);
        },

        setCurrentVideo: (video) => {
          set({
            currentVideo: video,
            currentVideoIndex: -1,
          });
        },

        // Favorites management (user-created data - keep in Zustand)
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

        // History management (user-created data - keep in Zustand)
        addToHistory: (video) => {
          set((state) => ({
            videoHistory: [
              {
                ...video,
                playedAt: Date.now(),
              },
              ...state.videoHistory.filter((v) => v.id !== video.id),
            ].slice(0, 100),
          }));
        },

        removeFromHistory: (videoId) => {
          set((state) => ({
            videoHistory: state.videoHistory.filter((v) => v.id !== videoId),
          }));
        },

        clearHistory: () => set({ videoHistory: [] }),

        // Playlist management (user-created data - keep in Zustand)
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
          set({
            isMiniPlayerVisible: false,
            isMiniPlayerPlaying: false,
            miniPlayerVideo: null,
            miniPlayerPosition: 0,
          });

          setTimeout(() => {
            const state = get();
            if (state.isMiniPlayerVisible) {
              set({ isMiniPlayerVisible: false });
            }
          }, 100);
        },

        toggleMiniPlayerPlayback: () => {
          set((state) => ({ isMiniPlayerPlaying: !state.isMiniPlayerPlaying }));
        },

        // Navigation controls (now work with currentVideo directly)
        playNext: () => {
          // This now requires the playlist/queue to be passed in
          // Kept for compatibility but will need playlist from hook
          console.log("playNext called - needs playlist from hook");
        },

        playPrevious: () => {
          console.log("playPrevious called - needs playlist from hook");
        },

        // Navigation helper
        getReturnRoute: () => {
          const { sourceTab, activeTab } = get();

          if (sourceTab) {
            switch (sourceTab) {
              case "video":
                return "/(tabs)/(video)";
              case "browse":
                return "/(tabs)/(browse)";
              case "playlist":
                return "/(tabs)/(playlist)";
              case "stream":
                return "/(tabs)/(browse)";
              default:
                return "/(tabs)/(video)";
            }
          }

          if (activeTab) {
            return "/(tabs)/(video)";
          }

          return "/(tabs)/(video)";
        },

        // Utility functions (no longer use videoFiles array)
        // getVideoById: Use useVideo hook instead
        // searchVideos: Use useVideoSearch hook instead

        // Video management functions (for compatibility - now use database)
        removeVideo: async (videoId) => {
          // This now needs to delete from database
          // Kept for compatibility
          set((state) => ({
            favouriteVideos: state.favouriteVideos.filter(
              (v) => v.id !== videoId
            ),
            videoHistory: state.videoHistory.filter((v) => v.id !== videoId),
          }));
        },

        renameVideo: async (videoId, newFileName) => {
          console.log("Rename video:", videoId, "to:", newFileName);
        },

        // Reset all state
        resetVideoStore: () => {
          set({
            isLoading: false,
            isInitialLoadComplete: false,
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
        name: "optimized-video-ui-storage",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          activeTab: state.activeTab,
          sortOrder: state.sortOrder,
          favouriteVideos: state.favouriteVideos,
          videoHistory: state.videoHistory,
          videoPlaylists: state.videoPlaylists,
        }),
      }
    )
  )
);

export default useOptimizedVideoStore;