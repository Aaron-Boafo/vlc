import { Stack } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import useThemeStore from "../../../store/theme";

const MoreLayout = () => {
  const { themeColors, activeTheme } = useThemeStore();

  return (
    <>
      <StatusBar style={activeTheme === "light" ? "dark" : "light"} />
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: themeColors.background,
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="about" />
        </Stack>
      </View>
    </>
  );
};

export default MoreLayout;
