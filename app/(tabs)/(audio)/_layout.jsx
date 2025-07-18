import {Stack} from "expo-router";
import { TouchableOpacity } from 'react-native';

const AudioLayout = () => {
  return (
    <>
      <Stack
        screenOptions={{
          // Instant transitions for tab content
          animation: 'none',
          animationDuration: 0,
          // Performance optimizations
          gestureEnabled: false,
          detachInactiveScreens: true,
        }}
      >
        <Stack.Screen name="index" options={{headerShown: false}} />
        <Stack.Screen 
          name="player" 
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 200,
          }} 
        />
      </Stack>
    </>
  );
};

export default AudioLayout;
