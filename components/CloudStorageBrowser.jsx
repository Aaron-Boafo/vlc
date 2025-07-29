import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  SafeAreaView,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useThemeStore from '../store/theme';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

const CloudStorageBrowser = ({ onFileSelect, onClose }) => {
  const navigation = useNavigation();
  const { themeColors, accentColor } = useThemeStore();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.storage.getAll();
      if (response.data?.data) {
        setFiles(response.data.data);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFiles();
  };

  const handleDelete = async (id, fileName) => {
    Alert.alert(
      "Delete File",
      `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.storage.delete(id);
              setFiles(files.filter(file => file.id !== id));
            } catch (err) {
              console.error('Error deleting file:', err);
              setError('Failed to delete file. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('audio/')) return 'audiotrack';
    if (fileType?.startsWith('video/')) return 'videocam';
    if (fileType?.startsWith('image/')) return 'image';
    if (fileType?.includes('pdf')) return 'picture-as-pdf';
    if (fileType?.includes('document') || fileType?.includes('word')) return 'description';
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return 'table-chart';
    return 'insert-drive-file';
  };

  const getFileIconColor = (fileType) => {
    if (fileType?.startsWith('audio/')) return '#FF6B6B';
    if (fileType?.startsWith('video/')) return '#4ECDC4';
    if (fileType?.startsWith('image/')) return '#45B7D1';
    if (fileType?.includes('pdf')) return '#FF4757';
    if (fileType?.includes('document') || fileType?.includes('word')) return '#5F27CD';
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return '#00D2D3';
    return '#6C5CE7';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.fileItem, 
        { 
          backgroundColor: themeColors.card || themeColors.surface || '#FFFFFF',
          borderColor: themeColors.border || 'rgba(0,0,0,0.05)',
        }
      ]}
      onPress={() => onFileSelect && onFileSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.fileIconContainer,
        { backgroundColor: getFileIconColor(item.fileType) + '15' }
      ]}>
        <MaterialIcons 
          name={getFileIcon(item.fileType)} 
          size={28} 
          color={getFileIconColor(item.fileType)} 
        />
      </View>
      
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
          {item.fileName || 'Untitled'}
        </Text>
        <Text style={[styles.fileDetails, { color: themeColors.textSecondary || '#8E8E93' }]}>
          {formatFileSize(item.size)} • {formatDate(item.createdAt)}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.fileName)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.headerTitle, { color: themeColors.text }]}>
        My Files
      </Text>
      <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background || '#F8F9FA',
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      backgroundColor: themeColors.background || '#F8F9FA',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: themeColors.text || '#1C1C1E',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: themeColors.textSecondary || '#8E8E93',
      fontWeight: '500',
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: themeColors.border || 'rgba(0,0,0,0.1)',
      backgroundColor: themeColors.background,
    },
    closeButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background || '#F8F9FA',
    },

    listContent: {
      paddingBottom: 100,
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    fileIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    fileInfo: {
      flex: 1,
      marginRight: 12,
    },
    fileName: {
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 4,
      color: '#1C1C1E',
    },
    fileDetails: {
      fontSize: 14,
      color: '#8E8E93',
      fontWeight: '500',
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      backgroundColor: themeColors.background || '#F8F9FA',
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FF3B30',
      textAlign: 'center',
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 16,
      color: themeColors.textSecondary || '#8E8E93',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    retryButton: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: accentColor || '#007AFF',
    },
    retryText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
    },
    emptyIcon: {
      marginBottom: 24,
    },
    emptyText: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 12,
      color: themeColors.text || '#1C1C1E',
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 17,
      textAlign: 'center',
      color: themeColors.textSecondary || '#8E8E93',
      lineHeight: 24,
      marginBottom: 32,
    },


  });

  if (loading && !refreshing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor || '#007AFF'} />
            <Text style={[
              { 
                marginTop: 16, 
                fontSize: 16, 
                color: themeColors.textSecondary || '#8E8E93',
                fontWeight: '500'
              }
            ]}>
              Loading your files...
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
          <View style={styles.errorContainer}>
            <MaterialIcons 
              name="cloud-off" 
              size={64} 
              color="#FF3B30" 
              style={styles.errorIcon}
            />
            <Text style={styles.errorText}>Connection Error</Text>
            <Text style={styles.errorSubtext}>
              {error}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchFiles}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
        
        <FlatList
          data={files}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[accentColor || '#007AFF']}
              tintColor={accentColor || '#007AFF'}
              progressBackgroundColor={themeColors.surface}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name="cloud-upload" 
                size={80} 
                color={themeColors.textSecondary || '#C7C7CC'} 
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>No files found</Text>
              <Text style={styles.emptySubtext}>
                There are no files in your cloud storage
              </Text>
            </View>
          }
        />
        {/* Close Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              // First try to call onClose if it exists
              if (onClose) {
                onClose();
              }
              // Then try to call onFileSelect if it exists
              else if (onFileSelect) {
                onFileSelect(null);
              }
              // Finally, try to navigate back
              else if (navigation) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default CloudStorageBrowser;