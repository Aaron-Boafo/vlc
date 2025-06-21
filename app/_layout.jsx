import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import "../global.css";
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Audio } from 'expo-av';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/inter/extras/ttf/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/inter/extras/ttf/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/inter/extras/ttf/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/extras/ttf/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar hidden />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="video-player" options={{ headerShown: false }} />
          <Stack.Screen
            name="(tabs)/(audio)/player"
            options={{ headerShown: false, presentation: "modal" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
