import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import React, { useCallback } from "react";
import useThemeStore from "../../../store/theme";
import { usePlaylist } from "./Context";
import { Plus, Trash2, Music4 } from 'lucide-react-native';

const TrackCard = React.memo(({ item, onRemove, themeColors }) => (
  <View style={[styles.card, { backgroundColor: themeColors.card, shadowColor: themeColors.shadow }] }>
    <Music4 size={28} color={themeColors.primary} style={{ marginRight: 12 }} />
    <Text style={[styles.trackTitle, { color: themeColors.text }]} numberOfLines={1}>{item.title || 'Untitled Track'}</Text>
    <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
      <Trash2 size={20} color={themeColors.error || '#EF4444'} />
    </TouchableOpacity>
  </View>
));

const PlaylistScreen = () => {
  const { themeColors } = useThemeStore();
  const { playlist, dispatch } = usePlaylist();

  // Handlers
  const addTrack = useCallback(() => {
    dispatch({ type: 'ADD_TRACK', payload: { title: `Track ${playlist.length + 1}` } });
  }, [dispatch, playlist.length]);

  const clearPlaylist = useCallback(() => dispatch({ type: 'CLEAR_PLAYLIST' }), [dispatch]);

  const handleRemove = useCallback((index) => {
    dispatch({ type: 'REMOVE_TRACK', payload: index });
  }, [dispatch]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <TrackCard
        item={item}
        onRemove={() => handleRemove(index)}
        themeColors={themeColors}
      />
    ),
    [handleRemove, themeColors]
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }] }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Playlist</Text>
        {playlist.length > 0 && (
          <TouchableOpacity style={[styles.clearButton, { backgroundColor: themeColors.card }]} onPress={clearPlaylist}>
            <Trash2 size={18} color={themeColors.primary} />
            <Text style={[styles.clearButtonText, { color: themeColors.primary }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Playlist List */}
      <FlatList
        data={playlist}
        keyExtractor={item => item.id?.toString() || item.title || String(Math.random())}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Music4 size={48} color={themeColors.primary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No tracks in playlist.</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1, padding: 16 }}
        style={{ width: '100%' }}
        initialNumToRender={10}
        windowSize={10}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
      />
      {/* Floating Add Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: themeColors.primary }]} onPress={addTrack}>
        <Plus size={28} color={themeColors.background} />
      </TouchableOpacity>
    </View>
  );
};

PlaylistScreen.displayName = 'PlaylistScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  clearButtonText: {
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  trackTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PlaylistScreen;
