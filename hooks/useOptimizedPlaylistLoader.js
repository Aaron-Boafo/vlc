import { useState, useEffect, useCallback } from 'react';
import OptimizedPlaylistLoader from '../utils/optimizedPlaylistLoader';

/**
 * Hook for optimized playlist creation loading
 * Provides fast, progressive loading of audio and video files
 */

export const useOptimizedPlaylistLoader = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    audio: { loaded: 0, total: 0, phase: 'idle' },
    video: { loaded: 0, total: 0, phase: 'idle' }
  });

  // Load audio files
  const loadAudioFiles = useCallback(async () => {
    setLoading(true);
    try {
      const files = await OptimizedPlaylistLoader.loadAudioFilesForPlaylist((progressData) => {
        setProgress(prev => ({
          ...prev,
          audio: progressData
        }));
        
        // Update files as metadata loads
        setAudioFiles([...files]);
      });
      
      setAudioFiles(files);
    } catch (error) {
      console.error('Audio loading error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load video files
  const loadVideoFiles = useCallback(async () => {
    setLoading(true);
    try {
      const files = await OptimizedPlaylistLoader.loadVideoFilesForPlaylist((progressData) => {
        setProgress(prev => ({
          ...prev,
          video: progressData
        }));
        
        // Update files as thumbnails load
        setVideoFiles([...files]);
      });
      
      setVideoFiles(files);
    } catch (error) {
      console.error('Video loading error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load both audio and video
  const loadAllMedia = useCallback(async () => {
    setLoading(true);
    try {
      const result = await OptimizedPlaylistLoader.loadAllMediaForPlaylist((progressData) => {
        setProgress(prev => ({
          ...prev,
          [progressData.type]: progressData
        }));
      });
      
      setAudioFiles(result.audio);
      setVideoFiles(result.video);
    } catch (error) {
      console.error('Media loading error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    await OptimizedPlaylistLoader.clearCache();
  }, []);

  return {
    // Data
    audioFiles,
    videoFiles,
    loading,
    progress,
    
    // Actions
    loadAudioFiles,
    loadVideoFiles,
    loadAllMedia,
    clearCache,
    
    // Computed values
    totalFiles: audioFiles.length + videoFiles.length,
    audioProgress: progress.audio,
    videoProgress: progress.video,
    isAudioLoading: progress.audio.phase !== 'idle',
    isVideoLoading: progress.video.phase !== 'idle',
  };
};

export default useOptimizedPlaylistLoader;