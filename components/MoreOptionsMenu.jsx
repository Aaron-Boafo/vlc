import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";

const MoreOptionsMenu = ({ visible, onClose }) => {
  const { themeColors, isIncognito, toggleIncognito } = useThemeStore();

  const handleIncognitoToggle = () => {
    toggleIncognito();
    onClose();
  };

  const handleRefresh = () => {
    // Add refresh logic here
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
        className="flex-1"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onClose}
      >
        <View 
          className="absolute right-4 top-16 rounded-lg overflow-hidden"
          style={{ backgroundColor: themeColors.background, minWidth: 200 }}
        >
          <TouchableOpacity
            className="flex-row items-center justify-between p-4"
            onPress={handleIncognitoToggle}
          >
            <View className="flex-row items-center">
              <Icons.EyeOff size={20} color={themeColors.text} className="mr-3" />
              <Text style={{ color: themeColors.text, marginLeft: 12 }}>
                Incognito mode
              </Text>
            </View>
            <View 
              className="w-5 h-5 rounded"
              style={{ 
                borderWidth: 2,
                borderColor: themeColors.text,
                backgroundColor: isIncognito ? themeColors.primary : 'transparent'
              }}
            >
              {isIncognito && (
                <Icons.Check size={16} color={themeColors.background} />
              )}
            </View>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          <TouchableOpacity
            className="flex-row items-center p-4"
            onPress={handleRefresh}
          >
            <Icons.RefreshCw size={20} color={themeColors.text} className="mr-3" />
            <Text style={{ color: themeColors.text, marginLeft: 12 }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

export default MoreOptionsMenu; 