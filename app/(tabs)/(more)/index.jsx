import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Icons from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Switch, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AccentColorPicker from '../../../components/AccentColorPicker';
import MoreOptionsMenu from '../../../components/MoreOptionsMenu';
import useThemeStore from '../../../store/theme';
import useUserProfileStore from '../../../store/userProfile';
import AuthForm from '../../components/AuthForm';
import UserProfileModal from '../../components/UserProfileModal';
import api from '../../../services/api';
import * as SecureStore from 'expo-secure-store';

// Default profile data
const DEFAULT_PROFILE = {
  name: "Guest User",
  email: "",
  phone: "",
  avatar: "https://ui-avatars.com/api/?name=Guest+User&background=0D8ABC&color=fff"
};

// Dummy data for profile
const PROFILE = {
  name: "Visura User",
  avatar: "https://ui-avatars.com/api/?name=Visura+User&background=0D8ABC&color=fff"
};

const FUN_FACTS = [
  " Visura can play almost any media file format!",
  "Visura is a powerful media player with advanced features.",
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
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user profile from the store
  const { userName, userAvatar } = useUserProfileStore();
  const { themeColors, activeTheme, accentColor, toggleTheme } = useThemeStore();
  const [screen, setScreen] = useState('main');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);

  // Check if user is already logged in on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const [token, userData] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('user_data')
      ]);
      
      console.log('Auth check - token exists:', !!token);
      
      if (token) {
        try {
          // Try to fetch the latest profile from the server
          console.log('Fetching latest profile from server...');
          await fetchUserProfile();
        } catch (error) {
          console.error('Error fetching profile, using cached data:', error);
          // If fetching fails but we have user data, use it
          if (userData) {
            try {
              const parsedUserData = JSON.parse(userData);
              console.log('Using cached user data:', parsedUserData);
              
              // Ensure we have required fields
              const username = parsedUserData.name || `User_${parsedUserData.phone?.slice(-4) || '0000'}`;
              const profileData = {
                name: username,
                phone: parsedUserData.phone || '',
                email: parsedUserData.email || '',
                avatar: parsedUserData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`,
                storageUsed: parsedUserData.storageUsed || 0
              };
              
              console.log('Setting profile from cache:', profileData);
              
              // Update state
              setProfile(profileData);
              setIsLoggedIn(true);
              
              // Save the updated profile data
              await SecureStore.setItemAsync('user_data', JSON.stringify(profileData));
            } catch (parseError) {
              console.error('Error parsing user data:', parseError);
              // If we can't parse the data, log the user out
              await handleLogout();
            }
          } else {
            console.log('No cached user data available');
            // If we have a token but no user data, log out to clear invalid state
            await handleLogout();
          }
        }
      } else {
        console.log('No auth token found, user is not logged in');
        // Clear any existing user data if no token is present
        await SecureStore.deleteItemAsync('user_data');
        setProfile(DEFAULT_PROFILE);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile...');
      const response = await api.profile.get();
      console.log('Profile API response:', response.data);
      
      if (response.data?.status === true && response.data?.data) {
        const profileData = response.data.data;
        const username = profileData.username || `User_${profileData.phoneNumber?.slice(-4) || ''}`;
        
        const updatedProfile = {
          name: username,
          phone: profileData.phoneNumber || '',
          email: profileData.email || '',
          avatar: profileData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`,
          storageUsed: profileData.storageUsed || 0
        };
        
        console.log('Updating profile with:', updatedProfile);
        
        // Save to secure storage
        await SecureStore.setItemAsync('user_data', JSON.stringify(updatedProfile));
        
        // Update state
        setProfile(updatedProfile);
        setIsLoggedIn(true);
        
        return updatedProfile;
      } else {
        throw new Error(response.data?.message || 'Invalid profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        await SecureStore.deleteItemAsync('auth_token');
        setIsLoggedIn(false);
      }
      throw error; // Re-throw to allow callers to handle the error
    }
  };

  // Handle login
  const handleLogin = async (userData) => {
    try {
      console.log('Handling login with user data:', userData);
      
      // Ensure we have at least a phone number to work with
      if (!userData.phone) {
        console.error('No phone number in user data');
        throw new Error('Invalid user data: missing phone number');
      }
      
      // Create a complete profile object with defaults
      const newProfile = {
        name: userData.name || `User_${userData.phone.slice(-4)}`,
        phone: userData.phone,
        email: userData.email || '',
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || `User_${userData.phone.slice(-4)}`)}&background=0D8ABC&color=fff`,
        storageUsed: userData.storageUsed || 0
      };
      
      console.log('Setting profile:', newProfile);
      
      // Update state
      setIsLoggedIn(true);
      setProfile(newProfile);
      
      // Save to secure storage
      await SecureStore.setItemAsync('user_data', JSON.stringify(newProfile));
      if (userData.token) {
        await SecureStore.setItemAsync('auth_token', userData.token);
      }
      
      setLoginVisible(false);
      console.log('Login successful, profile updated');
      
      // Try to fetch the latest profile data in the background
      try {
        await fetchUserProfile();
      } catch (profileError) {
        console.error('Background profile update failed, using local data:', profileError);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Try to call the logout API (but don't fail if it doesn't work)
      try {
        await api.auth.logout();
      } catch (error) {
        console.warn('Error during logout API call (can be ignored):', error);
      }
      
      // Clear all stored authentication data
      await Promise.all([
        SecureStore.deleteItemAsync('auth_token'),
        SecureStore.deleteItemAsync('user_data')
      ]);
      
      // Reset the UI state
      setProfile(DEFAULT_PROFILE);
      setIsLoggedIn(false);
      setScreen('main');
      
      // Close any open modals
      setLoginVisible(false);
      setProfileModalVisible(false);
      
      Alert.alert('Success', 'You have been logged out successfully.');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Handle signup
  const handleSignup = async (userData) => {
    try {
      setIsLoading(true);
      
      // Update the profile with the new user data
      setProfile({
        name: userData.name || `User_${userData.phoneNumber?.slice(-4) || ''}`,
        phone: userData.phoneNumber || '',
        email: userData.email || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=0D8ABC&color=fff`
      });
      
      // Set user as logged in
      setIsLoggedIn(true);
      setLoginVisible(false);
      
      // Show the profile modal for new users
      if (userData.isNewUser) {
        setProfileModalVisible(true);
      }
      
      // Fetch the latest profile data from the server
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Profile Section ---
  const ProfileSection = () => {
    // Log the current profile data for debugging
    console.log('Rendering ProfileSection with profile:', profile);
    
    // Determine the display name - prioritize the store's userName, then profile.name, then 'Guest User'
    const displayName = isLoggedIn 
      ? (userName || profile.name || 'User')
      : 'Guest User';
      
    // Determine the avatar URL - prioritize the store's userAvatar, then profile.avatar, then generate one
    const avatarUrl = isLoggedIn && (userAvatar || profile.avatar)
      ? (userAvatar || profile.avatar)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
    
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={() => {
          if (isLoggedIn) setProfileModalVisible(true);
          else setLoginVisible(true);
        }}
        style={{
          borderRadius: 22,
          marginBottom: 22,
          marginTop: 10,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          // Use a subtle gradient that works in both light and dark modes
          colors={
            activeTheme === 'dark'
              ? [themeColors.sectionBackground, themeColors.card]
              : [themeColors.card, themeColors.sectionBackground]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: themeColors.primary,
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Image
            source={{ 
              uri: avatarUrl,
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              marginRight: 18,
              backgroundColor: themeColors.sectionBackground,
            }}
            accessibilityLabel="User avatar"
            defaultSource={{ uri: 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff' }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: themeColors.text,
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 4,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling
            >
              {displayName}
            </Text>
            <Text
              style={{
                color: themeColors.textSecondary,
                fontSize: 13,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling
            >
              {isLoggedIn ? (profile.phone || profile.email || 'Experience Visura') : 'Tap to sign in or sign up'}
            </Text>
          </View>
          <Icons.ChevronRight size={22} color={themeColors.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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
      backgroundColor: themeColors.card,
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
      backgroundColor: themeColors.card,
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
      backgroundColor: themeColors.card,
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
      backgroundColor: themeColors.card,
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
        onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        accessibilityLabel={t("Send Feedback")}
        accessibilityHint={t("Open your email app to send feedback")}
      >
        <Icons.MessageCircle size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Send Feedback")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        accessibilityLabel={t("Help Center")}
        accessibilityHint={t("Open the VLC help center website")}
      >
        <Icons.HelpCircle size={22} color={themeColors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: themeColors.text }}>{t("Help Center")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")}
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
      backgroundColor: themeColors.card,
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
        onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")}
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
            onEditField={async (field, value, file = null) => {
              try {
                console.log('Updating profile field:', { field, value, hasFile: !!file });
                
                // Create the updated profile with the new value
                const updatedProfile = { 
                  ...profile,
                  [field]: value 
                };
                
                // If this is an avatar update, update the avatar URL
                if (field === 'avatar' && file) {
                  // Use the provided value (temp URI) for immediate UI update
                  updatedProfile.avatar = value || file.uri;
                  
                  // If no value provided but we have a file, use the file URI
                  if (!value && file.uri) {
                    updatedProfile.avatar = file.uri;
                  }
                } 
                // If updating name, update the avatar URL
                if (field === 'name') {
                  updatedProfile.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(value)}&background=0D8ABC&color=fff`
                }
                
                console.log('Updated profile:', updatedProfile);
                
                // Update local state immediately for better UX
                setProfile(updatedProfile);
                
                // Save to secure storage first to ensure we have the latest data locally
                await SecureStore.setItemAsync('user_data', JSON.stringify(updatedProfile));
                
                // If this is just a name update and no file upload, we're done
                if (field === 'name' && !file) {
                  console.log('Name updated locally successfully');
                  return true;
                }
                
                // Try to update on the server, but don't fail if it doesn't work
                // For local testing, we'll simulate a successful update
                if (__DEV__) {
                  console.log('DEV MODE: Simulating successful update');
                  // Simulate server response after a short delay
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Update the local profile with the new data
                  const updatedProfile = {
                    ...profile,
                    [field]: value,
                    // For avatars, we'll keep the local URI for now
                    ...(field === 'avatar' && file ? { avatar: file.uri } : {})
                  };
                  
                  setProfile(updatedProfile);
                  await SecureStore.setItemAsync('user_data', JSON.stringify(updatedProfile));
                  
                  console.log('DEV MODE: Local update successful');
                  return true;
                }
                
                // For production, try to update the server
                try {
                  // Handle different types of updates
                  let metadata = {};
                  let fileToUpload = null;
                  
                  if (field === 'name') {
                    // For name updates, we only need to send the username in metadata
                    metadata = { username: value };
                  } else if (field === 'avatar' && file) {
                    // For avatar uploads, we need to create a proper file object
                    fileToUpload = {
                      uri: file.uri,
                      type: file.type || 'image/jpeg',
                      name: file.name || `profile_${Date.now()}.jpg`,
                      fileName: file.name || `profile_${Date.now()}.jpg`
                    };
                    // No metadata needed for avatar upload
                    metadata = {};
                    
                    console.log('Prepared file for upload:', fileToUpload);
                  } else {
                    console.log('No valid update data provided');
                    return true;
                  }
                  
                  console.log('Preparing update with:', { field, metadata, file: fileToUpload ? 'file provided' : 'no file' });
                  
                  console.log('Sending update to server with metadata:', metadata, 'file:', fileToUpload ? 'provided' : 'none');
                  
                  let response;
                  try {
                    // Call the API with the metadata and optional file
                    response = await api.profile.update(metadata, fileToUpload);
                    
                    console.log('Server update response:', response.data);
                    
                    // If this was an avatar upload and we have a response with the new URL
                    if (field === 'avatar' && response.data?.data?.profilePicture) {
                      const updatedProfile = {
                        ...profile,
                        avatar: response.data.data.profilePicture
                      };
                      
                      console.log('Updating profile with new avatar URL:', updatedProfile.avatar);
                      
                      // Update the profile in state and storage
                      setProfile(updatedProfile);
                      await SecureStore.setItemAsync('user_data', JSON.stringify(updatedProfile));
                      
                      // Show success message
                      Alert.alert('Success', 'Profile picture updated successfully!');
                      return true;
                    }
                    
                    if (response.data?.status === true) {
                      // If the server returns updated profile data, use it
                      if (response.data.data) {
                        const serverProfile = response.data.data;
                        const syncedProfile = {
                          ...profile, // Keep existing profile data
                          name: serverProfile.username || profile.name,
                          phone: serverProfile.phoneNumber || profile.phone,
                          email: serverProfile.email || profile.email || '',
                          avatar: serverProfile.profilePicture || profile.avatar,
                          storageUsed: serverProfile.storageUsed || profile.storageUsed || 0
                        };
                        
                        console.log('Syncing local profile with server data:', syncedProfile);
                        setProfile(syncedProfile);
                        await SecureStore.setItemAsync('user_data', JSON.stringify(syncedProfile));
                      }
                      
                      // Show success message
                      Alert.alert('Success', 'Profile updated successfully');
                      return true;
                    } else {
                      throw new Error(response.data?.message || 'Failed to update profile');
                    }
                  } catch (error) {
                    console.error('API call error:', error);
                    // If we have a network error, the request never reached the server
                    if (error.message === 'Network Error') {
                      console.log('Network error - will retry later');
                      // Still return success since local update worked
                      return true;
                    }
                    throw error; // Re-throw other errors
                  }
                  
                } catch (apiError) {
                  console.error('Error updating profile on server:', {
                    message: apiError.message,
                    response: apiError.response?.data,
                    status: apiError.response?.status
                  });
                  
                  // Ensure local state is still saved even if server update fails
                  try {
                    await SecureStore.setItemAsync('user_data', JSON.stringify(updatedProfile));
                    console.log('Successfully saved to local storage after server error');
                  } catch (storageError) {
                    console.error('Error saving to local storage after server error:', storageError);
                  }
                  
                  // Don't show error to user, just log it
                  console.log('Local update successful, server sync will be retried later');
                  return true; // Still return success since local update worked
                }
                
                return true;
              } catch (error) {
                console.error('Error updating profile:', error);
                Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
                return false;
              }
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
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, backgroundColor: themeColors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('main')} style={{ padding: 4 }}>
              <Icons.ArrowLeft size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: 'bold' }}>{t("Settings")}</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>
        <ScrollView
          style={{ flex: 1, backgroundColor: themeColors.background }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        >
          {/* Appearance */}
          <Section title={t("APPEARANCE")}>
            <SettingItem icon={<Icons.Palette size={22} color={accentColor} />} title={t("Theme")} description={t("Switch between light and dark mode")}>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: accentColor + '20' }} onPress={toggleTheme} >
                <Text style={{ color: accentColor, fontWeight: '600' }}>{t("Change")}</Text>
              </TouchableOpacity>
            </SettingItem>
            <SettingItem isLast={true} icon={<Icons.Droplet size={22} color={accentColor} />} title={t("Accent Color")} description={t("Pick your favorite accent color")}>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: accentColor + '20' }} onPress={() => setColorPickerVisible(true)} >
                <Text style={{ color: accentColor, fontWeight: '600' }}>{t("Change")}</Text>
              </TouchableOpacity>
            </SettingItem>
          </Section>
          {/* Video */}
          <Section title={t("VIDEO")}>
            <SettingItem icon={<Icons.Minimize2 size={22} color={accentColor} />} title={t("Background/PiP mode")} description={t("Switch to PiP when you switch to another application")}>
              <Switch value={backgroundPiP} onValueChange={setBackgroundPiP} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
            <SettingItem icon={<Icons.Cpu size={22} color={accentColor} />} title={t("Hardware Acceleration")} description={t("Improves video playback performance")}>
              <Switch value={hardwareAcceleration} onValueChange={setHardwareAcceleration} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
            <SettingItem isLast={true} icon={<Icons.Video size={22} color={accentColor} />} title={t("Quality")} description={t("Play videos in highest quality when available")}>
              <Switch value={highQuality} onValueChange={setHighQuality} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
          </Section>
          {/* Playback */}
          <Section title={t("PLAYBACK")}>
            <SettingItem icon={<Icons.Play size={22} color={accentColor} />} title={t("Autoplay")} description={t("Automatically play next item")}>
              <Switch value={autoplay} onValueChange={setAutoplay} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
            <SettingItem isLast={true} icon={<Icons.Repeat1 size={22} color={accentColor} />} title={t("Background Play")} description={t("Continue playing when app is minimized")}>
              <Switch value={backgroundPlay} onValueChange={setBackgroundPlay} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
          </Section>
          {/* History */}
          <Section title={t("HISTORY")}>
            <SettingItem icon={<Icons.History size={22} color={accentColor} />} title={t("Playback history")} description={t("Save all media played in history section")}>
              <Switch value={saveHistory} onValueChange={setSaveHistory} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
            <SettingItem icon={<Icons.ListVideo size={22} color={themeColors.textSecondary} />} title={<Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' }}>{t("Video Play queue history")}</Text>} description={<Text style={{ color: themeColors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{t("Save video play queue between sessions")}</Text>}>
              <Switch value={videoQueueHistory} disabled={true} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
            <SettingItem isLast={true} icon={<Icons.ListMusic size={22} color={themeColors.textSecondary} />} title={<Text style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' }}>{t("Audio Play queue history")}</Text>} description={<Text style={{ color: themeColors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{t("Save audio play queue between sessions")}</Text>}>
              <Switch value={audioQueueHistory} disabled={true} thumbColor="#fff" trackColor={{ false: themeColors.sectionBackground, true: accentColor }} />
            </SettingItem>
          </Section>
          {/* Storage */}
          <Section title={t("STORAGE")}>
            <SettingItem isLast={true} icon={<Icons.Trash2 size={22} color={accentColor} />} title={t("Clear Cache")} description={t("Free up space by removing temporary files")}>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: accentColor + '20' }} onPress={() => console.log("Clear cache") }>
                <Text style={{ color: accentColor, fontWeight: '600' }}>{t("Clear")}</Text>
              </TouchableOpacity>
            </SettingItem>
          </Section>
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
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
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, backgroundColor: themeColors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('main')} style={{ padding: 4 }}>
              <Icons.ArrowLeft size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: 'bold' }}>{t("About")}</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>
        <ScrollView
          style={{ flex: 1, backgroundColor: themeColors.background }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        >
          <Section title={t("APP INFO")}>
            <SettingItem icon={<Icons.Info size={22} color={accentColor} />} title={t("Version")} description={`${APP_VERSION} (${BUILD_NUMBER})`} />
            <SettingItem isLast={true} icon={<Icons.Smartphone size={22} color={accentColor} />} title={t("Device")} description={DEVICE} />
          </Section>
          <Section title={t("FEEDBACK & SUPPORT")}>
            <SettingItem icon={<Icons.MessageCircle size={22} color={accentColor} />} title={t("Send Feedback")} onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")} />
            <SettingItem icon={<Icons.HelpCircle size={22} color={accentColor} />} title={t("Help Center")} onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")} />
            <SettingItem isLast={true} icon={<Icons.GitBranch size={22} color={accentColor} />} title={t("Open Source Credits")} onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")} />
          </Section>
          <Section title={t("LEGAL")}>
            <SettingItem icon={<Icons.FileText size={22} color={accentColor} />} title={t("Privacy Policy")} onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")} />
            <SettingItem isLast={true} icon={<Icons.FileTerminal size={22} color={accentColor} />} title={t("Terms of Service")} onPress={() => Linking.openURL("https://www.youware.com/project/visura-ct9esryamu")} />
          </Section>
          <View style={{ padding: 16, marginTop: 16 }}>
            <Text style={{ color: themeColors.textSecondary, fontSize: 13, textAlign: 'center' }} allowFontScaling>
              © 2025 Visura. All rights reserved.
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
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, backgroundColor: themeColors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('main')} style={{ padding: 4 }}>
              <Icons.ArrowLeft size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: 'bold' }}>{t("Labs")}</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>
        <ScrollView
          style={{ flex: 1, backgroundColor: themeColors.background }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        >
          <Section title={t("EXPERIMENTAL FEATURES")}>
            <SettingItem isLast={true} icon={<Icons.Beaker size={22} color={accentColor} />} title={t("Enable Labs Mode")} description={t("Try new features before anyone else!")}>
              <Switch
                value={experimentalFeature}
                onValueChange={setExperimentalFeature}
                thumbColor="#fff"
                trackColor={{ false: themeColors.sectionBackground, true: accentColor }}
              />
            </SettingItem>
          </Section>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Helper Components ---
  function Section({ title, children }) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ color: themeColors.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 }}>{title}</Text>
        <View style={{ backgroundColor: themeColors.card, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
          {children}
        </View>
      </View>
    );
  }

  function SettingItem({ icon, title, description, children, isLast = false, onPress }) {
    const ItemComponent = onPress ? TouchableOpacity : View;

    return (
      <ItemComponent
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: isLast ? 0 : 1,
          borderColor: themeColors.sectionBackground
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: accentColor + '1A',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {icon}
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            {typeof title === 'string' ? (
              <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
            ) : (
              title
            )}
            {description && (typeof description === 'string' ? (
              <Text style={{ color: themeColors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{description}</Text>
            ) : (
              description
            ))}
          </View>
        </View>
        {children ? children : (onPress && <Icons.ChevronRight size={22} color={themeColors.textSecondary} />)}
      </ItemComponent>
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