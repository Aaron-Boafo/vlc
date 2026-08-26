import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
// Simple ID generator function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};
import API_CONFIG from '../config/api';
import { webSocketService } from './websocketService';

// Global upload state
const activeUploads = new Map();

// Global upload progress callback
let globalUploadProgressCallback = null;

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

// Helper function to handle file uploads with WebSocket progress tracking
const uploadFile = async (formData, onProgress) => {
  const fileId = `file_${generateId()}`;
  
  // Register progress callback with WebSocket service
  const unsubscribe = webSocketService.registerProgressCallback(fileId, (progress) => {
    onProgress?.({ loaded: progress, total: 100 });
  });
  
  try {
    // Add session ID to form data
    const sessionId = webSocketService.getSessionId();
    formData.append('sessionId', sessionId);
    
    const response = await api.post(API_CONFIG.ENDPOINTS.STORAGE.ADD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Fallback progress if WebSocket fails
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          onProgress?.({
            loaded: (progressEvent.loaded / progressEvent.total) * 100,
            total: 100
          });
        }
      },
    });
    
    return response.data;
  } finally {
    // Clean up the progress callback
    unsubscribe();
  }
};

// Main API service
const apiService = {
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
       
          const fileObj = {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: fileName,
            fileName: fileName,
            filepath: file.uri
          };
          
          console.log('Appending file to formData:', fileObj);
          
          // Append the file to FormData 
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
            return data;
          },
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
    getAll: () => api.get(API_CONFIG.ENDPOINTS.STORAGE.ALL),
    getById: (id) => api.get(`${API_CONFIG.ENDPOINTS.STORAGE.BASE}/${id}`),
    upload: (formData, onUploadProgress) => 
      uploadFile(formData, onUploadProgress),
    delete: (id) => api.delete(`${API_CONFIG.ENDPOINTS.STORAGE.BASE}/${id}`),
    add: (formData, onUploadProgress) =>
      uploadFile(formData, onUploadProgress),
  },
  
  // Direct file upload method
  uploadFile: (formData, onUploadProgress) => 
    uploadFile(formData, onUploadProgress),
    
  // Setup axios interceptors for upload progress
  setupAxiosInterceptors(progressCallback) {
    globalUploadProgressCallback = progressCallback;
    
    // Return cleanup function
    return () => {
      globalUploadProgressCallback = null;
    };
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

// Export the API service with all its methods
export default apiService;