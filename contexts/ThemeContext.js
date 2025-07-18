import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import useThemeStore from '../store/theme';

// Create the context
const ThemeContext = createContext();

// Create a provider component
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  // Get theme state and actions from the store
  const {
    activeTheme = 'light',
    accentColor = 'purple',
    themeColors = {},
    toggleTheme,
    setAccentColor,
    setBackground,
    selectedBackground,
    initializeTheme,
    _hasHydrated = false
  } = useThemeStore();

  // Initialize theme when the provider mounts
  useEffect(() => {
    if (!_hasHydrated) {
      initializeTheme();
    }
  }, [initializeTheme, _hasHydrated]);

  // StatusBar style is now handled by the StatusBar component in the layout

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme: activeTheme,
    accentColor,
    colors: themeColors,
    isDark: activeTheme === 'dark',
    toggleTheme,
    setAccentColor,
    setBackground,
    selectedBackground,
  }), [activeTheme, accentColor, themeColors, toggleTheme, setAccentColor, setBackground, selectedBackground]);

  // Don't render children until theme is initialized
  if (!_hasHydrated || !themeColors) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
