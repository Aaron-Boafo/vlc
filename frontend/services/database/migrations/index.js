import * as SQLite from 'expo-sqlite';

const DB_NAME = 'visura_music.db';

let _db = null;

async function getDB() {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          uri TEXT NOT NULL UNIQUE,
          filename TEXT,
          duration REAL DEFAULT 0,
          title TEXT,
          artist TEXT,
          album TEXT,
          album_artist TEXT,
          genre TEXT,
          year TEXT,
          track_number INTEGER,
          disc_number INTEGER,
          bitrate INTEGER,
          sample_rate INTEGER,
          channels INTEGER,
          file_size INTEGER,
          artwork_path TEXT,
          thumbnail_path TEXT,
          metadata_loaded INTEGER DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          play_count INTEGER DEFAULT 0,
          playback_position INTEGER DEFAULT 0,
          last_played_at REAL,
          creation_time REAL,
          modification_time REAL,
          metadata_hash TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS scan_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          last_scan_time TEXT,
          last_scan_count INTEGER DEFAULT 0
        );

        INSERT OR IGNORE INTO scan_state (id, last_scan_time, last_scan_count)
        VALUES (1, NULL, 0);

        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          uri TEXT NOT NULL UNIQUE,
          filename TEXT,
          duration REAL DEFAULT 0,
          width INTEGER DEFAULT 0,
          height INTEGER DEFAULT 0,
          file_size INTEGER DEFAULT 0,
          title TEXT,
          artist TEXT,
          album TEXT,
          genre TEXT,
          year TEXT,
          thumbnail_path TEXT,
          metadata_loaded INTEGER DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          play_count INTEGER DEFAULT 0,
          playback_position INTEGER DEFAULT 0,
          last_played_at REAL,
          creation_time REAL,
          modification_time REAL,
          metadata_hash TEXT,
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
    }
  },
  {
    version: 2,
    name: 'add_performance_indexes',
    up: async (db) => {
      await db.execAsync(`
        -- Songs indexes
        CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
        CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
        CREATE INDEX IF NOT EXISTS idx_songs_album_artist ON songs(album_artist);
        CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
        CREATE INDEX IF NOT EXISTS idx_songs_filename ON songs(filename);
        CREATE INDEX IF NOT EXISTS idx_songs_date_added ON songs(created_at);
        CREATE INDEX IF NOT EXISTS idx_songs_date_modified ON songs(modification_time);
        CREATE INDEX IF NOT EXISTS idx_songs_favorite ON songs(favorite);
        CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
        CREATE INDEX IF NOT EXISTS idx_songs_metadata_loaded ON songs(metadata_loaded);
        CREATE INDEX IF NOT EXISTS idx_songs_artist_album ON songs(artist, album);
        
        -- Videos indexes
        CREATE INDEX IF NOT EXISTS idx_videos_artist ON videos(artist);
        CREATE INDEX IF NOT EXISTS idx_videos_album ON videos(album);
        CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(filename);
        CREATE INDEX IF NOT EXISTS idx_videos_date_added ON videos(created_at);
        CREATE INDEX IF NOT EXISTS idx_videos_date_modified ON videos(modification_time);
        CREATE INDEX IF NOT EXISTS idx_videos_favorite ON videos(favorite);
        CREATE INDEX IF NOT EXISTS idx_videos_genre ON videos(genre);
        CREATE INDEX IF NOT EXISTS idx_videos_metadata_loaded ON videos(metadata_loaded);
      `);
    }
  },
  {
    version: 3,
    name: 'add_fts_search',
    up: async (db) => {
      await db.execAsync(`
        -- FTS5 virtual table for songs search
        CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
          title, artist, album, album_artist, genre, filename,
          content='songs', content_rowid='rowid'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS songs_fts_ai AFTER INSERT ON songs BEGIN
          INSERT INTO songs_fts(rowid, title, artist, album, album_artist, genre, filename)
          VALUES (new.rowid, new.title, new.artist, new.album, new.album_artist, new.genre, new.filename);
        END;

        CREATE TRIGGER IF NOT EXISTS songs_fts_ad AFTER DELETE ON songs BEGIN
          INSERT INTO songs_fts(songs_fts, rowid, title, artist, album, album_artist, genre, filename)
          VALUES ('delete', old.rowid, old.title, old.artist, old.album, old.album_artist, old.genre, old.filename);
        END;

        CREATE TRIGGER IF NOT EXISTS songs_fts_au AFTER UPDATE ON songs BEGIN
          INSERT INTO songs_fts(songs_fts, rowid, title, artist, album, album_artist, genre, filename)
          VALUES ('delete', old.rowid, old.title, old.artist, old.album, old.album_artist, old.genre, old.filename);
          INSERT INTO songs_fts(rowid, title, artist, album, album_artist, genre, filename)
          VALUES (new.rowid, new.title, new.artist, new.album, new.album_artist, new.genre, new.filename);
        END;

        -- FTS5 virtual table for videos search
        CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
          filename, title, artist, album, genre,
          content='videos', content_rowid='rowid'
        );

        CREATE TRIGGER IF NOT EXISTS videos_fts_ai AFTER INSERT ON videos BEGIN
          INSERT INTO videos_fts(rowid, filename, title, artist, album, genre)
          VALUES (new.rowid, new.filename, new.title, new.artist, new.album, new.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS videos_fts_ad AFTER DELETE ON videos BEGIN
          INSERT INTO videos_fts(videos_fts, rowid, filename, title, artist, album, genre)
          VALUES ('delete', old.rowid, old.filename, old.title, old.artist, old.album, old.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS videos_fts_au AFTER UPDATE ON videos BEGIN
          INSERT INTO videos_fts(videos_fts, rowid, filename, title, artist, album, genre)
          VALUES ('delete', old.rowid, old.filename, old.title, old.artist, old.album, old.genre);
          INSERT INTO videos_fts(rowid, filename, title, artist, album, genre)
          VALUES (new.rowid, new.filename, new.title, new.artist, new.album, new.genre);
        END;
      `);
    }
  },
  {
    version: 4,
    name: 'add_media_type_to_songs',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE songs ADD COLUMN media_type TEXT DEFAULT 'audio';
        CREATE INDEX IF NOT EXISTS idx_songs_media_type ON songs(media_type);
      `);
    }
  }
];

export async function runMigrations() {
  const db = await getDB();
  
  // Create migrations table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Get applied migrations
  const applied = await db.getAllAsync('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.map(r => r.version));

  // Run pending migrations
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[Migrations] Running migration ${migration.version}: ${migration.name}`);
      try {
        await db.execAsync('BEGIN TRANSACTION');
        await migration.up(db);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
        await db.execAsync('COMMIT');
        console.log(`[Migrations] Migration ${migration.version} applied successfully`);
      } catch (error) {
        await db.execAsync('ROLLBACK');
        console.error(`[Migrations] Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  console.log('[Migrations] All migrations complete');
}

export async function getMigrationStatus() {
  const db = await getDB();
  const applied = await db.getAllAsync('SELECT * FROM schema_migrations ORDER BY version');
  return {
    applied,
    pending: migrations.filter(m => !applied.some(a => a.version === m.version)),
    latest: migrations[migrations.length - 1].version
  };
}