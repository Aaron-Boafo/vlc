import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_CONFIG from '../config/api';

// Add request interceptor to log outgoing requests
axios.interceptors.request.use(request => {
  console.log('=== AXIOS REQUEST ===');
  console.log('URL:', request.method?.toUpperCase(), request.url);
  console.log('Headers:', JSON.stringify(request.headers, null, 2));
  
  if (request.data instanceof FormData) {
    console.log('Request is FormData');
    // Log FormData entries
    for (const pair of request.data._parts) {
      console.log(`FormData[${pair[0]}]:`, 
        pair[1]?.constructor?.name || typeof pair[1],
        pair[1] instanceof Blob ? 
          `Blob { type: ${pair[1].type}, size: ${pair[1].size} bytes }` :
          pair[1]
      );
    }
  } else {
    console.log('Request data:', request.data);
  }
  
  return request;
}, error => {
  console.error('=== AXIOS REQUEST ERROR ===', error);
  return Promise.reject(error);
});

// Add response interceptor to log responses
axios.interceptors.response.use(response => {
  console.log('=== AXIOS RESPONSE ===');
  console.log('Status:', response.status, response.statusText);
  console.log('Headers:', JSON.stringify(response.headers, null, 2));
  console.log('Data:', response.data);
  return response;
}, error => {
  if (error.response) {
    console.error('=== AXIOS RESPONSE ERROR ===');
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    console.error('=== AXIOS REQUEST ERROR (No response) ===');
    console.error('Request:', error.request);
  } else {
    console.error('=== AXIOS ERROR ===', error.message);
  }
  return Promise.reject(error);
});

const ProfileService = {
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  getProfile: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        console.log('No auth_token found in SecureStore');
        throw new Error('No authentication token found');
      }
      
      console.log('Fetching profile with token:', token.substring(0, 10) + '...');
      const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update user profile
   * @param {Object} params - Parameters for update
   * @param {string} [params.name] - New username (optional)
   * @param {Object} [params.profileImage] - Profile image file object
   * @param {string} [params.profileImage.uri] - File URI
   * @param {string} [params.profileImage.type] - File MIME type
   * @param {string} [params.profileImage.name] - File name
   * @returns {Promise<Object>} Updated profile data
   */
  updateProfile: async (params) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        console.log('No auth_token found in SecureStore during update');
        throw new Error('No authentication token found');
      }
      
      console.log('Using token for update:', token.substring(0, 10) + '...');
      console.log('API Base URL:', API_CONFIG.BASE_URL);

      let response;
      if (params.name) {
        console.log('Updating username to:', params.name);
        const url = `${API_CONFIG.BASE_URL}/profile/update/username`;
        console.log('Request URL:', url);
        
        // Match the exact DTO structure expected by the backend
        const requestData = { username: params.name };
        console.log('Request data:', JSON.stringify(requestData, null, 2));
        
        // Add detailed logging of the full request
        console.log('Sending request to:', url);
        console.log('Request method: POST');
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        });
        
        response = await axios({
          method: 'post',
          url: url,
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 15000,  // Increased timeout
          validateStatus: status => status < 500  // Don't throw for 4xx errors
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
      } else if (params.profileImage) {
        console.log('Uploading profile image:', {
          uri: params.profileImage.uri,
          type: params.profileImage.type,
          name: params.profileImage.name
        });

        const formData = new FormData();
        formData.append('profileImage', {
          uri: params.profileImage.uri,
          type: params.profileImage.type || 'image/jpeg',
          name: params.profileImage.name || `profile-${Date.now()}.jpg`,
          filename: `profile-${Date.now()}.jpg`
        });

        const url = `${API_CONFIG.BASE_URL}/profile/update/image`;
        console.log('Upload URL:', url);
        
        response = await axios({
          method: 'post',
          url: url,
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        });
      } else {
        throw new Error('No update parameters provided');
      }

      console.log('Profile update successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error.response?.data || { message: error.message };
    }
  },

  /**
   * Update user's username
   * @param {string} username - New username
   * @returns {Promise<Object>} Updated profile data
   */
  updateUsername: async (username) => {
    return ProfileService.updateProfile({ name: username });
  },

  /**
   * Update user's profile picture
   * @param {Object} file - File object with uri, type, and name
   * @returns {Promise<Object>} Updated profile data
   */
  updateProfilePicture: async (file) => {
    return ProfileService.updateProfile({ profileImage: file });
  }
};

export default ProfileService;
