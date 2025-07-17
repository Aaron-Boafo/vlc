import { Tabs } from "expo-router";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";
import MiniPlayer from "../../components/MiniPlayer";
import { Video } from 'lucide-react-native';
import VideoMiniPlayer from '../../VideoComponents/VideoMiniPlayer';

export default function TabLayouts() {
  const { themeColors } = useThemeStore();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textSecondary,
          tabBarStyle: {
            backgroundColor: themeColors.background,
            borderTopColor: themeColors.card + '60',
            borderTopWidth: 0.5,
          },
          // Remove animations that cause reloading
          animation: 'none',
          animationDuration: 0,
          // Keep screens alive by default
          lazy: false,
          // Don't detach screens globally
          detachInactiveScreens: false,
          // Disable gestures that might interfere
          gestureEnabled: false,
        }}
      >
        <Tabs.Screen
          name="(video)"
          options={{
            title: "Video",
            headerShown: false,
            tabBarIcon: ({ color }) => <Icons.FileVideo color={color} />,
            // Keep video screen alive
            detachInactiveScreens: false,
          }}
        />
        <Tabs.Screen
          name="(audio)"
          options={{
            title: "Audio",
            headerShown: false,
            tabBarIcon: ({ color }) => <Icons.FileAudio color={color} />,
            // Keep audio screen alive
            detachInactiveScreens: false,
          }}
        />
        <Tabs.Screen 
          name="(browse)" 
          options={{ 
            title: "Browse", 
            tabBarIcon: ({ focused, size, color }) => 
              focused ? <Icons.FolderOpen size={size} color={color} /> : <Icons.FolderClosed size={size} color={color} />,
            // Browse can be detached as it's less critical
            detachInactiveScreens: true 
          }} 
        />
        <Tabs.Screen 
          name="(playlist)" 
          options={{ 
            title: "Playlist", 
            tabBarIcon: ({ color, size }) => <Icons.ListMusic color={color} size={size} />,
            // Keep playlist alive
            detachInactiveScreens: false 
          }} 
        />
        <Tabs.Screen 
          name="(more)" 
          options={{ 
            title: "More", 
            tabBarIcon: ({ color, size }) => <Icons.Component color={color} size={size} />,
            // More can be detached
            detachInactiveScreens: true 
          }} 
        />
      </Tabs>
      <MiniPlayer />
      <VideoMiniPlayer />
    </>
  );
}
