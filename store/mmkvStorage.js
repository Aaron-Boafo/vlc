import {MMKV} from "react-native-mmkv";
import {getAudioMetadata} from "@missingcore/audio-metadata";

export const mmkvStorage = new MMKV();

export async function fetchMetadata(uri) {
  const data = await getAudioMetadata(uri, ["artwork"]);
  return data.metadata.artwork ?? null;
}
