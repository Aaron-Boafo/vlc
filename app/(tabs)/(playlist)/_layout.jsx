import {Stack} from "expo-router";
import { PlaylistProvider } from "./Context";
import { TouchableOpacity } from 'react-native';

const AudioLayout = () => {
  return (
    <PlaylistProvider>
      <Stack
        screenOptions={{
          headerShown: false,
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
