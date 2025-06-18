import {Stack} from "expo-router";
import useThemeStore from "../../../store/useThemeStore";
import {View} from "react-native";
import {StatusBar} from "expo-status-bar";
import Constants from "expo-constants";

const AudioLayout = () => {
  const {themeColors, activeTheme} = useThemeStore();

  return (
    <>
      {/* the status bar will be white on light theme and black on dark theme */}
      <View
        style={{
          paddingTop: Constants.statusBarHeight + 5,
          backgroundColor: themeColors.background,
        }}
      >
        <StatusBar style={activeTheme === "light" ? "dark" : "light"} />
      </View>

      {/*the screens for the audio will be here  */}
      <Stack>
        <Stack.Screen name="index" options={{headerShown: false}} />
      </Stack>
    </>
  );
};

export default AudioLayout;
