import {View, Text, TouchableOpacity, StyleSheet} from "react-native";
import useThemeStore from "../store/useThemeStore";
import * as Icons from "lucide-react-native";
import {router} from "expo-router";
import AudioControls from "../store/useAudioControl";

//navigation tab with it icons and callbacks
const headIcons = [
  {
    name: Icons.Search,
    callBack: () => {
      router.push("/searchMusic");
    },
  },
  {
    name: Icons.History,
    callBack: async () => {
      if (AudioControls.getState()?.playlist.length > 0) {
        await AudioControls.getState().previous();
      }
    },
  },
  {
    name: Icons.EllipsisVertical,
    callBack: () => {
      console.log("More");
    },
  },
];

const Title = () => {
  const {themeColors} = useThemeStore();

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      {/* left side */}
      <Text style={[styles.leftSide, {color: themeColors.text}]}>Music</Text>

      {/* right side */}
      <View style={[styles.rightSideContainer, {width: "25%"}]}>
        {headIcons.map((Items, index) => {
          return (
            <TouchableOpacity
              key={index}
              onPress={Items.callBack}
              activeOpacity={0.7}
            >
              <Items.name size={20} color={themeColors.text} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

//style sheet for the title components
const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#282828",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  leftSide: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  rightSideContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

export default Title;
