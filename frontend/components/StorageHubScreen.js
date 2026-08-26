import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useThemeStore from '../store/theme';
import MediaSelector from './MediaSelector';
import CloudStorageBrowser from './CloudStorageBrowser';

const { width } = Dimensions.get('window');

const StorageHubScreen = ({ onClose, onUpload, onViewFiles }) => {
  const navigation = useNavigation();
  const { themeColors } = useThemeStore();
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showCloudFiles, setShowCloudFiles] = useState(false);

  const handleUploadComplete = (file) => {
    setShowMediaSelector(false);
    if (onUpload) onUpload(file);
  };

  const handleFileSelect = (file) => {
    console.log('Selected file:', file);
    // You can implement file preview or playback logic here
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { 
          backgroundColor: `${themeColors.primary}15`,
          shadowColor: themeColors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }]}>
          <MaterialIcons name="cloud-queue" size={40} color={themeColors.primary} />
        </View>
        <Text style={[styles.title, { color: themeColors.text, marginTop: 16 }]}>
          Cloud Storage
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Securely access and manage your files from anywhere
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Upload Card */}
        <TouchableOpacity 
          style={[styles.card, { 
            backgroundColor: themeColors.card || themeColors.background,
            borderColor: `${themeColors.primary}20`
          }]}
          onPress={() => setShowMediaSelector(true)}
          activeOpacity={0.9}
        >
          <View style={styles.cardContent}>
            <MaterialIcons 
              name="cloud-upload" 
              size={28} 
              color={themeColors.primary}
            />
            <Text style={[styles.cardTitle, { color: themeColors.text, marginLeft: 12 }]}>
              Upload Files
            </Text>
          </View>
        </TouchableOpacity>

        {/* My Files Card */}
        <TouchableOpacity 
          style={[styles.card, { 
            backgroundColor: themeColors.card || themeColors.background,
            borderColor: `${themeColors.success}20`
          }]}
          onPress={() => setShowCloudFiles(true)}
          activeOpacity={0.9}
        >
          <View style={styles.cardContent}>
            <MaterialIcons 
              name="folder" 
              size={28} 
              color="#34C759"
            />
            <Text style={[styles.cardTitle, { color: themeColors.text, marginLeft: 12 }]}>
              My Files
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMediaSelector}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMediaSelector(false)}
      >
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <MediaSelector
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowMediaSelector(false)}
            maxSizeMB={100}
          />
        </View>
      </Modal>

      <Modal
        visible={showCloudFiles}
        animationType="slide"
        onRequestClose={() => setShowCloudFiles(false)}
      >
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <CloudStorageBrowser 
            onFileSelect={handleFileSelect}
            onClose={() => setShowCloudFiles(false)}
          />
        </View>
      </Modal>

      {/* Close Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.background, borderTopColor: themeColors.border || 'rgba(0,0,0,0.1)' }]}>
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: themeColors.primary }]}
          onPress={onClose || (() => navigation.goBack())}
          activeOpacity={0.8}
        >
          <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
    marginBottom: 10,
  },
  content: {
    flex: 1,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
});

export default StorageHubScreen;