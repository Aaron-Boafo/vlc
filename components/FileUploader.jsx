import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import api from '../services/api';
import FileBrowser from './FileBrowser';

const FileUploader = ({ onUploadComplete, maxSizeMB = 100 }) => {
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = async (file) => {
    try {
      setError('');
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }

      // Determine file type based on extension
      const extension = file.name.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', '3gp', 'm4v', 'ts'].includes(extension);
      const isAudio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff', 'alac'].includes(extension);
      
      if (!isVideo && !isAudio) {
        setError('Please select a valid video or audio file');
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        type: isVideo ? 'video/mp4' : 'audio/mpeg',
        size: fileInfo.size,
        mediaType: isVideo ? 'video' : 'audio'
      });
      
      setShowFileBrowser(false);
    } catch (err) {
      console.log('Error selecting file:', err);
      setError('Failed to select file. Please try again.');
    }
  };

  const uploadFile = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const metadata = {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        mediaType: selectedFile.mediaType,
        description: `Uploaded on ${new Date().toLocaleString()}`,
      };

      const onUploadProgress = (progressEvent) => {
        const progress = progressEvent.loaded / progressEvent.total;
        setUploadProgress(progress);
      };

      const response = await api.storage.upload(
        {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        },
        metadata,
        onUploadProgress
      );

      if (response.data.status) {
        Alert.alert('Success', 'File uploaded successfully!');
        if (onUploadComplete) {
          onUploadComplete(response.data.data);
        }
        setSelectedFile(null);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, onUploadComplete]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showFileBrowser}
        animationType="slide"
        onRequestClose={() => setShowFileBrowser(false)}
      >
        <FileBrowser 
          onFileSelect={handleFileSelect} 
          onBack={() => setShowFileBrowser(false)}
          filterTypes={['video', 'audio']}
        />
      </Modal>

      {!selectedFile ? (
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={() => setShowFileBrowser(true)}
          disabled={isUploading}
        >
          <MaterialIcons name="folder-open" size={32} color="#6200ee" />
          <Text style={styles.buttonText}>Browse Files</Text>
          <Text style={styles.supportedFormats}>
            Supported: Videos & Audio
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileInfoContainer}>
          <View style={styles.fileInfo}>
            <MaterialIcons 
              name={selectedFile.mediaType === 'video' ? "videocam" : "audiotrack"} 
              size={24} 
              color="#6200ee" 
            />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(selectedFile.size)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedFile(null)}
              style={styles.cancelButton}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {isUploading && (
            <View style={styles.progressContainer}>
              <Progress.Bar 
                progress={uploadProgress} 
                width={null} 
                height={6}
                color="#6200ee"
                borderRadius={3}
              />
              <Text style={styles.progressText}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          )}

          {!isUploading && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.uploadButton]}
              onPress={uploadFile}
              disabled={isUploading}
            >
              <Text style={styles.actionButtonText}>
                Upload Now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={16} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 16,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#6200ee',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    marginTop: 8,
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '500',
  },
  supportedFormats: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fileInfoContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default FileUploader;
