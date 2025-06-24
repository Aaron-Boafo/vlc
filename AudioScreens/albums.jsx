import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import useThemeStore from '../store/theme';
import useAudioStore from '../store/AudioHeadStore';
import useAudioControl from '../store/useAudioControl';

const Albums = () => {
  const { themeColors } = useThemeStore();
  const { audioFiles } = useAudioStore();
  const audioControl = useAudioControl();
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get unique albums
  const albums = useMemo(() => {
    const map = new Map();
    audioFiles.forEach(track => {
      if (!map.has(track.album)) {
        map.set(track.album, {
          album: track.album,
          artist: track.artist,
          artwork: track.artwork,
        });
      }
    });
    return Array.from(map.values());
  }, [audioFiles]);

  // Get tracks for selected album
  const albumTracks = useMemo(() => {
    if (!selectedAlbum) return [];
    return audioFiles.filter(track => track.album === selectedAlbum.album);
  }, [selectedAlbum, audioFiles]);

  const handleAlbumPress = (album) => {
    setSelectedAlbum(album);
    setModalVisible(true);
  };

  const handlePlayTrack = async (track) => {
    await audioControl.setAndPlayPlaylist(albumTracks, track);
    setModalVisible(false);
  };

  const renderAlbum = ({ item }) => (
    <TouchableOpacity style={[styles.albumItem, { backgroundColor: themeColors.card }]} onPress={() => handleAlbumPress(item)}>
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, { backgroundColor: themeColors.sectionBackground, justifyContent: 'center', alignItems: 'center' }]}> 
          <Text style={{ color: themeColors.textSecondary, fontSize: 24 }}>🎵</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }} weight="Bold">{item.album}</Text>
        <Text style={{ color: themeColors.textSecondary }}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <FlatList
        data={albums}
        keyExtractor={item => item.album}
        renderItem={renderAlbum}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 40 }}>No albums found.</Text>}
      />
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: themeColors.background, padding: 16 }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 20, marginBottom: 12 }} weight="Bold">{selectedAlbum?.album}</Text>
          <Text style={{ color: themeColors.textSecondary, marginBottom: 20 }}>{selectedAlbum?.artist}</Text>
          <FlatList
            data={albumTracks}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.trackItem} onPress={() => handlePlayTrack(item)}>
                <Text style={{ color: themeColors.text }}>{item.title}</Text>
                <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>{item.artist}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: themeColors.textSecondary }}>No tracks in this album.</Text>}
          />
          <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 20, alignSelf: 'center' }}>
            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }} weight="Bold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  trackItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default Albums;
