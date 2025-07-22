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
      const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...API_CONFIG.HEADERS
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error.response?.data || error.message;
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
  updateProfile: async ({ name, profileImage }) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const formData = new FormData();

      // Only append name if provided
      if (name) {
        formData.append(
          'data',
          new Blob([JSON.stringify({ username: name })], {
            type: 'application/json',
          })
        );
      }

      // Only append profileImage if provided
      if (profileImage) {
        // Create a file object from the image URI
        const file = {
          uri: profileImage.uri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.name || 'profile.jpg',
        };
        formData.append('profileImage', file);
      }

      // Ensure at least one field is provided
      if (!name && !profileImage) {
        throw new Error('Either name or profileImage must be provided.');
      }

      const response = await axios({
        method: 'post',
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_PROFILE}`,
        data: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(API_CONFIG.HEADERS || {})
        },
        // This prevents axios from setting Content-Type
        transformRequest: (data, headers) => {
          delete headers.common['Content-Type'];
          return data;
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user's profile picture
   * @param {Object} file - File object with uri, type, and name
   * @returns {Promise<Object>} Updated profile data
   */
  updateProfilePicture: async (file) => {
    return ProfileService.updateProfile({ profileImage: file });
  },

  /**
   * Update user's username
   * @param {string} username - New username
   * @returns {Promise<Object>} Updated profile data
   */
  updateUsername: async (username) => {
    return ProfileService.updateProfile({ name: username });
  },
};

export default ProfileService;
