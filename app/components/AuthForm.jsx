import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  Animated,
  SafeAreaView,
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneInput from './PhoneInput';
import useThemeStore from '../../store/theme';

export default function AuthForm({
  visible,
  onClose,
  onLogin,
  onSignup,
}) {
  const { themeColors } = useThemeStore();
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Animated loading spinner
  useEffect(() => {
    if (isLoading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [isLoading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSubmit = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }

    if (isSignup && password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignup) {
        await onSignup(phone.trim(), password);
      } else {
        await onLogin(phone.trim(), password);
      }
      setPhone('');
      setPassword('');
      onClose();
    } catch (error) {
      Alert.alert(
        isSignup ? "Signup Failed" : "Login Failed",
        error.message || "Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Close button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: themeColors.card }]}
              onPress={onClose}
            >
              <Icons.X size={24} color={themeColors.text} />
            </TouchableOpacity>

            {/* Main Content */}
            <View style={[styles.content, { backgroundColor: themeColors.card }]}>
              {/* App Logo */}
              <View style={[styles.logoContainer, { backgroundColor: themeColors.primary + '20' }]}>
                <Icons.Play size={36} color={themeColors.primary} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: themeColors.text }]}>
                {isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {isSignup
                  ? 'Join Visura and start exploring'
                  : 'Sign in to continue your journey'
                }
              </Text>

              {/* Phone Field */}
              <View style={[styles.inputRow, {
                backgroundColor: themeColors.sectionBackground,
                borderColor: themeColors.border || 'rgba(255,255,255,0.1)'
              }]}>
                <Icons.Phone size={20} color={themeColors.primary} style={styles.inputIcon} />
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  style={{ flex: 1 }}
                  themeColors={themeColors}
                  placeholder="Phone number"
                  editable={!isLoading}
                />
              </View>

              {/* Password Field */}
              <View style={[styles.inputRow, {
                backgroundColor: themeColors.sectionBackground,
                borderColor: themeColors.border || 'rgba(255,255,255,0.1)'
              }]}>
                <Icons.Lock size={20} color={themeColors.primary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={themeColors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: themeColors.text }]}
                  textContentType="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Icons.EyeOff color={themeColors.textSecondary} size={22} />
                  ) : (
                    <Icons.Eye color={themeColors.textSecondary} size={22} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.submitButton, { opacity: isLoading ? 0.7 : 1 }]}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[themeColors.primary, themeColors.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Animated.View style={[styles.loadingSpinner, { transform: [{ rotate: spin }] }]}>
                      <Icons.Loader2 size={20} color="#FFFFFF" />
                    </Animated.View>
                    <Text style={styles.submitButtonText}>
                      {isSignup ? 'Creating...' : 'Signing in...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isSignup ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bottom Toggle */}
              <View style={styles.bottomToggle}>
                <Text style={[styles.toggleText, { color: themeColors.textSecondary }]}>
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <TouchableOpacity
                  onPress={toggleMode}
                  style={styles.toggleButton}
                  disabled={isLoading}
                >
                  <Text style={[styles.toggleButtonText, { color: themeColors.primary }]}>
                    {isSignup ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 35, 0.95)', // Use your app's dark background with transparency
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)', // Purple border accent
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 24,
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  inputRow: {
    width: '100%',
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  eyeButton: {
    padding: 10,
    marginLeft: 6,
    borderRadius: 8,
  },
  submitButton: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    marginBottom: 28,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 12,
  },
  bottomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
    marginTop: 8,
  },
  toggleText: {
    fontSize: 15,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});