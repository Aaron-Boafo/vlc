import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_CONFIG from '../config/api';

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 15000; // 15 seconds

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    ...API_CONFIG.HEADERS,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  timeoutErrorMessage: 'Request timed out. Please check your internet connection and try again.'
});

// Request interceptor to add auth token to headers
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

// Response interceptor for error handling
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

// Helper function to handle file uploads
const uploadFile = async (url, file, data, onUploadProgress) => {
  const formData = new FormData();
  
  // Add file
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'application/octet-stream',
    name: file.name || 'file',
  });
  
  // Add additional data if provided
  if (data) {
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object') {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    });
  }
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }
  
  return api.post(url, formData, config);
};

// Main API service
export default {
  // Auth endpoints
  auth: {
    login: (credentials, config = {}) => api.post(API_CONFIG.ENDPOINTS.LOGIN, credentials, {
      ...config,
      timeout: 20000, // 20 seconds for login
    }),
    register: (userData, config = {}) => api.post(API_CONFIG.ENDPOINTS.REGISTER, userData, {
      ...config,
      timeout: 30000, // 30 seconds for registration
    }),
    logout: (config = {}) => api.get(API_CONFIG.ENDPOINTS.LOGOUT, config),
    resetPassword: (data, config = {}) => api.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, data, config),
  },
  
  // Profile endpoints
  profile: {
    get: () => api.get(API_CONFIG.ENDPOINTS.PROFILE),
    update: async (metadata, file = null, onUploadProgress = null) => {
      try {
        const formData = new FormData();
        
        // Add metadata as a JSON string if provided
        if (metadata) {
          formData.append('metadata', JSON.stringify(metadata));
        }
        
        // Add file if provided
        if (file) {
          // For React Native, we need to create a file object that matches the web File API
          const fileExtension = file.uri.split('.').pop() || 'jpg';
          const fileName = file.name || `profile_${Date.now()}.${fileExtension}`;
          
          // Create a file object that matches what the server expects
          // The server expects a file object with uri, type, and name
          const fileObj = {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: fileName,
            // Some servers might need these additional fields
            fileName: fileName,
            filepath: file.uri
          };
          
          console.log('Appending file to formData:', fileObj);
          
          // Append the file to FormData with the exact field name the server expects
          formData.append('file', {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: fileName
          });
        }
        
        const config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          transformRequest: (data) => {
            // Let axios handle FormData
            return data;
          },
          // Some servers need this to properly handle FormData
          timeout: 30000, // 30 seconds timeout
        };
        
        if (onUploadProgress) {
          config.onUploadProgress = onUploadProgress;
        }
        
        console.log('Sending profile update with file:', file ? 'Yes' : 'No');
        
        // Log FormData contents for debugging
        if (formData._parts) {
          const formDataEntries = formData._parts.map(([key, value]) => ({
            key,
            value: key === 'file' ? '[File object]' : value
          }));
          console.log('FormData entries:', formDataEntries);
        }
        
        // Log the final request data for debugging
        console.log('Sending request to:', API_CONFIG.ENDPOINTS.UPDATE_PROFILE);
        
        const response = await api.post(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, formData, config);
        console.log('Server response:', response.data);
        return response;
        
      } catch (error) {
        console.error('Error in profile.update:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        throw error;
      }
    },
  },
  
  // Storage endpoints
  storage: {
    getAll: () => api.get(API_CONFIG.ENDPOINTS.STORAGE),
    getById: (id) => api.get(API_CONFIG.ENDPOINTS.STORAGE_BY_ID(id)),
    upload: (file, metadata = {}, onUploadProgress) => {
      return uploadFile(API_CONFIG.ENDPOINTS.STORAGE_ADD, file, metadata, onUploadProgress);
    },
    delete: (id) => api.delete(API_CONFIG.ENDPOINTS.STORAGE_BY_ID(id)),
  },
  
  // Helper to set auth token
  setAuthToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      await SecureStore.deleteItemAsync('auth_token');
      delete api.defaults.headers.common['Authorization'];
    }
  },
  
  // Helper to get auth token
  getAuthToken: async () => {
    return await SecureStore.getItemAsync('auth_token');
  },
  
  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    return !!token;
  },
};
