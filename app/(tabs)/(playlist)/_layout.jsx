import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

const Playlist = () => {
    const [playlist, setPlaylist] = useState([]);

    const addTrack = (track) => {
        setPlaylist([...playlist, track]);
    };

    const removeTrack = (index) => {
        setPlaylist(playlist.filter((_, i) => i !== index));
    };

    const clearPlaylist = () => {
        setPlaylist([]);
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.trackItem}>
            <Text style={styles.trackText}>
                {item.title} ({item.duration})
            </Text>
            <TouchableOpacity onPress={() => removeTrack(index)} style={styles.removeButton}>
                <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Playlist' }} />
            <Text style={styles.title}>Playlist</Text>

            <FlatList
                data={playlist}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
            />

            <TouchableOpacity
                onPress={() =>
                    addTrack({
                        title: 'New Track',
                        path: 'file:///C:/Music/newtrack.mp3',
                        duration: '3:45',
                    })
                }
                style={styles.addButton}
            >
                <Text style={styles.buttonText}>Add Sample Track</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={clearPlaylist} style={styles.clearButton}>
                <Text style={styles.buttonText}>Clear Playlist</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, flex: 1, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    trackItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    trackText: { fontSize: 16 },
    removeButton: { backgroundColor: '#ff4d4d', padding: 8, borderRadius: 5 },
    addButton: { backgroundColor: '#4caf50', padding: 12, marginTop: 20, borderRadius: 5 },
    clearButton: { backgroundColor: '#2196f3', padding: 12, marginTop: 10, borderRadius: 5 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default Playlist;