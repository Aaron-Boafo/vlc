import { Tabs } from "expo-router";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";
import MiniPlayer from "../../components/MiniPlayer";
import { Video } from 'lucide-react-native';
import VideoMiniPlayer from '../../VideoComponents/VideoMiniPlayer';

export default function TabLayouts() {
  const { themeColors, isDarkMode } = useThemeStore();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textSecondary,
          tabBarStyle: {
            backgroundColor: themeColors.background,
            borderTopColor: themeColors.card,
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="(video)"
          options={{
            title: "Video",
            headerShown: false,
            tabBarIcon: ({ color }) => <Icons.FileVideo color={color} />,
          }}
        />
        <Tabs.Screen
          name="(audio)"
          options={{
            title: "Audio",
            headerShown: false,
            tabBarIcon: ({ color }) => <Icons.FileAudio color={color} />,
          }}
        />
        <Tabs.Screen name="(browse)" options={{ title: "Browse", tabBarIcon: ({ focused, size, color }) => focused ? <Icons.FolderOpen size={size} color={color} /> : <Icons.FolderClosed size={size} color={color} /> }} />
        <Tabs.Screen name="(playlist)" options={{ title: "Playlist", tabBarIcon: ({ color, size }) => <Icons.ListMusic color={color} size={size} /> }} />
        <Tabs.Screen name="(more)" options={{ title: "More", tabBarIcon: ({ color, size }) => <Icons.Component color={color} size={size} /> }} />
      </Tabs>
      <MiniPlayer />
      <VideoMiniPlayer />
    </>
  );
}
