import useThemeStore from "../../../store/theme";
import {StyleSheet, Text, View, Button} from "react-native";
import {StatusBar} from "expo-status-bar";
import {SafeAreaView} from "react-native-safe-area-context";
import Constants from "expo-constants";
import clsx from "clsx";

//get the height of the thr screen
const statusBarHeight = Constants.statusBarHeight;

export default function App() {
  const {themeColors, toggleTheme, activeTheme} = useThemeStore();
  return (
    <>
      <View
        style={{
          height: statusBarHeight,
          zIndex: 1,
          backgroundColor: themeColors.background,
          boxShadow:
            activeTheme === "dark"
              ? `0px 0px 20px ${themeColors.shadow}`
              : "none",
        }}
      >
        <StatusBar style={activeTheme === "light" ? "dark" : "light"} />
      </View>

      <SafeAreaView
        className={clsx(
          "flex-1 items-center justify-center",
          `bg-[${themeColors.background}]`
        )}
      >
        <View>
          <Text style={[styles.text, {color: themeColors.text}]}>Audio</Text>
          <Button title="Toggle Theme" onPress={toggleTheme} />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
  },
});
