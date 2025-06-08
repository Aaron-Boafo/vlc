import {View, Text, TouchableOpacity} from "react-native";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import clsx from "clsx";
import useAudioStore from "../store/AudioHeadStore";

const toggleButton = ({activePage = "all"}) => {
  const {themeColors} = useThemeStore();
  const {toggleTabs} = useAudioStore();
  const size = 24;

  return (
    <View className="flex flex-row  w-[95%] mx-auto my-3 rounded-lg p-1 justify-between items-center bg-gray-500   ">
      {/* the all button page */}

      {tags.map((tag, index) => (
        <TouchableOpacity
          onPress={() => toggleTabs(tag.name)}
          className={clsx(
            "flex flex-row justify-center items-center gap-x-2 px-3 py-2",
            activePage === tag.name && "bg-slate-900 rounded-lg"
          )}
          key={index}
        >
          <tag.icon
            size={size}
            color={
              activePage === tag.name ? themeColors.primary : themeColors.text
            }
          />
          {activePage === tag.name && (
            <Text
              style={{
                color:
                  activePage === tag.name
                    ? themeColors.primary
                    : themeColors.text,
              }}
            >
              {" "}
              {tag.name.toLocaleUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const tags = [
  {
    name: "all",
    icon: Icons.LayoutGrid,
  },
  {
    name: "playlist",
    icon: Icons.ListVideo,
  },
  {
    name: "album",
    icon: Icons.Disc3,
  },
  {
    name: "artist",
    icon: Icons.SquareUserRound,
  },
  {
    name: "history",
    icon: Icons.Clock,
  },
];

export default toggleButton;
