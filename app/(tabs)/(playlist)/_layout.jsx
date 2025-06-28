import {Stack} from "expo-router";
import { PlaylistProvider } from "./Context";

const AudioLayout = () => {
  return (
    <PlaylistProvider>
      <Stack />
    </PlaylistProvider>
  );
};

export default AudioLayout;
