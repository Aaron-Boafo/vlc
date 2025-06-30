import React from 'react';
import { View, Image } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";

const AppLogo = ({ size = 24, width, height }) => {
  const { themeColors, isIncognito } = useThemeStore();

  const logoWidth = width || size;
  const logoHeight = height || size;

  if (isIncognito) {
    return (
      <View style={{ width: logoWidth, height: logoHeight }}>
        <Icons.UserCog size={logoWidth} color={themeColors.text} />
      </View>
    );
  }

  return (
    <Image
      source={require('../assets/images/Group-79-Visura.png')}
      style={{ width: logoWidth, height: logoHeight, resizeMode: 'contain' }}
      accessibilityLabel="Visura Logo"
    />
  );
};

AppLogo.defaultProps = {
  size: 24,
};

export default AppLogo; 