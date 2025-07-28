import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { InteractionManager, Platform } from "react-native";
import useThemeStore from "../../store/theme";
import * as Icons from "lucide-react-native";
import MiniPlayer from "../../components/MiniPlayer";
<<<<<<< HEAD
import VideoMiniPlayerConditional from '../../components/VideoMiniPlayerConditional';
=======
import VideoMiniPlayer from "../../VideoComponents/VideoMiniPlayer";
>>>>>>> 34c9bd60238c31fb2eadb99b38cbfb9c403de3c7
import NavigationOptimizer from "../../utils/navigationOptimizer";
import DeviceOptimizer from "../../utils/deviceOptimizer";
import TabOptimizer from "../../utils/tabOptimizer";

const TabLayouts = React.memo(() => {
  const { themeColors } = useThemeStore();
<<<<<<< HEAD
  const [currentTab, setCurrentTab] = React.useState('(audio)');
  const [isTransitioning, setIsTransitioning] = React.useState(false);
=======
  const [currentTab, setCurrentTab] = React.useState("(audio)");
  const [tabsInitialized, setTabsInitialized] = React.useState(false);
>>>>>>> 34c9bd60238c31fb2eadb99b38cbfb9c403de3c7

  // Initialize navigation optimizer and prevent reloading
  useEffect(() => {
    NavigationOptimizer.clearCache(); // Clear any old cache
    DeviceOptimizer.logDeviceInfo(); // Log device info for debugging
<<<<<<< HEAD
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
=======

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
>>>>>>> 34c9bd60238c31fb2eadb99b38cbfb9c403de3c7

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
<<<<<<< HEAD
        screenOptions={screenOptions}
        screenListeners={screenListeners}
=======
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
>>>>>>> 34c9bd60238c31fb2eadb99b38cbfb9c403de3c7
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c9bd60238c31fb2eadb99b38cbfb9c403de3c7
        />
      </Tabs>
      <MiniPlayer />
      <VideoMiniPlayerConditional />
    </>
  );
});

export default TabLayouts;
