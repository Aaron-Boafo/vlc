import { Stack } from "expo-router";

const VideoLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="player"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
};

export default VideoLayout; 