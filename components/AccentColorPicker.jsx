import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";
import * as Haptics from 'expo-haptics';

// Import accent colors from theme store
const accentColors = {
  fuchsia: "#F44BF8",  // Original Fuchsia - Modern and energetic
  gold: "#FFD700",     // Vibrant Gold - Excellent visibility in all modes
  coral: "#FB6A4A",    // Warm Coral - Better visibility on light UI
  teal: "#14B8A6",     // Teal 500 - More vibrant and contrast-friendly
  purple: "#8B5CF6",   // Violet 500 - Pops nicely in dark UI
  blue: "#2563EB",     // Blue 600 - Calmer and more readable in both themes
  red: "#DC2626",      // Red 600 - Deeper tone, prevents glare
  gray: "#6B7280"      // Slate Gray 500 - Better on dark backgrounds
};

const AccentColorPicker = ({ visible, onClose }) => {
  const { themeColors, setAccentColor, accentColor: currentAccent } = useThemeStore();

  const colors = Object.entries(accentColors).map(([name, hex]) => ({
    name,
    hex
  }));

  const handleSelectColor = (color) => {
    setAccentColor(color.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
  const colorRows = chunkArray(colors, 4);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onClose}
      >
        <Pressable 
          className="mx-4 rounded-2xl p-4"
          style={{ backgroundColor: themeColors.background }}
        >
          <View className="mb-4">
            <Text 
              className="text-lg font-semibold mb-2"
              style={{ color: themeColors.text }}
            >
              Select Accent Color
            </Text>
            <Text
              className="text-sm"
              style={{ color: themeColors.text }}
            >
              Choose your preferred accent color for the app
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4 justify-center mb-4">
            {colorRows.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
                {row.map((color) => (
                  <TouchableOpacity
                    key={color.name}
                    onPress={() => handleSelectColor(color)}
                    style={{ alignItems: 'center', marginHorizontal: 8 }}
                  >
                    <View 
                      style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: color.hex }}
                    >
                      {currentAccent === color.name && (
                        <Icons.Check size={20} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      style={{ 
                        color: currentAccent === color.name ? color.hex : themeColors.text,
                        opacity: currentAccent === color.name ? 1 : 0.7,
                        fontSize: 14
                      }}
                    >
                      {color.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="py-3 rounded-xl items-center"
            style={{ backgroundColor: themeColors.primaryLight }}
          >
            <Text style={{ color: themeColors.primary }}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AccentColorPicker; 