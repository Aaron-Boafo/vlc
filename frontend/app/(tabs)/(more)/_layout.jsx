import { Stack } from "expo-router";

const MoreLayout = () => {
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
      <Stack.Screen name="index" options={{headerShown: false}} />
      <Stack.Screen 
        name="settings" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 150,
        }} 
      />
      <Stack.Screen 
        name="about" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 150,
        }} 
      />
    </Stack>
  );
};

export default MoreLayout;
