import { View, Text, TouchableOpacity, ScrollView, Switch, Image } from "react-native";
import React, { useState } from "react";
import useThemeStore from "../../../store/theme";
import useHistoryStore from "../../../store/historyStore";
import * as Icons from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AccentColorPicker from "../../../components/AccentColorPicker";

const SettingsScreen = () => {
  const { themeColors, toggleTheme, activeTheme, accentColor, selectedBackground, setBackground } = useThemeStore();
  const { saveHistory, setSaveHistory } = useHistoryStore();
  const router = useRouter();
  const [autoplay, setAutoplay] = useState(false);
  const [backgroundPlay, setBackgroundPlay] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [backgroundPiP, setBackgroundPiP] = useState(false);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [videoQueueHistory, setVideoQueueHistory] = useState(true);
  const [audioQueueHistory, setAudioQueueHistory] = useState(true);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const SettingItem = ({ icon, title, description, children }) => (
    <View className="flex-row items-center justify-between p-4 border-b" style={{ borderColor: "rgba(147, 51, 234, 0.1)" }}>
      <View className="flex-row items-center flex-1">
        <View className="w-10">{icon}</View>
        <View className="flex-1 ml-3">
          {typeof title === 'string' ? (
            <Text className="font-medium" style={{ color: themeColors.text }}>
              {title}
            </Text>
          ) : (
            title
          )}
          {typeof description === 'string' ? (
            <Text className="text-sm mt-1" style={{ color: activeTheme === "dark" ? "rgba(255, 255, 255, 0.7)" : themeColors.tabIconColor }}>
              {description}
            </Text>
          ) : (
            description
          )}
        </View>
      </View>
      {children}
    </View>
  );

  const Section = ({ title, children }) => (
    <View className="mb-6">
      <Text
        className="text-sm font-medium px-4 py-2"
        style={{ color: themeColors.primary }}
      >
        {title}
      </Text>
      <View style={{ backgroundColor: themeColors.sectionBackground }}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
      }}
    >
      <View className="flex-row items-center p-4 border-b" style={{ borderColor: "rgba(147, 51, 234, 0.1)" }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icons.ArrowLeft size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text
          className="text-lg font-semibold ml-4"
          style={{ color: themeColors.text }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors.background }}
      >
        <View className="mt-4">
          <Section title="MEDIA LIBRARY">
            <SettingItem
              icon={<Icons.FolderSearch size={24} color={themeColors.primary} />}
              title="Media Library folders"
              description="Select directories to include in the media library"
            >
              <TouchableOpacity
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: themeColors.primaryLight }}
                onPress={() => console.log("Select folders")}
              >
                <Text style={{ color: themeColors.primary }}>Select</Text>
              </TouchableOpacity>
            </SettingItem>
            <SettingItem
              icon={<Icons.RefreshCw size={24} color={themeColors.primary} />}
              title="Auto rescan"
              description="Automatically scan device for new or deleted media"
            >
              <Switch
                value={autoScan}
                onValueChange={setAutoScan}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={autoScan ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
          </Section>

          <Section title="APPEARANCE">
            <SettingItem
              icon={<Icons.Palette size={24} color={themeColors.primary} />}
              title="Theme"
              description={`Currently using ${activeTheme} theme`}
            >
              <TouchableOpacity
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: themeColors.primaryLight }}
                onPress={toggleTheme}
              >
                <Text style={{ color: themeColors.primary }}>Change</Text>
              </TouchableOpacity>
            </SettingItem>
            <SettingItem
              icon={<Icons.Droplet size={24} color={themeColors.primary} />}
              title="Accent Color"
              description={`Currently using ${accentColor} accent`}
            >
              <TouchableOpacity
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: themeColors.primaryLight }}
                onPress={() => setColorPickerVisible(true)}
              >
                <Text style={{ color: themeColors.primary }}>Change</Text>
              </TouchableOpacity>
            </SettingItem>
          </Section>

          <Section title="VIDEO">
            <SettingItem
              icon={<Icons.Minimize2 size={24} color={themeColors.primary} />}
              title="Background/PiP mode"
              description="Switch to PiP when you switch to another application"
            >
              <Switch
                value={backgroundPiP}
                onValueChange={setBackgroundPiP}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={backgroundPiP ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
            <SettingItem
              icon={<Icons.Cpu size={24} color={themeColors.primary} />}
              title="Hardware Acceleration"
              description="Improves video playback performance"
            >
              <Switch
                value={hardwareAcceleration}
                onValueChange={setHardwareAcceleration}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={hardwareAcceleration ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
            <SettingItem
              icon={<Icons.Video size={24} color={themeColors.primary} />}
              title="Quality"
              description="Play videos in highest quality when available"
            >
              <Switch
                value={highQuality}
                onValueChange={setHighQuality}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={highQuality ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
          </Section>

          <Section title="PLAYBACK">
            <SettingItem
              icon={<Icons.Play size={24} color={themeColors.primary} />}
              title="Autoplay"
              description="Automatically play next item"
            >
              <Switch
                value={autoplay}
                onValueChange={setAutoplay}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={autoplay ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
            <SettingItem
              icon={<Icons.Minimize2 size={24} color={themeColors.primary} />}
              title="Background Play"
              description="Continue playing when app is minimized"
            >
              <Switch
                value={backgroundPlay}
                onValueChange={setBackgroundPlay}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={backgroundPlay ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
          </Section>

          <Section title="HISTORY">
            <SettingItem
              icon={<Icons.History size={24} color={themeColors.primary} />}
              title="Playback history"
              description="Save all media played in history section"
            >
              <Switch
                value={saveHistory}
                onValueChange={setSaveHistory}
                trackColor={{ false: "#767577", true: themeColors.primary }}
                thumbColor={saveHistory ? "#FFFFFF" : "#f4f3f4"}
                ios_backgroundColor="#767577"
              />
            </SettingItem>
            <SettingItem
              icon={<Icons.ListVideo size={24} color="#767577" />}
              title={
                <Text style={{ color: "#767577" }}>
                  Video Play queue history
                </Text>
              }
              description={
                <Text style={{ color: "#767577" }}>
                  Save video play queue between sessions
                </Text>
              }
            >
              <Switch
                value={videoQueueHistory}
                disabled={true}
                trackColor={{ false: "#767577", true: "#767577" }}
              />
            </SettingItem>
            <SettingItem
              icon={<Icons.ListMusic size={24} color="#767577" />}
              title={
                <Text style={{ color: "#767577" }}>
                  Audio Play queue history
                </Text>
              }
              description={
                <Text style={{ color: "#767577" }}>
                  Save audio play queue between sessions
                </Text>
              }
            >
              <Switch
                value={audioQueueHistory}
                disabled={true}
                trackColor={{ false: "#767577", true: "#767577" }}
              />
            </SettingItem>
          </Section>

          <Section title="STORAGE">
            <SettingItem
              icon={<Icons.HardDrive size={24} color={themeColors.primary} />}
              title="Clear Cache"
              description="Free up space by removing temporary files"
            >
              <TouchableOpacity
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(147, 51, 234, 0.1)" }}
                onPress={() => console.log("Clear cache")}
              >
                <Text style={{ color: themeColors.primary }}>Clear</Text>
              </TouchableOpacity>
            </SettingItem>
          </Section>
        </View>
      </ScrollView>

      <AccentColorPicker
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default SettingsScreen; 