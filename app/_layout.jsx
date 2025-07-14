import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import "../global.css";
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Audio } from 'expo-av';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import usePlaybackStore from '../store/playbackStore';
import React from 'react';

// Simple error boundary component
class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // You can log error to a service here
    console.error('Navigation error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><Text style={{ color: 'red', fontSize: 18 }}>Something went wrong with navigation.</Text></View>;
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/inter/extras/ttf/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/inter/extras/ttf/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/inter/extras/ttf/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/extras/ttf/Inter-Bold.ttf'),
  });
  const { backgroundPlay } = usePlaybackStore();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: backgroundPlay,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, [backgroundPlay]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar hidden />
        <NavigationErrorBoundary>
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 200,
            gestureEnabled: true,
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
        </NavigationErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
