import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import useThemeStore from '../store/theme';

const { width } = Dimensions.get('window');

const FileBrowser = ({ onFileSelect, onBack, hideHeader }) => {
  const { themeColors } = useThemeStore();
  const [currentPath, setCurrentPath] = useState(FileSystem.documentDirectory);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadDirectoryContents();
  }, [currentPath, sortBy, sortOrder]);

  const loadDirectoryContents = async () => {
    setIsLoading(true);
    try {
      const contents = await FileSystem.readDirectoryAsync(currentPath);
      const filePromises = contents.map(async (item) => {
        const fullPath = `${currentPath}${item}`;
        const info = await FileSystem.getInfoAsync(fullPath);
        return {
          name: item,
          path: fullPath,
          isDirectory: info.isDirectory,
          size: info.size,
          modificationTime: info.modificationTime,
          type: getFileType(item),
        };
      });
      
      let fileList = await Promise.all(filePromises);
      
      // Apply sorting
      fileList.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'size':
            comparison = (a.size || 0) - (b.size || 0);
            break;
          case 'date':
            comparison = (a.modificationTime || 0) - (b.modificationTime || 0);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading directory contents:', error);
      Alert.alert('Error', 'Failed to load directory contents');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return 'unknown';
    
    const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (imageExts.includes(ext)) return 'image';
    if (docExts.includes(ext)) return 'document';
    return 'unknown';
  };

  const navigateToDirectory = (path) => {
    setCurrentPath(path);
  };

  const navigateBack = () => {
    const parentPath = currentPath.split('/').slice(0, -2).join('/') + '/';
    if (parentPath !== currentPath) {
      setCurrentPath(parentPath);
    }
  };

  const handleFilePress = (file) => {
    if (file.isDirectory) {
      navigateToDirectory(file.path);
    } else {
      onFileSelect(file);
    }
  };

  const handleFileLongPress = (file) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedFiles([file]);
    }
  };

  const toggleFileSelection = (file) => {
    if (selectedFiles.find(f => f.path === file.path)) {
      setSelectedFiles(selectedFiles.filter(f => f.path !== file.path));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const deleteSelectedFiles = () => {
    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const file of selectedFiles) {
                await FileSystem.deleteAsync(file.path);
              }
              setSelectedFiles([]);
              setIsSelectionMode(false);
              loadDirectoryContents();
              Alert.alert('Success', 'Files deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some files');
            }
          },
        },
      ]
    );
  };

  const renderFileItem = ({ item }) => {
    const isSelected = selectedFiles.find(f => f.path === item.path);

    return (
      <TouchableOpacity
        style={[
          styles.fileItem,
          { backgroundColor: themeColors.card },
          isSelected && { borderColor: themeColors.primary, borderWidth: 2 }
        ]}
        onPress={() => isSelectionMode ? toggleFileSelection(item) : handleFilePress(item)}
        onLongPress={() => handleFileLongPress(item)}
      >
        <View style={styles.fileInfo}>
          <MaterialCommunityIcons 
            name={item.isDirectory ? 'folder' : getFileIcon(item.type)} 
            size={24} 
            color={item.isDirectory ? '#FFD700' : getFileColor(item.type)} 
          />
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.fileMeta, { color: themeColors.textSecondary }]}>
              {item.isDirectory ? 'Folder' : formatFileSize(item.size)} • {formatDate(item.modificationTime)}
            </Text>
          </View>
        </View>
        {isSelectionMode && (
          <MaterialIcons 
            name={isSelected ? 'check-circle' : 'radio-button-unchecked'} 
            size={24} 
            color={isSelected ? themeColors.primary : themeColors.textSecondary} 
          />
        )}
        {!isSelectionMode && (
          <MaterialIcons name="chevron-right" size={20} color={themeColors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'video': return 'video-file';
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const renderBreadcrumb = () => {
    const pathParts = currentPath.split('/').filter(part => part);
    return (
      <FlatList
        data={pathParts}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.breadcrumb}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.breadcrumbItem}
            onPress={() => {
              const newPath = '/' + pathParts.slice(0, index + 1).join('/') + '/';
              setCurrentPath(newPath);
            }}
          >
            <Text style={[styles.breadcrumbText, { color: themeColors.primary }]}>
              {item}
            </Text>
            {index < pathParts.length - 1 && (
              <MaterialIcons name="chevron-right" size={16} color={themeColors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => item?.toString() || index.toString()}
      />
    );
  };

  const sortOptions = [
    { key: 'name', label: 'Name', icon: 'sort-alphabetical' },
    { key: 'size', label: 'Size', icon: 'sort-numeric' },
    { key: 'date', label: 'Date Modified', icon: 'sort-calendar' },
    { key: 'type', label: 'Type', icon: 'sort-variant' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Browser Header */}
      {!hideHeader && (
        <View style={[styles.browserHeader, { borderBottomColor: themeColors.card }]}>
          <View style={styles.browserHeaderTop}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.browserTitle, { color: themeColors.text }]}>
              File Browser
            </Text>
            <View style={styles.browserActions}>
              {isSelectionMode ? (
                <>
                  <TouchableOpacity onPress={deleteSelectedFiles} style={styles.actionButton}>
                    <MaterialIcons name="delete" size={20} color="#FF5722" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setIsSelectionMode(false);
                      setSelectedFiles([]);
                    }} 
                    style={styles.actionButton}
                  >
                    <MaterialIcons name="close" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.actionButton}>
                  <MaterialIcons name="sort" size={20} color={themeColors.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {renderBreadcrumb()}
        </View>
      )}

      {/* File List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item?.path || Math.random().toString()}
          style={styles.fileList}
          contentContainerStyle={styles.fileListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="folder-open" size={64} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.text }]}>No files found</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                This folder is empty
              </Text>
            </View>
          }
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Sort By</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.modalOption, { borderBottomColor: themeColors.card }]}
                onPress={() => {
                  setSortBy(option.key);
                  setShowSortModal(false);
                }}
              >
                <MaterialCommunityIcons name={option.icon} size={20} color={themeColors.text} />
                <Text style={[styles.modalOptionText, { color: themeColors.text }]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <MaterialIcons name="check" size={20} color={themeColors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setShowSortModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  browserHeader: {
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  browserHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  browserTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  browserActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
  },
  breadcrumb: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  breadcrumbText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    padding: 16,
  },
  fileItem: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FileBrowser; 