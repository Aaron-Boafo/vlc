import {View, Text, TouchableOpacity} from "react-native";
import useThemeStore from "../store/theme";
import clsx from "clsx";
import * as Icons from "lucide-react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const Title = ({activePage = "all"}) => {
  const {themeColors} = useThemeStore();

  const containerClasses = clsx(
    "flex flex-row items-center justify-between px-4 py-3 border-b border-gray-500"
  );
  const appIconClasses = clsx(
    "w-12 h-12 justify-center items-center rounded-md"
  );
  const appNameClasses = clsx("text-2xl font-bold ml-2");

  return (
    <View
      className={containerClasses}
      style={{backgroundColor: themeColors.background}}
    >
      {/* Left side - App icon and name */}
      <TouchableOpacity
        className="flex flex-row items-center gap-x-2"
        activeOpacity={0.7}
      >
        <View
          className={appIconClasses}
          style={{
            backgroundColor: themeColors.primary,
            opacity: 0.4,
          }}
        />
        <Text className={appNameClasses} style={{color: themeColors.text}}>
          App
        </Text>
      </TouchableOpacity>

      {/* Right side - Action icons */}
      <View className="flex flex-row items-center gap-x-2">
        {activePage !== "playlist" && (
          <TouchableOpacity activeOpacity={0.7}>
            <Icons.Search size={20} color={themeColors.text} />
          </TouchableOpacity>
        )}

        {(activePage === "playlist" || activePage === "all") && (
          <TouchableOpacity activeOpacity={0.7}>
            <MaterialCommunityIcons
              name="tune"
              size={20}
              color={themeColors.text}
            />
          </TouchableOpacity>
        )}

        {activePage !== "playlist" && activePage !== "all" && (
          <TouchableOpacity activeOpacity={0.7}>
            <Icons.History size={20} color={themeColors.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.7}>
          <Icons.EllipsisVertical size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Title;
