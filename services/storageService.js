import api from './api';
import API_CONFIG from '../config/api';

const StorageService = {
  /**
   * Get all storage items for the authenticated user
   * @returns {Promise<Array>} Array of storage items
   */
  getAllStorage: async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.STORAGE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get a specific storage item by ID
   * @param {string} id - Storage item ID
   * @returns {Promise<Object>} Storage item data
   */
  getStorageById: async (id) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.STORAGE_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Upload a file to storage
   * @param {Object} file - File object with uri, type, and name
   * @param {Object} metadata - Additional metadata for the file
   * @param {string} [metadata.fileName] - Custom file name
   * @param {string} [metadata.fileType] - File MIME type
   * @param {string} [metadata.description] - File description
   * @param {string} [sessionId] - WebSocket session ID for progress updates
   * @returns {Promise<Object>} Upload response
   */
  uploadFile: async (file, metadata = {}, sessionId = null) => {
    try {
      const formData = new FormData();
      
      // Add file
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'file'
      });
      
      // Add metadata
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      // Add session ID if provided (for progress tracking)
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }
      
      const response = await api.post(API_CONFIG.ENDPOINTS.STORAGE_ADD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          // You can use this for progress tracking if needed
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${progress}%`);
        },
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete a storage item
   * @param {string} id - Storage item ID to delete
   * @returns {Promise<Object>} Delete response
   */
  deleteStorageItem: async (id) => {
    try {
      const response = await api.delete(API_CONFIG.ENDPOINTS.STORAGE_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Check if a file type is allowed for upload
   * @param {string} fileType - MIME type of the file
   * @returns {boolean} True if the file type is allowed
   */
  isFileTypeAllowed: (fileType) => {
    return API_CONFIG.ALLOWED_FILE_TYPES.includes(fileType);
  },

  /**
   * Get the maximum allowed file size in bytes
   * @returns {number} Maximum file size in bytes
   */
  getMaxFileSize: () => {
    return API_CONFIG.MAX_FILE_SIZE;
  }
};

export default StorageService;
