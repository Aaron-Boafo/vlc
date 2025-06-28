import { Stack } from "expo-router";

const BrowseLayout = () => {
  return (
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
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
};

export default BrowseLayout;
