import { useTheme } from '../contexts/ThemeContext';

/**
 * Custom hook to access theme values and functions
 * @returns {Object} Theme context with colors, theme info, and theme manipulation functions
 */
export const useAppTheme = () => {
  const theme = useTheme();
  
  // Helper function to get a color with opacity
  const withOpacity = (color, opacity) => {
    if (!color || !opacity) return color;
    
    // Convert hex to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // Helper function to get a darker/lighter shade of a color
  const adjustColor = (color, amount) => {
    if (!color) return color;
    
    // Convert hex to RGB
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    
    // Adjust brightness
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };
  
  return {
    ...theme,
    // Add theme colors for easy access
    colors: theme.colors || {},
    // Add theme type (light/dark)
    themeType: theme.theme || 'light',
    // Add helper functions
    withOpacity,
    adjustColor,
    // Add commonly used theme values
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      circle: 1000,
    },
    // Add shadow styles
    shadow: {
      sm: {
        shadowColor: theme.colors.shadow || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
      },
      md: {
        shadowColor: theme.colors.shadow || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      lg: {
        shadowColor: theme.colors.shadow || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
      },
    },
  };
};

export default useAppTheme;
