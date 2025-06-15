import {Stack} from "expo-router";
import {View} from "react-native";
import {useEffect} from "react";
import {Audio, InterruptionModeIOS, InterruptionModeAndroid} from "expo-av";
import "../global.css";

export default function Layout() {
  // Set audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: true,
    });
  }, []);

  // Set my layout
  return (
    <View style={{flex: 1, backgroundColor: "#121212"}}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: "#121212"},
          animation: "fade",
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="(onboarding)"
          options={{
            headerShown: false,
            gestureEnabled: false,
            contentStyle: {
              backgroundColor: "#121212",
            },
          }}
        />
        <Stack.Screen
          name="player"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            transitionSpec: {
              open: {animation: "timing", config: {duration: 100}},
              close: {animation: "timing", config: {duration: 100}},
            },
            gestureResponseDistance: 30,
            gestureVelocityImpact: 0.1,
          }}
        />

        <Stack.Screen
          name="searchMusic"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            transitionSpec: {
              open: {animation: "timing", config: {duration: 100}},
              close: {animation: "timing", config: {duration: 100}},
            },
            gestureResponseDistance: 30,
            gestureVelocityImpact: 0.1,
          }}
        />

        <Stack.Screen name="(tabs)" options={{gestureEnabled: false}} />
      </Stack>
    </View>
  );
}
