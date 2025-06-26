import { View, Text, FlatList, Button, TouchableOpacity } from "react-native";
import React from "react";
import useThemeStore from "../../../store/theme";
import usePlaylistStore from "../../../store/playlist"; // Assuming you have a playlist store

const PlaylistTab = () => {
    const { toggleTheme } = useThemeStore();
    const { playlists } = usePlaylistStore(); // Example: fetch playlists from global store

    const renderItem = ({ item }) => (
        <TouchableOpacity className="p-4 border-b border-gray-300">
            <Text className="text-lg font-semibold">{item.name}</Text>
            <Text className="text-sm text-gray-500">{item.songCount} songs</Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 p-4 bg-white dark:bg-black">
            <View className="mb-4 items-center">
                <Button title="Toggle Theme" onPress={toggleTheme} />
            </View>
            {playlists?.length ? (
                <FlatList
                    data={playlists}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                />
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500">No playlists yet. Start creating one!</Text>
                </View>
            )}
        </View>
    );
};

export default PlaylistTab;