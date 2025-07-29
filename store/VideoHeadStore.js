import AsyncStorage from "@react-native-async-storage/async-storage";
import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { router } from 'expo-router';
import MediaCacheManager from '../utils/MediaCacheManager';

const VIDEO_LIST_PATH = FileSystem.documentDirectory + 'video_list.json';

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error('[VideoStore] Failed to parse persisted state, using fallback.', e);
    return fallback;
  }
};

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
      isLoading: false,
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
          videoHistory: [
            {
              ...video,
              playedAt: Date.now() // Add timestamp for when video was actually played
            }, 
            ...state.videoHistory.filter(v => v.id !== video.id)
          ]
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
      clearVideoPlaylists: () => set({ videoPlaylists: [] }),

      // Mini Player State
      isMiniPlayerVisible: false,
      isMiniPlayerPlaying: false,
      miniPlayerPosition: 0,
      miniPlayerVideo: null,
      isTransitioning: false, // Prevent multiple simultaneous plays

      // Sorting function
      sortOrder: { key: 'filename', direction: 'asc' }, // default sort

      // Load video files with intelligent caching
      loadVideoFiles: async () => {
        try {
          console.log('[VideoStore] Starting intelligent video files load...');
          set({ isLoading: true, videoFiles: [] });
          
          // Use the new MediaCacheManager for intelligent loading
          const videoFiles = await MediaCacheManager.loadMediaFiles('video', (progress) => {
            console.log(`📊 Video loading progress: ${progress.phase} - ${progress.message || ''}`);
            
            // Update UI with progress - show files as they load
            if (progress.phase === 'cache_loaded' && progress.files && progress.files.length > 0) {
              // Show cached files immediately while checking for updates
              const sortedFiles = [...progress.files].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
              set({ videoFiles: sortedFiles, isLoading: false }); // Set loading to false to show files
            } else if (progress.phase === 'full_scan' && progress.files && progress.files.length > 0) {
              // Show files as they're being scanned for progressive loading
              const sortedFiles = [...progress.files].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
              set({ videoFiles: sortedFiles }); // Keep loading true during scan
            } else if (progress.phase === 'complete' && progress.files) {
              // Final update when loading is complete
              const sortedFiles = [...progress.files].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
              set({ videoFiles: sortedFiles, isLoading: false });
            } else if (progress.phase === 'complete') {
              // Just mark as complete if no files in progress
              set({ isLoading: false });
            }
          });

          // Sort by creation time (newest first) - final sort
          const sortedFiles = [...videoFiles].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
          set({ videoFiles: sortedFiles, isLoading: false });

          console.log(`✅ Loaded ${videoFiles.length} video files using intelligent caching`);
          
        } catch (error) {
          console.error('[VideoStore] Error loading video files:', error);
          set({ isLoading: false, videoFiles: [] });
          
          // Fallback to old method if new cache manager fails
          try {
            await get().refreshVideoFiles();
          } catch (fallbackError) {
            console.error('[VideoStore] Fallback loading also failed:', fallbackError);
          }
        }
      },

      // Force rescan and update cache
      refreshVideoFiles: async () => {
        try {
          set({ isLoading: true, videoFiles: [] });
          
          // Use MediaCacheManager for force refresh
          const videoFiles = await MediaCacheManager.forceRefresh('video', (progress) => {
            console.log(`📊 Video refresh progress: ${progress.phase} - ${progress.message || ''}`);
            
            // Update UI with current progress
            if (progress.filesFound > 0) {
              // You can show intermediate results here if desired
            }
          });

          // Sort by creation time (newest first)
          const sortedFiles = [...videoFiles].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
          set({ videoFiles: sortedFiles, isLoading: false });

          console.log(`✅ Force refreshed ${videoFiles.length} video files`);
          
        } catch (error) {
          console.error('[VideoStore] Error refreshing video files:', error);
          set({ isLoading: false, videoFiles: [] });
          
          // Fallback to original method with timeout
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Video loading timeout - taking too long')), 30000);
            });
            
            const loadPromise = (async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status !== "granted") {
                console.log("[VideoStore] Media library permission not granted");
                return;
              }
              
              let allFiles = [];
              let hasNextPage = true;
              let page = 0;
              const batchSize = 100;
              
              while (hasNextPage && page < 50) {
                try {
                  const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.video,
                    first: batchSize,
                    sortBy: [MediaLibrary.SortBy.creationTime],
                  });
                  
                  if (!media.assets || media.assets.length === 0) break;
                  
                  const basicFiles = media.assets.map((asset) => ({
                    id: asset.id,
                    uri: asset.uri,
                    filename: asset.filename || 'Unknown Video',
                    duration: asset.duration || 0,
                    width: asset.width || 0,
                    height: asset.height || 0,
                    creationTime: asset.creationTime || Date.now(),
                    modificationTime: asset.modificationTime || Date.now(),
                    size: asset.fileSize || 0,
                  }));
                  
                  allFiles = allFiles.concat(basicFiles);
                  set({ videoFiles: [...allFiles] });
                  
                  hasNextPage = media.hasNextPage;
                  page++;
                  
                  if (hasNextPage) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                } catch (batchError) {
                  console.error(`[VideoStore] Error loading batch ${page}:`, batchError);
                  hasNextPage = false;
                }
              }
              
              const sortedFiles = [...allFiles].sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
              set({ videoFiles: sortedFiles });
              
              // Save to old cache as fallback
              await FileSystem.writeAsStringAsync(VIDEO_LIST_PATH, JSON.stringify(sortedFiles));
              
            })();
            
            await Promise.race([loadPromise, timeoutPromise]);
            
          } catch (fallbackError) {
            console.error('[VideoStore] Fallback refresh also failed:', fallbackError);
          }
        }
      },

      // Set a single video to play
      setAndPlayVideo: (video, shouldContinuePlayback = false) => {
        const { isTransitioning } = get();
        if (isTransitioning) {
          console.log("Video transition already in progress, ignoring request");
          return;
        }
        
        set({ isTransitioning: true });
        
        try {
          const videoFiles = get().videoFiles || [];
          const index = videoFiles.findIndex(v => v.id === video.id);
          set({
            currentVideo: video,
            currentVideoIndex: index,
            isMiniPlayerVisible: false, // Always hide miniplayer when a new video is chosen
          });
          // Navigation should be handled by the component that calls this.
        } finally {
          setTimeout(() => set({ isTransitioning: false }), 500); // Small delay to prevent rapid clicks
        }
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
        const { currentVideoIndex, videoFiles, isTransitioning } = get();
        if (!videoFiles || !Array.isArray(videoFiles) || videoFiles.length === 0 || isTransitioning) {
          return;
        }
        
        set({ isTransitioning: true });
        
        try {
          const nextIndex = (currentVideoIndex + 1) % videoFiles.length;
          if (nextIndex < videoFiles.length) {
            set({
              currentVideo: videoFiles[nextIndex],
              currentVideoIndex: nextIndex,
            });
          }
        } finally {
          setTimeout(() => set({ isTransitioning: false }), 300);
        }
      },

      playPrevious: () => {
        const { currentVideoIndex, videoFiles, isTransitioning } = get();
        if (!videoFiles || !Array.isArray(videoFiles) || videoFiles.length === 0 || isTransitioning) {
          return;
        }
        
        set({ isTransitioning: true });
        
        try {
          const prevIndex = (currentVideoIndex - 1 + videoFiles.length) % videoFiles.length;
          if (prevIndex >= 0) {
            set({
              currentVideo: videoFiles[prevIndex],
              currentVideoIndex: prevIndex,
            });
          }
        } finally {
          setTimeout(() => set({ isTransitioning: false }), 300);
        }
      },
      
      clearCurrentVideo: () => set({ currentVideo: null, currentVideoIndex: -1 }),

      // Sorting function
      sortVideoFiles: (key, direction) => {
        const videoFiles = get().videoFiles || [];
        const sortedFiles = [...videoFiles].sort((a, b) => {
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
          // Only use FileSystem.moveAsync for renaming
          if (video.uri && video.uri.startsWith('file://')) {
            const parentDir = video.uri.substring(0, video.uri.lastIndexOf('/') + 1);
            const newUri = parentDir + newFileName;
            await FileSystem.moveAsync({ from: video.uri, to: newUri });
            await get().loadVideoFiles();
            return;
          } else {
            throw new Error('Cannot rename this video. It may not be in a supported location.');
          }
        } catch (error) {
          console.error('Failed to rename video:', error);
          throw error;
        }
      },

      // Clear video cache (useful for memory management)
      clearVideoCache: () => {
        set({ videoFiles: [], isLoading: false });
      },

      // Force reload videos (bypass cache)
      forceReloadVideos: async () => {
        console.log('[VideoStore] Force reloading videos...');
        set({ videoFiles: [], isLoading: true });
        await get().loadVideoFiles();
      },

      // Reset video store state completely
      resetVideoStore: () => {
        set({ 
          videoFiles: [], 
          isLoading: false,
          currentVideo: null,
          currentVideoIndex: -1,
          isMiniPlayerVisible: false,
          isMiniPlayerPlaying: false,
          miniPlayerVideo: null,
          miniPlayerPosition: 0
        });
      }
    }),

    {
      name: "Video-storage",
      storage: createJSONStorage(() => AsyncStorage, safeParse),
      partialize: (state) => ({
        activeTab: state.activeTab,
        videoFiles: state.videoFiles,
        favouriteVideos: state.favouriteVideos,
        videoHistory: state.videoHistory,
        videoPlaylists: state.videoPlaylists,
        sortOrder: state.sortOrder,
      }),
      // Defensive: fallback to empty state if persisted state is invalid
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          console.warn('[VideoStore] Invalid persisted state, using default.');
          return currentState;
        }
        return { ...currentState, ...persistedState };
      },
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