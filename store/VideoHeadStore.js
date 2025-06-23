import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import * as MediaLibrary from "expo-media-library";
import { router } from 'expo-router';

const useVideoStore = create(
  persist(
    (set, get) => ({
      // Tab state
      activeTab: "all",
      toggleTabs: (tabs) =>
        set(() => {
          return {activeTab: tabs};
        }),

      // Video files state
      videoFiles: [],
      isLoading: true,
      error: null,
      setVideoFiles: (files) => set({ videoFiles: files }),
      
      // Current video and playlist
      currentVideo: null,
      currentVideoIndex: -1,
      playlist: [],
      setCurrentVideo: (video) => set({ currentVideo: video }),
      setPlaylist: (videos) => set({ playlist: videos }),

      // Favourite videos
      favouriteVideos: [],
      addToFavourites: (video) => 
        set((state) => ({
          favouriteVideos: [...state.favouriteVideos, video]
        })),
      removeFromFavourites: (videoId) =>
        set((state) => ({
          favouriteVideos: state.favouriteVideos.filter(v => v.id !== videoId)
        })),
      toggleFavouriteVideo: (video) => 
        set((state) => {
          const isFavourite = state.favouriteVideos.some(v => v.id === video.id);
          if (isFavourite) {
            return { favouriteVideos: state.favouriteVideos.filter(v => v.id !== video.id) };
          } else {
            return { favouriteVideos: [...state.favouriteVideos, video] };
          }
        }),

      // Video history
      videoHistory: [],
      addToHistory: (video) => 
        set((state) => ({
          videoHistory: [video, ...state.videoHistory.filter(v => v.id !== video.id)]
        })),
      removeFromHistory: (videoId) =>
        set((state) => ({
          videoHistory: state.videoHistory.filter(v => v.id !== videoId)
        })),

      // Video Playlists
      videoPlaylists: [],
      createVideoPlaylist: (playlistName) => 
        set((state) => ({
          videoPlaylists: [...state.videoPlaylists, { id: Date.now().toString(), name: playlistName, videos: [] }]
        })),
      addVideoToPlaylist: (playlistId, video) =>
        set((state) => ({
          videoPlaylists: state.videoPlaylists.map(p => 
            p.id === playlistId 
              ? { ...p, videos: [...p.videos, video] }
              : p
          )
        })),

      // Mini Player State
      isMiniPlayerVisible: false,
      isMiniPlayerPlaying: false,
      miniPlayerPosition: 0,
      miniPlayerVideo: null,

      // Sorting function
      sortOrder: { key: 'filename', direction: 'asc' }, // default sort

      // Load video files from device with optimization
      loadVideoFiles: async () => {
        set({ isLoading: true, error: null });
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            set({
              error: 'Permission to access media library is required!',
              isLoading: false,
            });
            return;
          }

          const media = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.video,
            first: 1000,
          });

          const sortedVideos = media.assets.sort((a, b) => b.creationTime - a.creationTime);
          set({ videoFiles: sortedVideos, isLoading: false });
        } catch (e) {
          console.error('Failed to load videos', e);
          set({ error: 'Failed to load videos.', isLoading: false });
        }
      },

      // Set a single video to play
      setAndPlayVideo: (video, shouldContinuePlayback = false) => {
        const videoFiles = get().videoFiles;
        const index = videoFiles.findIndex(v => v.id === video.id);
        set({
          currentVideo: video,
          currentVideoIndex: index,
          isMiniPlayerVisible: false, // Always hide miniplayer when a new video is chosen
        });
        // Navigation should be handled by the component that calls this.
      },

      showMiniPlayer: (video, position, isPlaying = true) => {
        if (video) {
          set({ 
            isMiniPlayerVisible: true, 
            isMiniPlayerPlaying: isPlaying,
            miniPlayerVideo: video,
            miniPlayerPosition: position,
          });
        }
      },

      hideMiniPlayer: () => {
        set({ isMiniPlayerVisible: false });
      },

      closeMiniPlayer: () => {
        set({ 
          isMiniPlayerVisible: false, 
          isMiniPlayerPlaying: false,
          miniPlayerVideo: null,
          miniPlayerPosition: 0,
        });
      },

      toggleMiniPlayerPlayback: () => {
        set(state => ({ isMiniPlayerPlaying: !state.isMiniPlayerPlaying }));
      },

      setMiniPlayerPlaying: (isPlaying) => {
        set({ isMiniPlayerPlaying: isPlaying });
      },

      playNext: () => {
        const { currentVideoIndex, videoFiles } = get();
        const nextIndex = (currentVideoIndex + 1) % videoFiles.length;
        if (nextIndex < videoFiles.length) {
          set({
            currentVideo: videoFiles[nextIndex],
            currentVideoIndex: nextIndex,
          });
        }
      },

      playPrevious: () => {
        const { currentVideoIndex, videoFiles } = get();
        const prevIndex = (currentVideoIndex - 1 + videoFiles.length) % videoFiles.length;
        if (prevIndex >= 0) {
          set({
            currentVideo: videoFiles[prevIndex],
            currentVideoIndex: prevIndex,
          });
        }
      },
      
      clearCurrentVideo: () => set({ currentVideo: null, currentVideoIndex: -1 }),

      // Sorting function
      sortVideoFiles: (key, direction) => {
        const sortedFiles = [...get().videoFiles].sort((a, b) => {
          const valA = a[key] || '';
          const valB = b[key] || '';
          
          if (key === 'filename') {
            return direction === 'asc' 
              ? valA.localeCompare(valB) 
              : valB.localeCompare(valA);
          }
          // For numeric values like duration or modificationTime
          return direction === 'asc' ? valA - valB : valB - valA;
        });
        set({ videoFiles: sortedFiles, sortOrder: { key, direction } });
      },
    }),

    {
      name: "Video-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        videoFiles: state.videoFiles,
        favouriteVideos: state.favouriteVideos,
        videoHistory: state.videoHistory,
        videoPlaylists: state.videoPlaylists,
      }),
    }
  )
);

// Helper function to load additional video metadata in background
const loadVideoMetadataInBackground = async (videos) => {
  // This can be used for additional video processing if needed
  // For now, videos load with basic metadata which is usually sufficient
  console.log(`Loaded ${videos.length} videos with basic metadata`);
};

export default useVideoStore; 