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
- Migrated remaining screens off the removed store arrays onto SQLite hooks:
  - Video tab grid (`VideoScreens/all.jsx`) now uses `useVideos` + `useVideoSearch` with paginated FlatList grid
  - Video player screen (`app/player/video.jsx`) sources its play queue from `useVideos`
  - Audio Albums and Artists sub-tabs use `useAlbums`/`useArtists` with `useSongsByAlbum`/`useSongsByArtist`
  - Playlist tab track picker uses `useSongs` + `useVideos` (large page size) backed by the library
- Moved the bogus `(playlist)/Context.jsx` route file to `contexts/PlaylistContext.js` so it is no longer treated as a screen

### Removed
- Duplicate `audioFiles` and `videoFiles` arrays from Zustand stores
- `react-native-worklets` dependency (duplicate native class with react-native-reanimated 3.17.x) and its Babel plugin

### Fixed
- Android build failure caused by duplicate `com.swmansion.worklets` native classes; debug APK now builds successfully (13m20s clean assembleDebug)
- Blank screen after onboarding: temporal-dead-zone `ReferenceError` in `SimpleBottomPlayer` (debug logs referenced `currentTrack` before its destructure) prevented the entire tab layout, including the tab bar, from rendering
- `TypeError: Cannot read property 'length' of undefined` at first launch from screens still consuming the removed store arrays (`VideoScreens/all.jsx`, playlist tab, audio Albums/Artists sub-tabs)
- Bundle errors: incorrect repository import paths, missing `getAllUrisWithMeta()` queries, and a syntax error in `database.js` `clearVideoDatabase`
- `useSongSearch` imported from the wrong module; standalone `useSearch` hook used instead
- Extraneous `unified`/`player` Stack screens declared in `(audio)/_layout.jsx` generated router warnings
- `Database not initialized. Call initDB() first.` when data hooks queried before the database was ready; `initDB()` is now idempotent under concurrent callers, data/splash rendering waits on startup DB initialization, and every library/search/detail hook awaits `initDB()` before its first query
- Background thumbnail and metadata extraction starting nested transactions; chunk items are now processed sequentially so parallel writers can no longer overlap `BEGIN`/`COMMIT` on the single SQLite connection
- Music library scan failing with `NativeDatabase.prepareAsync` rejected (`23 values for 22 columns`): `songRepository.insertBatch` supplied one extra placeholder, so no songs could be inserted
- Scanners and library empty states now log and report the actual reason (permission denied vs. zero media found at scan time) instead of showing a bare empty list
- All Songs list showing empty rows (no title/artist/artwork): hooks returned raw SQLite rows whose `title`/`artist` are null until metadata extraction and whose artwork lives in `artwork_path`/`thumbnail_path` columns, while the UI read `item.artwork`/`item.thumbnail`. Song rows are now normalized (`utils/songMapper`) in every library/search hook so each row carries `title`, `artist`, `album`, `artwork`, and `thumbnail` populated from stored metadata or safe fallbacks
- Songs without metadata were re-extracted on every launch because the music scanner never set `metadata_loaded = 1`; both success and fallback paths now mark the row as metadata-loaded

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
