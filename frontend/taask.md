# Media Library Performance Refactor - Expo SDK 53

You are working on an existing **VLC-like media player application built with Expo SDK 53 / React Native**.

The application currently scans videos and audio files from the user's device and extracts metadata and artwork. The current implementation has performance problems, especially:

- Slow loading of large media libraries
- Repeatedly scanning the user's storage
- Repeatedly extracting media metadata
- Repeatedly loading/decoding artwork
- Slow startup
- UI freezing or lagging while media is being discovered
- Excessive filesystem operations
- Excessive React re-renders
- Artwork being loaded directly from the original media files repeatedly
- Media lists becoming slow as the library grows

Your task is to **refactor the media-library architecture for maximum performance while preserving all existing functionality and the current UI unless a UI change is necessary.**

Do not blindly rewrite the entire application. First inspect the existing codebase and understand the current media discovery, metadata extraction, artwork handling, playback, state management, and navigation architecture.

---

## 1. Main Architecture Change

Replace the current "scan storage -> extract everything -> keep results in memory/state" approach with a persistent local media-library database.

Use the **native SQLite database available through Expo SDK 53-compatible APIs**.

The SQLite database should become the application's primary source of truth for the media library.

The database should persist across application launches.

Do NOT store the actual video/audio binary data inside SQLite.

SQLite should only store metadata and references to files/artwork.

The architecture should conceptually become:

```text
Device Storage
     |
     v
Media Scanner
     |
     v
Metadata Extraction
     |
     v
SQLite Media Database
     |
     +----> Artwork Cache Directory
     |
     v
React Native UI
     |
     v
Playback Engine
```

The UI should primarily read from SQLite instead of repeatedly scanning the device.

---

# 2. SQLite Database Design

Design a proper schema for the media library.

At minimum, support media records containing information such as:

- id
- uri/path
- filename
- displayName
- mediaType
- mimeType
- duration
- fileSize
- width
- height
- bitrate if available
- sampleRate if available
- channels if available
- artist
- album
- albumArtist
- title
- genre
- year
- trackNumber
- discNumber
- artworkUri
- dateAdded
- dateModified
- lastScannedAt
- metadataVersion/hash if useful
- favorite status if the existing application supports favorites
- playback position if already supported
- play count if already supported

Use appropriate indexes.

At minimum, consider indexes for:

- media type
- artist
- album
- title
- filename
- date added
- date modified
- favorite status

Do not create unnecessary indexes that negatively affect write performance.

Use migrations so future schema changes can be performed safely.

---

# 3. Store Artwork on the Device

One of the biggest performance improvements should be artwork caching.

Do NOT repeatedly extract album/video artwork from the original media file.

When artwork is discovered:

1. Extract the artwork once.
2. Save it into an application-controlled cache/storage directory.
3. Store only the local artwork URI/path in SQLite.
4. Reuse the cached artwork on subsequent launches.

For example:

```text
App Storage
|
+-- media-cache/
|   |
|   +-- artwork/
|   |   +-- <media-id>.jpg
|   |   +-- <media-id>.jpg
|   |   +-- ...
|   |
|   +-- thumbnails/
|       +-- ...
```

Use deterministic filenames based on a stable media identifier.

Do not generate duplicate artwork files unnecessarily.

Before extracting artwork:

```text
Does cached artwork already exist?
        |
       YES ---> use cached artwork
        |
       NO
        |
        v
Extract artwork
        |
        v
Save artwork
        |
        v
Save artwork URI to SQLite
```

Artwork should not be regenerated every time the application starts.

---

# 4. Do Not Store Media Files in SQLite

This is extremely important.

Never store:

- MP4
- MKV
- AVI
- MP3
- FLAC
- WAV
- M4A
- or other large media binaries

inside SQLite.

Store only:

```text
uri/path
metadata
artwork URI
database identifiers
```

The original media remains on the user's device.

---

# 5. Incremental Media Scanning

The application should NOT perform a complete expensive media scan every time it starts.

Implement an incremental scanner.

The scanner should identify:

### New files

Files that exist on the device but are not in SQLite.

These should be indexed.

### Changed files

Files already in SQLite whose relevant properties have changed.

For example:

- modification time changed
- file size changed
- metadata fingerprint changed if available

Only these files should have their metadata refreshed.

### Deleted files

Files that exist in SQLite but no longer exist on the device.

Remove or mark these records appropriately.

---

# 6. Avoid Full Metadata Extraction

Do not extract expensive metadata for every file unnecessarily.

The desired logic is:

```text
File discovered
      |
      v
Does it already exist in SQLite?
      |
   +--+--+
   |     |
  YES    NO
   |     |
   v     v
Check    Extract metadata
whether
changed
   |
   v
Only re-extract if necessary
```

If a media file has not changed, reuse the metadata already stored in SQLite.

---

# 7. Separate Scanning From UI

The UI must never wait for the entire media scan to finish before displaying the library.

The application should:

1. Open SQLite.
2. Immediately load existing media records.
3. Render the existing library.
4. Start the scanner asynchronously.
5. Insert/update media records as scanning progresses.
6. Notify the UI about changes efficiently.

The user should be able to interact with the application while scanning is happening.

Example:

```text
App launches
     |
     v
Open SQLite
     |
     v
Load cached library immediately
     |
     v
Render UI
     |
     v
Background/incremental scan
     |
     +--> New media
     +--> Changed media
     +--> Deleted media
```

Do not block application startup on a complete device scan.

---

# 8. Batch Database Operations

Do not execute one expensive database transaction for every single file if thousands of files are being indexed.

Use transactions/batched inserts and updates where appropriate.

For example:

```text
Begin transaction

Insert media 1
Insert media 2
Insert media 3
...
Insert media 100

Commit transaction
```

Tune the batch size based on performance.

Avoid keeping a huge transaction open for an excessive amount of time.

---

# 9. Optimize React State Management

Do not keep the entire media library duplicated in multiple React states/stores.

SQLite should be the persistent source of truth.

Avoid architectures such as:

```text
SQLite
   |
   v
Huge Zustand store
   |
   v
Huge React state
```

if they are unnecessary.

Only keep transient UI state in React/Zustand.

Examples:

- current selected item
- search query
- sort mode
- filter
- current playback state
- UI preferences

The media library itself should be queried efficiently.

---

# 10. Pagination / Virtualization

The application must remain responsive even with:

- 1,000 media files
- 5,000 media files
- 10,000+ media files

Do not load thousands of records into the UI at once.

Implement appropriate pagination or incremental loading.

For example:

```text
First query:
LIMIT 50

Next:
LIMIT 50 OFFSET ...
```

or use a more efficient cursor/keyset strategy where appropriate.

Ensure the existing FlatList/FlashList/etc. configuration is optimized.

Check:

- keyExtractor
- renderItem
- memoization
- image rendering
- item layout
- unnecessary state updates
- unnecessary parent re-renders

Do not use ScrollView for very large media libraries.

---

# 11. Artwork/Image Performance

Artwork is one of the most important performance areas.

Do not repeatedly decode huge original artwork images.

If artwork is large, generate appropriately sized thumbnails for library views.

For example:

```text
Original artwork
      |
      +--> cached artwork
      |
      +--> thumbnail for list/grid
```

Use appropriate image caching and resizing.

A media list displaying 100 album covers should NOT load 100 full-resolution images unnecessarily.

If the current image library already provides caching, use it correctly rather than implementing duplicate caching.

Avoid converting image formats repeatedly.

---

# 12. Stable Media IDs

Create a stable identifier for each media item.

Do not depend solely on array indexes.

The identifier should remain stable across application launches.

Where practical, derive the identity from information such as:

```text
normalized URI/path
+
file size
+
modification timestamp
```

or another appropriate deterministic strategy.

However, do not make IDs so dependent on mutable metadata that normal metadata changes create duplicate records.

Ensure that rescanning the same file does not create duplicate database records.

---

# 13. File URI Handling

Be careful with Android/iOS URI formats.

Do not assume every media URI is a normal filesystem path.

Preserve the original URI in a format that the playback engine can actually consume.

The database should store the appropriate URI/reference required by the application.

Do not blindly convert:

```text
content://
```

URIs into filesystem paths if the platform does not permit that.

Account for Android scoped storage and the platform's media/file access model.

---

# 14. Permissions

Review the current permission implementation.

Ensure the application requests only the permissions actually required for accessing the user's media.

Do not repeatedly request permissions.

Handle:

- permission granted
- permission denied
- permission revoked
- restricted access
- empty library

gracefully.

If permission is unavailable, the UI should explain the state instead of repeatedly trying to scan.

---

# 15. Android/iOS Compatibility

This is an Expo SDK 53 application.

Before installing or replacing packages, verify that they are compatible with the project's current Expo SDK version.

Do NOT introduce packages that require an incompatible native setup without first checking the project's architecture.

Prefer Expo-supported/native modules where practical.

If a package requires:

```text
expo prebuild
```

or a development build instead of Expo Go, document that clearly before changing the project architecture.

Do not unnecessarily eject the project.

---

# 16. Metadata Extraction Architecture

Create a clean metadata extraction layer.

For example:

```text
src/
├── database/
│   ├── database.ts
│   ├── schema.ts
│   ├── migrations/
│   └── repositories/
│
├── media/
│   ├── scanner/
│   ├── metadata/
│   ├── artwork/
│   ├── thumbnails/
│   └── cache/
│
├── services/
│   └── mediaLibraryService.ts
│
└── ...
```

Adapt this structure to the existing project rather than blindly creating duplicate architecture.

The responsibilities should be separated:

### Media Scanner

Responsible for discovering media files.

### Metadata Extractor

Responsible for extracting metadata from a specific media file.

### Artwork Manager

Responsible for:

- extracting artwork
- saving artwork
- checking whether artwork exists
- generating thumbnails if needed
- returning cached artwork

### Database Repository

Responsible for:

- insert
- update
- delete
- search
- filtering
- sorting
- pagination

### Media Library Service

Coordinates:

```text
scanner
   +
metadata extractor
   +
artwork manager
   +
database
```

---

# 17. Search Optimization

Search should query SQLite rather than filtering a huge JavaScript array whenever possible.

Support efficient searches such as:

```text
title
artist
album
filename
genre
```

For example:

```text
Search "Michael"
        |
        v
SQLite query
        |
        v
Only matching records returned
```

Do not retrieve the entire media library and perform expensive JavaScript filtering for every keystroke.

Debounce search input appropriately.

---

# 18. Sorting and Filtering

Move large-library sorting/filtering into SQLite where practical.

Support existing application functionality such as:

- Recently added
- Recently played
- Alphabetical
- Artist
- Album
- Duration
- Favorites
- Videos
- Music

Do not sort thousands of objects repeatedly in JavaScript if SQLite can perform the operation efficiently.

---

# 19. Playback Must Remain Independent

Do not tightly couple the database to the playback engine.

The playback system should receive something like:

```text
media.uri
```

and use it to play the original media.

The database is for:

```text
library/index/metadata/state
```

not for actual playback data.

Playback should continue to work even if artwork caching fails.

Likewise, a metadata failure should not prevent a playable media file from appearing in the library.

Use graceful fallback values.

---

# 20. Failure Handling

A single corrupt media file must NOT stop the entire scanner.

For example:

```text
File 1 -> success
File 2 -> success
File 3 -> metadata error
File 4 -> success
File 5 -> success
```

File 3 should be logged/marked appropriately while scanning continues.

Implement appropriate error handling around:

- metadata extraction
- artwork extraction
- filesystem operations
- SQLite operations
- permission failures
- invalid URIs
- inaccessible files
- deleted files
- corrupted media

Do not silently swallow all errors.

Use structured logging in development.

Avoid excessive logging in production.

---

# 21. Cache Validation

Do not assume a cached artwork file is valid simply because the database contains its URI.

When necessary, verify that the cached file exists.

If the artwork cache is missing:

```text
SQLite artwork URI exists
        |
        v
Does file actually exist?
        |
     +--+--+
     |     |
    YES    NO
     |     |
    use   regenerate
```

Avoid regenerating artwork unnecessarily.

---

# 22. Startup Performance Target

Optimize startup so the application does NOT need to:

```text
scan entire storage
extract all metadata
extract all artwork
generate all thumbnails
populate massive JS arrays
```

before the UI becomes usable.

The ideal startup flow is:

```text
Launch
  |
  v
Initialize DB
  |
  v
Query cached media
  |
  v
Render UI quickly
  |
  v
Run incremental synchronization
```

The user should see the existing library as quickly as possible.

---

# 23. Avoid Memory Leaks

Audit the existing implementation for:

- event listeners
- subscriptions
- timers
- filesystem watchers
- media listeners
- database listeners
- promises/tasks
- image references

Ensure cleanup occurs when components/services are unmounted or destroyed.

Do not keep references to thousands of media objects unnecessarily.

---

# 24. Do Not Break Existing Features

Before modifying the implementation, identify all existing media-library features.

Preserve:

- playback
- playlists
- favorites
- recently played
- search
- sorting
- filtering
- album views
- artist views
- video views
- audio views
- metadata display
- artwork display
- playback history
- resume position
- queue functionality
- any existing user preferences

Only change the underlying storage/indexing architecture unless a change is required for performance.

---

# 25. Migration From Existing Implementation

If the application currently keeps media information in:

- React state
- Zustand
- AsyncStorage
- JSON
- filesystem cache
- another local database

create a migration path where appropriate.

Do not simply delete the old system without understanding whether existing user data would be lost.

If old cached data can safely be discarded and regenerated, document that decision.

---

# 26. Performance Testing

After implementation, test with increasingly large libraries:

```text
100 files
500 files
1,000 files
5,000 files
10,000+ files
```

Measure:

- application startup time
- time until library becomes visible
- initial database query time
- scan time
- metadata extraction time
- artwork extraction time
- memory usage
- UI FPS/responsiveness
- search performance
- scrolling performance
- database write performance

Compare the new implementation against the old one.

---

# 27. Important Implementation Rules

Do NOT:

- store media binaries in SQLite
- rescan everything on every launch
- extract artwork repeatedly
- load all media into React state
- load full-resolution artwork into every list item
- block the UI while scanning
- create thousands of individual React updates
- create duplicate database records
- blindly add incompatible Expo packages
- blindly run prebuild/eject
- rewrite unrelated parts of the application
- remove existing functionality just to simplify the implementation

Prefer:

- SQLite
- persistent metadata
- incremental scanning
- filesystem artwork cache
- thumbnail caching
- batched DB writes
- transactions
- indexed queries
- pagination
- virtualization
- memoized components
- asynchronous/background processing
- stable IDs
- graceful failure handling

---

# 28. Agent Workflow

Follow this workflow strictly.

### Phase 1 - Inspect

First inspect the entire project and identify:

- Expo SDK version
- React Native version
- existing media scanner
- metadata extraction library
- artwork extraction implementation
- filesystem implementation
- state management
- database/storage implementation
- playback implementation
- media list components
- navigation
- permissions
- existing caching

Do not modify anything yet.

### Phase 2 - Architecture Plan

Explain:

1. What is currently causing the performance problems.
2. What will be changed.
3. What files will be created.
4. What files will be modified.
5. What packages are required.
6. Whether any native build/development build requirement exists.
7. How migration will work.
8. How the new scanner will work.
9. How artwork caching will work.
10. How the UI will consume SQLite data.

Then implement the plan.

### Phase 3 - Implementation

Implement the database layer first.

Then:

```text
SQLite
  ↓
Repository
  ↓
Media Library Service
  ↓
Incremental Scanner
  ↓
Metadata Extraction
  ↓
Artwork Cache
  ↓
UI
```

Keep each layer independently testable.

### Phase 4 - Integration

Replace the old media-library loading logic with the new database-backed system.

Do not remove old functionality until the replacement is confirmed to work.

### Phase 5 - Performance Audit

After implementation, inspect the code again specifically for:

- unnecessary renders
- unnecessary filesystem reads
- unnecessary metadata extraction
- duplicate database queries
- duplicate artwork extraction
- large JS arrays
- memory leaks
- blocking operations
- sequential operations that could safely be batched
- inefficient SQL queries

Fix the identified issues.

### Phase 6 - Verification

Run:

```text
lint
typecheck
tests
Expo diagnostics
```

and the appropriate platform build/run commands.

Verify that the application works on the actual target device, not only the simulator/emulator.

---

# 29. Final Deliverable

At the end, provide a concise implementation report containing:

### Changed

List the files and major changes.

### Database

Show the final SQLite schema and indexes.

### Media Scanner

Explain how incremental scanning works.

### Artwork Cache

Explain where artwork is stored and how cache validation works.

### Performance

Explain what operations were removed from startup and what is now cached.

### Compatibility

Confirm Expo SDK 53 compatibility and identify any development-build/native requirements.

### Migration

Explain what happens to existing users' cached media data.

### Testing

Report the tests performed and any remaining limitations.

Most importantly, prioritize **real-world performance on physical Android/iOS devices with thousands of media files** rather than optimizing only for small test libraries.

Do not make speculative changes. Inspect the existing codebase first, preserve working functionality, and make the smallest architectural changes necessary to create a fast, persistent, scalable local media library.
