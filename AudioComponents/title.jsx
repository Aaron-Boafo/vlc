import {View, Text, TouchableOpacity} from "react-native";
import useThemeStore from "../store/theme";
import clsx from "clsx";
import * as Icons from "lucide-react-native";
import AudioControls from "../store/AudioControls";
import {router} from "expo-router";

const Title = () => {
  const {themeColors} = useThemeStore();

  const containerClasses = clsx(
    "flex flex-row items-center justify-between px-4 py-3 "
  );

  const appNameClasses = clsx("text-2xl font-bold ml-2");

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

  return (
    <View
      className={containerClasses}
      style={{backgroundColor: themeColors.background}}
    >
      <Text className={appNameClasses} style={{color: themeColors.text}}>
        Music
      </Text>

      <View
        className="flex flex-row items-center justify-between"
        style={{width: "25%"}}
      >
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

export default Title;
