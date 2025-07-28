import { Stack } from "expo-router";

const VideoLayout = () => {
  return (
    <Stack
      screenOptions={{
        // Instant transitions for tab content
        animation: 'none',
        animationDuration: 0,
        // Performance optimizations
        gestureEnabled: false,
        detachInactiveScreens: false, // Keep screens alive
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
};

export default VideoLayout; 