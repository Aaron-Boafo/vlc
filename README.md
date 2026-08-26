# VLC - Visura

A cross-platform mobile media application for playing audio and video files with integrated cloud storage, playlist management, and user profiles.

## Features

- **Audio Playback** — Play, pause, skip, and manage your music library with background playback
- **Video Playback** — Stream and play video files with subtitles support
- **Cloud Storage** — Upload and manage files via Cloudinary with real-time upload progress
- **Playlists** — Create, edit, and manage playlists for both audio and video
- **Favourites & History** — Track your favourite media and playback history
- **User Profiles** — Register, login, and manage your profile
- **Search** — Search through your media library
- **Dark/Light Mode** — Theme support with accent color customization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo 53), expo-router, NativeWind / Tailwind CSS, Zustand |
| **Backend** | Java 21, Spring Boot 3.5.3, Spring Security, Spring Data MongoDB |
| **Database** | MongoDB |
| **Auth** | JWT (jjwt 0.12.6) |
| **File Storage** | Cloudinary |
| **Realtime** | WebSocket (upload progress) |

## Project Structure

```
vlc/
├── backend/                        # Spring Boot REST API
│   ├── src/main/java/com/group79/vlc/
│   │   ├── config/                 # Security, JWT, WebSocket config
│   │   ├── controller/             # REST controllers
│   │   ├── dto/                    # Data transfer objects
│   │   ├── model/                  # MongoDB entities
│   │   ├── repo/                   # Repository interfaces
│   │   ├── response/               # API response models
│   │   ├── service/                # Business logic
│   │   └── util/                   # Utilities
│   ├── pom.xml
│   └── Dockerfile
│
└── frontend/                       # Expo (React Native) app
    ├── app/                        # Expo Router screens
    │   ├── (onboarding)/           # Onboarding flow
    │   ├── (tabs)/                 # Main tab navigation
    │   │   ├── (audio)/            # Audio tab screens
    │   │   ├── (video)/            # Video tab screens
    │   │   ├── (browse)/           # File browser tab
    │   │   ├── (playlist)/         # Playlist tab
    │   │   └── (more)/             # Settings & about tab
    │   ├── components/             # Auth, phone input, profile modal
    │   └── player/                 # Audio & video player screens
    ├── AudioScreens/               # Audio library screens
    ├── AudioComponents/            # Audio-specific components
    ├── VideoScreens/               # Video library screens
    ├── VideoComponents/            # Video-specific components
    ├── components/                 # Shared UI components
    ├── config/                     # API configuration
    ├── contexts/                   # React contexts
    ├── hooks/                      # Custom hooks
    ├── services/                   # API & platform services
    ├── store/                      # Zustand state stores
    ├── utils/                      # Utility functions
    └── assets/                     # Fonts, images
```

## Getting Started

### Prerequisites

- **Backend:** Java 21, Maven 3.9+
- **Frontend:** Node.js 18+, Expo CLI (`npm install -g expo-cli`)

### Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`.

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your device, or press `a` for Android emulator / `i` for iOS simulator.

### Environment Configuration

Backend configuration is in `backend/src/main/resources/application.properties`.

Frontend API base URL is configured in `frontend/config/api.js`.

## API Documentation

All endpoints require an `Authorization: Bearer <JWT_TOKEN>` header unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user (`phoneNumber`, `password`) |
| `POST` | `/reset-password` | Reset user password |
| `POST` | `/login` | Login and receive a JWT token |
| `GET` | `/logout` | Logout (invalidate token) |
| `GET` | `/profile` | Get current user profile |
| `POST` | `/profile/update` | Update profile (multipart: metadata + file) |
| `GET` | `/storage` | List all storage items |
| `GET` | `/storage/{id}` | Get a storage item by ID |
| `POST` | `/storage/add` | Upload a file (multipart, WebSocket progress) |
| `DELETE` | `/storage/{id}` | Delete a storage item |

## Deployment

- **Backend** is deployed on [Render](https://vlc-spring-boot.onrender.com)
- **Frontend** runs via Expo Go during development

## Contributors

| Contributor | GitHub |
|-------------|--------|
| Aaron Boafo | [@Aaron-Boafo](https://github.com/Aaron-Boafo) |
| smforson1 | [@smforson1](https://github.com/smforson1) |
| Armahkyek22 | [@Armahkyek22](https://github.com/Armahkyek22) |
| Skytechninja2 | [@Skytechninja2](https://github.com/Skytechninja2) |

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
