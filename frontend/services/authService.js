import axios from 'axios';
import API_CONFIG from '../config/api';
import * as SecureStore from 'expo-secure-store';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized errors (token expired, invalid token, etc.)
    if (error.response?.status === 401) {
      // Clear the token and redirect to login
      await SecureStore.deleteItemAsync('auth_token');
      // You might want to redirect to login screen here
      // navigation.navigate('Auth');
    }
    return Promise.reject(error);
  }
);

const AuthService = {
  // Register a new user
  register: async (phoneNumber, password) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.REGISTER, {
        phoneNumber,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Login user
  login: async (phoneNumber, password) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, {
        phoneNumber,
        password
      });
      
      // Save the token to secure storage
      if (response.data?.data?.jwt) {
        await SecureStore.setItemAsync('auth_token', response.data.data.jwt);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout user
  logout: async () => {
    try {
      const { resetProfile } = useUserProfileStore.getState();
      resetProfile();
      
      // Then make the API call to logout
      const response = await api.get(API_CONFIG.ENDPOINTS.LOGOUT);
      return response.data;
    } catch (error) {
      // Clear the token and profile data
      const { resetProfile } = useUserProfileStore.getState();
      resetProfile();
      await SecureStore.deleteItemAsync('auth_token');
      throw error.response?.data || error.message;
    }
  },

  // Reset password
  resetPassword: async (phoneNumber, password) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, {
        phoneNumber,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    return !!token;
  },

  // Get auth token
  getToken: async () => {
    return await SecureStore.getItemAsync('auth_token');
  },

  // Get auth headers (useful for direct fetch calls)
  getAuthHeaders: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
};

export default AuthService;