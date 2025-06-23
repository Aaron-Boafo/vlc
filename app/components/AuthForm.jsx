import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import PhoneInput from './PhoneInput';

export default function AuthForm({
  visible,
  onClose,
  onLogin,
  onSignup,
  accentColor = "#0D8ABC"
}) {
  const [activeTab, setActiveTab] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    onLogin(phone.trim(), password);
    setPhone('');
    setPassword('');
    onClose();
  };

  const handleSignup = () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    onSignup(phone.trim(), password);
    setPhone('');
    setPassword('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ImageBackground
        source={require('../../assets/images/bg-login.png')}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <BlurView 
            intensity={90}
            tint="dark"
            style={styles.blurContainer}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, width: '100%' }}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.title}>
                  {activeTab === 'login' ? 'WELCOME BACK' : 'VISURA IS FREE'}
                </Text>
                <Text style={styles.subtitle}>
                  {activeTab === 'login' ? 'Best Media Player' : 'Explore And Customize Your Media Player'}
                </Text>

                {/* Phone Field */}
                <View style={styles.inputRow}>
                  <Icons.Phone size={18} color="#a1a1c5" style={styles.inputIcon} />
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    style={{ flex: 1 }}
                  />
                </View>

                {/* Password Field */}
                <View style={styles.inputRow}>
                  <Icons.Lock size={18} color="#a1a1c5" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#8e89a8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    textContentType="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    style={{ padding: 4, marginLeft: 4 }}
                  >
                    {showPassword ? (
                      <Icons.EyeOff color="#a1a1c5" size={22} />
                    ) : (
                      <Icons.Eye color="#a1a1c5" size={22} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={activeTab === 'login' ? handleLogin : handleSignup}
                  style={[styles.submitButton, { backgroundColor: 'rgba(67, 63, 63, 0.59)' }]}
                >
                  <Text style={styles.submitButtonText}>
                    {activeTab === 'login' ? 'Sign in' : 'Sign up'}
                  </Text>
                </TouchableOpacity>

                {/* Tab Switcher */}
                <View style={styles.tabSwitcher}>
                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      activeTab === 'login' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveTab('login')}
                  >
                    <Text style={[
                      styles.tabButtonText,
                      activeTab === 'login' && { color: 'rgba(20, 19, 19, 0.92)' }
                    ]}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      activeTab === 'signup' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveTab('signup')}
                  >
                    <Text style={[
                      styles.tabButtonText,
                      activeTab === 'signup' && { color: 'rgba(26, 24, 24, 0.92)' }
                    ]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </BlurView>
        </View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(23, 23, 25, 0.1)',
  },
  blurContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    paddingBottom: 36,
  },
  scrollContent: {
    width: '100%',
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#d1d1e0',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  inputRow: {
    width: '100%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    fontSize: 18,
    color: '#a1a1c5',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    marginBottom: 18,
    backgroundColor: 'rgba(67, 63, 63, 0.59)',
    borderWidth: 1,
    borderColor: 'rgba(43, 42, 42, 0.48)',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  tabSwitcher: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 22,
    backgroundColor: 'rgba(67, 63, 63, 0.59)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(43, 42, 42, 0.48)'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});