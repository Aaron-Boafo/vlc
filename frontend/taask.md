# Fix Media Database ID / Key Collisions

The current VLC-like media library has a serious issue where **SQLite database record keys/IDs can collide with the IDs/keys of songs and videos**.

Refactor the media database identity system so that **database identity is completely independent from media identity**.

## Core Requirement

Do NOT use the media file's existing ID, track ID, video ID, filename, array index, or metadata ID directly as the SQLite primary key.

The database must generate and own its own unique record identifier.

For example:

```text
Database Record
id: 8f4c2c91-...

Media File
mediaId: song-123
```

These must be two completely separate identifiers.

---

## 1. Separate the IDs

Audit the entire codebase and identify every place where these concepts are currently mixed:

- SQLite primary key
- media ID
- song ID
- video ID
- file URI
- filename
- track ID
- playlist item ID
- artwork ID
- queue item ID
- React `key`
- Zustand/store identifier

Do not assume they are interchangeable.

Create a clear identity model.

For example:

```text
Media Database Record
---------------------
dbId        -> unique SQLite identifier
mediaKey    -> stable identifier for the physical media file
uri         -> original media URI
mediaType   -> audio | video
```

The `dbId` must belong exclusively to the database.

---

# 2. SQLite Primary Key

Use a proper database-generated primary key.

Prefer an integer SQLite primary key if there is no reason to use UUIDs:

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
```

The important requirement is that SQLite owns this ID.

Do NOT manually assign it from:

```text
song.id
video.id
filename
index
timestamp alone
```

If the existing architecture requires UUIDs, use a proper UUID generated specifically for the database record.

---

# 3. Create a Separate Media Identity

The application still needs to know when two scans refer to the same physical media file.

Create a separate stable media identity such as:

```text
mediaKey
```

For example:

```text
dbId:     127
mediaKey: 5d7d3a...
uri:      file:///storage/music/song.mp3
```

The database ID and media key must never be treated as the same value.

The `mediaKey` should be deterministic/stable enough to allow rescanning to find an existing media record rather than creating duplicates.

A suitable identity can be derived from stable file information such as:

```text
normalized URI/path
+
file size
+
modification timestamp
```

or another robust strategy appropriate for the existing media scanner.

Do NOT use only the filename because different directories can contain files with the same name.

---

# 4. Add a UNIQUE Constraint

The database should enforce uniqueness for the media identity.

For example:

```sql
CREATE UNIQUE INDEX idx_media_media_key
ON media(media_key);
```

or make `media_key` explicitly unique in the schema.

This protects against accidental duplicate records even if the scanner runs multiple times.

---

# 5. Do Not Use Array Indexes

Search the codebase for patterns such as:

```ts
key = { index };
```

or:

```ts
id: index;
```

or:

```ts
media.id = index;
```

or any equivalent logic.

Do not use array indexes as persistent media identifiers.

For React list keys, use the database ID or another genuinely stable unique identifier.

For example:

```tsx
keyExtractor={(item) => String(item.dbId)}
```

Do not use:

```tsx
keyExtractor={(item, index) => String(index)}
```

---

# 6. Separate Song and Video Records

Songs and videos must not have separate ID namespaces that can accidentally collide.

Do NOT create logic like:

```text
song ID = 1
video ID = 1
```

and then treat both as simply:

```text
id = 1
```

If songs and videos are stored in one `media` table, they should share the same database ID namespace.

For example:

```text
media
--------------------------------
dbId | mediaKey | mediaType
--------------------------------
1    | abc123   | audio
2    | xyz987   | video
3    | def456   | audio
4    | mno321   | video
```

There should never be two records with:

```text
dbId = 1
```

---

# 7. Foreign Keys Must Reference dbId

Audit all related tables.

If the application has tables such as:

```text
playlists
playlist_items
favorites
playback_history
artwork
queue
```

and they reference media, make sure they reference the database record's ID.

For example:

```text
playlist_items.media_id
        |
        v
media.id
```

NOT:

```text
playlist_items.media_id
        |
        v
media.songId
```

and NOT:

```text
playlist_items.media_id
        |
        v
media.filename
```

Use the database primary key for relational references.

---

# 8. Artwork IDs Must Also Be Independent

Check artwork caching.

Do not assume:

```text
artwork ID = song ID
```

or:

```text
artwork ID = video ID
```

The artwork cache can use the media's stable `mediaKey` or another dedicated artwork identifier.

For example:

```text
mediaKey:
abc123...

Artwork:
artwork/abc123.jpg
```

The important part is that artwork identity does not interfere with SQLite's database primary key.

---

# 9. Playback Queue

Audit the playback queue.

A queue item should identify the database media record explicitly.

For example:

```ts
{
    mediaDbId: 127,
    uri: "...",
    mediaType: "audio"
}
```

Do not rely on:

```ts
{
  id: 127;
}
```

if `id` could mean different things in different parts of the application.

Use explicit naming:

```text
dbId
mediaKey
uri
mediaType
```

This makes accidental ID mixing much harder.

---

# 10. API / Service Naming

Rename ambiguous variables where necessary.

Avoid code such as:

```ts
media.id;
```

when it is unclear what `id` means.

Prefer explicit properties:

```ts
media.dbId;
media.mediaKey;
media.uri;
```

For example:

```ts
const mediaDbId = media.dbId;
const mediaKey = media.mediaKey;
```

This should make the distinction obvious throughout the codebase.

---

# 11. Migration Existing Database

Do NOT simply delete the database if users may already have media records.

Inspect the current schema and determine whether a migration is required.

If the existing database uses:

```text
song IDs
video IDs
filename IDs
```

as primary keys, migrate them to the new identity model.

The migration should:

1. Create the new database schema.
2. Generate proper database-owned IDs.
3. Generate/populate stable `mediaKey` values.
4. Preserve metadata.
5. Preserve artwork references where possible.
6. Preserve favorites.
7. Preserve playlists.
8. Preserve playback history.
9. Preserve playback positions.
10. Preserve other existing media relationships.
11. Rebuild foreign-key relationships using the new `dbId`.

Do not lose user data unnecessarily.

If migration cannot safely preserve old records, clearly document why.

---

# 12. Scanner Upsert Logic

The media scanner must identify media using `mediaKey`, NOT `dbId`.

Correct logic:

```text
Scan file
    |
    v
Calculate mediaKey
    |
    v
Search SQLite by mediaKey
    |
    +---- Existing ----> UPDATE existing dbId
    |
    +---- Missing -----> INSERT new record
```

Never do:

```text
scan file
    |
    v
use file/song/video ID as database ID
```

The database decides the `dbId`.

---

# 13. Prevent Duplicate Records

The following situation must never occur:

```text
Song A
dbId = 10
mediaKey = abc

Song A after rescan
dbId = 11
mediaKey = abc
```

A rescan of the same physical file should update:

```text
dbId = 10
```

rather than create another record.

The unique constraint on `mediaKey` should provide an additional safety layer.

---

# 14. Handle URI Changes Carefully

If the physical URI changes but the file is still logically the same media item, determine whether the application should preserve its database identity.

Do not automatically create a duplicate simply because the URI changed.

However, do not make the identity system so aggressive that two genuinely different files are treated as the same file.

Choose a robust strategy based on the existing scanner and platform behavior.

---

# 15. Database Queries

Audit all SQL queries.

Replace ambiguous queries such as:

```sql
WHERE id = ?
```

when the caller might actually be passing:

```text
song ID
video ID
mediaKey
```

Use explicit queries:

```sql
WHERE id = ?
```

for `dbId`.

And:

```sql
WHERE media_key = ?
```

for `mediaKey`.

Never mix these parameters.

---

# 16. TypeScript Types

Create strong types that make ID confusion difficult.

For example:

```ts
type MediaRecord = {
  dbId: number;
  mediaKey: string;
  uri: string;
  mediaType: "audio" | "video";
  title?: string;
  artist?: string;
  album?: string;
  artworkUri?: string;
};
```

Do not expose an ambiguous generic `id` if it causes confusion throughout the application.

Update interfaces, database models, repository methods, services, stores, and UI components accordingly.

---

# 17. Audit All ID Usage

Perform a full codebase search for:

```text
.id
id:
media.id
song.id
video.id
track.id
keyExtractor
key=
mediaId
songId
videoId
trackId
```

For every occurrence, determine exactly what identifier it represents.

Do not blindly rename everything.

Some IDs may legitimately belong to external APIs or metadata sources.

The goal is to make the distinction explicit:

```text
Database identity  -> dbId
Media identity     -> mediaKey
Original URI       -> uri
External song ID   -> externalSongId
External video ID  -> externalVideoId
Artwork identity   -> artworkKey
```

---

# 18. Tests

Add tests specifically for ID collision scenarios.

Test cases must include:

### Test 1 - Song and video have same external ID

```text
song.id = 1
video.id = 1
```

Both must successfully exist in the database without collision.

### Test 2 - Same filename

```text
/music/song.mp3
/downloads/song.mp3
```

They must be treated as separate files.

### Test 3 - Rescan

Scanning the same file twice must produce only one database record.

### Test 4 - New media

A new file must receive a new database-generated `dbId`.

### Test 5 - Deleted media

Deleting a media file must not accidentally delete another media record because of an ID collision.

### Test 6 - Playlist references

Playlist entries must continue pointing to the correct media after database migration.

### Test 7 - Artwork

Two media files with conflicting external IDs must still receive the correct artwork.

### Test 8 - Playback

Playback must resolve the correct URI using the database record and must not confuse song/video IDs.

---

# 19. Final Architecture

The final architecture should conceptually look like:

```text
                    ┌──────────────────┐
                    │   Media Scanner  │
                    └────────┬─────────┘
                             │
                             │ mediaKey
                             v
                    ┌──────────────────┐
                    │  SQLite Media DB │
                    │                  │
                    │ dbId             │
                    │ mediaKey         │
                    │ uri              │
                    │ metadata         │
                    │ artworkUri       │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                v            v            v
           Playlists      Favorites    History
                │            │            │
                └────────────┼────────────┘
                             v
                         Playback
```

The critical identity rule is:

```text
dbId != mediaKey != externalSongId != externalVideoId
```

They may sometimes contain related information, but they must never be treated as interchangeable.

---

# 20. Final Verification

Before finishing:

1. Inspect the complete database schema.
2. Inspect every foreign key.
3. Inspect scanner/upsert logic.
4. Inspect song/video models.
5. Inspect playlist logic.
6. Inspect playback queue.
7. Inspect artwork cache.
8. Inspect Zustand/Redux/React state if used.
9. Inspect all list keys.
10. Search the entire project for ambiguous `.id` usage.
11. Run TypeScript checks.
12. Run linting.
13. Run tests.
14. Test with songs and videos having identical external IDs.
15. Test rescanning.
16. Test deleting and re-adding files.
17. Test playlists and favorites.
18. Test playback.
19. Test artwork.
20. Confirm that the database cannot create primary-key collisions.

Do not simply patch the immediate collision. Refactor the identity model so that **ID collisions are structurally impossible** between database records, songs, videos, artwork, and external media identifiers.
