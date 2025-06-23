import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";
import * as Haptics from 'expo-haptics';

const AccentColorPicker = ({ visible, onClose }) => {
  const { themeColors, setAccentColor, accentColor: currentAccent } = useThemeStore();

  const colors = [
    { name: 'purple', hex: '#F44BF8' },
    { name: 'blue', hex: '#00FFFF' },
    { name: 'orange', hex: '#EA580C' },
    { name: 'lime', hex: '#32CD32' },
    { name: 'red', hex: '#EF4444' },
    { name: 'amber', hex: '#FFBF00' },
    { name: 'indigo', hex: '#4B0082' },
    { name: 'gray', hex: '#64748B' },
  ];

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