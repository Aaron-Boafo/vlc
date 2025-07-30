# 🎵 Visura - Media Player App Documentation

## 📱 Overview

Visura is a comprehensive React Native media player application built with Expo, featuring audio and video playback, playlist management, and a modern, customizable interface. The app provides a seamless experience for managing and playing local media files with advanced features like notifications, swipe navigation, and dynamic theming.

## 🏗️ Project Structure

```
visura/
├── app/                          # Main application screens (Expo Router)
│   ├── (onboarding)/            # Onboarding flow
│   ├── (tabs)/                  # Tab-based navigation
│   │   ├── (audio)/            # Audio-related screens
│   │   ├── (video)/            # Video-related screens
│   │   ├── (playlist)/         # Playlist management
│   │   ├── (browse)/           # File browsing
│   │   └── (more)/             # Settings and more options
│   ├── player/                 # Full-screen players
│   └── components/             # App-specific components
├── components/                  # Reusable UI components
├── AudioScreens/               # Audio-specific screen components
├── VideoScreens/               # Video-specific screen components
├── AudioComponents/            # Audio-specific UI components
├── VideoComponents/            # Video-specific UI components
├── store/                      # State management (Zustand)
├── services/                   # External services and APIs
├── utils/                      # Utility functions and helpers
└── assets/                     # Static assets (images, fonts)
```

## 🎯 Core Features

### 🎵 Audio System
- **Unified Audio Loading**: Batch loading of all audio files with progressive UI updates
- **Multiple View Modes**: All, Playlist, Album, Artist, Favourite
- **Swipe Navigation**: Horizontal swipe between different audio views
- **Bottom Player**: Persistent mini player with full player modal
- **Music Notifications**: System notifications for background playback
- **Single Playback Protection**: Prevents multiple audio files from playing simultaneously

### 🎬 Video System
- **Optimized Video Loading**: Efficient loading with caching
- **Mini Player**: Picture-in-picture style video player
- **Multiple Formats**: Support for various video formats
- **Thumbnail Generation**: Automatic video thumbnail creation

### 🎨 Theming System
- **Dynamic Themes**: Light and dark mode support
- **Accent Colors**: 17 customizable accent colors
- **Consistent Application**: Theme colors applied across all components
- **Real-time Updates**: Instant theme changes without app restart

## 📁 Key Directories Explained

### `/app` - Main Application Structure
Uses Expo Router for file-based routing with nested layouts and screens.

#### `/app/(tabs)` - Tab Navigation
- **(audio)**: Main audio interface with unified loading system
- **(video)**: Video browsing and playback interface
- **(playlist)**: Playlist creation and management
- **(browse)**: File system browsing
- **(more)**: Settings, profile, and additional features

### `/store` - State Management
Built with Zustand for lightweight, performant state management.

#### Key Stores:
- **`theme.js`**: Theme and accent color management
- **`globalAudioStore.js`**: Unified audio file management
- **`optimizedVideoStore.js`**: Video file management with caching
- **`useAudioControl.js`**: Audio playback controls and state
- **`userProfile.js`**: User authentication and profile data

### `/components` - Reusable UI Components
- **`Header.jsx`**: App header with logo and navigation
- **`SimpleBottomPlayer.jsx`**: Persistent audio mini player
- **`AuthForm.jsx`**: Authentication modal with gradient background
- **`AppLogo.jsx`**: Consistent app branding

### `/services` - External Services
- **`musicNotificationService.js`**: System notifications for music playback
- **`musicControlService.js`**: Media control integration

## 🔧 Technical Implementation

### Audio Loading System
```javascript
// Batch loading with progressive updates
const loadAllAudioFiles = async () => {
  let allAssets = [];
  let after = null;
  let hasNextPage = true;
  const BATCH_SIZE = 50;

  while (hasNextPage) {
    const media = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: BATCH_SIZE,
      after: after,
    });
    
    // Process and filter files
    // Update UI progressively
    // Continue pagination
  }
};
```

### Theme System
```javascript
// Dynamic color generation
const getThemeColors = (theme, accentColor) => {
  const accent = accentColors[accentColor];
  const accentLight = tinycolor(accent).lighten(15).toString();
  const accentDark = tinycolor(accent).darken(15).toString();
  
  return {
    primary: accent,
    primaryLight: accentLight,
    primaryDark: accentDark,
    // ... other theme colors
  };
};
```

### Swipe Navigation
```javascript
// Horizontal swipe between screens
const renderSwipeableContent = () => (
  <ScrollView
    horizontal
    pagingEnabled
    onMomentumScrollEnd={handleScrollEnd}
  >
    {tabs.map((tab) => (
      <View key={tab.name} style={{ width: screenWidth }}>
        {/* Screen content */}
      </View>
    ))}
  </ScrollView>
);
```

## 📱 Key Components

### Audio Components
- **`AudioComponents/title.jsx`**: Audio section header
- **`AudioComponents/toggleButton.jsx`**: Tab switching buttons
- **`AudioScreens/all.jsx`**: All audio files view
- **`AudioScreens/playlist.jsx`**: Playlist management
- **`AudioScreens/albums.jsx`**: Album-grouped view
- **`AudioScreens/artist.jsx`**: Artist-grouped view
- **`AudioScreens/favourite.jsx`**: Favorited tracks

### Video Components
- **`VideoComponents/toggleButton.jsx`**: Video tab switching
- **`VideoComponents/VideoMiniPlayer.jsx`**: Picture-in-picture player
- **`VideoScreens/all.jsx`**: All video files view
- **`VideoScreens/playlist.jsx`**: Video playlist management

## 🔄 State Management Architecture

### Zustand Stores
The app uses Zustand for state management with the following pattern:

```javascript
const useStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        data: [],
        isLoading: false,
        
        // Actions
        loadData: async () => {
          set({ isLoading: true });
          // Load data
          set({ data: result, isLoading: false });
        },
      }),
      {
        name: 'store-name',
        storage: createJSONStorage(() => AsyncStorage),
      }
    )
  )
);
```

### Key State Patterns
- **Optimistic Updates**: UI updates immediately, sync in background
- **Caching**: Persistent storage for offline access
- **Subscription**: Components subscribe to specific state slices
- **Middleware**: Persistence and selector middleware for performance

## 🎵 Audio System Deep Dive

### Unified Audio Loading
The audio system loads all device audio files in batches:

1. **Initial Cache Load**: Instant UI with cached files
2. **Permission Check**: Request media library access
3. **Batch Processing**: Load 50 files at a time
4. **Progressive Updates**: UI updates with each batch
5. **Metadata Extraction**: Album, artist, artwork extraction
6. **Filtering**: Exclude system/app-specific folders

### Playback Protection
Prevents multiple audio files from playing simultaneously:

```javascript
const playTrack = async (track) => {
  // Prevent multiple loading
  if (isLoadingTrack) return;
  
  // Same track toggle
  if (currentTrack?.id === track.id) {
    return isPlaying ? pauseTrack() : resumeTrack();
  }
  
  // Stop current, play new
  if (sound) await sound.unloadAsync();
  // Load and play new track
};
```

### Music Notifications
System-level notifications for background playback:

```javascript
// Show persistent notification
await MusicNotificationService.showMusicNotification({
  title: track.title,
  artist: track.artist,
  // Notification stays until music stops
});
```

## 🎬 Video System Deep Dive

### Optimized Loading
Video files are loaded with caching and optimization:

1. **Cache-First**: Load from cache immediately
2. **Background Refresh**: Update cache in background
3. **Thumbnail Generation**: Create video previews
4. **Memory Management**: Efficient memory usage for large libraries

### Mini Player
Picture-in-picture style video player:
- Draggable positioning
- Persistent across navigation
- Smooth animations
- Gesture controls

## 🎨 Theming System Deep Dive

### Dynamic Color System
17 accent colors with automatic light/dark variants:

```javascript
const accentColors = {
  purple: '#8B5CF6',
  blue: '#3B82F6',
  green: '#10B981',
  // ... 14 more colors
};
```

### Theme Application
All components use theme colors:
- `themeColors.primary`: Main accent color
- `themeColors.background`: Background color
- `themeColors.text`: Primary text color
- `themeColors.card`: Card/surface color

### Real-time Updates
Theme changes propagate immediately:
1. User selects new accent color
2. Theme store recalculates all colors
3. All subscribed components re-render
4. UI updates instantly

## 📦 Dependencies

### Core Dependencies
- **React Native**: 0.79.5
- **Expo**: 53.0.20
- **Expo Router**: File-based routing
- **Zustand**: State management
- **Expo AV**: Audio/video playback
- **Expo Media Library**: Device media access

### UI/UX Dependencies
- **Lucide React Native**: Icon library
- **Expo Linear Gradient**: Gradient backgrounds
- **React Native Reanimated**: Smooth animations
- **React Native Gesture Handler**: Touch gestures

### Utility Dependencies
- **TinyColor2**: Color manipulation
- **Audio Metadata**: Music metadata extraction
- **Expo Notifications**: System notifications

## 🚀 Build Configuration

### EAS Build Setup
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": { "NODE_ENV": "production" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "apk" },
      "ios": { "buildConfiguration": "Release" }
    }
  }
}
```

### Permissions
#### Android
- `READ_MEDIA_AUDIO`: Audio file access
- `READ_MEDIA_VIDEO`: Video file access
- `POST_NOTIFICATIONS`: Music notifications
- `WAKE_LOCK`: Background playback

#### iOS
- `NSAppleMusicUsageDescription`: Media library access
- `UIBackgroundModes`: Background audio playback

## 🔧 Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Build preview
npx eas build --platform android --profile preview
```

### Code Organization
- **Components**: Reusable UI elements
- **Screens**: Full-screen views
- **Stores**: State management
- **Services**: External integrations
- **Utils**: Helper functions

### Best Practices
- Use TypeScript for type safety
- Implement proper error handling
- Follow React Native performance guidelines
- Use memoization for expensive operations
- Implement proper loading states

## 🎯 Performance Optimizations

### Audio Loading
- Batch processing (50 files per batch)
- Progressive UI updates
- Background caching
- Memory-efficient metadata extraction

### Video Loading
- Lazy loading of video thumbnails
- Efficient caching system
- Memory management for large files

### UI Performance
- Component memoization
- Optimized FlatList rendering
- Smooth animations with native driver
- Efficient state subscriptions

## 🔐 Security Considerations

### Data Storage
- Secure storage for user credentials
- Encrypted local storage
- No sensitive data in plain text

### Permissions
- Minimal permission requests
- Clear permission explanations
- Graceful permission denial handling

## 🐛 Troubleshooting

### Common Issues
1. **Audio not loading**: Check media library permissions
2. **Theme not updating**: Verify theme store subscription
3. **Build failures**: Check for corrupted image assets
4. **Performance issues**: Monitor memory usage and optimize

### Debug Tools
- React Native Debugger
- Flipper integration
- Console logging with prefixes
- Performance monitoring

## 📈 Future Enhancements

### Planned Features
- Cloud synchronization
- Advanced equalizer
- Lyrics integration
- Social sharing
- Advanced search filters

### Technical Improvements
- TypeScript migration
- Unit test coverage
- Performance monitoring
- Automated testing

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review component documentation
- Examine store implementations
- Test with debug logging enabled

---

**Visura** - A modern, feature-rich media player built with React Native and Expo.