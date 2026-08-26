/**
 * SQLite database service for the music and video catalog.
 *
 * Uses expo-sqlite to store song metadata and scan state locally,
 * replacing the old JSON-file-based caching approach.
 */
import * as SQLite from "expo-sqlite";

const DB_NAME = "visura_music.db";

let _db = null;

/**
 * Open (or create) the database and run migrations.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export async function initDB() {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync(DB_NAME);

  // Create tables
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL UNIQUE,
      filename TEXT,
      duration REAL DEFAULT 0,
      title TEXT,
      artist TEXT,
      album TEXT,
      year TEXT,
      artwork_path TEXT,
      metadata_loaded INTEGER DEFAULT 0,
      creation_time REAL,
      modification_time REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_scan_time TEXT,
      last_scan_count INTEGER DEFAULT 0
    );

    -- Seed scan_state if empty
    INSERT OR IGNORE INTO scan_state (id, last_scan_time, last_scan_count)
    VALUES (1, NULL, 0);

    -- ─── Video tables ──────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL UNIQUE,
      filename TEXT,
      duration REAL DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      thumbnail_path TEXT,
      metadata_loaded INTEGER DEFAULT 0,
      creation_time REAL,
      modification_time REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS video_scan_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_scan_time TEXT,
      last_scan_count INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO video_scan_state (id, last_scan_time, last_scan_count)
    VALUES (1, NULL, 0);
  `);

  return _db;
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
 * @param {{ id: string, uri: string, filename: string, duration: number, creation_time?: number, modification_time?: number }[]} songs
 */
export async function insertSongs(songs) {
  if (!songs || songs.length === 0) return;
  const db = getDB();

  // Process in batches of 50 to avoid SQLite limits
  const BATCH = 50;
  for (let i = 0; i < songs.length; i += BATCH) {
    const batch = songs.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap((s) => [
      s.id,
      s.uri,
      s.filename || null,
      s.duration || 0,
      s.creation_time || null,
      s.modification_time || null,
    ]);

    await db.runAsync(
      `INSERT OR IGNORE INTO songs (id, uri, filename, duration, creation_time, modification_time)
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
 * @param {{ title?: string, artist?: string, album?: string, year?: string, artwork_path?: string }} meta
 */
export async function updateSongMetadata(id, meta) {
  const db = getDB();
  await db.runAsync(
    `UPDATE songs SET
       title = COALESCE(?, title),
       artist = COALESCE(?, artist),
       album = COALESCE(?, album),
       year = COALESCE(?, year),
       artwork_path = ?,
       metadata_loaded = 1
     WHERE id = ?`,
    [
      meta.title || null,
      meta.artist || null,
      meta.album || null,
      meta.year || null,
      meta.artwork_path ?? null,
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
    UPDATE scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1;
  `);
}

// ═══════════════════════════════════════════════════════════════════
// ─── Video CRUD ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

/**
 * Bulk-insert basic video file references (Phase 1 — fast).
 * Uses INSERT OR IGNORE so duplicates are silently skipped.
 * @param {{ id: string, uri: string, filename: string, duration: number, width?: number, height?: number, creation_time?: number, modification_time?: number }[]} videos
 */
export async function insertVideos(videos) {
  if (!videos || videos.length === 0) return;
  const db = getDB();

  const BATCH = 50;
  for (let i = 0; i < videos.length; i += BATCH) {
    const batch = videos.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap((v) => [
      v.id,
      v.uri,
      v.filename || null,
      v.duration || 0,
      v.width || 0,
      v.height || 0,
      v.creation_time || null,
      v.modification_time || null,
    ]);

    await db.runAsync(
      `INSERT OR IGNORE INTO videos (id, uri, filename, duration, width, height, creation_time, modification_time)
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
    UPDATE video_scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1;
  `);
}
