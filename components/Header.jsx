import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import useThemeStore from '../store/theme';
import AppLogo from './AppLogo';
import * as Icons from "lucide-react-native";

const Header = ({ onMorePress, showMoreOptions = true }) => {
  const { themeColors } = useThemeStore();

  return (
    <View 
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, height: 110, backgroundColor: themeColors.background }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppLogo size={40} />
        <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 22, marginLeft: 12, alignSelf: 'center' }}>Visura</Text>
      </View>

      {showMoreOptions && (
        <TouchableOpacity onPress={onMorePress} style={{ alignSelf: 'center' }}>
          <Icons.MoreVertical size={28} color={themeColors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Header; 