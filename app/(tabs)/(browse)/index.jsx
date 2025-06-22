import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecentFiles from './RecentFiles';
import { useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeStore from '../../../store/theme';
import * as AuthSession from 'expo-auth-session';

const GOOGLE_CLIENT_ID = '<YOUR_GOOGLE_CLIENT_ID>'; // Replace with your Google OAuth Client ID
const DROPBOX_CLIENT_ID = '<YOUR_DROPBOX_CLIENT_ID>'; // Replace with your Dropbox App Key

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Item = ({
  icon,
  label,
  description,
  onPress,
  rightComponent,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const { themeColors } = useThemeStore();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const animatePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress && onPress();
  };

  return (
    <AnimatedTouchable
      style={[
        styles.item,
        {
          backgroundColor: themeColors.sectionBackground,
          borderColor: themeColors.primary + '18',
          borderWidth: 1,
          borderRadius: 14,
          shadowOpacity: 0,
          elevation: 0,
          marginBottom: 14,
          paddingVertical: 18,
          paddingHorizontal: 18,
          transform: [{ scale: scaleValue }],
        },
        style,
      ]}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={28} color={themeColors.primary} style={{ marginRight: 16 }} />
        <View>
          <Text style={[styles.itemLabel, { color: themeColors.text }]}>{label}</Text>
          <Text style={[styles.itemDescription, { color: themeColors.tabIconColor }]}>{description}</Text>
        </View>
      </View>
      {rightComponent}
    </AnimatedTouchable>
  );
};

const SectionDivider = () => {
  const { themeColors } = useThemeStore();
  return (
    <View style={{
      height: 1,
      backgroundColor: themeColors.primary + '18',
      marginVertical: 10,
      marginHorizontal: 8,
      borderRadius: 2,
    }} />
  );
};

const MediaBrowserScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, themeColors } = useThemeStore();
  const [wifiSharing, setWifiSharing] = useState(false);
  const [selectedMediaUri, setSelectedMediaUri] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [mediaDetails, setMediaDetails] = useState(null);
  const [networkStreamVisible, setNetworkStreamVisible] = useState(false);
  const [showCloudServices, setShowCloudServices] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [videoError, setVideoError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  // Recent Files
  const [recentFiles, setRecentFiles] = useState([]);
  React.useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('vlc_recent_files');
      if (stored) setRecentFiles(JSON.parse(stored));
    })();
  }, []);
  const addToRecents = async (file) => {
    let thumbnail = file.thumbnail;
    // Only generate thumbnail for local files
    if (!thumbnail && file.uri && file.uri.startsWith('file:')) {
      try {
        const VideoThumbnails = await import('expo-video-thumbnails');
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 1000 });
        thumbnail = thumbUri;
      } catch (e) {
        // fallback: no thumbnail
        thumbnail = undefined;
      }
    }
    let newRecents = recentFiles.filter(f => f.uri !== file.uri);
    newRecents.unshift({ ...file, thumbnail });
    if (newRecents.length > 10) newRecents = newRecents.slice(0, 10);
    setRecentFiles(newRecents);
    await AsyncStorage.setItem('vlc_recent_files', JSON.stringify(newRecents));
  };


  // Local file picker
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setSelectedMediaUri(fileUri);
        setVideoError(null);
        await addToRecents({
          uri: fileUri,
          name: fileUri.split('/').pop(),
          source: 'Local',
          thumbnail: undefined,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick the video file');
    }
  }, [recentFiles]);

  return (
    <>
      <StatusBar
        barStyle={themeColors.background === '#111017' ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.background}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: themeColors.text, marginTop: 16, marginLeft: 18, marginBottom: 12, letterSpacing: 0.1 }}>Browse</Text>
        <View style={{ height: 2 }} />
        <RecentFiles
          recents={recentFiles}
          onSelect={async (file) => {
            setSelectedMediaUri(file.uri);
            await addToRecents(file);
          }}
          themeColors={themeColors}
          onClear={async () => {
            await AsyncStorage.removeItem('vlc_recent_files');
            setRecentFiles([]);
          }}
        />
        <View style={{ height: 22 }} />
        <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: themeColors.background, paddingTop: 0, paddingBottom: 28 }]}>
          {/* Local Section */}
          {[{
            icon: 'folder-outline',
            label: 'Local Files',
            description: 'Browse and play videos stored on your device',
            onPress: pickDocument
          }, {
            icon: 'cloud-outline',
            label: 'Cloud Services',
            description: 'Connect and play videos from Google Drive, Dropbox, iCloud',
            onPress: () => setShowCloudServices(true)
          }, {
            icon: 'globe-outline',
            label: 'Network Stream',
            description: 'Play a video from a network URL',
            onPress: () => setNetworkStreamVisible(true)
          }, {
            icon: 'wifi-outline',
            label: 'Wi-Fi Sharing',
            description: 'Transfer files over Wi-Fi (coming soon)',
            onPress: () => Alert.alert('Wi-Fi Sharing', 'This feature is coming soon!')
          }].map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: themeColors.sectionBackground,
                borderRadius: 18,
                marginBottom: 18,
                marginHorizontal: 8,
                minHeight: 76,
                shadowColor: themeColors.text,
                shadowOpacity: 0.03,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
                paddingVertical: 0,
                paddingHorizontal: 0,

              }}
            >
              <View style={{
                backgroundColor: themeColors.primary + '16',
                width: 48, height: 48,
                borderRadius: 24,
                justifyContent: 'center', alignItems: 'center',
                marginLeft: 20, marginRight: 18,
              }}>
                <Ionicons name={item.icon} size={26} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1, justifyContent: 'center', minHeight: 60 }}>
                <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 17, marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ color: themeColors.tabIconColor, fontSize: 13, fontWeight: '500', opacity: 0.85 }}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={themeColors.primary} style={{ marginRight: 18, marginLeft: 10 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cloud Services Modal */}
        <Modal
          visible={showCloudServices}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowCloudServices(false)}
        >
          <View style={{
            flex: 1, backgroundColor: themeColors.background, paddingTop: insets.top}}>
            <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themeColors.text + '10', backgroundColor: themeColors.background}}>
              <TouchableOpacity onPress={() => setShowCloudServices(false)} style={{ padding: 2, borderRadius: 8 }}>
                <Ionicons name="arrow-back" size={26} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={{color: themeColors.text, fontWeight: 'bold', fontSize: 20, marginLeft: 16, letterSpacing: 0.1}}>Cloud File Picker</Text>
            </View>
            <ScrollView contentContainerStyle={{padding: 18, alignItems: 'center'}}>
              {/* Google Drive */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: themeColors.sectionBackground,
                  borderColor: themeColors.primary + '18',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  marginBottom: 14,
                  width: '100%',
                }}
                onPress={async () => {
                  setIsLoading(true);
                  try {
                    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/drive.readonly`;
                    const result = await AuthSession.startAsync({ authUrl });
                    if (result.type === 'success' && result.params.access_token) {
                      // Fetch video files from Google Drive
                      const filesRes = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType contains 'video/'&fields=files(id,name,mimeType,webContentLink)", {
                        headers: { Authorization: `Bearer ${result.params.access_token}` },
                      });
                      const filesJson = await filesRes.json();
                      setIsLoading(false);
                      if (filesJson.files && filesJson.files.length > 0) {
                        Alert.alert(
                          'Google Drive Videos',
                          filesJson.files.map((f, i) => `${i + 1}. ${f.name}`).join('\n'),
                          [
                            {
                              text: 'Play First',
                              onPress: async () => {
                                const file = filesJson.files[0];
                                setShowCloudServices(false);
                                setSelectedMediaUri(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${result.params.access_token}`);
                                await addToRecents({
                                  uri: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${result.params.access_token}`,
                                  name: file.name,
                                  source: 'Google Drive',
                                  thumbnail: undefined,
                                });
                              },
                            },
                            { text: 'Close', style: 'cancel' },
                          ]
                        );
                      } else {
                        Alert.alert('Google Drive', 'No video files found.');
                      }
                    } else {
                      setIsLoading(false);
                      Alert.alert('Google Drive', 'Authentication failed.');
                    }
                  } catch (e) {
                    setIsLoading(false);
                    Alert.alert('Google Drive', 'Error: ' + e.message);
                  }
                }}
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text style={{fontSize: 16, fontWeight: '600', marginLeft: 14, color: themeColors.text}}>Google Drive</Text>
              </TouchableOpacity>

              {/* Dropbox */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: themeColors.sectionBackground,
                  borderColor: themeColors.primary + '18',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  marginBottom: 14,
                  width: '100%',
                }}
                onPress={async () => {
                  setIsLoading(true);
                  try {
                    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
                    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${DROPBOX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
                    const result = await AuthSession.startAsync({ authUrl });
                    if (result.type === 'success' && result.params.access_token) {
                      // Fetch video files from Dropbox
                      const filesRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${result.params.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ path: '', recursive: true }),
                      });
                      const filesJson = await filesRes.json();
                      setIsLoading(false);
                      if (filesJson.entries && filesJson.entries.length > 0) {
                        const videoFiles = filesJson.entries.filter(
                          (f) =>
                            f['.tag'] === 'file' &&
                            /\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp|m3u8|mpd)$/i.test(f.name)
                        );
                        if (videoFiles.length > 0) {
                          Alert.alert(
                            'Dropbox Videos',
                            videoFiles.map((f, i) => `${i + 1}. ${f.name}`).join('\n'),
                            [
                              {
                                text: 'Play First',
                                onPress: async () => {
                                  // Get temporary link
                                  const tempLinkRes = await fetch(
                                    'https://api.dropboxapi.com/2/files/get_temporary_link',
                                    {
                                      method: 'POST',
                                      headers: {
                                        Authorization: `Bearer ${result.params.access_token}`,
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ path: videoFiles[0].path_lower }),
                                    }
                                  );
                                  const tempLinkJson = await tempLinkRes.json();
                                  setShowCloudServices(false);
                                  setSelectedMediaUri(tempLinkJson.link);
                                  await addToRecents({
                                    uri: tempLinkJson.link,
                                    name: videoFiles[0].name,
                                    source: 'Dropbox',
                                    thumbnail: undefined,
                                  });
                                },
                              },
                              { text: 'Close', style: 'cancel' },
                            ]
                          );
                        } else {
                          Alert.alert('Dropbox', 'No video files found.');
                        }
                      } else {
                        Alert.alert('Dropbox', 'No files found.');
                      }
                    } else {
                      setIsLoading(false);
                      Alert.alert('Dropbox', 'Authentication failed.');
                    }
                  } catch (e) {
                    setIsLoading(false);
                    Alert.alert('Dropbox', 'Error: ' + e.message);
                  }
                }}
              >
                <Ionicons name="logo-dropbox" size={24} color="#0061FF" />
                <Text style={{fontSize: 16, fontWeight: '600', marginLeft: 14, color: themeColors.text}}>Dropbox</Text>
              </TouchableOpacity>

              {/* iCloud (iOS only) */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: themeColors.sectionBackground,

                    borderRadius: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 15,
                    marginBottom: 14,
                    width: '100%',
                  }}
                  onPress={async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: 'video/*',
                        copyToCacheDirectory: true,
                      });
                      if (result.assets && result.assets.length > 0) {
                        setShowCloudServices(false);
                        setSelectedMediaUri(result.assets[0].uri);
                        await addToRecents({
                          uri: result.assets[0].uri,
                          name: result.assets[0].name || 'iCloud Video',
                          source: 'iCloud',
                          thumbnail: undefined,
                        });
                      }
                    } catch (e) {
                      Alert.alert('iCloud', 'Error: ' + e.message);
                    }
                  }}
                >
                  <Ionicons name="cloud" size={24} color="#4285F4" />
                  <Text style={{fontSize: 16, fontWeight: '600', marginLeft: 14, color: themeColors.text}}>iCloud</Text>
                </TouchableOpacity>
              )}

              {isLoading && (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 24 }} />
              )}

              <TouchableOpacity
                style={{marginTop: 18, padding: 10, borderRadius: 9, backgroundColor: themeColors.primary, minWidth: 90, alignItems: 'center'}}
                onPress={() => setShowCloudServices(false)}
                activeOpacity={0.82}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

        {/* Video Modal */}
        <Modal
          visible={!!selectedMediaUri}
          animationType="fade"
          transparent={false}
          onRequestClose={() => setSelectedMediaUri(null)}
        >
          <View style={styles.videoModalFullScreen}>
            {isLoading && (
              <ActivityIndicator size="large" color={themeColors.primary} style={{ position: 'absolute', top: 40, alignSelf: 'center', zIndex: 10 }} />
            )}
            {videoError && (
              <Text style={{ color: 'red', marginBottom: 12, position: 'absolute', top: 60, alignSelf: 'center', zIndex: 10 }}>{videoError}</Text>
            )}
            {selectedMediaUri && (
              <Video
                ref={videoRef}
                source={{ uri: selectedMediaUri }}
                style={styles.videoFullScreen}
                useNativeControls
                resizeMode="contain"
                shouldPlay
                isLooping
                isMuted={false}
                rate={1.0}
                volume={1.0}
                onError={(error) => {
                  const errorMsg = `Video error: ${error.nativeEvent?.error?.message || 'Unknown error'}`;
                  setVideoError(errorMsg);
                  setIsLoading(false);
                }}
                onLoadStart={() => {
                  setIsLoading(true);
                  setVideoError(null);
                }}
                onLoad={() => {
                  setIsLoading(false);
                  // Automatically present fullscreen when loaded (for all sources)
                  if (videoRef.current?.presentFullscreenPlayer) {
                    videoRef.current.presentFullscreenPlayer();
                  }
                }}
                onFullscreenUpdate={({ fullscreenUpdate }) => {
                  // 2 = fullscreen dismissed
                  if (fullscreenUpdate === 2) {
                    setSelectedMediaUri(null);
                    videoRef.current?.stopAsync();
                  }
                }}
              />
            )}
          </View>
        </Modal>

        {/* Network Stream Modal */}
        <Modal
          visible={networkStreamVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setNetworkStreamVisible(false)}
        >
          <SafeAreaView style={{flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center'}}>
            <View style={{width: '92%', maxWidth: 420, alignItems: 'center', backgroundColor: themeColors.sectionBackground, borderRadius: 16, padding: 20, shadowColor: themeColors.text, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2}}>
              <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 20, marginBottom: 14, letterSpacing: 0.1 }}>Network Stream</Text>
              <TextInput
                style={{
                  borderRadius: 8,
                  padding: 13,
                  color: themeColors.text,
                  fontSize: 16,
                  backgroundColor: themeColors.background,
                  marginBottom: 18,
                  width: '100%',
                }}
                placeholder="https://example.com/stream.mp4"
                placeholderTextColor={themeColors.tabIconColor}
                value={streamUrl}
                onChangeText={setStreamUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={{
                  backgroundColor: themeColors.primary,
                  borderRadius: 9,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 10,
                  width: '100%',
                }}
                onPress={async () => {
                  if (!streamUrl.trim()) {
                    Alert.alert('Error', 'Please enter a valid URL');
                    return;
                  }
                  setNetworkStreamVisible(false);
                  setSelectedMediaUri(streamUrl.trim());
                  await addToRecents({
                    uri: streamUrl.trim(),
                    name: streamUrl.trim(),
                    source: 'Network',
                    thumbnail: undefined,
                  });
                }}
                activeOpacity={0.83}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 6, padding: 10, borderRadius: 8, backgroundColor: themeColors.background, minWidth: 90, alignItems: 'center', width: '100%' }}
                onPress={() => setNetworkStreamVisible(false)}
                activeOpacity={0.82}
              >
                <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  browseTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginLeft: 18,
    marginBottom: 8,
    textAlign: 'left',
    letterSpacing: 1.1,
  },
  scrollContainer: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  item: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    opacity: 0.8,
  },
  videoModalFullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoFullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});

export default MediaBrowserScreen;