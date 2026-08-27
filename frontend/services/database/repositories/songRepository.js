import { getDB } from '../database';

const DEFAULT_LIMIT = 50;
const DEFAULT_ORDER = { key: 'title', dir: 'ASC' };

const VALID_ORDER_KEYS = ['title', 'artist', 'album', 'album_artist', 'genre', 'year', 'duration', 'filename', 'created_at', 'modification_time', 'play_count', 'last_played_at'];
const VALID_ORDER_DIRS = ['ASC', 'DESC'];

function sanitizeOrder(order) {
  const key = VALID_ORDER_KEYS.includes(order.key) ? order.key : 'title';
  const dir = VALID_ORDER_DIRS.includes(order.dir.toUpperCase()) ? order.dir.toUpperCase() : 'ASC';
  return { key, dir };
}

function buildWhereClause(filters) {
  const conditions = [];
  const values = [];

  if (filters.artist) {
    conditions.push('artist = ?');
    values.push(filters.artist);
  }
  if (filters.album) {
    conditions.push('album = ?');
    values.push(filters.album);
  }
  if (filters.albumArtist) {
    conditions.push('album_artist = ?');
    values.push(filters.albumArtist);
  }
  if (filters.genre) {
    conditions.push('genre = ?');
    values.push(filters.genre);
  }
  if (filters.favorite !== undefined) {
    conditions.push('favorite = ?');
    values.push(filters.favorite ? 1 : 0);
  }
  if (filters.metadataLoaded !== undefined) {
    conditions.push('metadata_loaded = ?');
    values.push(filters.metadataLoaded ? 1 : 0);
  }
  if (filters.year) {
    conditions.push('year = ?');
    values.push(filters.year);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, values };
}

export const songRepository = {
  /**
   * Get paginated songs with filtering and sorting
   */
  async getAll({ limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER, filters = {} }) {
    const db = getDB();
    const { key, dir } = sanitizeOrder(order);
    const { where, values } = buildWhereClause(filters);

    const query = `
      SELECT * FROM songs
      ${where}
      ORDER BY ${key} COLLATE NOCASE ${dir}
      LIMIT ? OFFSET ?
    `;
    values.push(limit, offset);

    return db.getAllAsync(query, values);
  },

  /**
   * Get total count with filters
   */
  async getCount(filters = {}) {
    const db = getDB();
    const { where, values } = buildWhereClause(filters);
    const query = `SELECT COUNT(*) as count FROM songs ${where}`;
    const row = await db.getFirstAsync(query, values);
    return row?.count ?? 0;
  },

  /**
   * Get songs by artist with pagination
   */
  async getByArtist(artist, { limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER }) {
    return this.getAll({ limit, offset, order, filters: { artist } });
  },

  /**
   * Get songs by album with pagination
   */
  async getByAlbum(album, { limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER }) {
    return this.getAll({ limit, offset, order, filters: { album } });
  },

  /**
   * Get favorite songs with pagination
   */
  async getFavorites({ limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER }) {
    return this.getAll({ limit, offset, order, filters: { favorite: true } });
  },

  /**
   * Get recently added songs
   */
  async getRecentlyAdded({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM songs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get recently played songs
   */
  async getRecentlyPlayed({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM songs WHERE last_played_at IS NOT NULL ORDER BY last_played_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get most played songs
   */
  async getMostPlayed({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM songs WHERE play_count > 0 ORDER BY play_count DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Search songs using FTS5
   */
  async search(query, { limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    const searchQuery = query.trim();
    if (!searchQuery) return [];

    // Use FTS5 for full-text search
    return db.getAllAsync(
      `SELECT s.* FROM songs s
       JOIN songs_fts fts ON s.rowid = fts.rowid
       WHERE songs_fts MATCH ?
       ORDER BY rank
       LIMIT ? OFFSET ?`,
      [searchQuery, limit, offset]
    );
  },

  /**
   * Get search count
   */
  async searchCount(query) {
    const db = getDB();
    const searchQuery = query.trim();
    if (!searchQuery) return 0;
    const row = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM songs_fts WHERE songs_fts MATCH ?`,
      [searchQuery]
    );
    return row?.count ?? 0;
  },

  /**
   * Get unique artists
   */
  async getArtists({ limit = 1000, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT DISTINCT artist, COUNT(*) as track_count, MIN(artwork_path) as artwork
       FROM songs
       WHERE artist IS NOT NULL AND artist != ''
       GROUP BY artist
       ORDER BY artist COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get unique albums with artist
   */
  async getAlbums({ limit = 1000, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT album, artist, COUNT(*) as track_count, MIN(artwork_path) as artwork, MIN(album_artist) as album_artist
       FROM songs
       WHERE album IS NOT NULL AND album != ''
       GROUP BY album, artist
       ORDER BY album COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get unique genres
   */
  async getGenres({ limit = 1000, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT DISTINCT genre, COUNT(*) as track_count
       FROM songs
       WHERE genre IS NOT NULL AND genre != ''
       GROUP BY genre
       ORDER BY genre COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get songs by genre
   */
  async getByGenre(genre, { limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER }) {
    return this.getAll({ limit, offset, order, filters: { genre } });
  },

  /**
   * Insert songs in batch (transaction)
   */
  async insertBatch(songs) {
    if (!songs || songs.length === 0) return 0;
    const db = getDB();

    const BATCH = 50;
    let totalInserted = 0;

    for (let i = 0; i < songs.length; i += BATCH) {
      const batch = songs.slice(i, i + BATCH);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = batch.flatMap((s) => [
        s.id,
        s.uri,
        s.filename || null,
        s.duration || 0,
        s.title || null,
        s.artist || null,
        s.album || null,
        s.album_artist || null,
        s.genre || null,
        s.year || null,
        s.track_number || null,
        s.disc_number || null,
        s.bitrate || null,
        s.sample_rate || null,
        s.channels || null,
        s.file_size || null,
        s.artwork_path || null,
        s.thumbnail_path || null,
        s.metadata_loaded ? 1 : 0,
        s.creation_time || null,
        s.modification_time || null,
        s.metadata_hash || null,
      ]);

      const result = await db.runAsync(
        `INSERT OR IGNORE INTO songs (
          id, uri, filename, duration, title, artist, album, album_artist, genre, year,
          track_number, disc_number, bitrate, sample_rate, channels, file_size,
          artwork_path, thumbnail_path, metadata_loaded, creation_time, modification_time, metadata_hash
        ) VALUES ${placeholders}`,
        values
      );
      totalInserted += result.changes || 0;
    }

    return totalInserted;
  },

  /**
   * Update songs in batch (transaction)
   */
  async updateBatch(updates) {
    if (!updates || updates.length === 0) return 0;
    const db = getDB();

    await db.execAsync('BEGIN TRANSACTION');
    try {
      let totalUpdated = 0;
      for (const update of updates) {
        const { id, ...fields } = update;
        if (!id) continue;

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
          const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${col} = ?`);
          values.push(value);
        }

        if (setClauses.length === 0) continue;

        values.push(id);
        await db.runAsync(
          `UPDATE songs SET ${setClauses.join(', ')} WHERE id = ?`,
          values
        );
        totalUpdated++;
      }
      await db.execAsync('COMMIT');
      return totalUpdated;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  },

  /**
   * Delete songs by IDs
   */
  async deleteBatch(ids) {
    if (!ids || ids.length === 0) return 0;
    const db = getDB();

    const placeholders = ids.map(() => '?').join(', ');
    const result = await db.runAsync(
      `DELETE FROM songs WHERE id IN (${placeholders})`,
      ids
    );
    return result.changes || 0;
  },

  /**
   * Mark songs as missing (for deleted files)
   */
  async markMissing(ids) {
    if (!ids || ids.length === 0) return 0;
    return this.updateBatch(ids.map(id => ({ id, missing: 1 })));
  },

  /**
   * Update play count and last played
   */
  async updatePlayStats(id, position = 0) {
    const db = getDB();
    const now = Date.now();
    return db.runAsync(
      `UPDATE songs SET 
         play_count = play_count + 1,
         last_played_at = ?,
         playback_position = ?
       WHERE id = ?`,
      [now, position, id]
    );
  },

  /**
   * Update playback position
   */
  async updatePlaybackPosition(id, position) {
    const db = getDB();
    return db.runAsync(
      `UPDATE songs SET playback_position = ? WHERE id = ?`,
      [position, id]
    );
  },

  /**
   * Toggle favorite
   */
  async toggleFavorite(id) {
    const db = getDB();
    return db.runAsync(
      `UPDATE songs SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`,
      [id]
    );
  },

  /**
   * Get song by ID
   */
  async getById(id) {
    const db = getDB();
    return db.getFirstAsync(`SELECT * FROM songs WHERE id = ?`, [id]);
  },

  /**
   * Get songs without metadata (for Phase 2)
   */
  async getWithoutMetadata(limit = 50) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM songs WHERE metadata_loaded = 0 LIMIT ?`,
      [limit]
    );
  },
};