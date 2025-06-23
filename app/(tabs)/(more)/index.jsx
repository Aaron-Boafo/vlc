import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Icons from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AccentColorPicker from '../../../components/AccentColorPicker';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import useThemeStore from '../../../store/theme';
import AuthForm from '../../components/AuthForm';
import UserProfileModal from '../../components/UserProfileModal';

// Dummy data for profile
const PROFILE = {
  name: "Visura User",
  avatar: "https://ui-avatars.com/api/?name=Visura+User&background=0D8ABC&color=fff"
};

const FUN_FACTS = [
  " Visura can play almost any media file format!",
  "Visura stands for VideoLAN Client.",
  "Visura is open source and free!",
  "You can stream media over the network with Visura.",
  "The Visura cone icon comes from a student project!"
];

// Random username generator
const generateRandomUsername = (phone) => {
  const adjectives = ['Happy', 'Sunny', 'Brave', 'Gentle', 'Clever', 'Wild', 'Calm', 'Eager', 'Jolly', 'Kind'];
  const nouns = ['Tiger', 'Eagle', 'Dolphin', 'Panda', 'Koala', 'Wolf', 'Owl', 'Fox', 'Lion', 'Bear'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = phone ? `_${phone.slice(-4)}` : Math.floor(100 + Math.random() * 900);
  return `${randomAdj}${randomNoun}${randomNum}`;
};

const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "100";
const DEVICE = Platform.OS + " " + Platform.Version;

export default function MoreTab() {
  // --- Authentication State (for modal visibility and user profile) ---
  const [loginVisible, setLoginVisible] = useState(false);
  const [profile, setProfile] = useState({ name: '', avatar: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { themeColors, activeTheme, accentColor, toggleTheme } = useThemeStore();
  const [screen, setScreen] = useState('main');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);

  // SETTINGS STATE
  const [autoplay, setAutoplay] = useState(false);
  const [backgroundPlay, setBackgroundPlay] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [backgroundPiP, setBackgroundPiP] = useState(false);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [videoQueueHistory, setVideoQueueHistory] = useState(true);
  const [audioQueueHistory, setAudioQueueHistory] = useState(true);
  const [experimentalFeature, setExperimentalFeature] = useState(false);

  // Profile Modal & Fun Fact
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [funFactIdx] = useState(Math.floor(Math.random() * FUN_FACTS.length));

  // Diagnostics
  const [storageInfo, setStorageInfo] = useState(null);
  useEffect(() => {
    FileSystem.getFreeDiskStorageAsync().then(free => {
      FileSystem.getTotalDiskCapacityAsync().then(total => {
        setStorageInfo({ free, total });
      });
    });
  }, []);

  // --- Accessibility/i18n helpers (scaffold) ---
  const t = (str) => str;

  // --- Auth Handlers (replace with backend integration) ---
  const handleLogin = async (phone, password) => {
    try {
      console.log('Login attempt with:', phone);
      if (!phone || !password) {
        Alert.alert('Error', 'Please enter both phone and password');
        return;
      }
      
      const username = generateRandomUsername(phone);
      setIsLoggedIn(true);
      setProfile({
        name: username,
        phone: phone,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&bold=true`
      });
      setLoginVisible(false);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to log in. Please try again.');
    }
  };
  
  const handleSignup = async (phone, password) => {
    try {
      console.log('Signup attempt with:', phone);
      if (!phone || !password) {
        Alert.alert('Error', 'Please enter both phone and password');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      
      const username = generateRandomUsername(phone);
      setIsLoggedIn(true);
      setProfile({
        name: username,
        phone: phone,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&bold=true`
      });
      setLoginVisible(false);
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    }
  };

  // --- Profile Section ---
  const ProfileSection = () => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => {
      if (isLoggedIn) setProfileModalVisible(true);
      else setLoginVisible(true);
    }}>
      <LinearGradient
        colors={[themeColors.sectionBackground + 'BB', themeColors.background + 'F0']}
        style={{
          borderRadius: 22,
          marginBottom: 22,
          marginTop: 10,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: themeColors.primary,
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 2,
        }}
      >
        <Image
          source={{ uri: isLoggedIn && profile.avatar ? profile.avatar : PROFILE.avatar }}
          style={{ width: 64, height: 64, borderRadius: 32, marginRight: 18, borderWidth: 2, borderColor: accentColor }}
          accessibilityLabel={t("User avatar")}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 18 }} allowFontScaling>{isLoggedIn && profile.name ? profile.name : PROFILE.name}</Text>
          <Text style={{ color: themeColors.tabIconColor, fontSize: 13, marginTop: 2 }} allowFontScaling>{isLoggedIn ? t("Experience Visura") : t("Tap to sign in or sign up")}</Text>
        </View>
        <Icons.Info size={22} color={themeColors.primary} />
      </LinearGradient>
    </TouchableOpacity>
  );

  // --- Theme Picker 
  const ThemePreview = () => (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        {/*Theme Segmented Control */}
        <View style={{ flexDirection: 'row', backgroundColor: themeColors.sectionBackground + 'DD', borderRadius: 22, padding: 3, shadowColor: themeColors.primary, shadowOpacity: 0.10, shadowRadius: 6, elevation: 2 }}>
          {['dark', 'light'].map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                if (activeTheme !== mode) toggleTheme();
              }}
              style={{  
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: activeTheme === mode ? accentColor : 'transparent',
                shadowColor: activeTheme === mode ? accentColor : 'transparent',
                shadowOpacity: activeTheme === mode ? 0.17 : 0,
                shadowRadius: 8,
                elevation: activeTheme === mode ? 4 : 0,
                marginHorizontal: 2
              }}
              accessibilityLabel={t(`Switch to ${mode} mode`)}
              accessibilityState={{ selected: activeTheme === mode }}
            >
              {mode === 'light' ? (
                <Icons.Sun size={18} color={activeTheme === mode ? '#fff' : themeColors.primary} style={{ marginRight: 5 }} />
              ) : (
                <Icons.Moon size={18} color={activeTheme === mode ? '#fff' : themeColors.primary} style={{ marginRight: 5 }} />
              )}
              <Text style={{ color: activeTheme === mode ? '#fff' : themeColors.primary, fontWeight: 'bold', fontSize: 14, textTransform: 'capitalize' }}>{t(mode)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // --- Diagnostics Card ---
  const DiagnosticsCard = () => (
    <View style={{
      backgroundColor: themeColors.sectionBackground + 'BB',
      borderRadius: 18,
      marginVertical: 10,
      padding: 18,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}>
      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {t("Diagnostics")}
      </Text>
      <Text style={{ color: themeColors.text, fontSize: 14 }}>{t("Device")}: {DEVICE}</Text>
      <Text style={{ color: themeColors.text, fontSize: 14 }}>{t("App Version")}: {APP_VERSION} ({BUILD_NUMBER})</Text>
      {storageInfo && (
        <>
          <Text style={{ color: themeColors.text, fontSize: 14 }}>
            {t("Storage")}: {((storageInfo.total - storageInfo.free) / 1e9).toFixed(2)} GB used / {(storageInfo.total / 1e9).toFixed(2)} GB total
          </Text>
          <Text style={{ color: themeColors.text, fontSize: 14 }}>
            {t("Free")}: {(storageInfo.free / 1e9).toFixed(2)} GB
          </Text>
        </>
      )}
    </View>
  );

  // --- App Info Card ---
  const AppInfoCard = () => (
    <View style={{
      backgroundColor: themeColors.sectionBackground + 'BB',
      borderRadius: 18,
      marginVertical: 10,
      padding: 18,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}>
      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {t("App Info")}
      </Text>
      <Text style={{ color: themeColors.text, fontSize: 14 }}>{t("Version")}: {APP_VERSION}</Text>
      <Text style={{ color: themeColors.text, fontSize: 14 }}>{t("Build")}: {BUILD_NUMBER}</Text>
      <Text style={{ color: themeColors.text, fontSize: 14 }}>{t("Device")}: {DEVICE}</Text>
    </View>
  );

  // --- Experimental Features Section ---
  const LabsSection = () => (
    <View style={{
      backgroundColor: themeColors.sectionBackground + 'BB',
      borderRadius: 18,
      marginVertical: 10,
      padding: 18,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}>
      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {t("Experimental Features")}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: themeColors.text }}>{t("Enable Labs Mode")}</Text>
          <Text style={{ color: themeColors.tabIconColor, fontSize: 13 }}>{t("Try new features before anyone else!")}</Text>
        </View>
        <Switch
          value={experimentalFeature}
          onValueChange={setExperimentalFeature}
          accessibilityLabel={t("Enable Labs Mode")}
          accessibilityHint={t("Try new features before anyone else!")}
          thumbColor="#fff"
          trackColor={{ false: themeColors.sectionBackground, true: accentColor }}
        />
      </View>
    </View>
  );

  // --- Feedback/Contact Section ---
  const FeedbackSection = () => (
    <View style={{
      backgroundColor: themeColors.sectionBackground + 'BB',
      borderRadius: 18,
      marginVertical: 10,
      padding: 18,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}>
      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {t("Feedback & Support")}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL("mailto:support@videolan.org")}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        accessibilityLabel={t("Send Feedback")}
        accessibilityHint={t("Open your email app to send feedback")}
      >
        <Icons.MessageCircle size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Send Feedback")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://www.videolan.org/support/")}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        accessibilityLabel={t("Help Center")}
        accessibilityHint={t("Open the VLC help center website")}
      >
        <Icons.HelpCircle size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Help Center")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://github.com/videolan/vlc")}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        accessibilityLabel={t("Open Source Credits")}
        accessibilityHint={t("View open source credits on GitHub")}
      >
        <Icons.GitBranch size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Open Source Credits")}</Text>
      </TouchableOpacity>
    </View>
  );

  // --- Legal Section ---
  const LegalSection = () => (
    <View style={{
      backgroundColor: themeColors.sectionBackground + 'BB',
      borderRadius: 18,
      marginVertical: 10,
      padding: 18,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}>
      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {t("Legal")}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://www.videolan.org/legal.html")}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        accessibilityLabel={t("Privacy Policy")}
        accessibilityHint={t("View the privacy policy")}
      >
        <Icons.FileText size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Privacy Policy")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://www.videolan.org/legal.html")}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        accessibilityLabel={t("Terms of Service")}
        accessibilityHint={t("View the terms of service")}
      >
        <Icons.FileTerminal size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Terms of Service")}</Text>
      </TouchableOpacity>
    </View>
  );

  // --- Settings Reset ---
  const ResetSettingsButton = () => (
    <TouchableOpacity
      style={{
        marginTop: 18,
        alignSelf: 'center',
        backgroundColor: themeColors.primary + '33',
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 18
      }}
      onPress={() => {
        setAutoplay(false);
        setBackgroundPlay(false);
        setHighQuality(true);
        setAutoScan(false);
        setBackgroundPiP(false);
        setHardwareAcceleration(true);
        setSaveHistory(true);
        setVideoQueueHistory(true);
        setAudioQueueHistory(true);
        setExperimentalFeature(false);
        Alert.alert(t("Settings Reset"), t("All settings have been reset to defaults."));
      }}
      accessibilityLabel={t("Reset Settings")}
      accessibilityHint={t("Restore all settings to their default values")}
    >
      <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{t("Reset to Defaults")}</Text>
    </TouchableOpacity>
  );

  // --- Main More screen ---
  if (screen === 'main') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 16, backgroundColor: themeColors.background }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}>
          <ProfileSection />
          <UserProfileModal
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            profile={profile}
            onLogout={() => {
              setIsLoggedIn(false);
              setProfile({ name: '', avatar: '' });
              setProfileModalVisible(false);
            }}
            onEdit={() => {
              // Add edit profile logic here
              setProfileModalVisible(false);
            }}
          />
          <AuthForm
            visible={loginVisible}
            onClose={() => setLoginVisible(false)}
            onLogin={handleLogin}
            onSignup={handleSignup}
            accentColor={accentColor}
          />
          <ThemePreview />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <ActionButton icon={<Icons.Settings size={20} color={themeColors.primary} />} label={t("SETTINGS")} onPress={() => setScreen('settings')} />
            <ActionButton icon={<Icons.Info size={20} color={themeColors.primary} />} label={t("ABOUT")} onPress={() => setScreen('about')} />
            <ActionButton icon={<Icons.Beaker size={20} color={themeColors.primary} />} label={t("LABS")} onPress={() => setScreen('labs')} />
          </View>
          <DiagnosticsCard />
          <AppInfoCard />
          <LabsSection />
          <FeedbackSection />
          <LegalSection />
        </ScrollView>
        <AccentColorPicker visible={colorPickerVisible} onClose={() => setColorPickerVisible(false)} />
        <MoreOptionsMenu visible={moreOptionsVisible} onClose={() => setMoreOptionsVisible(false)} />
      </SafeAreaView>
    );
  }

  // --- Settings screen ---
  if (screen === 'settings') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
          <TouchableOpacity onPress={() => setScreen('main')}>
            <Icons.ArrowLeft size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>{t("Settings")}</Text>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={{ marginTop: 16 }}>
            {/* Appearance */}
            <Section title={t("APPEARANCE")}>
              <SettingItem icon={<Icons.Palette size={24} color={themeColors.primary} />} title={t("Theme")} description={t("Switch between light and dark mode")}>
                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: themeColors.primaryLight }} onPress={toggleTheme} >
                  <Text style={{ color: themeColors.primary }}>{t("Change")}</Text>
                </TouchableOpacity>
              </SettingItem>
              <SettingItem icon={<Icons.Droplet size={24} color={themeColors.primary} />} title={t("Accent Color")} description={t("Pick your favorite accent color")}>
                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: themeColors.primaryLight }} onPress={() => setColorPickerVisible(true)} >
                  <Text style={{ color: themeColors.primary }}>{t("Change")}</Text>
                </TouchableOpacity>
              </SettingItem>
            </Section>
            {/* Video */}
            <Section title={t("VIDEO")}>
              <SettingItem icon={<Icons.Minimize2 size={24} color={themeColors.primary} />} title={t("Background/PiP mode")} description={t("Switch to PiP when you switch to another application")}>
                <Switch value={backgroundPiP} onValueChange={setBackgroundPiP} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
              <SettingItem icon={<Icons.Cpu size={24} color={themeColors.primary} />} title={t("Hardware Acceleration")} description={t("Improves video playback performance")}>
                <Switch value={hardwareAcceleration} onValueChange={setHardwareAcceleration} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
              <SettingItem icon={<Icons.Video size={24} color={themeColors.primary} />} title={t("Quality")} description={t("Play videos in highest quality when available")}>
                <Switch value={highQuality} onValueChange={setHighQuality} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
            </Section>
            {/* Playback */}
            <Section title={t("PLAYBACK")}>
              <SettingItem icon={<Icons.Play size={24} color={themeColors.primary} />} title={t("Autoplay")} description={t("Automatically play next item")}>
                <Switch value={autoplay} onValueChange={setAutoplay} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
              <SettingItem icon={<Icons.Minimize2 size={24} color={themeColors.primary} />} title={t("Background Play")} description={t("Continue playing when app is minimized")}>
                <Switch value={backgroundPlay} onValueChange={setBackgroundPlay} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
            </Section>
            {/* History */}
            <Section title={t("HISTORY")}>
              <SettingItem icon={<Icons.History size={24} color={themeColors.primary} />} title={t("Playback history")} description={t("Save all media played in history section")}>
                <Switch value={saveHistory} onValueChange={setSaveHistory} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
              <SettingItem icon={<Icons.ListVideo size={24} color="#767577" />} title={<Text style={{ color: "#767577" }}>{t("Video Play queue history")}</Text>} description={<Text style={{ color: "#767577" }}>{t("Save video play queue between sessions")}</Text>}>
                <Switch value={videoQueueHistory} disabled={true} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
              <SettingItem icon={<Icons.ListMusic size={24} color="#767577" />} title={<Text style={{ color: "#767577" }}>{t("Audio Play queue history")}</Text>} description={<Text style={{ color: "#767577" }}>{t("Save audio play queue between sessions")}</Text>}>
                <Switch value={audioQueueHistory} disabled={true} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
              </SettingItem>
            </Section>
            {/* Storage */}
            <Section title={t("STORAGE")}>
              <SettingItem icon={<Icons.HardDrive size={24} color={themeColors.primary} />} title={t("Clear Cache")} description={t("Free up space by removing temporary files")}>
                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: "rgba(147, 51, 234, 0.1)" }} onPress={() => console.log("Clear cache") }>
                  <Text style={{ color: themeColors.primary }}>{t("Clear")}</Text>
                </TouchableOpacity>
              </SettingItem>
            </Section>
            {ResetSettingsButton()}
          </View>
        </ScrollView>
        <AccentColorPicker visible={colorPickerVisible} onClose={() => setColorPickerVisible(false)} />
      </SafeAreaView>
    );
  }

  // --- About screen ---
  if (screen === 'about') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
          <TouchableOpacity onPress={() => setScreen('main')}>
            <Icons.ArrowLeft size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>{t("About VLC")}</Text>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: themeColors.background }}>
          <AppInfoCard />
          <LegalSection />
          <FeedbackSection />
          <View style={{ padding: 16 }}>
            <Text style={{ color: activeTheme === "dark" ? "rgba(255,255,255,0.7)" : themeColors.tabIconColor, fontSize: 13, textAlign: 'center' }} allowFontScaling>
              © 2025 VideoLAN. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Labs/Experimental screen ---
  if (screen === 'labs') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
          <TouchableOpacity onPress={() => setScreen('main')}>
            <Icons.ArrowLeft size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>{t("Labs & Experimental")}</Text>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: themeColors.background }}>
          <LabsSection />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Helper Components ---
  function Section({ title, children }) {
    return (
      <View style={{ marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: themeColors.primary, fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }

  function SettingItem({ icon, title, description, children }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ width: 40 }}>{icon}</View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            {typeof title === 'string' ? (
              <Text style={{ color: themeColors.text, fontWeight: '500' }}>{title}</Text>
            ) : (
              title
            )}
            {typeof description === 'string' ? (
              <Text style={{ color: activeTheme === "dark" ? "rgba(255,255,255,0.7)" : themeColors.tabIconColor, fontSize: 13, marginTop: 4 }}>{description}</Text>
            ) : (
              description
            )}
          </View>
        </View>
        {children}
      </View>
    );
  }

  function ActionButton({ icon, label, onPress }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: themeColors.sectionBackground,
          borderWidth: activeTheme === "dark" ? 1 : 0,
          borderColor: "rgba(255, 255, 255, 0.1)",
          marginRight: 8
        }}
        accessibilityLabel={label}
        accessibilityHint={label}
      >
        {icon}
        <Text style={{ color: themeColors.primary, marginLeft: 8, fontWeight: '600' }}>{label}</Text>
      </TouchableOpacity>
    );
  }
}