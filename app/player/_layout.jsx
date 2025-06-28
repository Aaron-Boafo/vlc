import { Stack } from 'expo-router';

export default function PlayerLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        // Swift transition configurations
        animation: 'fade',
        animationDuration: 150,
        // Performance optimizations
        gestureEnabled: false,
        detachInactiveScreens: true,
      }} 
    />
  );
} 