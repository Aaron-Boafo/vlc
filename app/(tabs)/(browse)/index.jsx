import {View, Button} from "react-native";
import React from "react";
import ThemeStore from "../../../store/useThemeStore";

const index = () => {
  const {toggleTheme} = ThemeStore();
  return (
    <View className="flex-1 items-center justify-center">
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
};

export default index;
