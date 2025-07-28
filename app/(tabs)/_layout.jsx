import { Tabs } from "expo-router";
import React, { useCallback, useEffect } from "react";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";
import MiniPlayer from "../../components/MiniPlayer";
import VideoMiniPlayer from "../../VideoComponents/VideoMiniPlayer";
import NavigationOptimizer from "../../utils/navigationOptimizer";
import DeviceOptimizer from "../../utils/deviceOptimizer";

export default function TabLayouts() {
  const { themeColors } = useThemeStore();
  const [currentTab, setCurrentTab] = React.useState("(audio)");
  const [tabsInitialized, setTabsInitialized] = React.useState(false);

  // Initialize navigation optimizer and prevent reloading
  useEffect(() => {
    NavigationOptimizer.clearCache(); // Clear any old cache
    DeviceOptimizer.logDeviceInfo(); // Log device info for debugging

    // Mark tabs as initialized to prevent unnecessary reloads
    setTabsInitialized(true);
  }, []);

  // Optimized tab press handler
  const handleTabPress = useCallback(
    (tabName) => {
      if (currentTab === tabName) return; // Skip if same tab

      NavigationOptimizer.optimizeTransition(currentTab, tabName, () => {
        setCurrentTab(tabName);
      });
    },
    [currentTab]
  );

  // Get device-optimized settings
  const deviceSettings = DeviceOptimizer.getRenderingSettings();
  const canHandleAnimations = DeviceOptimizer.canHandleAdvancedFeatures();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textSecondary,
          tabBarStyle: {
            backgroundColor: themeColors.background,
            borderTopColor: themeColors.card + "60",
            borderTopWidth: 0.5,
          },
          // Optimize animations based on device capability
          animation: canHandleAnimations ? "shift" : "none",
          animationDuration: canHandleAnimations ? 150 : 0,
          // CRITICAL: Keep screens alive to prevent reloading
          lazy: false,
          detachInactiveScreens: false,
          unmountOnBlur: false, // Prevent unmounting when switching tabs
          // Optimize gestures based on device
          gestureEnabled: canHandleAnimations,
          // Add performance optimizations
          freezeOnBlur: false, // Don't freeze to maintain state
        }}
        screenListeners={{
          tabPress: (e) => {
            const tabName = e.target?.split("-")[0];
            if (tabName) {
              handleTabPress(tabName);
            }
          },
        }}
      >
        <Tabs.Screen
          name="index"
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
              focused ? (
                <Icons.FolderOpen size={size} color={color} />
              ) : (
                <Icons.FolderClosed size={size} color={color} />
              ),
            // Browse can be detached as it's less critical
            detachInactiveScreens: true,
          }}
        />
        <Tabs.Screen
          name="(playlist)"
          options={{
            title: "Playlist",
            tabBarIcon: ({ color, size }) => (
              <Icons.ListMusic color={color} size={size} />
            ),
            // Keep playlist alive
            detachInactiveScreens: false,
          }}
        />
        <Tabs.Screen
          name="(more)"
          options={{
            title: "More",
            tabBarIcon: ({ color, size }) => (
              <Icons.Component color={color} size={size} />
            ),
            // More can be detached
            detachInactiveScreens: true,
          }}
        />
      </Tabs>
      <MiniPlayer />
      <VideoMiniPlayer />
    </>
  );
}
