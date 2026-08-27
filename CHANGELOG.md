# Changelog

## [Unreleased]

### Added
- SQLite migration system with versioned migrations (schema, indexes, FTS5, media_type)
- Repository layer for songs, videos, and scan state (`songRepository`, `videoRepository`, `scanStateRepository`)
- Full-text search (FTS5) for songs and videos with automatic index sync
- Query hooks for songs, videos, search, artists, albums, genres, favorites, and history (`useSongs`, `useVideos`, `useSearch`)
- Filesystem-based artwork and thumbnail caching with background thumbnail generation (`artworkManager`)
- Incremental media sync that detects new, modified, and deleted files
- Performance indexes across songs and videos tables
- `@shopify/flash-list` virtualized list integration for large libraries

### Changed
- Replaced in-memory duplicate media arrays with SQLite as the single source of truth
- Refactored `globalAudioStore`, `simpleAudioStore`, and `optimizedVideoStore` to hold UI state only
- Refactored music and video scanners to use incremental sync and batch repository operations
- Audio library screen now streams data from SQLite via hooks with FlashList virtualization

### Removed
- Duplicate `audioFiles` and `videoFiles` arrays from Zustand stores

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
