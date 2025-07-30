import apiService from './api';
import API_CONFIG from '../config/api';
import { webSocketService } from './websocketService';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const StorageService = {
  getAll: async () => {
    try {
      const response = await api.get('/storage');
      if (response.data?.status === true) return response.data.data || [];
      throw new Error(response.data?.message || 'Failed to fetch storage items');
    } catch (error) {
      console.error('Error fetching storage items:', error);
      throw error.response?.data?.message || error.message;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/storage/${id}`);
      if (response.data?.status === true) return response.data.data;
      throw new Error(response.data?.message || 'Storage item not found');
    } catch (error) {
      console.error(`Error fetching storage item ${id}:`, error);
      throw error.response?.data?.message || error.message;
    }
  },

  uploadFile: async (file, metadata = {}, onProgress = null) => {
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let unsubscribe = () => {};

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) throw new Error('No authentication token found');

      if (onProgress) {
        unsubscribe = webSocketService.registerProgressCallback(sessionId, (progress) => {
          console.log('WebSocket progress:', progress);
          onProgress(progress);
        });
      }

      const fileName = metadata.fileName || file.name || `file_${Date.now()}`;
      const detectedMimeType = getMimeType(fileName);

      const formData = new FormData();
      const fileObj = { uri: file.uri, type: detectedMimeType, name: fileName };

      formData.append('file', fileObj);
      formData.append('metadata', JSON.stringify({
        fileName,
        fileType: detectedMimeType,
        description: metadata.description || ''
      }));
      formData.append('sessionId', sessionId);

      const uploadWithRetry = async () => {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STORAGE.ADD}`;
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
          try {
            const result = await uploadFileWithXHR(url, formData, token, onProgress);
            return result;
          } catch (err) {
            if (++attempt < maxRetries) await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
            else throw err;
          }
        }
      };

      return await uploadWithRetry();

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      unsubscribe();
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/storage/${id}`);
      if (response.data?.status === true) return response.data;
      throw new Error(response.data?.message || 'Failed to delete item');
    } catch (error) {
      console.error(`Error deleting item ${id}:`, error);
      throw error.response?.data?.message || error.message;
    }
  },

  getFileUrl: (location) => {
    if (!location) return null;
    return location.startsWith('http') ? location : `${API_CONFIG.BASE_URL}${location.startsWith('/') ? '' : '/'}${location}`;
  },

  isFileTypeAllowed: (fileType) => {
    if (!fileType) return false;
    const allowed = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac',
      'audio/flac', 'audio/m4a', 'audio/wma', 'audio/x-m4a', 'audio/x-wav',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
      'video/x-matroska', 'video/webm', 'video/3gpp', 'video/3gpp2'
    ];
    return allowed.includes(fileType.toLowerCase());
  },

  getMaxFileSize: () => API_CONFIG.MAX_FILE_SIZE || 500 * 1024 * 1024,

  formatFileSize: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i];
  }
};

const getMimeType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types = {
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    aac: 'audio/aac', flac: 'audio/flac', wma: 'audio/x-ms-wma',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm'
  };
  return types[ext] || 'application/octet-stream';
};

const uploadFileWithXHR = (url, formData, token, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 300000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
        } catch (err) {
          reject(new Error('Failed to parse server response'));
        }
      } else {
        let message = 'Upload failed';
        try {
          const errRes = JSON.parse(xhr.responseText);
          message = errRes.message || message;
        } catch {}
        const err = new Error(message);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error('Network error. Check your connection.'));
    xhr.ontimeout = () => reject(new Error('Upload request timed out.'));
    xhr.send(formData);
  });
};

export default StorageService;