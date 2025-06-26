import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
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

      // Remove video from library and all related collections
      removeVideo: async (videoId) => {
        const state = get();
        
        // Remove from videoFiles
        const updatedVideoFiles = state.videoFiles.filter(v => v.id !== videoId);
        
        // Remove from favorites
        const updatedFavouriteVideos = state.favouriteVideos.filter(v => v.id !== videoId);
        
        // Remove from history
        const updatedVideoHistory = state.videoHistory.filter(v => v.id !== videoId);
        
        // Remove from all playlists
        const updatedVideoPlaylists = state.videoPlaylists.map(playlist => ({
          ...playlist,
          videos: playlist.videos.filter(v => v.id !== videoId)
        }));
        
        // Clear current video if it's the one being deleted
        let updatedCurrentVideo = state.currentVideo;
        let updatedCurrentVideoIndex = state.currentVideoIndex;
        
        if (state.currentVideo && state.currentVideo.id === videoId) {
          updatedCurrentVideo = null;
          updatedCurrentVideoIndex = -1;
        } else if (state.currentVideoIndex >= 0) {
          // Adjust current video index if needed
          const newIndex = updatedVideoFiles.findIndex(v => v.id === state.currentVideo?.id);
          updatedCurrentVideoIndex = newIndex;
        }
        
        set({
          videoFiles: updatedVideoFiles,
          favouriteVideos: updatedFavouriteVideos,
          videoHistory: updatedVideoHistory,
          videoPlaylists: updatedVideoPlaylists,
          currentVideo: updatedCurrentVideo,
          currentVideoIndex: updatedCurrentVideoIndex,
        });
      },

      // Copy video to app storage and import to gallery
      copyVideoToAppStorageAndGallery: async (videoId, newFileName) => {
        const state = get();
        const video = state.videoFiles.find(v => v.id === videoId);
        if (!video) {
          throw new Error('Video not found');
        }
        if (!video.uri || !video.uri.startsWith('file://')) {
          throw new Error('Unsupported file location.');
        }
        try {
          // Copy to app storage
          const appDir = FileSystem.documentDirectory + 'videos/';
          await FileSystem.makeDirectoryAsync(appDir, { intermediates: true }).catch(() => {});
          const newUri = appDir + newFileName;
          await FileSystem.copyAsync({ from: video.uri, to: newUri });
          // Import to gallery
          const asset = await MediaLibrary.createAssetAsync(newUri);
          await get().loadVideoFiles();
          return asset;
        } catch (error) {
          console.error('Failed to copy and import video:', error);
          throw error;
        }
      },

      // Rename video file
      renameVideo: async (videoId, newFileName) => {
        const state = get();
        const video = state.videoFiles.find(v => v.id === videoId);
        if (!video) {
          throw new Error('Video not found');
        }
        // Check for restricted locations (any file in shared storage /storage/emulated/0/)
        const restrictedBase = '/storage/emulated/0/';
        if (video.uri && video.uri.startsWith('file://' + restrictedBase)) {
          const err = new Error("This file cannot be renamed due to Android restrictions. Please use your device's file manager to rename it.");
          err.code = 'RESTRICTED_LOCATION';
          throw err;
        }
        try {
          // Check for MediaLibrary permissions
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Permission to access media library is required to rename this video.');
          }
          // Try MediaLibrary rename first
          try {
            await MediaLibrary.updateAssetAsync(videoId, { filename: newFileName });
            await get().loadVideoFiles();
            return;
          } catch (mediaLibErr) {
            // Fallback: Try FileSystem move if MediaLibrary fails
            if (video.uri && video.uri.startsWith('file://')) {
              const parentDir = video.uri.substring(0, video.uri.lastIndexOf('/') + 1);
              const newUri = parentDir + newFileName;
              await FileSystem.moveAsync({ from: video.uri, to: newUri });
              await get().loadVideoFiles();
              return;
            } else {
              throw new Error('Cannot rename this video. It may not be in a supported location.');
            }
          }
        } catch (error) {
          console.error('Failed to rename video:', error);
          throw error;
        }
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