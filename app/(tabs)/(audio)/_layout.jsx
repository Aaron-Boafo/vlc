import {Stack} from "expo-router";

const AudioLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{headerShown: false}} />
      <Stack.Screen name="player" options={{headerShown: false}} />
    </Stack>
  );
};

export default AudioLayout;
