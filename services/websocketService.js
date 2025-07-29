import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import API_CONFIG from '../config/api';

// Simple React Native compatible ID generator
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    this.maxReconnectDelay = 30000; // Max 30 seconds delay
    this.messageQueue = [];
    this.authToken = null;
    this.connectionPromise = null;
    this.eventListeners = {};
    this.progressCallbacks = new Map();
  }

  // Initialize WebSocket connection with token
  async initialize(token) {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        // Get the auth token
        this.authToken = token || await SecureStore.getItemAsync('auth_token');
        if (!this.authToken) {
          console.log('No auth token available for WebSocket');
          throw new Error('No auth token available');
        }

        console.log('Initializing WebSocket with token:', this.authToken ? 'Token exists' : 'No token');
        await this.connect();
        return this.socket;
      } catch (error) {
        console.error('WebSocket initialization error:', error);
        this.connectionPromise = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  // Get WebSocket URL
  getWebSocketUrl() {
    try {
      const protocol = API_CONFIG.BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const host = API_CONFIG.BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
      const wsPath = API_CONFIG.ENDPOINTS.WEBSOCKET || '/ws/connect';
      return `${protocol}://${host}${wsPath}`;
    } catch (error) {
      console.error('Error constructing WebSocket URL:', error);
      throw error;
    }
  }

  // Connect to WebSocket
  async connect() {
    if (this.socket) {
      // If we have an existing socket, clean it up first
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close(1000, 'Reconnecting...');
        }
      } catch (e) {
        console.warn('Error cleaning up existing WebSocket:', e);
      }
      this.socket = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      // Create WebSocket connection with error handling
      this.socket = new WebSocket(wsUrl);
      this.isConnected = false; // Reset connection state

      // Set up event handlers with proper binding
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.handleOpen();
      };
      
      this.socket.onmessage = (event) => {
        try {
          this.handleMessage(event);
        } catch (e) {
          console.error('Error in WebSocket message handler:', e);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleError(error);
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.handleClose(event);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  // Handle WebSocket open event
  handleOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset reconnect delay
    
    // Authenticate with the server
    this.authenticate()
      .then(() => {
        console.log('WebSocket authentication initiated');
      })
      .catch(error => {
        console.error('WebSocket authentication error:', error);
        this.emit('auth_failed', { error: error.message });
      });
  }

  // Handle incoming messages
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      // Handle authentication response
      if (data.type === 'auth_success') {
        console.log('WebSocket authentication successful');
        this.flushMessageQueue();
        return;
      }

      // Handle progress updates
      if (data.type === 'upload_progress') {
        const { sessionId } = data;
        const callback = this.progressCallbacks.get(sessionId);
        if (callback) {
          callback(data);
        }
        return;
      }

      // Emit event to listeners
      const listeners = this.eventListeners[data.type] || [];
      listeners.forEach(callback => callback(data.payload));

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  // Handle WebSocket errors
  handleError(error) {
    console.error('WebSocket error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      isTrusted: error.isTrusted
    });
    
    // Don't attempt to reconnect on authentication errors
    if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
      console.error('Authentication error, stopping reconnection attempts');
      this.reconnectAttempts = this.maxReconnectAttempts;
      return;
    } 
    
    // For other errors, we'll let the onclose handler handle reconnection
    console.log('WebSocket error occurred, connection will attempt to recover');
  }

  // Handle WebSocket close event
  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.socket = null;
    
    if (event.code === 1008) { // 1008 is Policy Violation (e.g., auth failed)
      console.error('WebSocket authentication failed');
      this.reconnectAttempts = this.maxReconnectAttempts;
      // Don't attempt to reconnect on auth failures
      return;
    }

    if (event.code === 1006) { // Abnormal closure
      console.error('WebSocket connection failed. Check server logs for details.');
      this.reconnectAttempts = this.maxReconnectAttempts;
      return;
    }

    if (event.code !== 1000) { // 1000 is a normal closure
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('Connection closed unexpectedly, attempting to reconnect...');
        this.handleReconnect();
      } else {
        console.error('Max reconnection attempts reached');
      }
    }
  }

  // Handle reconnection with exponential backoff
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      Alert.alert(
        'Connection Error', 
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  // Authenticate with the server
  authenticate() {
    return new Promise((resolve, reject) => {
      if (this.authToken) {
        console.log('Sending authentication message');
        this.sendMessage({
          type: 'authenticate',
          token: this.authToken
        });
        resolve();
      } else {
        reject(new Error('No authentication token available'));
      }
    });
  }

  // Send a message through the WebSocket
  sendMessage(message) {
    if (!this.isConnected || !this.socket) {
      console.log('Queueing message (not connected):', message);
      this.messageQueue.push(message);
      return false;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(messageStr);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Flush any queued messages
  flushMessageQueue() {
    if (!this.isConnected) return;
    
    const failedMessages = [];
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending queued WebSocket message:', error);
        failedMessages.push(message);
      }
    }
    
    // Re-queue any failed messages
    this.messageQueue = [...failedMessages, ...this.messageQueue];
  }

  // Register a callback for upload progress
  registerProgressCallback(sessionId, callback) {
    this.progressCallbacks.set(sessionId, callback);
    
    // Return cleanup function
    return () => this.unregisterProgressCallback(sessionId);
  }
  
  // Unregister a progress callback
  unregisterProgressCallback(sessionId) {
    this.progressCallbacks.delete(sessionId);
  }
  
  // Add event listener
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    
    // Return cleanup function
    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    };
  }
  
  // Remove event listener
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }
  
  // Emit event to all listeners
  emit(event, data) {
    const listeners = this.eventListeners[event] || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }
  
  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
      this.messageQueue = [];
      this.removeAllListeners();
    }
  }

  registerProgressCallback(fileId, callback) {
    this.progressCallbacks.set(fileId, callback);
    return () => this.progressCallbacks.delete(fileId);
  }

  // Generate a unique session ID for this upload using our custom generator
  getSessionId() {
    return `upload-${Date.now()}-${generateId()}`;
  }
}

export const webSocketService = new WebSocketService();
