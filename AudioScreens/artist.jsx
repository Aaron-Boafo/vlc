import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, StyleSheet, TextInput } from 'react-native';
import useThemeStore from '../store/theme';
import useAudioStore from '../store/AudioHeadStore';
import useAudioControl from '../store/useAudioControl';
import SearchBar from '../components/SearchBar';

const ArtistScreen = ({ showSearch, searchQuery, setSearchQuery, setShowSearch }) => {
  const { themeColors } = useThemeStore();
  const { audioFiles } = useAudioStore();
  const audioControl = useAudioControl();
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get unique artists
  const artists = useMemo(() => {
    const map = new Map();
    audioFiles.forEach(track => {
      if (!map.has(track.artist)) {
        map.set(track.artist, {
          artist: track.artist,
          artwork: track.artwork,
        });
      }
    });
    return Array.from(map.values());
  }, [audioFiles]);

  // Filter artists based on search query
  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artists;
    return artists.filter(artist =>
      artist.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artists, searchQuery]);

  // Get tracks for selected artist
  const artistTracks = useMemo(() => {
    if (!selectedArtist) return [];
    return audioFiles.filter(track => track.artist === selectedArtist.artist);
  }, [selectedArtist, audioFiles]);

  const handleArtistPress = (artist) => {
    setSelectedArtist(artist);
    setModalVisible(true);
  };

  const handlePlayTrack = async (track) => {
    const index = artistTracks.findIndex(t => t.id === track.id);
    if (index !== -1 && track.uri) {
      await audioControl.setAndPlayPlaylist(artistTracks, index);
      setModalVisible(false);
    } else {
      alert('This track has no valid audio file.');
    }
  };

  const renderArtist = ({ item }) => (
    <TouchableOpacity style={[styles.artistItem, { backgroundColor: themeColors.card }]} onPress={() => handleArtistPress(item)}>
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.artistArt} />
      ) : (
        <View style={[styles.artistArt, { backgroundColor: themeColors.sectionBackground, justifyContent: 'center', alignItems: 'center' }]}> 
          <Text style={{ color: themeColors.textSecondary, fontSize: 24 }}>🎤</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }} weight="Bold">{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search artists..."
          themeColors={themeColors}
          onClose={() => {
            setSearchQuery('');
            if (typeof setShowSearch === 'function') setShowSearch(false);
          }}
        />
      )}
      <FlatList
        data={filteredArtists}
        keyExtractor={item => item.artist}
        renderItem={renderArtist}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 40 }}>
            {searchQuery ? 'No artists found' : 'No artists found.'}
          </Text>
        }
      />
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: themeColors.background, padding: 16 }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 20, marginBottom: 12 }}>{selectedArtist?.artist}</Text>
          <FlatList
            data={artistTracks}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.trackItem} onPress={() => handlePlayTrack(item)}>
                <Text style={{ color: themeColors.text }}>{item.title}</Text>
                <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>{item.album}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: themeColors.textSecondary }}>No tracks for this artist.</Text>}
          />
          <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 20, alignSelf: 'center' }}>
            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  artistArt: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  trackItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
});

export default ArtistScreen;
