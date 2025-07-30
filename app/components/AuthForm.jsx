import React, { useState } from 'react';
import useUserProfileStore from '../../store/userProfile';
import useThemeStore from '../../store/theme';
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
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneInput from './PhoneInput';
import api from '../../services/api';

export default function AuthForm({
  visible,
  onClose,
  onLogin,
  onSignup,
  accentColor = "#0D8ABC"
}) {
  const { themeColors } = useThemeStore();
  const [activeTab, setActiveTab] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    // Basic validation for both login and signup
    const trimmedPhone = phone.trim();
    
    if (!trimmedPhone) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    
    // Check if phone number has valid international format
    const phoneRegex = /^\+[1-9]\d{1,14}$/; // E.164 format
    if (!phoneRegex.test(trimmedPhone)) {
      Alert.alert('Error', 'Please enter a valid international phone number (e.g., +1234567890)');
      return false;
    }
    
    // Check minimum length (country code + number)
    if (trimmedPhone.length < 8) {
      Alert.alert('Error', 'Phone number is too short');
      return false;
    }
    
    // Check maximum length (15 digits max including +)
    if (trimmedPhone.length > 16) {
      Alert.alert('Error', 'Phone number is too long');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    
    // Check password length (minimum 8 characters)
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    // Additional validation for signup
    if (activeTab === 'signup') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        Alert.alert('Error', 'Please enter your full name');
        return false;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
      
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return false;
      }
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      const trimmedPhone = phone.trim();
      console.log('Attempting login with phone:', trimmedPhone);
      
      // First, authenticate the user
      const loginResponse = await api.auth.login({
        phoneNumber: trimmedPhone,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', loginResponse.data);
      
      if (loginResponse.data?.status === true && loginResponse.data?.data?.jwt) {
        const token = loginResponse.data.data.jwt;
        const userData = loginResponse.data.data.user || {}; // Get user data from login response if available
        
        // Get username from response or generate a default one
        const username = userData.username || `User_${trimmedPhone.slice(-4)}`;
        const profilePicture = userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`;
        
        // Save the JWT token to secure storage first
        await SecureStore.setItemAsync('auth_token', token);
        
        // Prepare user profile data
        const userProfile = {
          name: username,
          phone: trimmedPhone,
          email: userData.email || '',
          avatar: profilePicture,
          storageUsed: userData.storageUsed || 0,
          token: token
        };
        
        console.log('User logged in with profile:', userProfile);
        
        // Update profile store and initialize WebSocket
        try {
          await useUserProfileStore.getState().setUserProfile({
            name: username,
            avatar: profilePicture,
            email: userData.email || ''
          });
          
          console.log('Profile updated, WebSocket should be initializing...');
          
          // Call the onLogin callback with user data if provided
          if (onLogin) {
            onLogin(userProfile);
          }
          
          // Close the modal
          onClose();
          
        } catch (wsError) {
          console.error('Error during WebSocket initialization:', wsError);
          // Still continue with login even if WebSocket fails
          if (onLogin) {
            onLogin(userProfile);
          }
          onClose();
        }
        
        // Fetch the latest profile data to ensure we have the most up-to-date information
        try {
          console.log('Fetching updated profile...');
          const profileResponse = await api.profile.get();
          console.log('Profile response:', profileResponse.data);
          
          if (profileResponse.data?.status === true && profileResponse.data?.data) {
            const profileData = profileResponse.data.data;
            const updatedName = profileData.username || profileData.phoneNumber || username;
            const updatedAvatar = profileData.profilePicture || profilePicture;
            
            // Update the profile store with the latest data
            useUserProfileStore.getState().setUserName(updatedName);
            useUserProfileStore.getState().setUserAvatar(updatedAvatar);
            
            const updatedProfile = {
              name: updatedName,
              phone: profileData.phoneNumber || trimmedPhone,
              email: profileData.email || userProfile.email,
              avatar: updatedAvatar,
              storageUsed: profileData.storageUsed || 0,
              token: token
            };
            
            console.log('Updated profile with latest data:', updatedProfile);
            
            // Call the onLogin callback with the updated profile if needed
            if (onLogin) {
              onLogin(updatedProfile);
            }
          }
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
          // Silently fail - we already have the basic profile from login
        }
        
        // Close the modal
        onClose();
      } else {
        throw new Error(response.data?.message || 'Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.log('Error response data:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to login. Please check your credentials and try again.';
      
      if (error.response) {
        // Server responded with an error status code
        const { status, data } = error.response;
        
        if (status === 400) {
          errorMessage = data?.message || 'Invalid phone number or password.';
        } else if (status === 401) {
          errorMessage = 'Invalid phone number or password.';
        } else if (status === 404) {
          errorMessage = 'No account found with this phone number.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your internet connection.';
      } else if (error.message) {
        // Something else caused the error
        console.error('Error:', error.message);
        errorMessage = error.message;
      }
      
      // Show error to user
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      const trimmedPhone = phone.trim();
      
      console.log('Attempting signup with phone:', trimmedPhone);
      
      // Set a timeout for the API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        // Include name in the signup request if available
        const signupData = {
          phoneNumber: trimmedPhone,
          password,
          ...(name && { name }) // Include name if it exists
        };
        
        const response = await api.auth.register(signupData, { 
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        console.log('Signup response:', response.data);
        
        if (response.data?.status === true) {
          // Clear form fields
          setPassword('');
          setConfirmPassword('');
          setName('');
          
          // Automatically log in the user after successful signup
          try {
            console.log('Attempting to log in with new account...');
            const loginResponse = await api.auth.login({
              phoneNumber: trimmedPhone,
              password: password // Use the same password from signup
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (loginResponse.data?.status === true && loginResponse.data?.data?.jwt) {
              const token = loginResponse.data.data.jwt;
              const userData = loginResponse.data.data.user || {};
              const username = userData.username || `User_${trimmedPhone.slice(-4)}`;
              
              // Create user profile
              const userProfile = {
                name: username,
                phone: trimmedPhone,
                email: userData.email || '',
                avatar: userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`,
                storageUsed: userData.storageUsed || 0
              };
              
              // Save the JWT token and user data
              await SecureStore.setItemAsync('auth_token', token);
              await SecureStore.setItemAsync('user_data', JSON.stringify(userProfile));
              
              console.log('Auto-login successful');
              
              // Call the onLogin callback to update the parent component
              if (onLogin) {
                onLogin({
                  ...userProfile,
                  token: token,
                });
              }
              
              // Close the auth modal
              onClose();
              return; // Exit the function after successful login
            }
          } catch (loginError) {
            console.error('Auto-login failed:', loginError);
            // Continue to show success message if auto-login fails
          }
          
          // If auto-login fails, show success message and switch to login tab
          Alert.alert(
            'Success',
            'Account created successfully! Please log in with your credentials.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setActiveTab('login');
                }
              }
            ]
          );
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        throw apiError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'This phone number is already registered. Please log in instead.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        if (error.response.status === 500 && 
            error.response.data?.message?.includes('non unique result')) {
          errorMessage = "This phone number is already registered. Please login instead.";
        } else if (error.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = "No response from server. Please check your connection.";
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Show error to user
      Alert.alert("Error", errorMessage);
      
      // Switch to login tab if needed
      if (shouldSwitchToLogin) {
        setActiveTab('login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <LinearGradient
        colors={[
          '#667eea', // Beautiful blue
          '#764ba2', // Purple
          '#2c3e50', // Dark blue-gray
          '#1a1a1a'  // Dark
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.overlay}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.blurContainer}
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

                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.phoneInputContainer]}>
                  <PhoneInput
                    value={phone}
                    onChange={(value) => {
                      console.log('Phone input changed:', value);
                      setPhone(value);
                    }}
                    placeholder="Enter your phone number"
                    defaultCountry="US"
                  />
                </View>

                {/* Password Field */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Password</Text>
                <View style={styles.inputRow}>
                  <Icons.Lock size={18} color="#a1a1c5" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#8e89a8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={[styles.input, { flex: 1 }]}
                    textContentType="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
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

                {/* Name Field (Signup only) */}
                {activeTab === 'signup' && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Full Name</Text>
                    <View style={styles.inputRow}>
                      <Icons.User size={18} color="#a1a1c5" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Enter your full name"
                        placeholderTextColor="#8e89a8"
                        value={name}
                        onChangeText={setName}
                        style={[styles.input, { flex: 1 }]}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Confirm Password Field (Signup only) */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Confirm Password</Text>
                    <View style={styles.inputRow}>
                      <Icons.Lock size={18} color="#a1a1c5" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Confirm your password"
                        placeholderTextColor="#8e89a8"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        style={[styles.input, { flex: 1 }]}
                        textContentType="password"
                        autoCapitalize="none"
                      />
                    </View>
                  </>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={activeTab === 'login' ? handleLogin : handleSignup}
                  style={styles.submitButton}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#D147FF', '#9D4EDD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.submitButtonGradient, isLoading && { opacity: 0.9 }]}
                  >
                    <View style={styles.submitButtonContent}>
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitButtonText}>
                            {activeTab === 'login' ? 'SIGN IN' : 'SIGN UP'}
                          </Text>
                          <Icons.ArrowRight size={20} color="#FFF" style={styles.submitButtonIcon} />
                        </>
                      )}
                    </View>
                  </LinearGradient>
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
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(190, 24, 200, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 15.5,
    color: 'rgba(255, 230, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 24,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  phoneInputContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(210, 100, 255, 0.1)',
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: 'rgba(210, 60, 255, 0.3)',
    backgroundColor: 'rgba(210, 60, 255, 0.08)',
  },
  inputRow: {
    width: '100%',
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: 16,
  },
  inputLabel: {
    color: 'rgba(255, 220, 255, 0.9)',
    fontSize: 12.5,
    marginBottom: 8,
    marginLeft: 6,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontFamily: 'Inter_400Regular',
  },
  blurContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'rgba(40, 10, 60, 0.98)',
    borderWidth: 0,
    borderTopWidth: 0.5,
    borderColor: 'rgba(200, 80, 255, 0.15)',
    elevation: 5,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 32,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#D147FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  submitButtonGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  submitButtonIcon: {
    marginLeft: 8,
    opacity: 0.9,
  },
  tabSwitcher: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(70, 20, 90, 0.2)',
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 80, 255, 0.1)',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(220, 90, 255, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(200, 100, 255, 0.2)',
  },
  tabButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});