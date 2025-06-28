import {Stack} from "expo-router";
import { PlaylistProvider } from "./Context";

const AudioLayout = () => {
  return (
    <PlaylistProvider>
      <Stack
        screenOptions={{
          // Instant transitions
          animation: 'none',
          animationDuration: 0,
          // Performance optimizations
          gestureEnabled: false,
          detachInactiveScreens: true,
        }}
      />
    </PlaylistProvider>
  );
};

export default AudioLayout;
