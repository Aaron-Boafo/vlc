import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ActivityIndicator, 
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Clipboard,
  Alert
} from 'react-native';
import * as Icons from 'lucide-react-native';
import useThemeStore from '../store/theme';
import { router } from 'expo-router';
import useAudioControl from '../store/useAudioControl';
import useVideoStore from '../store/VideoHeadStore';
import PropTypes from 'prop-types';

const StreamModal = ({ visible, onClose }) => {
  const { themeColors } = useThemeStore();
  const [streamUrl, setStreamUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasteButton, setShowPasteButton] = useState(true);
  const inputRef = useRef(null);
  const audioControl = useAudioControl();
  const videoControl = useVideoStore();

  // Auto-focus input when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const validateUrl = (url) => {
    try {
      // More comprehensive URL validation
      const urlPattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i' // fragment locator
      );
      return !!urlPattern.test(url);
    } catch {
      return false;
    }
  };

  const getStreamType = (url) => {
    const lowerUrl = url.toLowerCase();
    
    // Check for YouTube first
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    }
    
    // Check video extensions
    if (lowerUrl.match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|3gp|wmv|ts|m3u8)$/)) {
      return 'video';
    }
    
    // Check streaming protocols
    if (lowerUrl.match(/^(rtmp|rtsp|hls|http|https):\/\//)) {
      // If it's a streaming URL but not a known audio stream, assume video
      if (!lowerUrl.match(/\.(mp3|wav|aac|flac|ogg|m4a)$/) && 
          !lowerUrl.match(/^(icecast|shoutcast):\/\//)) {
        return 'video';
      }
    }
    
    // Audio formats
    if (lowerUrl.match(/\.(mp3|wav|aac|flac|ogg|m4a|opus|weba)$/)) {
      return 'audio';
    }
    
    // Audio streaming protocols
    if (lowerUrl.match(/^(icecast|shoutcast):\/\//)) {
      return 'audio';
    }
    
    // Default to video for unknown types
    return 'video';
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setStreamUrl(text);
        setError('');
        setShowPasteButton(false);
      }
    } catch (err) {
      console.error('Failed to fetch clipboard content:', err);
    }
  };

  const handlePlay = async () => {
    Keyboard.dismiss();
    
    const trimmedUrl = streamUrl.trim();
    if (!trimmedUrl) {
      setError("Please enter a stream URL");
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const streamType = getStreamType(trimmedUrl);
      
      if (streamType === 'youtube' || streamType === 'video') {
        const videoTrack = {
          id: `stream-${Date.now()}`,
          uri: trimmedUrl,
          title: streamType === 'youtube' ? "YouTube Video" : "Network Stream",
          filename: streamType === 'youtube' ? "YouTube Stream" : "Network Stream",
          artist: streamType === 'youtube' ? "YouTube" : "Unknown",
        };
        videoControl.setAndPlayVideo(videoTrack);
        router.push('/player/video');
      } else {
        const audioTrack = {
          id: `stream-${Date.now()}`,
          uri: trimmedUrl,
          title: "Network Audio Stream",
          artist: "Unknown",
          artwork: null,
        };
        await audioControl.setAndPlayPlaylist([audioTrack]);
        router.push('/(tabs)/(audio)/player');
      }

      onClose();
      setStreamUrl("");
    } catch (err) {
      console.error('Stream error:', err);
      setError("Failed to start stream. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (text) => {
    setStreamUrl(text);
    if (error) setError('');
    setShowPasteButton(text.length === 0);
  };

  const clearInput = () => {
    setStreamUrl('');
    setShowPasteButton(true);
    inputRef.current?.focus();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View 
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
          accessible={true}
          accessibilityViewIsModal
          accessibilityLabel="Network stream dialog"
        >
          <TouchableWithoutFeedback>
            <View 
              style={[styles.modalContent, { backgroundColor: themeColors.card }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text 
                  style={[styles.modalTitle, { color: themeColors.text }]}
                  accessibilityRole="header"
                >
                  Add Network Stream
                </Text>
                <TouchableOpacity 
                  onPress={onClose}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Icons.X size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.input,
                    {
                      color: themeColors.text,
                      backgroundColor: themeColors.sectionBackground,
                      borderColor: error ? '#ff4444' : themeColors.sectionBackground,
                      paddingRight: 40, // Space for clear button
                    }
                  ]}
                  placeholder="Enter stream URL (e.g., http://example.com/stream)"
                  placeholderTextColor={themeColors.textSecondary}
                  value={streamUrl}
                  onChangeText={handleInputChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="url"
                  textContentType="URL"
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handlePlay}
                  blurOnSubmit={false}
                  accessibilityLabel="Stream URL"
                  accessibilityHint="Enter the URL of the stream you want to play"
                />
                {streamUrl.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={clearInput}
                    accessibilityLabel="Clear input"
                  >
                    <Icons.X size={16} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              
              {showPasteButton && (
                <TouchableOpacity
                  onPress={handlePasteFromClipboard}
                  style={styles.pasteButton}
                >
                  <Icons.Clipboard size={16} color={themeColors.primary} />
                  <Text style={[styles.pasteButtonText, { color: themeColors.primary }]}>
                    Paste from clipboard
                  </Text>
                </TouchableOpacity>
              )}
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Icons.AlertCircle size={16} color="#ff4444" />
                  <Text style={[styles.errorText, { color: '#ff4444' }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: themeColors.textSecondary }
                  ]}
                  onPress={onClose}
                  disabled={isLoading}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, { color: themeColors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.playButton,
                    { 
                      backgroundColor: themeColors.primary,
                      opacity: isLoading ? 0.7 : 1
                    }
                  ]}
                  onPress={handlePlay}
                  disabled={isLoading}
                  accessibilityLabel={isLoading ? "Loading" : "Play stream"}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icons.Play size={20} color="#fff" style={styles.buttonIcon} />
                      <Text style={[styles.buttonText, styles.playButtonText]}>
                        Play
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// PropTypes for better type checking
StreamModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    paddingRight: 40, // Space for clear button
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 12,
    padding: 4,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
    padding: 4,
  },
  pasteButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    marginLeft: 4,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  playButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  playButtonText: {
    color: '#fff',
  },
  buttonIcon: {
    marginRight: 5,
  },
});

export default StreamModal;