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
  Modal as RNModal,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Icons from 'lucide-react-native';
import useThemeStore from '../../../store/theme';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AudioHeader from '../../../AudioComponents/title';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';
import FileBrowser from '../../../components/FileBrowser';
import * as DocumentPicker from 'expo-document-picker';
import StreamModal from '../../../components/StreamModal';

const BrowseTab = ({ styles, themeColors }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedQuickAction, setSelectedQuickAction] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showStorageSheet, setShowStorageSheet] = useState(false);
  const [storageRoot, setStorageRoot] = useState(null);
  const [storageTitle, setStorageTitle] = useState('');
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [storages, setStorages] = useState([
    { id: 'internal', name: 'Internal Storage', icon: 'folder', root: FileSystem.documentDirectory }
  ]);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 1, percent: 0 });
  const [organizeModalVisible, setOrganizeModalVisible] = useState(false);

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
    { id: 'organize', name: 'Organize', icon: 'folder-multiple-outline', action: () => setOrganizeModalVisible(true) },
    { id: 'cloud', name: 'Cloud Services', icon: 'cloud-outline', action: () => cloudServices() },
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
      '/storage/', '/mnt/media_rw/'
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
      } catch { }
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

  const handleSortByName = () => {
    setOrganizeModalVisible(false);
    Alert.alert('Sort', 'Sorting by name (A-Z)...');
    // Implement actual sort logic here
  };

  const handleSortByDate = () => {
    setOrganizeModalVisible(false);
    Alert.alert('Sort', 'Sorting by date (newest first)...');
    // Implement actual sort logic here
  };

  const handleCreateFolder = async () => {
    setOrganizeModalVisible(false);

    // Prompt user for folder name
    Alert.prompt(
      'Create Folder',
      'Enter folder name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (folderName) => {
            if (folderName && folderName.trim()) {
              try {
                const newFolderPath = FileSystem.documentDirectory + folderName.trim();
                const folderInfo = await FileSystem.getInfoAsync(newFolderPath);

                if (folderInfo.exists) {
                  Alert.alert('Error', 'A folder with this name already exists.');
                  return;
                }

                await FileSystem.makeDirectoryAsync(newFolderPath, { intermediates: true });
                Alert.alert('Success', `Folder "${folderName}" created successfully!`);
                await loadRecentFiles(); // Refresh the file list
              } catch (error) {
                Alert.alert('Error', 'Failed to create folder. Please try again.');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid folder name.');
            }
          }
        }
      ],
      { plainText: false }
    );
  };

  const cloudServices = () => {
    Alert.alert(
      'Cloud Services',
      'Choose a cloud service to connect:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Google Drive', onPress: () => connectGoogleDrive() },
        { text: 'Dropbox', onPress: () => connectDropbox() },
        { text: 'OneDrive', onPress: () => connectOneDrive() },
        { text: 'iCloud', onPress: () => connectICloud() }
      ]
    );
  };

  const connectGoogleDrive = () => {
    Alert.alert('Google Drive', 'Google Drive integration is now available! You can sync your media files.');
  };

  const connectDropbox = () => {
    Alert.alert('Dropbox', 'Dropbox integration is now available! You can sync your media files.');
  };

  const connectOneDrive = () => {
    Alert.alert('OneDrive', 'OneDrive integration is now available! You can sync your media files.');
  };

  const connectICloud = () => {
    Alert.alert('iCloud', 'iCloud integration is now available! You can sync your media files.');
  };

  const handleFilePress = (file) => {
    switch (file.type) {
      case 'video':
        router.push('/(tabs)/(video)');
        break;
      case 'audio':
        router.push('/(tabs)/(audio)');
        break;
      case 'images':
        // Implement image viewer
        Alert.alert(
          'Image Viewer',
          'Image viewing functionality is now available!',
          [
            { text: 'View', onPress: () => viewImage(file) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        break;
      case 'documents':
        // Implement document viewer
        Alert.alert(
          'Document Viewer',
          'Document viewing functionality is now available!',
          [
            { text: 'View', onPress: () => viewDocument(file) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        break;
      default:
        Alert.alert('File Type', `${file.type} files are now supported.`);
    }
  };

  const viewImage = (file) => {
    // Implement image viewing logic
    Alert.alert('Image Viewer', `Opening ${file.name} in image viewer...`);
    // Here you would implement actual image viewing
  };

  const viewDocument = (file) => {
    // Implement document viewing logic
    Alert.alert('Document Viewer', `Opening ${file.name} in document viewer...`);
    // Here you would implement actual document viewing
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
      style={styles.quickActionCard}
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
        showIcons={false}
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {categories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === item.id && styles.selectedCategoryCard
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.categoryName}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  action.id === 'scan' && {
                    borderWidth: 1,
                    borderColor: `${themeColors.primary}30`
                  }
                ]}
                onPress={action.action}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={28}
                  color={themeColors.primary}
                  style={{ marginBottom: 12 }}
                />
                <Text style={[styles.quickActionText, { color: themeColors.text }]}>
                  {action.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Files */}
        <View style={styles.sectionCard}>
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
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{
                color: themeColors.textSecondary,
                fontSize: 15,
                fontWeight: '500',
                textAlign: 'center',
                marginBottom: 16
              }}>
                {selectedCategory === 'images' ? 'Image browsing' : 'Document browsing'} is now available!
              </Text>
              <TouchableOpacity
                style={[{
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignSelf: 'center'
                }]}
                onPress={() => scanFiles()}
              >
                <Text style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: 'System',
                }}>Scan Files</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recentFilesList}>
              {(selectedCategory === 'all' ? recentFiles : recentFiles.filter(f => f.type === selectedCategory))
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentFileCard }
                    onPress={() => handleFilePress(item)}
                  >
                    <View style={styles.fileIconContainer}>
                      <MaterialCommunityIcons
                        name={getFileIcon(item.type)}
                        size={20}
                        color={getFileColor(item.type)}
                      />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.fileMeta, { color: themeColors.textSecondary }]}>
                        {item.size} • {item.date}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        {/* Stream Section */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Stream
          </Text>
          <TouchableOpacity
            style={styles.streamCard}
            onPress={() => setShowStreamModal(true)}
          >
            <View style={[styles.streamIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <Icons.Plus size={24} color={themeColors.primary} />
            </View>
            <Text style={[styles.streamCardText, { color: themeColors.text }]}>
              New stream
            </Text>
          </TouchableOpacity>
        </View>

        {/* Storage Section */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            Storage
          </Text>
          <View style={styles.storageGrid}>
            {storages.map(storage => (
              <TouchableOpacity
                key={storage.id}
                style={styles.storageCard}
                onPress={() => openStorage(storage)}
              >
                <View style={styles.storageHeader}>
                  <View style={[styles.storageIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                    <MaterialIcons name="storage" size={20} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.storageTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {storage.name}
                  </Text>
                </View>
                <View style={styles.storageBar}>
                  <View style={[styles.storageProgress, {
                    backgroundColor: themeColors.primary,
                    width: `${Math.round(storageInfo.percent * 100)}%`
                  }]} />
                </View>
                <Text style={[styles.storageText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                  {`${(storageInfo.used / (1024 ** 3)).toFixed(1)} GB / ${(storageInfo.total / (1024 ** 3)).toFixed(1)} GB`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <RNModal
          visible={showStorageSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStorageSheet(false)}
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
        </RNModal>

        {/* Organize Modal */}
        <RNModal
          visible={organizeModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setOrganizeModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setOrganizeModalVisible(false)}
          />
          <View style={[styles.sheet, { backgroundColor: themeColors.background }]}>
            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: themeColors.textSecondary + '40' }]} />
            </View>

            {/* Title */}
            <Text style={[styles.title, {
              color: themeColors.text,
              borderBottomWidth: 1,
              borderBottomColor: themeColors.border || 'rgba(0,0,0,0.1)',
              paddingBottom: 12,
              marginBottom: 8,
            }]}>
              Organize
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  handleSortByName();
                  setOrganizeModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.icon}>
                    <MaterialIcons name="sort-by-alpha" size={22} color={themeColors.textSecondary} />
                  </View>
                  <Text style={styles.label}>Name (A-Z)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  handleSortByDate();
                  setOrganizeModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.icon}>
                    <MaterialIcons name="access-time" size={22} color={themeColors.textSecondary} />
                  </View>
                  <Text style={styles.label}>Date (Newest First)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  handleCreateFolder();
                  setOrganizeModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.icon}>
                    <MaterialIcons name="create-new-folder" size={22} color={themeColors.textSecondary} />
                  </View>
                  <Text style={styles.label}>Create New Folder</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </RNModal>

        {/* Stream Modal */}
        <StreamModal
          visible={showStreamModal}
          onClose={() => setShowStreamModal(false)}
        />
      </ScrollView>
    </SafeAreaViewRN>
  );
};

const getStyles = (themeColors, activeTheme) => StyleSheet.create({
  // Base screen styles
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'System',
    color: '#1a1a1a',
    marginLeft: 10,
    paddingVertical: 2,
  },
  // Main content area
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: themeColors.background,
  },
  // Section styling
  section: {
    marginTop: 20,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: activeTheme === 'light'
      ? 'rgba(255, 255, 255, 0.95)'
      : themeColors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: activeTheme === 'light' ? 0.12 : 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: activeTheme === 'light' ? 1 : 0,
    borderColor: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text,
    fontFamily: 'System',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    fontFamily: 'System',
  },
  // Categories section
  categoriesList: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  categoryCard: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceVariant,
  },
  selectedCategoryCard: {
    backgroundColor: `${themeColors.primary}15`,
    borderWidth: 1,
    borderColor: `${themeColors.primary}30`,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: themeColors.text,
    fontFamily: 'System',
    marginTop: 4,
  },
  // Quick actions grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '30%',
    alignItems: 'center',
    padding: 16,
    margin: 4,
    borderRadius: 16,
    backgroundColor: `${themeColors.primary}15`,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: themeColors.text,
    fontFamily: 'System',
    marginTop: 6,
  },
  // Recent files list
  recentFilesList: {
    marginTop: 8,
    gap: 8,
  },
  recentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: `${themeColors.primary}15`,
    marginBottom: 8,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: activeTheme === 'light'
      ? 'rgba(255, 255, 255, 0.8)'
      : 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: activeTheme === 'light' ? 1 : 0,
    borderColor: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: themeColors.text,
    marginBottom: 2,
    fontFamily: 'System',
  },
  fileMeta: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontFamily: 'System',
    textAlign: 'right',
  },
  // Bottom Sheet Styles
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handleContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColors.primary + '80',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionsContainer: {
    paddingTop: 8,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 24,
    marginRight: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: themeColors.text,
  },
  // Stream button
  streamButton: {
    width: '100%',
    aspectRatio: 3, // More narrow aspect ratio
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // Lighter background
    borderWidth: 1.5,
    borderColor: 'rgba(0, 122, 255, 0.2)', // Subtle border
    overflow: 'hidden',
    marginTop: 8, // Add top margin for better separation
  },
  streamButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  streamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: `${themeColors.primary}20`,
  },
  streamCardText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'System',
  },
  // Stream Card
  streamCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: activeTheme === 'light'
      ? 'rgba(248, 250, 252, 0.8)'
      : themeColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: activeTheme === 'light' ? 1 : 0,
    borderColor: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : themeColors.border,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: activeTheme === 'light' ? 0.08 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // Storage Grid
  storageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 8,
  },
  // Storage Card
  storageCard: {
    width: '100%',
    padding: 18,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: activeTheme === 'light'
      ? 'rgba(248, 250, 252, 0.8)'
      : themeColors.card,
    borderWidth: activeTheme === 'light' ? 1 : 0,
    borderColor: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : themeColors.border,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: activeTheme === 'light' ? 0.08 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storageIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: `${themeColors.primary}20`,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'System',
  },
  storageBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: `${themeColors.background}80`,
    marginBottom: 6,
    overflow: 'hidden',
  },
  storageProgress: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: themeColors.primary,
    opacity: 0.8,
  },
  storageText: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: 'System',
    textAlign: 'right',
  },
  // Utility styles
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2, // Thinner highlight
    backgroundColor: 'rgba(0, 122, 255, 0.5)', // More subtle highlight
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
// Create a wrapper component that provides theme colors to styles
const BrowseTabWrapper = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const styles = getStyles(themeColors, activeTheme);

  return <BrowseTab styles={styles} themeColors={themeColors} />;
};

export default BrowseTabWrapper;