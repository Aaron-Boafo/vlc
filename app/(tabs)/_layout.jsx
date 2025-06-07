import {Tabs} from "expo-router";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";

const TabLayouts = () => {
  const {themeColors} = useThemeStore();
  return (
    <Tabs
      initialRouteName="(video)"
      screenOptions={({focused}) => ({
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          padding: 5,
          paddingTop: 3,
        },
        tabBarStyle: {
          backgroundColor: themeColors.background,
          height: 80,
          paddingTop: 3,
          boxShadow: `10px 4px 50px ${themeColors.shadow}`,
          borderTopColor: "gray",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.tabIconColor,
        tabBarIconSize: 30,
      })}
    >
      <Tabs.Screen
        name="(video)"
        options={{
          headerShown: false,
          tabBarIcon: ({color, size}) => (
            <Icons.FileVideo color={color} size={size} />
          ),
          title: "Video",
        }}
      />
      <Tabs.Screen
        name="(audio)"
        options={{
          headerShown: false,
          title: "Audio",
          tabBarIcon: ({size, color}) => (
            <Icons.FileAudio size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(browse)"
        options={{
          headerShown: false,
          title: "Browse",
          tabBarIcon: ({focused, size, color}) => {
            return !focused ? (
              <Icons.FolderClosed size={size} color={color} />
            ) : (
              <Icons.FolderOpen size={size} color={color} />
            );
          },
        }}
      />
      <Tabs.Screen
        name="(playlist)"
        options={{
          headerShown: false,
          title: "Playlist",
          tabBarIcon: ({size, color}) => (
            <Icons.ListMusic color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          headerShown: false,
          title: "More",
          tabBarIcon: ({size, color}) => (
            <Icons.Component color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayouts;
