import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";

const AccentColorPicker = ({ visible, onClose }) => {
  const { themeColors, setAccentColor, accentColor } = useThemeStore();

  const colors = [
    { id: 'purple', name: 'Purple', color: '#F44BF8' },
    { id: 'blue', name: 'Blue', color: '#2563EB' },
    { id: 'orange', name: 'Orange', color: '#EA580C' },
    { id: 'green', name: 'Green', color: '#16A34A' },
  ];

  const handleColorSelect = (colorId) => {
    setAccentColor(colorId);
    onClose();
  };

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
            {colors.map((color) => (
              <TouchableOpacity
                key={color.id}
                onPress={() => handleColorSelect(color.id)}
                className="items-center"
              >
                <View 
                  className="w-12 h-12 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: color.color }}
                >
                  {accentColor === color.id && (
                    <Icons.Check size={20} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  className="text-sm"
                  style={{ 
                    color: accentColor === color.id ? color.color : themeColors.text,
                    opacity: accentColor === color.id ? 1 : 0.7
                  }}
                >
                  {color.name}
                </Text>
              </TouchableOpacity>
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