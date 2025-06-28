import {View, Button, Text, FlatList, TouchableOpacity} from "react-native";
import React from "react";
import useThemeStore from "../../../store/theme";
import { usePlaylist } from "./Context";

const index = () => {
  const {toggleTheme} = useThemeStore();
  const { playlist, dispatch } = usePlaylist();

  // Demo: Add a dummy track
  const addTrack = () => {
    dispatch({ type: 'ADD_TRACK', payload: { title: `Track ${playlist.length + 1}` } });
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button title="Toggle Theme" onPress={toggleTheme} />
      <Button title="Add Track" onPress={addTrack} />
      <Button title="Clear Playlist" onPress={() => dispatch({ type: 'CLEAR_PLAYLIST' })} />
      <Text style={{ marginTop: 20, fontWeight: 'bold' }}>Playlist:</Text>
      <FlatList
        data={playlist}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <Text>{item.title || 'Untitled Track'}</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_TRACK', payload: index })}>
              <Text style={{ color: 'red', marginLeft: 10 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text>No tracks in playlist.</Text>}
        style={{ marginTop: 10, width: 200 }}
      />
    </View>
  );
};

export default index;
