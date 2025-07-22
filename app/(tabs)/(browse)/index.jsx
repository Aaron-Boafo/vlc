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
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Icons from 'lucide-react-native';
import useThemeStore from '../../../store/theme';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import AudioHeader from '../../../AudioComponents/title';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';
import FileBrowser from '../../../components/FileBrowser';
import * as DocumentPicker from 'expo-document-picker';
import StreamModal from '../../../components/StreamModal';
import api from '../../../services/api';
import axios from 'axios';

const BrowseTab = ({ styles, themeColors }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showStorageSheet, setShowStorageSheet] = useState(false);
  const [storageRoot, setStorageRoot] = useState(null);
  const [storageTitle, setStorageTitle] = useState('');
  const [showStreamModal, setShowStreamModal] = useState(false);
  
  // Function to manually refresh storage access
  const handleRefreshStorage = async () => {
    try {
      console.log('Manually refreshing storage access...');
      // Clear current storage state
      setStorages([{ id: 'internal', name: 'App Storage', icon: 'folder', root: FileSystem.documentDirectory }]);
      setStorageRoot(null);
      setStorageTitle('');
      
      // Re-initialize storage
      const availableStorages = await getStoragePaths();
      console.log('Refreshed storage paths:', availableStorages);
      
      if (availableStorages.length > 0) {
        setStorages(availableStorages);
        const defaultStorage = availableStorages[0];
        setStorageRoot(defaultStorage.root);
        setStorageTitle(defaultStorage.name);
        Alert.alert('Success', 'Storage access refreshed successfully!');
      } else {
        Alert.alert('No Storage Found', 'Could not find any accessible storage locations.');
      }
    } catch (error) {
      console.error('Error refreshing storage:', error);
      Alert.alert('Error', 'Failed to refresh storage access. Please check console for details.');
    }
  };

  // Function to get accessible storage paths on Android
  const getStoragePaths = async () => {
    const paths = [];
    
    // Always include the app's document directory
    paths.push({
      id: 'internal',
      name: 'App Storage',
      icon: 'folder',
      root: FileSystem.documentDirectory
    });

    try {
      // Try to access common media directories
      const mediaDirs = [
        { id: 'downloads', name: 'Downloads', icon: 'folder-download', path: 'Download' },
        { id: 'music', name: 'Music', icon: 'folder-music', path: 'Music' },
        { id: 'dcim', name: 'Pictures', icon: 'folder-image', path: 'DCIM' },
        { id: 'movies', name: 'Movies', icon: 'folder-video', path: 'Movies' },
      ];

      // Check each media directory
      for (const dir of mediaDirs) {
        try {
          const fullPath = `${FileSystem.documentDirectory}../${dir.path}/`;
          const info = await FileSystem.getInfoAsync(fullPath);
          if (info.exists && info.isDirectory) {
            paths.push({
              id: dir.id,
              name: dir.name,
              icon: dir.icon,
              root: fullPath
            });
          }
        } catch (error) {
          console.log(`Could not access ${dir.name}:`, error.message);
        }
      }

      // Try to access external storage
      const externalDirs = [
        { id: 'storage_emulated', name: 'Internal Storage', icon: 'sd', path: '/storage/emulated/0' },
        { id: 'storage_self', name: 'Primary Storage', icon: 'sd', path: '/storage/self/primary' },
      ];

      for (const dir of externalDirs) {
        try {
          const info = await FileSystem.getInfoAsync(dir.path);
          if (info.exists && info.isDirectory) {
            paths.push({
              id: dir.id,
              name: dir.name,
              icon: dir.icon,
              root: dir.path + '/'
            });
          }
        } catch (error) {
          console.log(`Could not access ${dir.path}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error getting storage paths:', error);
    }

    console.log('Available storage paths:', paths);
    return paths;
  };

  const [storages, setStorages] = useState([
    { id: 'internal', name: 'Internal Storage', icon: 'folder', root: FileSystem.documentDirectory }
  ]);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 1, percent: 0 });
  const [organizeModalVisible, setOrganizeModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Check and log storage access
  const checkStorageAccess = async () => {
    try {
      console.log('Checking storage access...');
      
      // List all available storage directories
      const documentDir = FileSystem.documentDirectory;
      const cacheDir = FileSystem.cacheDirectory;
      const bundleDir = FileSystem.bundleDirectory;
      
      console.log('Document directory:', documentDir);
      console.log('Cache directory:', cacheDir);
      console.log('Bundle directory:', bundleDir);
      
      // Try to list files in the root directory
      try {
        const rootContents = await FileSystem.readDirectoryAsync('/');
        console.log('Root directory contents:', rootContents);
      } catch (error) {
        console.log('Cannot access root directory:', error.message);
      }
      
      // Try to list files in the storage directory
      try {
        const storageContents = await FileSystem.readDirectoryAsync('/storage/');
        console.log('Storage directory contents:', storageContents);
      } catch (error) {
        console.log('Cannot access storage directory:', error.message);
      }
      
      // Try to list files in the external storage directory
      try {
        const externalContents = await FileSystem.readDirectoryAsync('/storage/emulated/0/');
        console.log('External storage contents:', externalContents);
      } catch (error) {
        console.log('Cannot access external storage:', error.message);
      }
      
    } catch (error) {
      console.error('Error checking storage access:', error);
    }
  };

  // Request storage permission and initialize storage paths on mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('Initializing storage...');
        
        // First, request media library permissions
        try {
          console.log('Requesting media library permission...');
          const { status, canAskAgain, granted } = await MediaLibrary.requestPermissionsAsync();
          console.log('Media library permission status:', { status, canAskAgain, granted });
          setHasPermission(status === 'granted');
        } catch (error) {
          console.warn('Error requesting media library permission:', error);
        }
        
        // Check storage access and log available paths
        await checkStorageAccess();
        
        // Initialize available storage paths
        try {
          console.log('Getting storage paths...');
          const availableStorages = await getStoragePaths();
          
          // Always update the storages with whatever we found
          if (availableStorages.length > 0) {
            console.log('Updating available storages:', availableStorages);
            setStorages(availableStorages);
            
            // Set the first available storage as the default if not already set
            if (!storageRoot) {
              const defaultStorage = availableStorages[0];
              console.log('Setting default storage:', defaultStorage);
              setStorageRoot(defaultStorage.root);
              setStorageTitle(defaultStorage.name);
            }
          } else {
            console.warn('No accessible storage paths found');
          }
        } catch (error) {
          console.error('Error initializing storage paths:', error);
        }
        
      } catch (error) {
        console.error('Error initializing storage:', error);
      }
    };
    
    initializeStorage();
  }, []); // Empty dependency array means this runs once on mount

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
    { 
      id: 'cloud', 
      name: 'Cloud Storage', 
      icon: 'cloud-upload', 
      action: async () => {
        try {
          // Check if user is authenticated
          const token = await SecureStore.getItemAsync('auth_token');
          if (!token) {
            Alert.alert(
              'Authentication Required',
              'Please log in to access cloud storage',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Login', onPress: () => router.push('/(auth)/login') }
              ]
            );
            return;
          }
          
          // Show cloud storage options
          Alert.alert(
            'Cloud Storage',
            'Choose an action',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upload to Cloud', onPress: () => uploadToCloud() },
              { text: 'View Cloud Files', onPress: () => viewCloudFiles() }
            ]
          );
        } catch (error) {
          console.error('Cloud storage error:', error);
          Alert.alert('Error', 'Failed to access cloud storage');
        }
      } 
    },
  ];

  // Function to handle file upload to cloud using media library
  const uploadToCloud = async () => {
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to upload files');
        return;
      }

      // Show loading indicator
      Alert.alert(
        'Loading Media',
        'Preparing your media files...',
        [],
        { cancelable: false }
      );

      try {
        // Get media files (videos and audio)
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: ['video', 'audio'],
          sortBy: ['creationTime'],
          first: 50, // Get first 50 files
        });

        // Map media items
        const mediaItems = media.assets.map(asset => ({
          id: asset.id,
          name: asset.filename,
          uri: asset.uri,
          type: asset.mediaType === 'video' ? 'video/mp4' : 'audio/mpeg',
          size: asset.fileSize,
          duration: asset.duration,
        }));

        // Dismiss the loading alert by showing a new one with empty content
        Alert.alert(
          '',
          '',
          [],
          { cancelable: false }
        );

        // Show media selection dialog
        Alert.alert(
          'Select Media to Upload',
          'Choose a video or audio file to upload',
          mediaItems.map(item => ({
            text: `${item.name} (${(item.size / (1024 * 1024)).toFixed(2)} MB)`,
            onPress: () => handleMediaSelect(item)
          })).concat([
            { 
              text: 'Cancel',
              style: 'cancel'
            }
          ])
        );
      } catch (error) {
        console.error('Error loading media:', error);
        Alert.alert(
          'Error',
          'Failed to load media files. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error accessing media library:', error);
      Alert.alert('Error', 'Failed to access media library');
    }
  };

// ...
  // Handle media file selection and upload
  const handleMediaSelect = async (mediaItem) => {
    try {
      const fileSizeMB = mediaItem.size / (1024 * 1024);
      
      if (fileSizeMB > 100) {
        Alert.alert('Error', 'File size exceeds 100MB limit');
        return;
      }

      // Show upload confirmation
      Alert.alert(
        'Upload to Cloud',
        `Upload ${mediaItem.name} (${fileSizeMB.toFixed(2)} MB) to cloud storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              // Show uploading indicator
              Alert.alert(
                'Uploading...',
                `Please wait while we upload ${mediaItem.name}`,
                [],
                { cancelable: false }
              );

              try {
                // Upload the selected media file
                const token = await SecureStore.getItemAsync('auth_token');
                if (!token) {
                  throw new Error('Authentication required');
                }

                const formData = new FormData();
                formData.append('file', {
                  uri: mediaItem.uri,
                  name: mediaItem.name,
                  type: mediaItem.type,
                });

                // Show initial upload alert
                let uploadAlert = {
                  title: 'Uploading...',
                  message: `Starting upload of ${mediaItem.name}`,
                };
                
                // Show the first alert
                Alert.alert(uploadAlert.title, uploadAlert.message, [], { cancelable: false });
                
                // Function to update the upload alert
                const updateUploadAlert = (title, message) => {
                  uploadAlert = { title, message };
                  Alert.alert(title, message, [], { cancelable: false });
                };

                try {
                  // Using XMLHttpRequest for better progress tracking
                  const xhr = new XMLHttpRequest();
                  
                  // Set up progress tracking
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const percentComplete = Math.round((event.loaded / event.total) * 100);
                      updateUploadAlert(
                        'Uploading...',
                        `Uploading ${mediaItem.name}: ${percentComplete}%`
                      );
                    }
                  };

                  // Set up completion handler
                  xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      const result = JSON.parse(xhr.responseText);
                      updateUploadAlert(
                        'Upload Complete',
                        `${mediaItem.name} has been uploaded successfully!`
                      );
                      // Refresh the media list or update UI as needed
                      // refreshMediaList();
                    } else {
                      throw new Error(`Upload failed with status ${xhr.status}`);
                    }
                  };

                  // Set up error handler
                  xhr.onerror = () => {
                    throw new Error('Network error during upload');
                  };

                  // Open and send the request
                  xhr.open('POST', 'YOUR_UPLOAD_ENDPOINT');
                  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  xhr.send(formData);
                  
                } catch (error) {
                  console.error('Upload error:', error);
                  updateUploadAlert(
                    'Upload Failed',
                    `Failed to upload ${mediaItem.name}. Please try again.\n\nError: ${error.message}`
                  );
                }
                
                formData.append('metadata', JSON.stringify(metadata));

                // Upload using fetch with progress
                const response = await fetch('https://vlc-spring-boot.onrender.com/storage/add', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                  },
                  body: formData
                });

                if (!response.ok) {
                  throw new Error('Upload failed');
                }

                const result = await response.json();
                Alert.alert('Success', 'File uploaded successfully!');
                
              } catch (error) {
                console.error('Upload error:', error);
                Alert.alert('Upload Failed', error.message || 'Failed to upload file');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling media selection:', error);
      Alert.alert('Error', 'Failed to process the selected media');
    }
  };

  // Handle file selection from the file browser
  const handleFileSelect = async (file) => {
    try {
      if (file.isDirectory) {
        // If a directory is selected, navigate into it
        setStorageRoot(file.path);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(file.path);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      
      if (fileSizeMB > 100) { // 100MB limit
        Alert.alert('Error', 'File size exceeds 100MB limit');
        return;
      }

      // Show upload confirmation
      Alert.alert(
        'Upload to Cloud',
        `Upload ${file.name} (${fileSizeMB.toFixed(2)} MB) to cloud storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              try {
                // Create a more user-friendly upload progress indicator
                let uploadAlert = Alert.alert(
                  'Uploading...',
                  `Preparing to upload ${file.name}\n\n0% complete`,
                  [],
                  { cancelable: false }
                );

                // Update progress
                const updateProgress = (progress) => {
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  Alert.alert(
                    'Uploading...',
                    `Uploading ${file.name}\n\n${percent}% complete`,
                    [],
                    { cancelable: false }
                  );
                };

                // Determine file type
                const fileExt = file.name.split('.').pop().toLowerCase();
                let mimeType = 'application/octet-stream';
                
                // Map common file extensions to MIME types
                const mimeTypes = {
                  // Images
                  jpg: 'image/jpeg',
                  jpeg: 'image/jpeg',
                  png: 'image/png',
                  gif: 'image/gif',
                  
                  // Audio
                  mp3: 'audio/mpeg',
                  wav: 'audio/wav',
                  ogg: 'audio/ogg',
                  
                  // Video
                  mp4: 'video/mp4',
                  m4v: 'video/x-m4v',
                  mpg: 'video/mpeg',
                  
                  // Documents
                  pdf: 'application/pdf',
                  doc: 'application/msword',
                  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  xls: 'application/vnd.ms-excel',
                  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  ppt: 'application/vnd.ms-powerpoint',
                  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  
                  // Text
                  txt: 'text/plain',
                  json: 'application/json',
                  
                  // Archives
                  zip: 'application/zip',
                  rar: 'application/x-rar-compressed',
                };
                
                if (mimeTypes[fileExt]) {
                  mimeType = mimeTypes[fileExt];
                }
                
                // Create form data for the upload
                const formData = new FormData();
                
                // Create a file object that React Native's FormData can handle
                const fileObject = {
                  uri: file.path,
                  name: file.name,
                  type: mimeType,
                };
                
                // Add the file to form data
                formData.append('file', fileObject);
                
                // Create and add metadata as a string
                const metadata = {
                  fileName: file.name,
                  fileType: mimeType,
                  description: `Uploaded from mobile app on ${new Date().toISOString()}`
                };
                formData.append('metadata', JSON.stringify(metadata));
                
                // For debugging
                console.log('FormData contents:', {
                  file: fileObject,
                  metadata: JSON.stringify(metadata)
                });

                // Get auth token
                const token = await SecureStore.getItemAsync('auth_token');
                if (!token) {
                  throw new Error('Authentication required');
                }

                try {
                  // Upload file to cloud using XMLHttpRequest for better progress tracking
                  const xhr = new XMLHttpRequest();
                  
                  // Set up progress tracking
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      updateProgress({
                        loaded: event.loaded,
                        total: event.total
                      });
                    }
                  };
                  
                  // Create a promise to handle the upload
                  const uploadPromise = new Promise((resolve, reject) => {
                    xhr.onload = () => {
                      if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                          resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                          resolve(xhr.responseText);
                        }
                      } else {
                        reject(new Error(xhr.statusText || 'Upload failed'));
                      }
                    };
                    xhr.onerror = () => {
                      reject(new Error('Network Error'));
                    };
                  });
                  
                  // Open and send the request
                  xhr.open('POST', 'https://vlc-spring-boot.onrender.com/storage/add');
                  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  xhr.setRequestHeader('Accept', 'application/json');
                  xhr.send(formData);
                  
                  // Wait for the upload to complete
                  const responseData = await uploadPromise;
                  
                  // Show success message
                  Alert.alert(
                    'Success',
                    `${file.name} uploaded successfully!`,
                    [
                      { 
                        text: 'OK',
                        onPress: () => setShowStorageSheet(false)
                      }
                    ]
                  );
                  
                  return { data: responseData };
                } catch (error) {
                  console.error('Upload error:', error);
                  throw error; // Re-throw to be caught by the outer catch block
                }
              } catch (error) {
                console.error('Upload error:', error);
                let errorMessage = 'Failed to upload file';
                
                if (error.message === 'Network Error') {
                  errorMessage = 'Unable to connect to the server. Please check your internet connection.';
                } else if (error.response) {
                  // Server responded with an error status code
                  if (error.response.status === 401) {
                    errorMessage = 'Session expired. Please log in again.';
                    // Optionally redirect to login
                    router.push('/(auth)/login');
                  } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                }
                
                Alert.alert('Upload Failed', errorMessage);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to process the selected file. Please try again.'
      );
    }
  };

  // Function to view cloud files
  const viewCloudFiles = async () => {
    try {
      const response = await api.storage.getAll();
      if (response.data.status && response.data.data) {
        // Navigate to cloud files screen or show in a modal
        Alert.alert(
          'Cloud Files',
          `Found ${response.data.data.length} files in your cloud storage`,
          [
            { text: 'OK', onPress: () => {
              // Here you would typically navigate to a cloud files screen
              // router.push('/(cloud)/files');
            }}
          ]
        );
      } else {
        Alert.alert('Cloud Storage', 'No files found in your cloud storage');
      }
    } catch (error) {
      console.error('Error fetching cloud files:', error);
      Alert.alert('Error', 'Failed to load cloud files');
    }
  };

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
      <View style={styles.headerContainer}>
        <AudioHeader
          onSearch={() => setShowSearch(s => !s)}
          onMore={() => setShowMore(true)}
          showIcons={false}
        />
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefreshStorage}
        >
          <MaterialCommunityIcons name="reload" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>
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
                style={styles.quickActionCard}
                onPress={action.action}
              >
                <MaterialCommunityIcons 
                  name={action.icon} 
                  size={24} 
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
                    style={styles.recentFileCard}
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
              <FileBrowser 
                rootPath={storageRoot} 
                filterTypes={['audio', 'video']} 
                hideHeader={true} 
                onFileSelect={handleFileSelect}
              />
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

const getStyles = (themeColors) => StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 15,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: themeColors.card,
    marginLeft: 10,
  },
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
    backgroundColor: themeColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: themeColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0, // Remove border
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
    padding: 12,
    margin: 4,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceVariant,
    borderWidth: 1,
    borderColor: themeColors.border,
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
  },
  recentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border + '80',
  },
  fileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    borderRadius: 12,
    backgroundColor: themeColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
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
  const { themeColors } = useThemeStore();
  const styles = getStyles(themeColors);
  
  return <BrowseTab styles={styles} themeColors={themeColors} />;
};

export default BrowseTabWrapper;