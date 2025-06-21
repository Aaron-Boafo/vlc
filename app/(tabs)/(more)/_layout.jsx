import { Stack } from "expo-router";

const MoreLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{headerShown: false}} />
      <Stack.Screen name="settings" options={{headerShown: false}} />
      <Stack.Screen name="about" options={{headerShown: false}} />
    </Stack>
  );
};

export default MoreLayout;
