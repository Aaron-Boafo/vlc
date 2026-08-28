import { getDB } from '../../database';

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
  const conditions = ['media_type = ?'];
  const values = ['audio'];

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
      SELECT * FROM media
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
    const query = `SELECT COUNT(*) as count FROM media ${where}`;
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
      `SELECT * FROM media WHERE media_type = 'audio' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get recently played songs
   */
  async getRecentlyPlayed({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM media WHERE last_played_at IS NOT NULL AND media_type = 'audio' ORDER BY last_played_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get most played songs
   */
  async getMostPlayed({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM media WHERE play_count > 0 AND media_type = 'audio' ORDER BY play_count DESC LIMIT ? OFFSET ?`,
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

    return db.getAllAsync(
      `SELECT s.* FROM media s
       JOIN media_fts fts ON s.id = fts.rowid
       WHERE media_fts MATCH ? AND s.media_type = 'audio'
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
      `SELECT COUNT(*) as count FROM media_fts fts JOIN media s ON fts.rowid = s.id WHERE media_fts MATCH ? AND s.media_type = 'audio'`,
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
       FROM media
       WHERE artist IS NOT NULL AND artist != '' AND media_type = 'audio'
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
       FROM media
       WHERE album IS NOT NULL AND album != '' AND media_type = 'audio'
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
       FROM media
       WHERE genre IS NOT NULL AND genre != '' AND media_type = 'audio'
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
        s.media_key || s.mediaKey,
        s.uri,
        'audio',
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
        `INSERT OR IGNORE INTO media (
          media_key, uri, media_type, filename, duration, title, artist, album, album_artist, genre, year,
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
          `UPDATE media SET ${setClauses.join(', ')} WHERE id = ?`,
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
      `DELETE FROM media WHERE id IN (${placeholders})`,
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
      `UPDATE media SET 
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
      `UPDATE media SET playback_position = ? WHERE id = ?`,
      [position, id]
    );
  },

  /**
   * Toggle favorite
   */
  async toggleFavorite(id) {
    const db = getDB();
    return db.runAsync(
      `UPDATE media SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`,
      [id]
    );
  },

  /**
   * Get song by ID
   */
  async getById(id) {
    const db = getDB();
    return db.getFirstAsync(`SELECT * FROM media WHERE id = ?`, [id]);
  },

  /**
   * Get song by mediaKey
   */
  async getByMediaKey(mediaKey) {
    const db = getDB();
    return db.getFirstAsync(`SELECT * FROM media WHERE media_key = ?`, [mediaKey]);
  },

  /**
   * Get all known URIs with modification time and file size for incremental sync.
   * @returns {Promise<Map<string, {id: number, modification_time: number, file_size: number}>>}
   */
  async getAllUrisWithMeta() {
    const db = getDB();
    const rows = await db.getAllAsync(`SELECT id, uri, modification_time, file_size FROM media WHERE media_type = 'audio'`);
    const map = new Map();
    for (const row of rows) {
      map.set(row.uri, { id: row.id, modification_time: row.modification_time, file_size: row.file_size });
    }
    return map;
  },

  /**
   * Get songs without metadata (for Phase 2)
   */
  async getWithoutMetadata(limit = 100000) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM media WHERE metadata_loaded = 0 AND media_type = 'audio' ORDER BY id ASC LIMIT ?`,
      [limit]
    );
  },
};