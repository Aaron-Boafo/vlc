// Accessibility and theme enhancements
import { AccessibilityInfo, Appearance } from 'react-native';

class AccessibilityEnhancer {
  constructor() {
    this.isScreenReaderEnabled = false;
    this.isReduceMotionEnabled = false;
    this.colorScheme = Appearance.getColorScheme();
    this.initializeAccessibility();
  }

  async initializeAccessibility() {
    try {
      // Check screen reader status
      this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Check reduce motion preference
      this.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      
      // Listen for changes
      AccessibilityInfo.addEventListener('screenReaderChanged', this.handleScreenReaderChange);
      AccessibilityInfo.addEventListener('reduceMotionChanged', this.handleReduceMotionChange);
      Appearance.addChangeListener(this.handleColorSchemeChange);
      
    } catch (error) {
      console.log('Accessibility initialization failed:', error);
    }
  }

  handleScreenReaderChange = (isEnabled) => {
    this.isScreenReaderEnabled = isEnabled;
    console.log('Screen reader:', isEnabled ? 'enabled' : 'disabled');
  };

  handleReduceMotionChange = (isEnabled) => {
    this.isReduceMotionEnabled = isEnabled;
    console.log('Reduce motion:', isEnabled ? 'enabled' : 'disabled');
  };

  handleColorSchemeChange = ({ colorScheme }) => {
    this.colorScheme = colorScheme;
    console.log('Color scheme changed to:', colorScheme);
  };

  // Get accessibility-optimized props for components
  getAccessibilityProps(type, options = {}) {
    const baseProps = {
      accessible: true,
      accessibilityRole: type,
    };

    switch (type) {
      case 'button':
        return {
          ...baseProps,
          accessibilityRole: 'button',
          accessibilityLabel: options.label,
          accessibilityHint: options.hint,
          accessibilityState: {
            disabled: options.disabled || false,
            selected: options.selected || false,
          },
        };

      case 'slider':
        return {
          ...baseProps,
          accessibilityRole: 'adjustable',
          accessibilityLabel: options.label,
          accessibilityValue: {
            min: options.min || 0,
            max: options.max || 100,
            now: options.current || 0,
            text: options.valueText,
          },
        };

      case 'image':
        return {
          ...baseProps,
          accessibilityRole: 'image',
          accessibilityLabel: options.label || 'Image',
          accessible: !!options.label, // Only accessible if has meaningful label
        };

      case 'text':
        return {
          ...baseProps,
          accessibilityRole: 'text',
          accessibilityLabel: options.label,
        };

      default:
        return baseProps;
    }
  }

  // Get animation props based on reduce motion preference
  getAnimationProps(defaultProps = {}) {
    if (this.isReduceMotionEnabled) {
      return {
        ...defaultProps,
        duration: 0,
        useNativeDriver: false,
      };
    }
    return defaultProps;
  }

  // Get contrast-optimized colors
  getContrastOptimizedColors(baseColors) {
    // Increase contrast for better accessibility
    const contrastMultiplier = this.isScreenReaderEnabled ? 1.2 : 1.0;
    
    return {
      ...baseColors,
      text: this.adjustContrast(baseColors.text, contrastMultiplier),
      textSecondary: this.adjustContrast(baseColors.textSecondary, contrastMultiplier),
      primary: this.adjustContrast(baseColors.primary, contrastMultiplier),
    };
  }

  adjustContrast(color, multiplier) {
    // Simple contrast adjustment (in a real app, use a proper color library)
    if (multiplier === 1.0) return color;
    
    // This is a simplified version - use a proper color manipulation library
    return color;
  }

  // Get font size adjustments
  getFontSizeAdjustment() {
    // In a real app, you'd get this from system settings
    return this.isScreenReaderEnabled ? 1.2 : 1.0;
  }

  // Announce important changes to screen readers
  announceForAccessibility(message) {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Cleanup
  cleanup() {
    AccessibilityInfo.removeEventListener('screenReaderChanged', this.handleScreenReaderChange);
    AccessibilityInfo.removeEventListener('reduceMotionChanged', this.handleReduceMotionChange);
    Appearance.removeChangeListener(this.handleColorSchemeChange);
  }
}

export default new AccessibilityEnhancer();