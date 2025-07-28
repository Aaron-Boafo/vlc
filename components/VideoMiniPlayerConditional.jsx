import React from 'react';
import { usePathname } from 'expo-router';
import VideoMiniPlayer from '../VideoComponents/VideoMiniPlayer';

const VideoMiniPlayerConditional = () => {
  const pathname = usePathname();
  
  // Hide VideoMiniPlayer when user is in the main video player
  const isInVideoPlayer = pathname === '/player/video';
  
  // Only render VideoMiniPlayer when NOT in the main video player
  if (isInVideoPlayer) {
    return null;
  }
  
  return <VideoMiniPlayer />;
};

export default VideoMiniPlayerConditional;