import {Stack} from "expo-router";
import {View} from "react-native";
import "../global.css";

export default function Layout() {
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
        <Stack.Screen name="(tabs)" options={{gestureEnabled: false}} />
      </Stack>
    </View>
  );
}
