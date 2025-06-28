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
        detachInactiveScreens: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="player"
        options={{ 
          headerShown: false, 
          presentation: "modal",
          animation: 'slide_from_bottom',
          animationDuration: 200,
        }}
      />
    </Stack>
  );
};

export default VideoLayout; 