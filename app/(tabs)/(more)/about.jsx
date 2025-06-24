import { View, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import useThemeStore from "../../../store/theme";
import * as Icons from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomAlert from "../../../components/CustomAlert";
import { Text } from 'react-native';

const AboutScreen = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const router = useRouter();
  const [alertInfo, setAlertInfo] = useState({ visible: false, title: '', message: '', buttons: [] });

  const showComingSoonAlert = () => {
    setAlertInfo({
      visible: true,
      title: "🚀 Coming Soon!",
      message: "We're working hard to bring you this exciting feature.",
      buttons: [{ text: "OK", onPress: () => setAlertInfo({ visible: false }) }]
    });
  };

  const InfoSection = ({ title, children }) => (
    <View className="mb-6">
      <Text className="text-sm font-medium px-4 py-2" style={{ color: themeColors.primary }} weight="Bold">{title}</Text>
      <View style={{ backgroundColor: themeColors.sectionBackground }}>
        {children}
      </View>
    </View>
  );

  const InfoItem = ({ icon, title, description }) => (
    <View 
      className="flex-row items-center p-4 border-b"
      style={{ borderColor: "rgba(147, 51, 234, 0.1)" }}
    >
      <View className="w-10">
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-medium" style={{ color: themeColors.text }} weight="Bold">{title}</Text>
        {description && (
          <Text className="text-sm mt-1" style={{ color: activeTheme === "dark" ? "rgba(255, 255, 255, 0.7)" : themeColors.tabIconColor }}>{description}</Text>
        )}
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
      <View 
        className="flex-row items-center p-4 border-b" 
        style={{ borderColor: "rgba(147, 51, 234, 0.1)" }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Icons.ArrowLeft size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-4" style={{ color: themeColors.text }} weight="Bold">About Visura</Text>
      </View>

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors.background }}
      >
        <View className="mt-4">
          <InfoSection title="APPLICATION">
            <InfoItem
              icon={<Icons.Play size={24} color={themeColors.primary} />}
              title="Visura"
              description="Version 1.0.0"
            />
            <InfoItem
              icon={<Icons.Code size={24} color={themeColors.primary} />}
              title="Build Version"
              description="Latest Stable Release"
            />
          </InfoSection>

          <InfoSection title="LEGAL">
            <InfoItem
              icon={<Icons.Scale size={24} color={themeColors.primary} />}
              title="License"
              description="GNU General Public License"
            />
            <TouchableOpacity onPress={showComingSoonAlert}>
              <InfoItem
                icon={<Icons.FileText size={24} color={themeColors.primary} />}
                title="Privacy Policy"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={showComingSoonAlert}>
              <InfoItem
                icon={<Icons.FileTerminal size={24} color={themeColors.primary} />}
                title="Terms of Service"
              />
            </TouchableOpacity>
          </InfoSection>

          <InfoSection title="SUPPORT">
            <TouchableOpacity onPress={showComingSoonAlert}>
              <InfoItem
                icon={<Icons.HelpCircle size={24} color={themeColors.primary} />}
                title="Help Center"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={showComingSoonAlert}>
              <InfoItem
                icon={<Icons.MessageCircle size={24} color={themeColors.primary} />}
                title="Feedback"
                description="Help us improve Visura"
              />
            </TouchableOpacity>
          </InfoSection>

          <View className="p-4">
            <Text className="text-sm text-center" style={{ color: activeTheme === "dark" ? "rgba(255, 255, 255, 0.7)" : themeColors.tabIconColor }}>
              © 2025 Visura. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        buttons={alertInfo.buttons}
        onClose={() => setAlertInfo({ visible: false })}
      />
    </SafeAreaView>
  );
};

export default AboutScreen;