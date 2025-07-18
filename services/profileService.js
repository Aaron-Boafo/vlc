import api from './api';

const ProfileService = {
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  getProfile: async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.PROFILE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} [profileData.username] - New username
   * @param {Object} [file] - Optional profile image file
   * @param {string} [file.uri] - File URI
   * @param {string} [file.type] - File MIME type
   * @param {string} [file.name] - File name
   * @returns {Promise<Object>} Updated profile data
   */
  updateProfile: async (profileData, file) => {
    try {
      const formData = new FormData();
      
      // Add metadata if provided
      if (profileData) {
        formData.append('metadata', JSON.stringify(profileData));
      }
      
      // Add file if provided
      if (file) {
        formData.append('file', {
          uri: file.uri,
          type: file.type || 'image/jpeg', // default to jpeg if type not provided
          name: file.name || 'profile.jpg' // default filename
        });
      }
      
      const response = await api.post(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user's profile picture
   * @param {Object} file - File object with uri, type, and name
   * @returns {Promise<Object>} Updated profile data
   */
  updateProfilePicture: async (file) => {
    return ProfileService.updateProfile(null, file);
  },

  /**
   * Update user's username
   * @param {string} username - New username
   * @returns {Promise<Object>} Updated profile data
   */
  updateUsername: async (username) => {
    return ProfileService.updateProfile({ username });
  }
};

export default ProfileService;
