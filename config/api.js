const API_CONFIG = {
  BASE_URL: 'https://vlc-spring-boot.onrender.com',
  ENDPOINTS: {
    // Auth endpoints
    REGISTER: '/register',
    LOGIN: '/login',
    LOGOUT: '/logout',
    RESET_PASSWORD: '/reset-password',
    
    // Profile endpoints
    PROFILE: '/profile',
    UPDATE_PROFILE: '/profile/update',
    
    // Storage endpoints
    STORAGE: {
      BASE: '/storage',
      ALL: '/storage',
      ADD: '/storage/add',
      DELETE: (id) => `/storage/${id}`,
      GET_BY_ID: (id) => `/storage/${id}`,
      UPLOAD: '/storage/upload'
    },
    // Legacy endpoints (for backward compatibility)
    STORAGE_BY_ID: (id) => `/storage/${id}`,
    STORAGE_ADD: '/storage/add',
    
    // WebSocket endpoint
    WEBSOCKET: '/ws/connect'
  },
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Timeout for requests in milliseconds
  TIMEOUT: 30000,
  // File upload settings
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large file uploads
  MAX_RETRIES: 3, // Maximum number of retry attempts for failed uploads
  RETRY_DELAY: 1000, // Delay between retries in milliseconds
  CONCURRENT_UPLOADS: 3, // Maximum number of concurrent uploads
  ALLOWED_FILE_TYPES: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-matroska',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/x-pn-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/m4a',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

export default API_CONFIG;
