/**
 * SQLite database service for the music and video catalog.
 *
 * Uses expo-sqlite to store song metadata and scan state locally,
 * replacing the old JSON-file-based caching approach.
 */
import * as SQLite from "expo-sqlite";
import { runMigrations } from "./database/migrations";

const DB_NAME = "visura_music.db";

let _db = null;
let _initPromise = null;

/**
 * Open (or create) the database and run migrations.
 * Concurrency-safe: concurrent callers share a single init/migration run.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export async function initDB() {
  if (_db) return _db;

  if (!_initPromise) {
    _initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // Run migrations to ensure schema is up to date
      await runMigrations();
      _db = db;
      return db;
    })().finally(() => {
      _initPromise = null;
    });
  }

  return _initPromise;
}

/**
 * Get the database instance (must call initDB first).
 * @returns {SQLite.SQLiteDatabase}
 */
export function getDB() {
  if (!_db) throw new Error("Database not initialized. Call initDB() first.");
  return _db;
}

// ─── Song CRUD ───────────────────────────────────────────────────

/**
 * Bulk-insert basic file references (Phase 1 — fast).
 * Uses INSERT OR IGNORE so duplicates are silently skipped.
 * @param {{ id: string, uri: string, filename: string, duration: number, creation_time?: number, modification_time?: number, file_size?: number }[]} songs
 */
export async function insertSongs(songs) {
  if (!songs || songs.length === 0) return;
  const db = getDB();

  // Process in batches of 50 to avoid SQLite limits
  const BATCH = 50;
  for (let i = 0; i < songs.length; i += BATCH) {
    const batch = songs.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap((s) => [
      s.id,
      s.uri,
      s.filename || null,
      s.duration || 0,
      s.creation_time || null,
      s.modification_time || null,
      s.file_size || null,
    ]);

    await db.runAsync(
      `INSERT OR IGNORE INTO songs (id, uri, filename, duration, creation_time, modification_time, file_size)
       VALUES ${placeholders}`,
      values
    );
  }
}

/**
 * Get all songs from the database, ordered by title.
 * @returns {Promise<Array>}
 */
export async function getAllSongs() {
  const db = getDB();
  return db.getAllAsync(
    `SELECT * FROM songs ORDER BY COALESCE(title, filename) COLLATE NOCASE ASC`
  );
}

/**
 * Get songs that have not had metadata extracted yet.
 * @param {number} [limit] — optional limit
 * @returns {Promise<Array>}
 */
export async function getSongsWithoutMetadata(limit) {
  const db = getDB();
  let query = `SELECT * FROM songs WHERE metadata_loaded = 0`;
  if (limit) query += ` LIMIT ${limit}`;
  return db.getAllAsync(query);
}

/**
 * Update a song's metadata after Phase 2 extraction.
 * @param {string} id
 * @param {{ title?: string, artist?: string, album?: string, album_artist?: string, genre?: string, year?: string, track_number?: number, disc_number?: number, bitrate?: number, sample_rate?: number, channels?: number, artwork_path?: string, thumbnail_path?: string, file_size?: number }} meta
 */
export async function updateSongMetadata(id, meta) {
  const db = getDB();
  await db.runAsync(
    `UPDATE songs SET
       title = COALESCE(?, title),
       artist = COALESCE(?, artist),
       album = COALESCE(?, album),
       album_artist = COALESCE(?, album_artist),
       genre = COALESCE(?, genre),
       year = COALESCE(?, year),
       track_number = COALESCE(?, track_number),
       disc_number = COALESCE(?, disc_number),
       bitrate = COALESCE(?, bitrate),
       sample_rate = COALESCE(?, sample_rate),
       channels = COALESCE(?, channels),
       artwork_path = ?,
       thumbnail_path = ?,
       file_size = COALESCE(?, file_size),
       metadata_loaded = 1
     WHERE id = ?`,
    [
      meta.title || null,
      meta.artist || null,
      meta.album || null,
      meta.album_artist || null,
      meta.genre || null,
      meta.year || null,
      meta.track_number || null,
      meta.disc_number || null,
      meta.bitrate || null,
      meta.sample_rate || null,
      meta.channels || null,
      meta.artwork_path ?? null,
      meta.thumbnail_path ?? null,
      meta.file_size || null,
      id,
    ]
  );
}

/**
 * Check if a song with the given URI already exists.
 * @param {string} uri
 * @returns {Promise<boolean>}
 */
export async function songExistsByUri(uri) {
  const db = getDB();
  const row = await db.getFirstAsync(
    `SELECT 1 FROM songs WHERE uri = ? LIMIT 1`,
    [uri]
  );
  return !!row;
}

/**
 * Get all known URIs with modification time and file size for incremental sync.
 * @returns {Promise<Map<string, {modification_time: number, file_size: number}>>}
 */
export async function getAllSongUrisWithMeta() {
  const db = getDB();
  const rows = await db.getAllAsync(`SELECT uri, modification_time, file_size FROM songs`);
  const map = new Map();
  for (const row of rows) {
    map.set(row.uri, { modification_time: row.modification_time, file_size: row.file_size });
  }
  return map;
}

/**
 * Get all known URIs (for fast set-based duplicate checking during sync).
 * @returns {Promise<Set<string>>}
 */
export async function getAllSongUris() {
  const db = getDB();
  const rows = await db.getAllAsync(`SELECT uri FROM songs`);
  return new Set(rows.map((r) => r.uri));
}

/**
 * Get the total number of songs.
 * @returns {Promise<number>}
 */
export async function getSongCount() {
  const db = getDB();
  const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM songs`);
  return row?.count ?? 0;
}

// ─── Scan State ──────────────────────────────────────────────────

/**
 * Get the timestamp of the last full scan.
 * @returns {Promise<string|null>}
 */
export async function getLastScanTime() {
  const db = getDB();
  const row = await db.getFirstAsync(
    `SELECT last_scan_time FROM scan_state WHERE id = 1`
  );
  return row?.last_scan_time ?? null;
}

/**
 * Update the last scan timestamp and count.
 * @param {number} count
 */
export async function setLastScanTime(count) {
  const db = getDB();
  await db.runAsync(
    `UPDATE scan_state SET last_scan_time = datetime('now'), last_scan_count = ? WHERE id = 1`,
    [count]
  );
}

// ─── Utility ─────────────────────────────────────────────────────

/**
 * Clear all songs and reset scan state (for debugging / force refresh).
 */
export async function clearDatabase() {
  const db = getDB();
  await db.execAsync(`
    DELETE FROM songs;
    DELETE FROM songs_fts;
    UPDATE scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1;
  `);
}

// ═══════════════════════════════════════════════════════════════════
// ─── Video CRUD ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

/**
 * Bulk-insert basic video file references (Phase 1 — fast).
 * Uses INSERT OR IGNORE so duplicates are silently skipped.
 * @param {{ id: string, uri: string, filename: string, duration: number, width?: number, height?: number, creation_time?: number, modification_time?: number, file_size?: number }[]} videos
 */
export async function insertVideos(videos) {
  if (!videos || videos.length === 0) return;
  const db = getDB();

  const BATCH = 50;
  for (let i = 0; i < videos.length; i += BATCH) {
    const batch = videos.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap((v) => [
      v.id,
      v.uri,
      v.filename || null,
      v.duration || 0,
      v.width || 0,
      v.height || 0,
      v.creation_time || null,
      v.modification_time || null,
      v.file_size || 0,
    ]);

    await db.runAsync(
      `INSERT OR IGNORE INTO videos (id, uri, filename, duration, width, height, creation_time, modification_time, file_size)
       VALUES ${placeholders}`,
      values
    );
  }
}

/**
 * Get all videos from the database, ordered by filename.
 * @returns {Promise<Array>}
 */
export async function getAllVideos() {
  const db = getDB();
  return db.getAllAsync(
    `SELECT * FROM videos ORDER BY filename COLLATE NOCASE ASC`
  );
}

/**
 * Get videos that don't have a thumbnail yet.
 * @param {number} [limit]
 * @returns {Promise<Array>}
 */
export async function getVideosWithoutThumbnails(limit) {
  const db = getDB();
  let query = `SELECT * FROM videos WHERE metadata_loaded = 0`;
  if (limit) query += ` LIMIT ${limit}`;
  return db.getAllAsync(query);
}

/**
 * Update a video's thumbnail path after Phase 2 extraction.
 * @param {string} id
 * @param {string|null} thumbnailPath
 */
export async function updateVideoThumbnail(id, thumbnailPath) {
  const db = getDB();
  await db.runAsync(
    `UPDATE videos SET thumbnail_path = ?, metadata_loaded = 1 WHERE id = ?`,
    [thumbnailPath, id]
  );
}

/**
 * Update a video's metadata after Phase 2 extraction.
 * @param {string} id
 * @param {{ title?: string, artist?: string, album?: string, genre?: string, year?: string, thumbnail_path?: string, file_size?: number }} meta
 */
export async function updateVideoMetadata(id, meta) {
  const db = getDB();
  await db.runAsync(
    `UPDATE videos SET
       title = COALESCE(?, title),
       artist = COALESCE(?, artist),
       album = COALESCE(?, album),
       genre = COALESCE(?, genre),
       year = COALESCE(?, year),
       thumbnail_path = ?,
       file_size = COALESCE(?, file_size),
       metadata_loaded = 1
     WHERE id = ?`,
    [
      meta.title || null,
      meta.artist || null,
      meta.album || null,
      meta.genre || null,
      meta.year || null,
      meta.thumbnail_path ?? null,
      meta.file_size || null,
      id,
    ]
  );
}

/**
 * Get all known video URIs with modification time and file size for incremental sync.
 * @returns {Promise<Map<string, {modification_time: number, file_size: number}>>}
 */
export async function getAllVideoUrisWithMeta() {
  const db = getDB();
  const rows = await db.getAllAsync(`SELECT uri, modification_time, file_size FROM videos`);
  const map = new Map();
  for (const row of rows) {
    map.set(row.uri, { modification_time: row.modification_time, file_size: row.file_size });
  }
  return map;
}

/**
 * Get all known video URIs (for fast duplicate checking during sync).
 * @returns {Promise<Set<string>>}
 */
export async function getAllVideoUris() {
  const db = getDB();
  const rows = await db.getAllAsync(`SELECT uri FROM videos`);
  return new Set(rows.map((r) => r.uri));
}

/**
 * Get the total number of videos.
 * @returns {Promise<number>}
 */
export async function getVideoCount() {
  const db = getDB();
  const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM videos`);
  return row?.count ?? 0;
}

// ─── Video Scan State ────────────────────────────────────────────

/**
 * Get the timestamp of the last video scan.
 * @returns {Promise<string|null>}
 */
export async function getVideoScanTime() {
  const db = getDB();
  const row = await db.getFirstAsync(
    `SELECT last_scan_time FROM video_scan_state WHERE id = 1`
  );
  return row?.last_scan_time ?? null;
}

/**
 * Update the last video scan timestamp and count.
 * @param {number} count
 */
export async function setVideoScanTime(count) {
  const db = getDB();
  await db.runAsync(
    `UPDATE video_scan_state SET last_scan_time = datetime('now'), last_scan_count = ? WHERE id = 1`,
    [count]
  );
}

/**
 * Clear all videos and reset video scan state.
 */
export async function clearVideoDatabase() {
  const db = getDB();
  await db.execAsync(`
    DELETE FROM videos;
    DELETE FROM videos_fts;
    UPDATE video_scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1;
  `);
}