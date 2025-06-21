import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import useHistoryStore from '../store/historyStore';
import useThemeStore from '../store/theme';
import useAudioControl from '../store/useAudioControl';
import { useRouter } from 'expo-router';
import { Music4, Heart, MoreVertical } from 'lucide-react-native';

const HistoryScreen = () => {
  const { history, removeFromHistory, clearHistory } = useHistoryStore();
  const { themeColors } = useThemeStore();
  const audioControl = useAudioControl();
  const router = useRouter();

  const handlePlaySong = async (item) => {
    await audioControl.setAndPlayPlaylist([item]);
    router.push('/(tabs)/(audio)/player');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handlePlaySong(item)}
      activeOpacity={0.7}
    >
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.artwork} />
      ) : (
        <View style={styles.artworkPlaceholder}>
          <Music4 size={24} color={themeColors.text} />
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.artist, { color: themeColors.textSecondary }]} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={[styles.duration, { color: themeColors.textSecondary }]}> 
          {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:00'}
        </Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => removeFromHistory(item.id)}>
          <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (history.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Music4 size={80} color={themeColors.textSecondary} />
        <Text style={[styles.title, { color: themeColors.text }]}>No History Yet</Text>
        <Text style={[styles.artist, { color: themeColors.textSecondary }]}>Play some music to see your history here.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      <TouchableOpacity onPress={clearHistory} style={{ alignSelf: 'flex-end', margin: 12, padding: 8 }}>
        <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Clear History</Text>
      </TouchableOpacity>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  listContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  artwork: { width: 56, height: 56, borderRadius: 8, marginRight: 16 },
  artworkPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContainer: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  artist: { fontSize: 14, marginBottom: 2 },
  duration: { fontSize: 12 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 8, marginLeft: 4 },
});

export default HistoryScreen;
