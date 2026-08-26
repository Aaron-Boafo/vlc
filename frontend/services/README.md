# API Services

This directory contains the API service implementation for the VLC application, which communicates with the backend server at `https://vlc-spring-boot.onrender.com`.

## Services Overview

1. **API Service (`api.js`)**
   - Centralized service for making HTTP requests
   - Handles authentication tokens automatically
   - Provides methods for all API endpoints
   - Handles file uploads

2. **Auth Service (`authService.js`)**
   - User authentication (login/register)
   - Token management
   - Session handling

3. **Profile Service (`profileService.js`)**
   - Get user profile
   - Update profile information
   - Manage profile picture

4. **Storage Service (`storageService.js`)**
   - Upload files
   - List user's stored files
   - Delete files
   - Get file information

## Usage Examples

### Authentication

```javascript
import api from './api';

// Login
const login = async (phoneNumber, password) => {
  try {
    const response = await api.auth.login({ phoneNumber, password });
    console.log('Login successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Register
const register = async (phoneNumber, password) => {
  try {
    const response = await api.auth.register({ phoneNumber, password });
    console.log('Registration successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

### Profile Management

```javascript
// Get user profile
const getProfile = async () => {
  try {
    const response = await api.profile.get();
    return response.data;
  } catch (error) {
    console.error('Failed to get profile:', error);
    throw error;
  }
};

// Update profile picture
const updateProfilePicture = async (file) => {
  try {
    const response = await api.profile.update(null, file, (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      console.log(`Upload Progress: ${percentCompleted}%`);
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update profile picture:', error);
    throw error;
  }
};
```

### File Management

```javascript
// Upload a file
const uploadFile = async (file, metadata = {}) => {
  try {
    const response = await api.storage.upload(file, metadata, (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      console.log(`Upload Progress: ${percentCompleted}%`);
    });
    return response.data;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

// Get all user files
const getUserFiles = async () => {
  try {
    const response = await api.storage.getAll();
    return response.data;
  } catch (error) {
    console.error('Failed to get files:', error);
    throw error;
  }
};
```

## Authentication Flow

1. User logs in with phone number and password
2. On successful login, the JWT token is stored securely using `expo-secure-store`
3. The token is automatically added to all subsequent API requests
4. If a 401 Unauthorized error is received, the token is cleared and the user is logged out

## Error Handling

All API methods throw errors that can be caught and handled appropriately. The error object contains:

- `message`: Error message from the server or a default message
- `status`: HTTP status code
- `data`: Additional error data from the server

## Configuration

The API configuration is stored in `../config/api.js` and includes:

- Base URL
- Endpoint paths
- Default headers
- Timeout settings
- File upload limits

## Dependencies

- `axios`: For making HTTP requests
- `expo-secure-store`: For secure token storage

## Notes

- All API calls return Promises
- File uploads support progress tracking
- Authentication state is managed automatically
- The service handles token refresh if implemented on the backend
