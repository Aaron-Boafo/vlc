import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { InteractionManager, Platform } from "react-native";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";
import MiniPlayer from "../../components/MiniPlayer";
import VideoMiniPlayerConditional from '../../components/VideoMiniPlayerConditional';
import NavigationOptimizer from "../../utils/navigationOptimizer";
import DeviceOptimizer from "../../utils/deviceOptimizer";
import TabOptimizer from "../../utils/tabOptimizer";

const TabLayouts = React.memo(() => {
  const { themeColors } = useThemeStore();
  const [currentTab, setCurrentTab] = React.useState('(audio)');
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Initialize navigation optimizer and prevent reloading
  useEffect(() => {
    NavigationOptimizer.clearCache(); // Clear any old cache
    DeviceOptimizer.logDeviceInfo(); // Log device info for debugging
  }, []);

  // Lightning-fast tab press handler
  const handleTabPress = useCallback((tabName) => {
    if (currentTab === tabName || isTransitioning) return; // Skip if same tab or transitioning

    setIsTransitioning(true);
    
    // Use TabOptimizer for instant feedback and background optimization
    TabOptimizer.optimizeTabSwitch(currentTab, tabName, () => {
      setCurrentTab(tabName);
      setIsTransitioning(false);
    });
  }, [currentTab, isTransitioning]);

  // Get device-optimized settings - memoized for performance
  const deviceSettings = useMemo(() => ({
    canHandleAnimations: DeviceOptimizer.canHandleAdvancedFeatures(),
    isHighEndDevice: DeviceOptimizer.isHighEndDevice(),
    shouldUseNativeDriver: Platform.OS === 'ios' || DeviceOptimizer.canHandleAdvancedFeatures(),
  }), []);

  // Memoized tab bar style for performance
  const tabBarStyle = useMemo(() => ({
    backgroundColor: themeColors.background,
    borderTopColor: themeColors.card + '60',
    borderTopWidth: 0.5,
    // Performance optimizations
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: -2 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
  }), [themeColors.background, themeColors.card]);

  // Memoized screen options for maximum performance
  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: themeColors.primary,
    tabBarInactiveTintColor: themeColors.textSecondary,
    tabBarStyle,
    // Fast and reliable animations
    animation: deviceSettings.canHandleAnimations ? 'shift' : 'none',
    animationDuration: deviceSettings.isHighEndDevice ? 150 : 100, // Balanced speed and smoothness
    // CRITICAL: Keep screens alive to prevent reloading
    lazy: false,
    detachInactiveScreens: false,
    unmountOnBlur: false, // Prevent unmounting when switching tabs
    // Optimize gestures based on device
    gestureEnabled: deviceSettings.canHandleAnimations,
    // Add performance optimizations
    freezeOnBlur: false, // Don't freeze to maintain state
    // Simplified animation config for reliability
    animationEnabled: deviceSettings.canHandleAnimations,
    // Optimize tab bar
    tabBarHideOnKeyboard: true,
  }), [themeColors.primary, themeColors.textSecondary, tabBarStyle, deviceSettings]);

  // Optimized screen listeners
  const screenListeners = useMemo(() => ({
    tabPress: (e) => {
      const tabName = e.target?.split('-')[0];
      if (tabName) {
        handleTabPress(tabName);
      }
    },
    // Add focus listeners for preloading
    focus: (e) => {
      const tabName = e.target?.split('-')[0];
      if (tabName) {
        // Preload tab data for faster switching
        TabOptimizer.preloadTabData(tabName);
      }
    },
  }), [handleTabPress]);

  return (
    <>
      <Tabs
        screenOptions={screenOptions}
        screenListeners={screenListeners}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Video",
            headerShown: false,
            tabBarIcon: ({ color, size = 24 }) => <Icons.FileVideo color={color} size={size} />,
            // Keep video screen alive for instant switching
            detachInactiveScreens: false,
            lazy: false,
            unmountOnBlur: false,
            // Preload this screen
            tabBarTestID: 'video-tab',
          }}
        />
        <Tabs.Screen
          name="(audio)"
          options={{
            title: "Audio",
            headerShown: false,
            tabBarIcon: ({ color, size = 24 }) => <Icons.FileAudio color={color} size={size} />,
            // Keep audio screen alive for instant switching
            detachInactiveScreens: false,
            lazy: false,
            unmountOnBlur: false,
            // Preload this screen
            tabBarTestID: 'audio-tab',
          }}
        />
        <Tabs.Screen 
          name="(browse)" 
          options={{ 
            title: "Browse", 
            tabBarIcon: ({ focused, size = 24, color }) => 
              focused ? <Icons.FolderOpen size={size} color={color} /> : <Icons.FolderClosed size={size} color={color} />,
            // Keep browse alive for faster switching
            detachInactiveScreens: false,
            lazy: false,
            unmountOnBlur: false,
            tabBarTestID: 'browse-tab',
          }} 
        />
        <Tabs.Screen 
          name="(playlist)" 
          options={{ 
            title: "Playlist", 
            tabBarIcon: ({ color, size = 24 }) => <Icons.ListMusic color={color} size={size} />,
            // Keep playlist alive for instant switching
            detachInactiveScreens: false,
            lazy: false,
            unmountOnBlur: false,
            tabBarTestID: 'playlist-tab',
          }} 
        />
        <Tabs.Screen 
          name="(more)" 
          options={{ 
            title: "More", 
            tabBarIcon: ({ color, size = 24 }) => <Icons.Component color={color} size={size} />,
            // Keep more alive for faster switching
            detachInactiveScreens: false,
            lazy: false,
            unmountOnBlur: false,
            tabBarTestID: 'more-tab',
          }} 
        />
      </Tabs>
      <MiniPlayer />
      <VideoMiniPlayerConditional />
    </>
  );
});

export default TabLayouts;
