import {View, Button} from "react-native";
import React from "react";
import useThemeStore from "../../../store/theme";

const index = () => {
  const {toggleTheme} = useThemeStore();
  return (
    <View className="flex-1 items-center justify-center">
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
};

export default index;
