import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import React, { useState } from "react";
import useThemeStore from "../../../store/theme";
import * as Icons from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import MoreOptionsMenu from "../../../components/MoreOptionsMenu";

const MoreScreen = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const router = useRouter();
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);

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
    >
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b" 
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
              backgroundColor: activeTheme === "dark" ? 'transparent' : themeColors.sectionBackground,
              borderWidth: activeTheme === "dark" ? 1 : 0,
              borderColor: "rgba(255, 255, 255, 0.2)",
              width: 162,
              height: 106,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onPress={() => console.log("New stream pressed")}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HistoryItem
              title="Justin Bieber"
              subtitle="15.5K Views"
            />
            <HistoryItem
              title="The Weeknd"
              subtitle="10.2K Views"
            />
            <HistoryItem
              title="Drake"
              subtitle="8.7K Views"
            />
            <HistoryItem
              title="Taylor Swift"
              subtitle="12.3K Views"
            />
          </ScrollView>
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
    </SafeAreaView>
  );
};

export default MoreScreen;
