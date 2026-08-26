# Changelog

## v1.0.0

### Added
- dotenv-java support for Spring Boot environment variable loading
- example.env files for backend and frontend
- Root .gitignore for env files, OS artifacts, and IDE files
- Frontend config to use EXPO_PUBLIC_API_URL environment variable
- Shield badges to README
- MIT license with contributors
- WebSocket support
- Cloudinary file storage integration
- JWT authentication
- User profile management
- File upload and storage system
- Music and video playback

### Changed
- Replaced hardcoded secrets in application.properties with environment variables
- Updated backend .gitignore to exclude .env files and secrets
- Updated frontend .gitignore to properly exclude all .env files
- Restructured project into separate backend and frontend directories
- Refactored README

### Security
- Removed hardcoded MongoDB URI, Cloudinary credentials, and JWT secret from version control
- Added .env file exclusions to .gitignore

### Fixed
- Accent color implementation errors
- Audio store loading performance and routing
- Large file handling
- Progressive file loading
