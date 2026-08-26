
import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";
import * as Haptics from 'expo-haptics';

// Import accent colors from theme store
const accentColors = {
  fuchsia: "#F44BF8",  // Original Fuchsia - Modern and energetic
  orange: '#F97316',
  green: '#10B981',
  teal: "#14B8A6",     // Teal 500 - More vibrant and contrast-friendly
  purple: "#8B5CF6",   // Violet 500 - Pops nicely in dark UI
  blue: "#2563EB",     // Blue 600 - Calmer and more readable in both themes
  red: "#D71920",      // Red 600 - Deeper tone, prevents glare
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
          <View className="mb-6">
            <Text 
              className="text-xl font-bold mb-1"
              style={{ 
                color: themeColors.text,
                textAlign: 'center',
                fontSize: 20
              }}
            >
              Accent Color
            </Text>
            <Text
              className="text-sm text-center px-4"
              style={{ 
                color: themeColors.textSecondary,
                fontSize: 14,
                lineHeight: 20
              }}
              numberOfLines={2}
            >
              Choose your preferred color
            </Text>
          </View>

          <View className="mb-4">
            {colorRows.map((row, rowIdx) => (
              <View 
                key={rowIdx} 
                style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  marginBottom: 16
                }}
              >
                {row.map((color) => (
                  <TouchableOpacity
                    key={color.name}
                    onPress={() => handleSelectColor(color)}
                    style={{ alignItems: 'center', marginHorizontal: 8 }}
                  >
                    <View 
                      style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 28, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: color.hex,
                        marginBottom: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 3
                      }}
                    >
                      {currentAccent === color.name && (
                        <Icons.Check size={20} color="#FFFFFF" />
                      )}
                    </View>
                    <Text 
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ 
                        color: currentAccent === color.name ? color.hex : themeColors.text,
                        opacity: currentAccent === color.name ? 1 : 0.7,
                        fontSize: 12,
                        fontWeight: '500',
                        maxWidth: 60,
                        textAlign: 'center',
                        textTransform: 'capitalize'
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
            style={{ 
              backgroundColor: themeColors.card,
              borderWidth: 1,
              borderColor: themeColors.border
            }}
          >
            <Text style={{ 
              color: themeColors.text,
              fontWeight: '500'
            }}>
              Done
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AccentColorPicker; 