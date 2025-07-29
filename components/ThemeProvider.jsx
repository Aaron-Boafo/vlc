import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as StyledThemeProvider } from '../contexts/ThemeContext';

/**
 * ThemeProvider component that wraps the app with theme context.
 * This should be placed near the root of your app component tree.
 */
const AppThemeProvider = ({ children }) => {
  // This component now just passes through to the StyledThemeProvider
  // All theme logic is now handled in the ThemeContext
  return (
    <StyledThemeProvider>
      <StatusBar style="auto" />
      {children}
    </StyledThemeProvider>
  );
};

export default AppThemeProvider;
