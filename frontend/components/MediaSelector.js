import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Animated, 
  Easing, 
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import useThemeStore from '../store/theme';
import storageService from '../services/storageService';

const { width } = Dimensions.get('window');

const UPLOAD_URL = 'https://vlc-spring-boot.onrender.com/storage/add';
const WS_URL = 'wss://vlc-spring-boot.onrender.com/upload-progress';

const MediaSelector = ({ onUploadComplete, maxSizeMB = 100, onClose }) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { themeColors, accentColor } = useThemeStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [existingFiles, setExistingFiles] = useState(undefined);
  const [duplicateFile, setDuplicateFile] = useState(false);
  const wsRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Button press animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Progress animation
  useEffect(() => {
    if (isUploading) {
      Animated.timing(progressAnim, {
        toValue: uploadProgress / 100,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [uploadProgress, isUploading]);

  // WebSocket setup for progress/sessionId
  useEffect(() => {
    let ws;
    const setup = async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      setAuthToken(token);
      if (!token) return;
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token }));
      };
      ws.onmessage = (event) => {
        console.log('WEBSOCKET: Message received:', event.data);
        const msg = event.data;
        if (msg.startsWith('SESSION_ID:')) {
          const sid = msg.replace('SESSION_ID:', '').trim();
          setSessionId(sid);
          console.log('WEBSOCKET: SESSION_ID set:', sid);
        } else if (!isNaN(Number(msg))) {
          setUploadProgress(Number(msg));
          console.log('WEBSOCKET: Progress update:', Number(msg));
        } else {
          console.log('WEBSOCKET: Unknown message:', msg);
        }
      };
    };
    setup();
    return () => { if (ws) ws.close(); };
  }, []);

  // Fetch existing files from backend
  useEffect(() => {
    const fetchExistingFiles = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const response = await axios.get('https://vlc-spring-boot.onrender.com/storage', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.data && response.data.data) {
          setExistingFiles(response.data.data.map(f => f.fileName || f.filename || f.name));
        } else if (Array.isArray(response.data)) {
          setExistingFiles(response.data.map(f => f.fileName || f.filename || f.name));
        } else {
          setExistingFiles([]);
        }
      } catch (e) {
        setExistingFiles(null);
      }
    };
    fetchExistingFiles();
  }, []);

  // Load media files and their sizes
  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      setError('');
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Please grant media library access');
          setLoading(false);
          return;
        }
        
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: ['video', 'audio'],
          sortBy: ['creationTime'],
          first: 100,
        });
        
        const items = media.assets.map(asset => ({
          id: asset.id,
          name: asset.filename,
          uri: asset.uri,
          type: asset.mediaType === 'video' ? 'video/mp4' : 'audio/mpeg',
          size: asset.fileSize,
          duration: asset.duration,
        }));
        
        setMediaItems(items);
        
        const itemsWithSizes = await Promise.all(
          items.map(async (item) => {
            try {
              if (!item.size) {
                const fileInfo = await FileSystem.getInfoAsync(item.uri);
                return { ...item, size: fileInfo.size };
              }
              return item;
            } catch (err) {
              console.error(`Error getting size for ${item.name}:`, err);
              return item;
            }
          })
        );
        
        setMediaItems(itemsWithSizes);
      } catch (err) {
        setError('Failed to load media files.');
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
  }, []);

  // Check for duplicate on file select
  useEffect(() => {
    if (selectedFile && Array.isArray(existingFiles) && existingFiles.length > 0) {
      const isDuplicate = existingFiles.includes(selectedFile.name);
      setDuplicateFile(isDuplicate);
      if (isDuplicate) {
        setError('A file with this name already exists. Please select a different file.');
      } else {
        setError('');
      }
    } else {
      setDuplicateFile(false);
    }
  }, [selectedFile, existingFiles]);

  // Helper to determine MIME type from file name
  const getMimeType = (filename) => {
    if (!filename) return 'audio/mpeg';
    const ext = filename.split('.').pop().toLowerCase();
    // Audio types
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'ogg') return 'audio/ogg';
    if (ext === 'm4a') return 'audio/mp4';
    if (ext === 'aac') return 'audio/aac';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'wma') return 'audio/x-ms-wma';
    // Image types
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    return 'audio/mpeg';
  };

  // Upload handler
  const uploadFile = async () => {
    console.log('UPLOAD: Starting uploadFile');
    console.log('UPLOAD: selectedFile:', selectedFile);
    console.log('UPLOAD: sessionId:', sessionId);

    if (!selectedFile) {
      console.log('UPLOAD: No file selected');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess(false);
    setUploadProgress(0);
    setDuplicateFile(false);

    try {
      const mimeType = getMimeType(selectedFile.name);
      const metadata = {
        fileName: selectedFile.name,
        fileType: mimeType,
        description: '',
      };

      console.log('UPLOAD: Starting file upload with metadata:', metadata);

      const response = await storageService.uploadFile(
        selectedFile,
        metadata,
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
          setUploadProgress(progress);
        }
      );

      console.log('UPLOAD: Upload successful:', response);
      setSuccess(true);
      if (onUploadComplete) onUploadComplete(selectedFile);
      
      // Success animation
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
      
      return response;
    } catch (e) {
      let friendlyError = 'Failed to upload. Please try again.';
      console.log('UPLOAD: Error during uploadFile:', e);
      
      if (e.message) {
        if (e.message.includes('Network Error')) {
          friendlyError = 'Network error. Please check your internet connection.';
        } else if (e.message.includes('timeout')) {
          friendlyError = 'Upload timed out. Please try again.';
        } else if (e.message.includes('already exists')) {
          friendlyError = 'A file with this name already exists. Please rename your file.';
        } else if (e.message.includes('status 0')) {
          friendlyError = 'Connection error. Please check your network and try again.';
        } else {
          friendlyError = e.message;
        }
      }
      
      setError(friendlyError);
      throw e;
    } finally {
      setIsUploading(false);
      if (!error) {
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      }
    }
  };

  const getFileTypeIcon = (type) => {
    if (type.startsWith('video')) return 'videocam';
    if (type.startsWith('audio')) return 'audiotrack';
    if (type.startsWith('image')) return 'image';
    return 'insert-drive-file';
  };

  const getFileTypeColor = (type) => {
    if (type.startsWith('video')) return '#FF6B6B';
    if (type.startsWith('audio')) return '#4ECDC4';
    if (type.startsWith('image')) return '#45B7D1';
    return '#6C5CE7';
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background || '#F8F9FA',
    },
    safeArea: {
      width: '100%',
    },
    header: {
      backgroundColor: themeColors.background || '#F8F9FA',
      width: '100%',
      // Add padding top to account for status bar on iOS
      paddingTop: 40,
      height: 100,
    },
    headerContent: {
      paddingHorizontal: 20,
      paddingTop: 0, // Remove top padding since we're handling it in the header
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border || 'rgba(0,0,0,0.1)',
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${themeColors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: themeColors.text || '#1C1C1E',
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 15,
      color: themeColors.textSecondary || '#8E8E93',
      lineHeight: 20,
      opacity: 0.9,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingContent: {
      alignItems: 'center',
    },
    loadingText: {
      color: themeColors.text || '#1C1C1E',
      marginTop: 20,
      fontSize: 18,
      fontWeight: '600',
    },
    loadingSubtext: {
      color: themeColors.textSecondary || '#8E8E93',
      marginTop: 8,
      fontSize: 15,
      textAlign: 'center',
    },
    fileList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: themeColors.card || '#FFFFFF',
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedFileItem: {
      borderColor: accentColor || '#007AFF',
      backgroundColor: `${accentColor || '#007AFF'}08`,
      transform: [{ scale: 1.02 }],
    },
    fileIcon: {
      width: 56,
      height: 56,
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
      color: themeColors.text || '#1C1C1E',
      marginBottom: 6,
      lineHeight: 22,
    },
    fileMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 2,
    },
    metaText: {
      fontSize: 14,
      color: themeColors.textSecondary || '#8E8E93',
      fontWeight: '500',
      marginLeft: 4,
    },
    checkIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: accentColor || '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadSection: {
      padding: 20,
      backgroundColor: themeColors.background || themeColors.card || '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: themeColors.border || 'rgba(0,0,0,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    selectedFileCard: {
      backgroundColor: themeColors.card || themeColors.surface || '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: `${accentColor || '#007AFF'}20`,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    selectedFileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    selectedFileIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    selectedFileDetails: {
      flex: 1,
    },
    selectedFileName: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.text || '#1C1C1E',
      marginBottom: 4,
      lineHeight: 24,
    },
    selectedFileSize: {
      fontSize: 15,
      color: themeColors.textSecondary || '#8E8E93',
      fontWeight: '500',
    },
    uploadButton: {
      backgroundColor: accentColor || '#007AFF',
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      shadowColor: accentColor || '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
      minHeight: 56,
    },
    uploadButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 17,
      letterSpacing: 0.3,
    },
    disabledButton: {
      opacity: 0.6,
      backgroundColor: themeColors.textSecondary || '#8E8E93',
      shadowOpacity: 0,
      elevation: 0,
    },
    progressContainer: {
      marginTop: 16,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: `${themeColors.textSecondary || '#8E8E93'}20`,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressBar: {
      height: '100%',
      backgroundColor: accentColor || '#007AFF',
      borderRadius: 4,
    },
    progressText: {
      textAlign: 'center',
      color: themeColors.textSecondary || '#8E8E93',
      fontSize: 15,
      fontWeight: '600',
    },
    statusMessage: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
    },
    errorMessage: {
      backgroundColor: `${themeColors.error || '#FF3B30'}08`,
      color: themeColors.error || '#FF3B30',
      borderWidth: 1,
      borderColor: `${themeColors.error || '#FF3B30'}20`,
    },
    successMessage: {
      backgroundColor: `${themeColors.success || '#34C759'}08`,
      color: themeColors.success || '#34C759',
      borderWidth: 1,
      borderColor: `${themeColors.success || '#34C759'}20`,
    },
    warningMessage: {
      backgroundColor: `${themeColors.warning || '#FF9500'}08`,
      color: themeColors.warning || '#FF9500',
      borderWidth: 1,
      borderColor: `${themeColors.warning || '#FF9500'}20`,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: themeColors.text || '#1C1C1E',
      marginBottom: 12,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 17,
      color: themeColors.textSecondary || '#8E8E93',
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 280,
    },
    checkingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    checkingText: {
      marginLeft: 12,
      fontSize: 15,
      color: themeColors.textSecondary || '#8E8E93',
      fontWeight: '500',
    },
  });

  // Render loading state
  if (loading) {
    return (
      <Animated.View 
        style={[
          styles.container,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={accentColor || '#007AFF'} />
              <Text style={styles.loadingText}>Loading Media</Text>
              <Text style={styles.loadingSubtext}>Scanning your device for audio and video files</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    );
  }

  // Render error state for media loading
  if (error && !selectedFile) {
    return (
      <Animated.View 
        style={[
          styles.container,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
          <View style={styles.emptyState}>
            <MaterialIcons 
              name="error-outline" 
              size={80} 
              color="#FF3B30" 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>Access Required</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <StatusBar barStyle={themeColors.statusBar || 'dark-content'} />
      
      {/* Header with SafeAreaView */}
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={[styles.headerContent, { borderBottomColor: themeColors.border || 'rgba(0,0,0,0.1)' }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
                onPress={onClose} 
                style={[styles.backButton, { backgroundColor: `${themeColors.primary}15` }]}
                activeOpacity={0.8}
              >
                <MaterialIcons 
                  name="arrow-back" 
                  size={20} 
                  color={themeColors.primary} 
                />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Upload Media</Text>
                <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
                  Select a file to upload to your cloud storage
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {/* File List */}
        <ScrollView 
          style={styles.fileList} 
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {mediaItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons 
                name="folder-open" 
                size={80} 
                color={themeColors.textSecondary || '#C7C7CC'} 
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>No Media Found</Text>
              <Text style={styles.emptyText}>
                No audio or video files were found on your device
              </Text>
            </View>
          ) : (
            mediaItems.map((item, index) => {
              const fileSizeMB = item.size ? (item.size / (1024 * 1024)).toFixed(1) : 'Loading...';
              const fileTypeColor = getFileTypeColor(item.type);
              const isSelected = selectedFile?.id === item.id;
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.fileItem,
                    isSelected && styles.selectedFileItem
                  ]}
                  onPress={async () => {
                    try {
                      let fileSize = item.size;
                      if (!fileSize) {
                        const fileInfo = await FileSystem.getInfoAsync(item.uri);
                        fileSize = fileInfo.size;
                        const updatedItems = mediaItems.map(i => 
                          i.id === item.id ? { ...i, size: fileSize } : i
                        );
                        setMediaItems(updatedItems);
                      }
                      
                      const fileSizeMB = fileSize / (1024 * 1024);
                      if (fileSizeMB > maxSizeMB) {
                        Alert.alert(
                          'File Too Large',
                          `File size (${fileSizeMB.toFixed(1)}MB) exceeds ${maxSizeMB}MB limit`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setError('');
                      setSelectedFile({ ...item, size: fileSize });
                    } catch (err) {
                      console.error('Error getting file info:', err);
                      setError('Failed to get file information');
                    }
                  }}
                  disabled={isUploading}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.fileIcon, 
                    { backgroundColor: `${fileTypeColor}15` }
                  ]}>
                    <MaterialIcons 
                      name={getFileTypeIcon(item.type)} 
                      size={26} 
                      color={fileTypeColor} 
                    />
                  </View>
                  
                  <View style={styles.fileInfo}>
                    <Text 
                      style={styles.fileName} 
                      numberOfLines={1} 
                      ellipsizeMode="middle"
                    >
                      {item.name}
                    </Text>
                    <View style={styles.fileMeta}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="storage" size={14} color={themeColors.textSecondary || '#8E8E93'} />
                        <Text style={styles.metaText}>{fileSizeMB} MB</Text>
                      </View>
                      {item.duration && (
                        <View style={styles.metaItem}>
                          <MaterialIcons name="schedule" size={14} color={themeColors.textSecondary || '#8E8E93'} />
                          <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
                        </View>
                      )}
                      <View style={styles.metaItem}>
                        <MaterialIcons name="label" size={14} color={themeColors.textSecondary || '#8E8E93'} />
                        <Text style={styles.metaText}>
                          {item.type.split('/').pop().toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {isSelected && (
                    <View style={styles.checkIcon}>
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Upload Section */}
        {selectedFile && (
          <View style={styles.uploadSection}>
            <View style={styles.selectedFileCard}>
              <View style={styles.selectedFileHeader}>
                <View style={[
                  styles.selectedFileIcon, 
                  { backgroundColor: `${getFileTypeColor(selectedFile.type)}15` }
                ]}>
                  <MaterialIcons 
                    name={getFileTypeIcon(selectedFile.type)} 
                    size={24} 
                    color={getFileTypeColor(selectedFile.type)} 
                  />
                </View>
                <View style={styles.selectedFileDetails}>
                  <Text 
                    style={styles.selectedFileName} 
                    numberOfLines={1} 
                    ellipsizeMode="middle"
                  >
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.selectedFileSize}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.type.split('/').pop().toUpperCase()}
                  </Text>
                </View>
              </View>
              
              {/* Duplicate Check Status */}
              {existingFiles === undefined && (
                <View style={styles.checkingContainer}>
                  <ActivityIndicator size="small" color={accentColor || '#007AFF'} />
                  <Text style={styles.checkingText}>Checking for duplicates...</Text>
                </View>
              )}
              
              {existingFiles === null && (
                <Text style={[styles.statusMessage, styles.warningMessage]}>
                  Could not check for duplicates. Upload may still proceed.
                </Text>
              )}

              {/* Upload Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    (isUploading || (Array.isArray(existingFiles) && duplicateFile) || existingFiles === undefined) && styles.disabledButton
                  ]}
                  onPress={() => {
                    animateButtonPress();
                    uploadFile();
                  }}
                  disabled={isUploading || (Array.isArray(existingFiles) && duplicateFile) || existingFiles === undefined}
                  activeOpacity={0.8}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 12 }} />
                      <Text style={styles.uploadButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <Text style={styles.uploadButtonText}>
                      {duplicateFile ? 'File Already Exists' : 'Upload to Cloud'}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Progress Bar */}
              {isUploading && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarContainer}>
                    <Animated.View 
                      style={[
                        styles.progressBar,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(uploadProgress)}% uploaded
                  </Text>
                </View>
              )}
            </View>

            {/* Status Messages */}
            {error && selectedFile && (
              <Text style={[styles.statusMessage, styles.errorMessage]}>
                {error}
              </Text>
            )}
            
            {success && (
              <Text style={[styles.statusMessage, styles.successMessage]}>
                ✅ Upload complete! File is now available in your cloud storage.
              </Text>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default MediaSelector;