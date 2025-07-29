import { useAppTheme } from '../hooks/useAppTheme';

/**
 * Creates a style object with theme colors applied
 * @param {Function} stylesFn - Function that receives theme object and returns styles
 * @returns {Object} Style object with theme applied
 */
export const createThemedStyles = (stylesFn) => {
  return () => {
    const theme = useAppTheme();
    return stylesFn(theme);
  };
};

/**
 * Hook to get themed styles
 * @param {Function} stylesFn - Function that receives theme object and returns styles
 * @returns {Object} Style object with theme applied
 */
export const useThemedStyles = (stylesFn) => {
  const theme = useAppTheme();
  return stylesFn(theme);
};

/**
 * Creates a memoized style object that updates when theme changes
 * @param {Function} stylesFn - Function that receives theme object and returns styles
 * @returns {Object} Memoized style object
 */
export const memoizedStyles = (stylesFn) => {
  let cache = null;
  let lastTheme = null;
  
  return (theme) => {
    if (!cache || lastTheme !== theme.themeType) {
      cache = stylesFn(theme);
      lastTheme = theme.themeType;
    }
    return cache;
  };
};

/**
 * Get a color with opacity
 * @param {string} color - Hex color string
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA color string
 */
export const withOpacity = (color, opacity) => {
  if (!color || !opacity) return color;
  
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
