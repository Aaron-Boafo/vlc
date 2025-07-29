import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import "../global.css";
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import usePlaybackStore from '../store/playbackStore';
import useAudioControl from '../store/useAudioControl';
import AppThemeProvider from '../components/ThemeProvider';
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

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/inter/extras/ttf/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/inter/extras/ttf/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/inter/extras/ttf/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/extras/ttf/Inter-Bold.ttf'),
  });
  const { backgroundPlay } = usePlaybackStore();

  const { initializeAudio } = useAudioControl();

  // Set up audio mode and notifications
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Configure notifications
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        // Initialize audio
        await initializeAudio();
        
        // Set audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: backgroundPlay,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.warn('Error setting up audio:', error);
      }
    };

    setupAudio();
  }, [backgroundPlay, initializeAudio]);

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
          <Stack.Screen name="(onboarding)" options={{ 
            headerShown: false,
            gestureEnabled: true // Enable gestures for onboarding
          }} />
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
