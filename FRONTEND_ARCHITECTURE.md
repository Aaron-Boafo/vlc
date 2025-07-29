# Frontend Architecture Documentation

## 🏗️ Current App Structure

### **Core Features Implemented**
- ✅ Audio/Video media player with optimized caching
- ✅ Playlist management system
- ✅ Theme system (dark mode + purple accent)
- ✅ Authentication UI (ready for backend integration)
- ✅ History tracking with proper timestamps
- ✅ Search and filtering functionality

### **Key Stores (Zustand)**
```
store/
├── theme.js                 # Theme management (dark/light + accent colors)
├── optimizedAudioStore.js   # Audio files caching & management
├── optimizedVideoStore.js   # Video files caching & management
├── playlistStore.js         # Playlist CRUD operations
├── useAudioControl.js       # Audio playback control
├── favouriteStore.js        # Favorites management
├── historyStore.js          # Playback history
└── playbackStore.js         # Playback settings (speed, etc.)
```

### **Authentication System**
- **Current State**: UI-only implementation
- **Components**: `app/components/AuthForm.jsx`, `app/components/PhoneInput.jsx`
- **Ready for Backend**: Async handlers already implemented
- **Integration Points**: `onLogin()` and `onSignup()` functions

### **Critical Performance Optimizations**
1. **Caching System**: Audio/video files cached for 30 minutes
2. **Progressive Loading**: Files load incrementally for better UX
3. **Memory Management**: Intelligent cleanup for large libraries
4. **Navigation Optimization**: Prevents unnecessary reloading

### **Theme System**
- **Colors**: Centralized in `store/theme.js`
- **Primary**: `#8B5CF6` (purple)
- **Background**: `#0F0F23` (dark)
- **Usage**: All components use `useThemeStore()` hook

### **File Structure**
```
app/
├── (tabs)/                  # Main tab navigation
│   ├── (audio)/            # Audio tab
│   ├── (video)/            # Video tab
│   ├── (playlist)/         # Playlist management
│   ├── (browse)/           # File browser
│   └── (more)/             # Settings & more
├── player/                  # Media player screens
├── components/             # Reusable UI components
└── (onboarding)/           # App intro screens
```

## ⚠️ **Integration Considerations**

### **Backend Integration Points**
1. **Authentication**: Replace mock handlers in `AuthForm.jsx`
2. **Cloud Storage**: May need new stores for cloud media
3. **User Preferences**: Sync theme/settings with backend
4. **Playlist Sync**: Cloud backup of playlists

### **Potential Conflicts**
- **Dependencies**: Check for package.json conflicts
- **Navigation**: Ensure new routes don't conflict
- **State Management**: Coordinate store usage
- **API Integration**: Plan for offline/online modes

### **Performance Considerations**
- **Maintain Caching**: Don't break existing optimization
- **Progressive Loading**: Ensure cloud content loads progressively
- **Memory Management**: Account for cloud data in memory limits