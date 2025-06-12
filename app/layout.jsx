import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useState } from 'react';
import useThemeStore from '../store/theme';
import Header from '../components/Header';
import MoreOptionsMenu from '../components/MoreOptionsMenu';

const RootLayout = () => {
  const { themeColors } = useThemeStore();
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Header 
        onMorePress={() => setShowMoreOptions(true)}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: themeColors.background },
        }}
      />
      <MoreOptionsMenu 
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
      />
    </View>
  );
};

export default RootLayout; 