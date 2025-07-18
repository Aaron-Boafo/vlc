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
    STORAGE: '/storage',
    STORAGE_BY_ID: (id) => `/storage/${id}`,
    STORAGE_ADD: '/storage/add'
  },
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Timeout for requests in milliseconds
  TIMEOUT: 30000,
  // File upload settings
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav'
  ]
};

export default API_CONFIG;
