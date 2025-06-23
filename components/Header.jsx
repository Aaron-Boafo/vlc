import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import useThemeStore from '../store/theme';
import AppLogo from './AppLogo';
import * as Icons from "lucide-react-native";

const Header = ({ onMorePress, showMoreOptions = true }) => {
  const { themeColors } = useThemeStore();

  return (
    <View 
      className="flex-row items-center justify-between px-4 py-3"
      style={{ backgroundColor: themeColors.background }}
    >
      <View className="flex-row items-center">
        <AppLogo size={28} />
        <Text 
          className="text-xl font-semibold ml-2"
          style={{ color: themeColors.text }}
        >
          Visura
        </Text>
      </View>

      {showMoreOptions && (
        <TouchableOpacity onPress={onMorePress}>
          <Icons.MoreVertical size={24} color={themeColors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Header; 