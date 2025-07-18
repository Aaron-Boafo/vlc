import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import "../global.css";
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import usePlaybackStore from '../store/playbackStore';
import AppThemeProvider from '../components/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/inter/extras/ttf/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/inter/extras/ttf/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/inter/extras/ttf/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/extras/ttf/Inter-Bold.ttf'),
  });
  const { backgroundPlay } = usePlaybackStore();

  // Set up audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: backgroundPlay,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, [backgroundPlay]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar hidden />
        <Stack
          screenOptions={{
            // Instant transitions for main navigation
            animation: 'none',
            animationDuration: 0,
            // Performance optimizations
            gestureEnabled: false,
            detachInactiveScreens: true,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Main app component with theme provider
export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}
