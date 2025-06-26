import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import useThemeStore from '../../../store/theme';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AudioHeader from '../../../AudioComponents/title';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';
import FileBrowser from '../../../components/FileBrowser';
import * as DocumentPicker from 'expo-document-picker';

const BrowseTab = () => {
  const { themeColors } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showStorageSheet, setShowStorageSheet] = useState(false);
  const [storageRoot, setStorageRoot] = useState(null);
  const [storageTitle, setStorageTitle] = useState('');
  const [storages, setStorages] = useState([
    { id: 'internal', name: 'Internal Storage', icon: 'folder', root: FileSystem.documentDirectory }
  ]);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 1, percent: 0 });

  const categories = [
    { id: 'all', name: 'All Files', icon: 'folder-multiple', color: '#4CAF50' },
    { id: 'video', name: 'Videos', icon: 'video', color: '#FF5722' },
    { id: 'audio', name: 'Audio', icon: 'music', color: '#2196F3' },
    { id: 'images', name: 'Images', icon: 'image', color: '#9C27B0' },
    { id: 'documents', name: 'Documents', icon: 'file-document', color: '#607D8B' },
  ];

  const quickActions = [
    { id: 'scan', name: 'Scan Files', icon: 'folder-search', action: () => scanFiles() },
    { id: 'import', name: 'Import Media', icon: 'import', action: () => importMedia() },
    { id: 'organize', name: 'Organize', icon: 'folder-multiple-outline', action: () => organizeFiles() },
    { id: 'cleanup', name: 'Clean Up', icon: 'delete-sweep', action: () => cleanupFiles() },
  ];

  useEffect(() => {
    loadRecentFiles();
    detectSDCard();
    fetchStorageInfo();
  }, []);

  const loadRecentFiles = async () => {
    setIsLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setRecentFiles([]);
        setIsLoading(false);
        return;
      }
      // Fetch recent audio files
      const audioAssets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 20,
        sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
      });
      // Fetch recent video files
      const videoAssets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        first: 20,
        sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
      });
      // Combine and sort by modification date
      const allAssets = [...audioAssets.assets, ...videoAssets.assets];
      allAssets.sort((a, b) => (b.modificationTime || 0) - (a.modificationTime || 0));
      // Map to recentFiles format
      const files = allAssets.slice(0, 20).map(asset => ({
        id: asset.id,
        name: asset.filename,
        type: asset.mediaType === 'audio' ? 'audio' : 'video',
        size: asset.duration ? `${(asset.duration / 60).toFixed(2)} min` : '',
        date: asset.modificationTime ? new Date(asset.modificationTime * 1000).toLocaleDateString() : '',
        uri: asset.uri,
      }));
      setRecentFiles(files);
    } catch (error) {
      console.error('Error loading recent files:', error);
      setRecentFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectSDCard = async () => {
    // Common SD card mount points on Android
    const sdCardPaths = [
      '/storage/sdcard1/',
      '/storage/extSdCard/',
      '/storage/usbcard1/',
      '/storage/udisk/',
      '/storage/','/mnt/media_rw/'
    ];
    for (const base of sdCardPaths) {
      try {
        const info = await FileSystem.getInfoAsync(base);
        if (info.exists && info.isDirectory) {
          setStorages(prev => [
            ...prev.filter(s => s.id !== 'sdcard'),
            { id: 'sdcard', name: 'SD Card', icon: 'folder', root: base }
          ]);
          break;
        }
      } catch {}
    }
  };

  const scanFiles = async () => {
    await loadRecentFiles();
    Alert.alert('Scan Complete', 'Media files have been refreshed.');
  };

  const importMedia = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: false,
        multiple: true,
      });
      if (result.type === 'success') {
        // Copy the file(s) to the app's document directory
        const files = Array.isArray(result) ? result : [result];
        for (const file of files) {
          const destPath = FileSystem.documentDirectory + file.name;
          await FileSystem.copyAsync({ from: file.uri, to: destPath });
        }
        Alert.alert('Import Complete', 'Media file(s) imported successfully.');
        await loadRecentFiles();
      }
    } catch (error) {
      Alert.alert('Import Failed', 'Could not import media file(s).');
    }
  };

  const organizeFiles = () => {
    Alert.alert('Organize Files', 'File organization functionality coming soon!');
  };

  const cleanupFiles = () => {
    Alert.alert('Clean Up', 'File cleanup functionality coming soon!');
  };

  const handleFilePress = (file) => {
    switch (file.type) {
      case 'video':
        router.push('/(tabs)/(video)');
        break;
      case 'audio':
        router.push('/(tabs)/(audio)');
        break;
      default:
        Alert.alert('File Type', `${file.type} files are not yet supported.`);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        { backgroundColor: themeColors.card },
        selectedCategory === item.id && { borderColor: item.color, borderWidth: 2 }
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={[styles.categoryName, { color: themeColors.text }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentFile = ({ item }) => (
    <TouchableOpacity
      style={[styles.recentFileCard, { backgroundColor: themeColors.card }]}
      onPress={() => handleFilePress(item)}
    >
      <View style={styles.fileInfo}>
        <MaterialCommunityIcons 
          name={getFileIcon(item.type)} 
          size={24} 
          color={getFileColor(item.type)} 
        />
        <View style={styles.fileDetails}>
          <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.fileMeta, { color: themeColors.textSecondary }]}>
            {item.size} • {item.date}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: themeColors.card }]}
      onPress={item.action}
    >
      <MaterialCommunityIcons 
        name={item.icon} 
        size={28} 
        color={themeColors.primary} 
      />
      <Text style={[styles.quickActionText, { color: themeColors.text }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const getFileIcon = (type) => {
    switch (type) {
      case 'video': return 'video';
      case 'audio': return 'music';
      case 'image': return 'image';
      case 'document': return 'file-document';
      default: return 'file';
    }
  };

  const getFileColor = (type) => {
    switch (type) {
      case 'video': return '#FF5722';
      case 'audio': return '#2196F3';
      case 'image': return '#9C27B0';
      case 'document': return '#607D8B';
      default: return themeColors.textSecondary;
    }
  };

  const openStorage = (storage) => {
    setStorageRoot(storage.root);
    setStorageTitle(storage.name);
    setShowStorageSheet(true);
  };

  const fetchStorageInfo = async () => {
    try {
      const total = await FileSystem.getTotalDiskCapacityAsync();
      const free = await FileSystem.getFreeDiskStorageAsync();
      const used = total - free;
      const percent = total > 0 ? used / total : 0;
      setStorageInfo({ used, total, percent });
    } catch (e) {
      setStorageInfo({ used: 0, total: 1, percent: 0 });
    }
  };

  return (
    <SafeAreaViewRN
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={['top']}
    >
      <AudioHeader
        onSearch={() => setShowSearch(s => !s)}
        onMore={() => setShowMore(true)}
      />
      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
          <MaterialIcons name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search files..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <ScrollView style={[styles.content, { paddingTop: 0, marginTop: 0 }]} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Categories
          </Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionCard, { backgroundColor: themeColors.card }]}
                onPress={action.action}
              >
                <MaterialCommunityIcons 
                  name={action.icon} 
                  size={28} 
                  color={themeColors.primary} 
                />
                <Text style={[styles.quickActionText, { color: themeColors.text }]}>
                  {action.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Files */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
              Recent Files
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: themeColors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          {(selectedCategory === 'images' || selectedCategory === 'documents') ? (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '500' }}>
                {selectedCategory === 'images' ? 'Image browsing' : 'Document browsing'} is coming soon!
              </Text>
            </View>
          ) : (
            <FlatList
              data={
                selectedCategory === 'all'
                  ? recentFiles
                  : recentFiles.filter(f => f.type === selectedCategory)
              }
              renderItem={renderRecentFile}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Storage Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Storages</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {storages.map(storage => (
              <TouchableOpacity
                key={storage.id}
                style={[styles.storageCard, { backgroundColor: themeColors.card, flex: 1 }]}
                onPress={() => openStorage(storage)}
              >
                <View style={styles.storageHeader}>
                  <MaterialIcons name="storage" size={24} color={themeColors.primary} />
                  <Text style={[styles.storageTitle, { color: themeColors.text }]}>{storage.name}</Text>
                </View>
                <View style={styles.storageBar}>
                  <View style={[styles.storageProgress, { backgroundColor: themeColors.primary, width: `${Math.round(storageInfo.percent * 100)}%` }]} />
                </View>
                <Text style={[styles.storageText, { color: themeColors.textSecondary }]}> 
                  {`${(storageInfo.used / (1024 ** 3)).toFixed(2)} GB of ${(storageInfo.total / (1024 ** 3)).toFixed(2)} GB used`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Modal
          visible={showStorageSheet}
          animationType="slide"
          onRequestClose={() => setShowStorageSheet(false)}
          transparent={false}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: themeColors.card }}>
              <TouchableOpacity onPress={() => setShowStorageSheet(false)}>
                <MaterialIcons name="arrow-back" size={28} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 16, color: themeColors.text }}>{storageTitle}</Text>
            </View>
            {storageRoot && (
              <FileBrowser rootPath={storageRoot} filterTypes={['audio', 'video']} hideHeader={true} />
            )}
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaViewRN>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesList: {
    paddingRight: 16,
  },
  categoryCard: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 12,
  },
  storageCard: {
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  storageBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  storageProgress: {
    height: '100%',
    borderRadius: 4,
  },
  storageText: {
    fontSize: 14,
  },
});

export default BrowseTab;
