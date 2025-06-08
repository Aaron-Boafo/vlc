import useThemeStore from "../../../store/theme";
import {View} from "react-native";
import Head from "../../../AudioComponents/title";
import ToggleBar from "../../../AudioComponents/toggleButton";
import useAudioStore from "../../../store/AudioHeadStore";

export default function App() {
  const {activeTab} = useAudioStore();
  const {themeColors} = useThemeStore();
  return (
    <>
      {/* the vlc header with it components */}
      <Head activePage={activeTab} />

      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
        }}
      >
        {/* the toggle bar to move between components */}
        <ToggleBar activePage={activeTab} />
      </View>
    </>
  );
}
