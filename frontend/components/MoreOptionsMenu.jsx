import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";

const MoreOptionsMenu = ({ visible, onClose, onSettings, onAbout }) => {
  const { themeColors } = useThemeStore();

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
            className="flex-row items-center p-4"
            onPress={handleRefresh}
          >
            <Icons.RefreshCw size={20} color={themeColors.text} className="mr-3" />
            <Text style={{ color: themeColors.text, marginLeft: 12 }}>
              Refresh
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center p-4"
            onPress={() => { onSettings && onSettings(); onClose(); }}
          >
            <Icons.Settings size={20} color={themeColors.text} className="mr-3" />
            <Text style={{ color: themeColors.text, marginLeft: 12 }}>
              Settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center p-4"
            onPress={() => { onAbout && onAbout(); onClose(); }}
          >
            <Icons.Info size={20} color={themeColors.text} className="mr-3" />
            <Text style={{ color: themeColors.text, marginLeft: 12 }}>
              About
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

export default MoreOptionsMenu; 