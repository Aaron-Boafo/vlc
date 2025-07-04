import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Icons from "lucide-react-native";
import useHistoryStore from "../../../store/historyStore";
import useAudioControl from "../../../store/useAudioControl";
import useVideoStore from "../../../store/VideoHeadStore";
import useThemeStore from "../../../store/theme";
import MoreOptionsMenu from "../../../components/MoreOptionsMenu";
import { SafeAreaView } from "react-native-safe-area-context";

// Try to import ytdl, but don't fail if it's not available
let ytdl = null;
try {
  ytdl = require('react-native-ytdl');
} catch (error) {
  console.log('react-native-ytdl not available, YouTube streaming disabled');
}

const MoreScreen = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [isStreamModalVisible, setStreamModalVisible] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState("");
  const { history } = useHistoryStore();
  const audioControl = useAudioControl();
  const videoControl = useVideoStore();

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getStreamType = (url) => {
    const lowerUrl = url.toLowerCase();
    
    // Video streams
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    }
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || 
        lowerUrl.includes('.mkv') || lowerUrl.includes('.webm') || lowerUrl.includes('.m4v')) {
      return 'video';
    }
    if (lowerUrl.includes('rtmp://') || lowerUrl.includes('rtsp://') || lowerUrl.includes('hls://')) {
      return 'video';
    }
    
    // Audio streams
    if (lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || lowerUrl.includes('.aac') || 
        lowerUrl.includes('.flac') || lowerUrl.includes('.ogg') || lowerUrl.includes('.m4a')) {
      return 'audio';
    }
    if (lowerUrl.includes('icecast://') || lowerUrl.includes('shoutcast://')) {
      return 'audio';
    }
    
    // Default to video for unknown types
    return 'video';
  };

  const handlePlayStream = async () => {
    if (!streamUrl.trim()) {
      setStreamError("Please enter a stream URL");
      return;
    }

    if (!validateUrl(streamUrl)) {
      setStreamError("Please enter a valid URL");
      return;
    }

    setIsStreamLoading(true);
    setStreamError("");

    try {
      const streamType = getStreamType(streamUrl);
      
      // For YouTube URLs, test extraction before navigation
      if (streamType === 'youtube') {
        if (!ytdl) {
          setStreamError("YouTube streaming is not available. Please try a different URL or install the required library.");
          return;
        }
        
        try {
          const videoInfo = await ytdl.getInfo(streamUrl);
          const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest', filter: 'videoandaudio' });
          
          if (!format || !format.url) {
            setStreamError("Could not extract YouTube video. The video might be private, restricted, or unavailable.");
            return;
          }
        } catch (ytdlError) {
          console.error('YouTube extraction failed:', ytdlError);
          setStreamError("YouTube video extraction failed. This could be due to:\n\n• Private or restricted video\n• Invalid or expired link\n• Network connectivity issues\n• YouTube API changes");
          return;
        }
      }
      
      if (streamType === 'youtube' || streamType === 'video') {
        const videoTrack = {
          id: `stream-${Date.now()}`,
          uri: streamUrl,
          title: streamType === 'youtube' ? "YouTube Video" : "Network Video Stream",
          filename: streamType === 'youtube' ? "YouTube Stream" : "Network Stream",
          artist: streamType === 'youtube' ? "YouTube" : "Unknown",
        };
        videoControl.setAndPlayVideo(videoTrack);
        router.push('/(tabs)/(video)/player');
      } else {
        const audioTrack = {
          id: `stream-${Date.now()}`,
          uri: streamUrl,
          title: "Network Audio Stream",
          artist: "Unknown",
          artwork: null,
        };
        await audioControl.setAndPlayPlaylist([audioTrack]);
        router.push('/(tabs)/(audio)/player');
      }

      setStreamModalVisible(false);
      setStreamUrl("");
    } catch (error) {
      console.error('Stream error:', error);
      setStreamError("Failed to start stream. Please check the URL and try again.");
    } finally {
      setIsStreamLoading(false);
    }
  };

  const handleStreamModalClose = () => {
    setStreamModalVisible(false);
    setStreamUrl("");
    setStreamError("");
    setIsStreamLoading(false);
  };

  const clearAndTryAgain = () => {
    setStreamUrl("");
    setStreamError("");
  };

  const testStreamUrl = async () => {
    if (!streamUrl.trim()) {
      setStreamError("Please enter a stream URL");
      return;
    }

    if (!validateUrl(streamUrl)) {
      setStreamError("Please enter a valid URL");
      return;
    }

    setIsStreamLoading(true);
    setStreamError("");

    try {
      const streamType = getStreamType(streamUrl);
      const response = await fetch(streamUrl, { method: 'HEAD' });
      
      if (response.ok) {
        setStreamError("URL is accessible and ready to stream!");
        setTimeout(() => setStreamError(""), 3000);
      } else {
        setStreamError("URL might not be accessible. Try streaming anyway.");
      }
    } catch (error) {
      console.error('URL test error:', error);
      setStreamError("Could not test URL. You can still try to stream it.");
    } finally {
      setIsStreamLoading(false);
    }
  };

  const ActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
      style={{ 
        backgroundColor: themeColors.sectionBackground,
        borderWidth: activeTheme === "dark" ? 1 : 0,
        borderColor: "rgba(255, 255, 255, 0.1)"
      }}
    >
      {icon}
      <Text
        className="ml-2 font-semibold"
        style={{ color: themeColors.primary }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Section = ({ title, children, showArrow = false }) => (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4">
        <Text
          className="text-lg font-semibold"
          style={{ color: themeColors.primary }}
        >
          {title}
        </Text>
        {showArrow && (
          <Icons.ChevronRight size={20} color={themeColors.primary} />
        )}
      </View>
      {children}
    </View>
  );

  const HistoryItem = ({ title, subtitle, imageUrl }) => (
    <TouchableOpacity
      className="w-24 mr-4"
      onPress={() => console.log("History item pressed")}
    >
      <View
        className="w-24 h-24 rounded-lg mb-2"
        style={{ 
          backgroundColor: themeColors.sectionBackground,
          borderWidth: activeTheme === "dark" ? 1 : 0,
          borderColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <Icons.Music
          size={24}
          color={themeColors.primary}
          style={{ margin: 8 }}
        />
      </View>
      <Text
        className="text-xs font-medium"
        style={{ color: themeColors.text }}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        className="text-xs"
        style={{ 
          color: activeTheme === "dark" ? "rgba(255, 255, 255, 0.7)" : themeColors.tabIconColor 
        }}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ 
        flex: 1,
        backgroundColor: themeColors.background,
      }}
      edges={['top']}
    >
      {/* Header */}
      <View className="px-4 py-2.5 flex-row items-center justify-between border-b" 
        style={{ borderColor: "rgba(147, 51, 234, 0.1)" }}>
        <View className="flex-row items-center">
          <View 
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ 
              backgroundColor: themeColors.sectionBackground,
              borderWidth: activeTheme === "dark" ? 1 : 0,
              borderColor: "rgba(255, 255, 255, 0.1)"
            }}
          >
            <Icons.Play size={20} color={themeColors.primary} />
          </View>
          <Text className="text-lg font-bold" style={{ color: themeColors.text }}>
            VLC
          </Text>
        </View>
        <TouchableOpacity 
          className="w-10 h-10 rounded-full items-center justify-center"
          onPress={() => setMoreOptionsVisible(true)}
        >
          <Icons.MoreVertical size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 20,
        }}
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Top Actions */}
        <View className="flex-row gap-3 mb-8">
          <ActionButton
            icon={<Icons.Settings size={20} color={themeColors.primary} />}
            label="SETTINGS"
            onPress={() => router.push("/(tabs)/(more)/settings")}
          />
          <ActionButton
            icon={<Icons.Info size={20} color={themeColors.primary} />}
            label="ABOUT"
            onPress={() => router.push("/(tabs)/(more)/about")}
          />
        </View>

        {/* Streams Section */}
        <Section title="Streams" showArrow>
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.sectionBackground,
              width: 162,
              height: 106,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 3,
            }}
            onPress={() => setStreamModalVisible(true)}
          >
            <Icons.Plus size={24} color={themeColors.primary} />
            <Text
              className="mt-2 text-base"
              style={{ color: themeColors.text }}
            >
              New stream
            </Text>
          </TouchableOpacity>
        </Section>

        {/* History Section */}
        <Section title="History" showArrow>
          {history.length === 0 ? (
            <Text style={{ color: themeColors.textSecondary, marginLeft: 8 }}>No history yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {history.slice(0, 10).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="w-24 mr-4"
                  onPress={async () => {
                    await audioControl.setAndPlayPlaylist([item]);
                    router.push('/player');
                  }}
                >
                  <View
                    className="w-24 h-24 rounded-lg mb-2"
                    style={{ 
                      backgroundColor: themeColors.sectionBackground,
                      borderWidth: activeTheme === "dark" ? 1 : 0,
                      borderColor: "rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    {item.artwork ? (
                      <Image source={{ uri: item.artwork }} style={{ width: 48, height: 48, borderRadius: 8, alignSelf: 'center', marginTop: 16 }} />
                    ) : (
                      <Icons.Music size={24} color={themeColors.primary} style={{ margin: 8, alignSelf: 'center', marginTop: 16 }} />
                    )}
                  </View>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: themeColors.text }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ color: activeTheme === "dark" ? "rgba(255, 255, 255, 0.7)" : themeColors.tabIconColor }}
                    numberOfLines={1}
                  >
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Section>

        {/* Additional Features */}
        <Section title="Features">
          <View className="space-y-4">
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 rounded-lg"
              style={{ 
                backgroundColor: themeColors.sectionBackground,
                borderWidth: activeTheme === "dark" ? 1 : 0,
                borderColor: "rgba(255, 255, 255, 0.1)"
              }}
              onPress={() => console.log("Downloads pressed")}
            >
              <View className="flex-row items-center">
                <Icons.Download size={24} color={themeColors.primary} />
                <Text
                  className="ml-3 font-medium"
                  style={{ color: themeColors.text }}
                >
                  Downloads
                </Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 rounded-lg"
              style={{ 
                backgroundColor: themeColors.sectionBackground,
                borderWidth: activeTheme === "dark" ? 1 : 0,
                borderColor: "rgba(255, 255, 255, 0.1)"
              }}
              onPress={() => console.log("Network pressed")}
            >
              <View className="flex-row items-center">
                <Icons.Wifi size={24} color={themeColors.primary} />
                <Text
                  className="ml-3 font-medium"
                  style={{ color: themeColors.text }}
                >
                  Network
                </Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 rounded-lg"
              style={{ 
                backgroundColor: themeColors.sectionBackground,
                borderWidth: activeTheme === "dark" ? 1 : 0,
                borderColor: "rgba(255, 255, 255, 0.1)"
              }}
              onPress={() => console.log("Storage pressed")}
            >
              <View className="flex-row items-center">
                <Icons.HardDrive size={24} color={themeColors.primary} />
                <Text
                  className="ml-3 font-medium"
                  style={{ color: themeColors.text }}
                >
                  Storage
                </Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>

      <MoreOptionsMenu
        visible={moreOptionsVisible}
        onClose={() => setMoreOptionsVisible(false)}
      />

      {/* Stream Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStreamModalVisible}
        onRequestClose={handleStreamModalClose}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 24, width: '90%', elevation: 10 }}>
            <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
              Open Network Stream
            </Text>
            <Text style={{ color: themeColors.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
              Enter a URL to stream video or audio content
            </Text>
            <TextInput
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: themeColors.primary,
              }}
              placeholder="https://example.com/video.mp4 or YouTube URL"
              placeholderTextColor={themeColors.textSecondary}
              value={streamUrl}
              onChangeText={(text) => {
                setStreamUrl(text);
                setStreamError(""); // Clear error when user types
              }}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />
            <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Supported: YouTube, MP4, MP3, RTMP, HLS, and more
            </Text>
            {isStreamLoading && (
              <Text style={{ color: themeColors.textSecondary, marginBottom: 12 }}>Loading...</Text>
            )}
            {streamError && (
              <View style={{ 
                backgroundColor: themeColors.background, 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 12,
                borderWidth: 1,
                borderColor: themeColors.error || '#ff6b6b'
              }}>
                <Text style={{ 
                  color: themeColors.error || '#ff6b6b', 
                  fontSize: 14,
                  lineHeight: 20
                }}>
                  {streamError}
                </Text>
                <TouchableOpacity
                  onPress={clearAndTryAgain}
                  style={{
                    backgroundColor: themeColors.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                    marginTop: 8
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    Try Different URL
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                onPress={handleStreamModalClose}
                style={{ flex: 1, backgroundColor: themeColors.background, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={testStreamUrl}
                disabled={isStreamLoading}
                style={{ 
                  flex: 1, 
                  backgroundColor: themeColors.sectionBackground, 
                  paddingVertical: 12, 
                  borderRadius: 8, 
                  alignItems: 'center',
                  opacity: isStreamLoading ? 0.6 : 1
                }}
              >
                <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>
                  {isStreamLoading ? 'Testing...' : 'Test URL'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePlayStream}
                disabled={isStreamLoading}
                style={{ 
                  flex: 1, 
                  backgroundColor: isStreamLoading ? themeColors.textSecondary : themeColors.primary, 
                  paddingVertical: 12, 
                  borderRadius: 8, 
                  alignItems: 'center',
                  opacity: isStreamLoading ? 0.6 : 1
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {isStreamLoading ? 'Processing...' : 'Stream'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default MoreScreen;
