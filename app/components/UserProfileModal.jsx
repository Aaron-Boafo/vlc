import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Animated, Linking, Platform, TouchableNativeFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import useThemeStore from '../../store/theme';

const FUN_FACTS = [
  "Visura can play almost any media file format!",
  "Visura stands for VideoLAN Client.",
  "Visura is open source and free!",
  "You can stream media over the network with Visura.",
  "The Visura cone icon comes from a student project!"
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
  const { themeColors, accentColor, activeTheme } = useThemeStore();
  const [avatarUri, setAvatarUri] = useState(profile.avatar || '');
  const avatarAnim = useRef(new Animated.Value(0)).current;
  const [funFactIdx, setFunFactIdx] = useState(Math.floor(Math.random() * FUN_FACTS.length));
  const [factAnim] = useState(new Animated.Value(1));
  const [iconIdx, setIconIdx] = useState(Math.floor(Math.random() * FUN_FACT_ICONS.length));

  useEffect(() => {
    if (visible) {
      setAvatarUri(profile.avatar || '');
      avatarAnim.setValue(0);
      Animated.spring(avatarAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 70,
      }).start();
    }
  }, [visible, profile.avatar]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setAvatarUri(result.assets[0].uri);
      if (onUpdateAvatar) onUpdateAvatar(result.assets[0].uri);
    }
  };

  const handleNextFunFact = () => {
    let nextIdx, nextIconIdx;
    do {
      nextIdx = Math.floor(Math.random() * FUN_FACTS.length);
    } while (nextIdx === funFactIdx && FUN_FACTS.length > 1);
    do {
      nextIconIdx = Math.floor(Math.random() * FUN_FACT_ICONS.length);
    } while (nextIconIdx === iconIdx && FUN_FACT_ICONS.length > 1);
    // Animate fade out, change, then fade in
    Animated.timing(factAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setFunFactIdx(nextIdx);
      setIconIdx(nextIconIdx);
      Animated.timing(factAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

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
    url: 'https://instagram.com/yourprofile',
    bg: '#E1306C',
  },
  {
    label: 'Facebook',
    icon: <FontAwesome name="facebook-square" size={24} color="#fff" style={{ marginRight: 12 }} />,
    url: 'https://facebook.com/yourprofile',
    bg: '#1877F3',
  },
  {
    label: 'Twitter',
    icon: <FontAwesome name="twitter" size={24} color="#fff" style={{ marginRight: 12 }} />,
    url: 'https://twitter.com/yourprofile',
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
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: modalBg }}>
              {/* Header (no title) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}>
                <TouchableOpacity onPress={onClose} accessibilityLabel="Close profile modal">
                  <Icons.ArrowLeft size={28} color={themeColors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar */}
                <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 18 }}>
                  <TouchableOpacity onPress={pickImage} activeOpacity={0.8} accessibilityLabel="Edit photo">
                    <Animated.View style={{
                      shadowColor: accentColor,
                      shadowOpacity: 0.18,
                      shadowRadius: 8,
                      elevation: 4,
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
                          width: 110,
                          height: 110,
                          borderRadius: 55,
                          borderWidth: 2,
                          borderColor: themeColors.sectionBackground,
                          backgroundColor: themeColors.sectionBackground,
                        }}
                        accessibilityLabel="User avatar"
                      />
                    </Animated.View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickImage} accessibilityLabel="Edit photo">
                    <Text style={{ color: accentColor, fontWeight: '600', fontSize: 15, marginTop: 10 }}>Edit photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Name Field */}
                <View style={cardStyle}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => onEditField && onEditField('name')}
                    accessibilityLabel="Edit name"
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={{ color: themeColors.tabIconColor, fontSize: 13 }}>Name</Text>
                      <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500', marginTop: 2 }}>{profile.name || 'User'}</Text>
                    </View>
                    <Icons.ChevronRight size={22} color={themeColors.tabIconColor} />
                  </TouchableOpacity>
                </View>

                {/* Diagnostics Card */}
                <View style={cardStyle}>
                  <Text style={{ color: accentColor, fontWeight: 'bold', fontSize: 16, marginBottom: 10, letterSpacing: 0.2, borderBottomWidth: 1, borderColor: 'transparent' }}>
                    Diagnostics
                  </Text>
                  {/* Storage Progress */}
                  <Text style={{ color: themeColors.tabIconColor, fontSize: 13, marginBottom: 4 }}>
                    Storage
                  </Text>
                  <View style={{
                    width: '100%',
                    height: 18,
                    backgroundColor: themeColors.background,
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: accentColor + '33'
                  }}>
                    <View style={{
                      width: `${storagePercent}%`,
                      height: '100%',
                      backgroundColor: accentColor,
                    }} />
                  </View>
                  <Text style={{ color: themeColors.text, fontSize: 13, marginBottom: 8 }}>
                    {DIAGNOSTICS.storageUsed} GB / {DIAGNOSTICS.storageTotal} GB ({storagePercent}%)
                  </Text>
                  {/* Other Diagnostics */}
                  <Text style={{ color: themeColors.tabIconColor, fontSize: 13 }}>
                    App version: <Text style={{ color: themeColors.text }}>{DIAGNOSTICS.appVersion}</Text>
                  </Text>
                  <Text style={{ color: themeColors.tabIconColor, fontSize: 13 }}>
                    Device: <Text style={{ color: themeColors.text }}>{DIAGNOSTICS.device}</Text>
                  </Text>
                </View>

                {/* Fun Fact Card */}
                <Animated.View style={{
                  transform: [{ scale: funFactScale }],
                  marginVertical: 18,
                }}>
                  <TouchableOpacity
                    onPress={handleNextFunFact}
                    onPressIn={handleFunFactPressIn}
                    onPressOut={handleFunFactPressOut}
                    activeOpacity={0.85}
                    accessibilityLabel="Show another fun fact"
                    style={{ padding: 0, borderRadius: 18 }}
                  >
                    <LinearGradient
                      colors={[accentColor + '16', themeColors.sectionBackground]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        ...cardStyle,
                        alignItems: 'center',
                        marginVertical: 0,
                        paddingVertical: 22,
                        paddingHorizontal: 18,
                        marginBottom: 0,
                        borderWidth: 0,
                        shadowOpacity: 0.10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        {FUN_FACT_ICONS[iconIdx](accentColor)}
                        <Text style={{
                          color: accentColor,
                          fontWeight: 'bold',
                          fontSize: 15,
                          letterSpacing: 1.2,
                          textTransform: 'uppercase',
                        }}>
                          Fun Fact
                        </Text>
                      </View>
                      <View style={{
                        width: 32,
                        height: 2,
                        backgroundColor: accentColor + '33',
                        borderRadius: 1,
                        marginBottom: 12,
                      }} />
                      <Animated.Text style={{
                        color: themeColors.text,
                        fontSize: 17,
                        fontStyle: 'italic',
                        textAlign: 'center',
                        marginBottom: 6,
                        lineHeight: 25,
                        fontWeight: '500',
                        opacity: factAnim,
                        transform: [{ translateY: factAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                      }}>
                        “{FUN_FACTS[funFactIdx]}”
                      </Animated.Text>
                      <Text style={{
                        color: themeColors.tabIconColor,
                        fontSize: 12,
                        marginTop: 8,
                        opacity: 0.7,
                        textAlign: 'center',
                      }}>
                        Tap for another fact
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* App Links Card */}
                <LinearGradient
  colors={[themeColors.sectionBackground, accentColor + '0D']}
  start={{ x: 0, y: 0.2 }}
  end={{ x: 1, y: 1 }}
  style={{
    borderRadius: 24,
    marginHorizontal: 14,
    marginBottom: 32,
    paddingVertical: 18,
    paddingHorizontal: 16,
  }}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
    <FontAwesome name="external-link" size={18} color={accentColor} style={{ marginRight: 8 }} />
    <Text style={{
      color: accentColor,
      fontWeight: 'bold',
      fontSize: 15,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      App Links
    </Text>
  </View>
  <View style={{
    width: 32,
    height: 2,
    backgroundColor: accentColor + '22',
    borderRadius: 1,
    marginBottom: 16,
    marginLeft: 1,
  }} />
  <View>
    {socialLinks.map(link => {
      const ButtonContent = (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 22,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: link.bg,
            borderWidth: 1,
            borderColor: link.bg,
            marginBottom: 14,
          }}
        >
          {link.icon}
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              marginLeft: 10,
              fontWeight: 'bold',
              letterSpacing: 0.2,
            }}
          >
            {link.label}
          </Text>
        </View>
      );
      return Platform.OS === 'android' ? (
        <TouchableNativeFeedback
          key={link.label}
          onPress={() => Linking.openURL(link.url)}
          background={TouchableNativeFeedback.Ripple('#fff', false)}
          accessibilityLabel={`Visit our ${link.label} page`}
        >
          {ButtonContent}
        </TouchableNativeFeedback>
      ) : (
        <TouchableOpacity
          key={link.label}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.7}
          accessibilityLabel={`Visit our ${link.label} page`}
          style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 14 }}
        >
          {ButtonContent}
        </TouchableOpacity>
      );
    })}
  </View>
</LinearGradient>
              </ScrollView>

              {/* Sticky Footer Buttons */}
              <View style={{
                flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                padding: 18, borderTopWidth: 1, borderColor: themeColors.sectionBackground, backgroundColor: modalBg
              }}>
                <TouchableOpacity
                  onPress={onLogout}
                  accessibilityLabel="Log out"
                  style={{
                    backgroundColor: accentColor, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 32
                  }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}