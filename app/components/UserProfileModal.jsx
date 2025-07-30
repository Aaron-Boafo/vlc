import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput,
  Image, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Animated, 
  Linking, 
  Platform, 
  TouchableNativeFeedback,
  ActivityIndicator,
  Alert,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import useThemeStore from '../../store/theme';
import useUserProfileStore from '../../store/userProfile';
import api from '../../services/api';
import ProfileService from '../../services/profileService';

const FUN_FACTS = [
  "Visura can play almost any media file format!",
  "Visura means sight and sound in latin.",
  "Visura is open source and free!",
  "You can stream media over the network with Visura.",
  "The Visura was created by 7 brillant student !"
];

const FUN_FACT_ICONS = [
  (color) => <Icons.Sparkles color={color} size={20} style={{ marginRight: 6 }} />, 
  (color) => <Icons.Lightbulb color={color} size={20} style={{ marginRight: 6 }} />, 
  (color) => <Icons.Star color={color} size={20} style={{ marginRight: 6 }} />, 
];

// Example diagnostic data (replace with real data as needed)
const DIAGNOSTICS = {
  storageUsed: 4.2, // in GB
  storageTotal: 8,  // in GB
  appVersion: '2.3.1',
  device: 'Pixel 7 Pro'
};

export default function UserProfileModal({
  visible,
  onClose,
  profile = {},
  onUpdateAvatar,
  onEditField, // (field) => {}
  onLogout,
}) {
  // Log the received profile data for debugging
  console.log('UserProfileModal - Received profile:', profile);
  const { themeColors, accentColor, activeTheme } = useThemeStore();
  const { 
    userName, 
    userAvatar, 
    setUserName, 
    setUserAvatar 
  } = useUserProfileStore();
  
  const [avatarUri, setAvatarUri] = useState(userAvatar);
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const avatarAnim = useRef(new Animated.Value(0)).current;
  const [funFactIdx, setFunFactIdx] = useState(Math.floor(Math.random() * FUN_FACTS.length));
  const [isAnimating, setIsAnimating] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [iconIdx, setIconIdx] = useState(Math.floor(Math.random() * FUN_FACT_ICONS.length));
  
  // Animation interpolations
  const spin = rotateAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: ['0deg', '180deg', '360deg']
  });
  
  const scale = scaleAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 1.03, 0.98, 1]
  });
  
  const fade = fadeAnim.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [1, 0.3, 0.3, 1]
  });
  
  const iconScale = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1]
  });

  // Update local state when profile prop changes
  useEffect(() => {
    if (profile) {
      console.log('Updating profile data in modal:', profile);
      
      // Always update the name from profile prop to ensure it's in sync
      const newName = profile.name || (profile.phone ? `User_${profile.phone.slice(-4)}` : 'User');
      
      setAvatarUri(profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=0D8ABC&color=fff`);
      setName(newName);
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      
      console.log('Updated modal state with name:', newName);
    }
  }, [profile]);

  // Initialize the component with the user's saved avatar and name
  useEffect(() => {
    if (visible) {
      // Set the name from the store or profile prop
      if (userName) {
        setName(userName);
      } else if (profile.name) {
        setName(profile.name);
      }
      
      // Set the avatar from the store or profile prop
      if (userAvatar) {
        setAvatarUri(userAvatar);
      } else if (profile.avatar) {
        setAvatarUri(profile.avatar);
      } else if (userName || profile.name) {
        // Generate a default avatar based on the user's name
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || profile.name || 'U')}&background=0D8ABC&color=fff`;
        setAvatarUri(defaultAvatar);
      } else {
        // Fallback to a generic avatar
        setAvatarUri('https://ui-avatars.com/api/?name=U&background=0D8ABC&color=fff');
      }
      
      // Animate the avatar
      avatarAnim.setValue(0);
      Animated.spring(avatarAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
      }).start();
    }
  }, [visible, userAvatar]);

  const handleAvatarChange = async () => {
    try {
      setIsLoading(true);
      
      // Request permission to access the media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to change your profile picture.');
        return;
      }
      
      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Resize and compress the image
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // Create a file object for upload
        const file = {
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: `profile-${Date.now()}.jpg`
        };
        
        // Upload the profile picture
        await ProfileService.updateProfilePicture(file);
        
        // Update local state with the new image
        const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;
        
        // Save the avatar to the store
        setUserAvatar(dataUrl);
        setAvatarUri(dataUrl);
        
        // Call the onUpdateAvatar callback if provided
        if (onUpdateAvatar) {
          onUpdateAvatar(dataUrl);
        }
        
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=222&color=fff&bold=true`;
      setAvatarUri(defaultAvatar);
      Alert.alert('Error', error.message || 'Failed to update profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleSaveName = async () => {
    const trimmedName = name.trim();
    
    // Validate the name
    if (!trimmedName) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Update the username using the profile service
      await ProfileService.updateUsername(trimmedName);
      
      // Update local state
      setUserName(trimmedName);
      
      // Update the avatar with the new name if no custom avatar is set
      if (!userAvatar || userAvatar.startsWith('https://ui-avatars.com/')) {
        const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=0D8ABC&color=fff`;
        setUserAvatar(newAvatar);
        setAvatarUri(newAvatar);
      }
      
      // Call the onEditField callback if provided
      if (onEditField) {
        await onEditField('name', trimmedName);
      }
      
      // Close the editing mode
      setIsEditingName(false);
      
      // Show success message
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', error.message || 'Failed to update name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleNextFunFact = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Generate new random indices
    let newIdx, newIconIdx;
    do {
      newIdx = Math.floor(Math.random() * FUN_FACTS.length);
    } while (newIdx === funFactIdx && FUN_FACTS.length > 1);
    
    do {
      newIconIdx = Math.floor(Math.random() * FUN_FACT_ICONS.length);
    } while (newIconIdx === iconIdx && FUN_FACT_ICONS.length > 1);
    
    // Reset animations
    fadeAnim.setValue(1);
    rotateAnim.setValue(0);
    scaleAnim.setValue(1);
    
    // First phase: Shrink and fade out slightly
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Update content immediately after first phase
      setFunFactIdx(newIdx);
      setIconIdx(newIconIdx);
      
      // Second phase: Rotate and scale up
      Animated.parallel([
        Animated.spring(rotateAnim, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Final phase: Return to normal
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Reset animation values
          rotateAnim.setValue(0);
          scaleAnim.setValue(1);
          fadeAnim.setValue(1);
          setIsAnimating(false);
        });
      });
    });
  }, [funFactIdx, iconIdx, isAnimating, rotateAnim, scaleAnim, fadeAnim]);

  // Scale animation for fun fact card
  const funFactScale = useRef(new Animated.Value(1)).current;
  const handleFunFactPressIn = () => Animated.spring(funFactScale, { toValue: 0.97, useNativeDriver: true }).start();
  const handleFunFactPressOut = () => Animated.spring(funFactScale, { toValue: 1, friction: 3, tension: 70, useNativeDriver: true }).start();

  // Diagnostic progress bar calculation
  const storagePercent = Math.min(100, Math.round((DIAGNOSTICS.storageUsed / DIAGNOSTICS.storageTotal) * 100));

  // Social links
  const socialLinks = [
  {
    label: 'Instagram',
    icon: <FontAwesome name="instagram" size={24} color="#fff" style={{ marginRight: 12 }} />,
    url: 'https://www.instagram.com/visuraver1/',
    bg: '#E1306C',
  },
  {
    label: 'Facebook',
    icon: <FontAwesome name="facebook-square" size={24} color="#fff" style={{ marginRight: 12 }} />,
    url: 'https://www.facebook.com/profile.php?id=61578731392728',
    bg: '#1877F3',
  },
  {
    label: 'Twitter',
    icon: <FontAwesome name="twitter" size={24} color="#fff" style={{ marginRight: 12 }} />,
    url: 'https://x.com/Visuraver1',
    bg: '#1DA1F2',
  },
];

  const defaultAvatarUrl = 'https://ui-avatars.com/api/?name=User&background=222&color=fff&bold=true';
  const modalBg = activeTheme === 'dark' ? '#101010' : '#fff';

  // Card style for all cards
  const cardStyle = {
    backgroundColor: themeColors.sectionBackground,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: accentColor + '33',
    shadowColor: accentColor,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: themeColors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginTop: 40 }}>
              {/* Header */}
              <LinearGradient
                colors={[themeColors.card, themeColors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  paddingTop: 20,
                  borderBottomWidth: 1,
                  borderColor: themeColors.sectionBackground
                }}
              >
                <TouchableOpacity onPress={onClose} accessibilityLabel="Close profile modal" style={{ padding: 4 }}>
                  <Icons.X size={26} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold' }}>Profile</Text>
                <View style={{ width: 30 }} />
              </LinearGradient>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar Section */}
                <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: themeColors.sectionBackground }}>
                  <TouchableOpacity onPress={handleAvatarChange} activeOpacity={0.9} accessibilityLabel="Edit photo">
                    <Animated.View style={{
                      transform: [
                        {
                          scale: avatarAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}>
                      <Image
                        source={avatarUri ? { uri: avatarUri } : { uri: defaultAvatarUrl }}
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: 60,
                          borderWidth: 3,
                          borderColor: accentColor,
                          backgroundColor: themeColors.card,
                        }}
                        accessibilityLabel="User avatar"
                      />
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        backgroundColor: themeColors.background,
                        padding: 8,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: accentColor
                      }}>
                        <Icons.Camera size={20} color={accentColor} />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                  {/* Name & Phone Section */}
                  <View style={{ backgroundColor: themeColors.card, borderRadius: 18, marginBottom: 24, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: themeColors.sectionBackground }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Icons.User size={22} color={accentColor} />
                        {isEditingName ? (
                          <TextInput
                            style={{
                              flex: 1,
                              color: themeColors.text,
                              fontSize: 16,
                              marginLeft: 12,
                              padding: 8,
                              backgroundColor: themeColors.sectionBackground,
                              borderRadius: 8,
                            }}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            onSubmitEditing={handleSaveName}
                            placeholder="Enter your name"
                            placeholderTextColor={themeColors.textSecondary}
                          />
                        ) : (
                          <Text 
                            style={{ 
                              color: themeColors.text, 
                              fontSize: 16, 
                              fontWeight: '500', 
                              marginLeft: 12,
                              padding: 8,
                              flex: 1
                            }}
                          >
                            {name || 'User'}
                          </Text>
                        )}
                      </View>
                      {isEditingName ? (
                        <TouchableOpacity onPress={handleSaveName} style={{ marginLeft: 8 }}>
                          <Icons.Check size={22} color={accentColor} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => setIsEditingName(true)}>
                          <Icons.Edit3 size={18} color={themeColors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icons.Phone size={22} color={accentColor} />
                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 12 }}>{profile.phone || 'Not available'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Diagnostics & Actions */}
                  <View style={{ backgroundColor: themeColors.card, borderRadius: 18, marginBottom: 24, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: themeColors.sectionBackground }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icons.Info size={22} color={accentColor} />
                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 12 }}>App Version</Text>
                      </View>
                      <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>{DIAGNOSTICS.appVersion}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => Alert.alert("Clear Cache", "This feature is coming soon!")}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: themeColors.sectionBackground }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icons.Trash2 size={22} color={accentColor} />
                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 12 }}>Clear Cache</Text>
                      </View>
                      <Icons.ChevronRight size={22} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => Linking.openURL("https://www.videolan.org/")}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icons.Star size={22} color={accentColor} />
                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginLeft: 12 }}>Rate App</Text>
                      </View>
                      <Icons.ChevronRight size={22} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Social Links */}
                  <View style={{ backgroundColor: themeColors.card, borderRadius: 18, marginBottom: 24, overflow: 'hidden' }}>
                    {socialLinks.map((link, index) => (
                      <TouchableOpacity
                        key={link.label}
                        onPress={() => Linking.openURL(link.url)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          borderBottomWidth: index === socialLinks.length - 1 ? 0 : 1,
                          borderColor: themeColors.sectionBackground
                        }}
                      >
                        <View style={{ backgroundColor: link.bg, borderRadius: 8, padding: 6, marginRight: 12 }}>
                          {React.cloneElement(link.icon, { size: 20, style: { marginRight: 0 } })}
                        </View>
                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', flex: 1 }}>{link.label}</Text>
                        <Icons.ChevronRight size={22} color={themeColors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Fun Fact Card */}
                  <Animated.View 
                    style={[{
                      backgroundColor: themeColors.card,
                      borderRadius: 16,
                      padding: 16,
                      margin: 16,
                      marginTop: 0,
                      marginBottom: 24,
                      borderWidth: 1,
                      borderColor: themeColors.sectionBackground,
                      shadowColor: accentColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                      elevation: 3,
                      transform: [{ scale }],
                      opacity: fade
                    }]}
                  >
                    <TouchableOpacity
                      onPress={handleNextFunFact}
                      activeOpacity={0.85}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        transform: [{ scale: 0.98 }] // Subtle press effect
                      }}
                      disabled={isAnimating}
                    >
                      <Animated.View 
                        style={{
                          backgroundColor: accentColor + '20',
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 14,
                          transform: [
                            { rotate: spin },
                            { scale: iconScale }
                          ]
                        }}
                      >
                        <Animated.View style={{ 
                          transform: [
                            { rotate: spin },
                            { scale: iconScale }
                          ]
                        }}>
                          {FUN_FACT_ICONS[iconIdx](accentColor)}
                        </Animated.View>
                      </Animated.View>
                      <Text style={{
                        color: themeColors.text,
                        fontSize: 14,
                        flex: 1,
                        lineHeight: 20,
                        fontStyle: 'italic',
                        marginRight: 8
                      }}>
                        {FUN_FACTS[funFactIdx]}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Logout Button */}
                  <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                    <TouchableOpacity
                      onPress={onLogout}
                      accessibilityLabel="Log out"
                      activeOpacity={0.9}
                      style={{
                        backgroundColor: '#DC2626',
                        borderRadius: 12,
                        paddingVertical: 16,
                        borderWidth: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#DC2626',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3
                      }}
                    >
                      <Icons.LogOut size={18} color="white" style={{ marginRight: 10 }} />
                      <Text style={{ 
                        color: 'white', 
                        fontWeight: '600', 
                        fontSize: 16,
                        letterSpacing: 0.5
                      }}>
                        Log Out
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}