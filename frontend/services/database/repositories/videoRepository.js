import { getDB } from '../database';

const DEFAULT_LIMIT = 50;
const DEFAULT_ORDER = { key: 'filename', dir: 'ASC' };

const VALID_ORDER_KEYS = ['filename', 'title', 'artist', 'album', 'genre', 'year', 'duration', 'width', 'height', 'file_size', 'created_at', 'modification_time', 'play_count', 'last_played_at'];
const VALID_ORDER_DIRS = ['ASC', 'DESC'];

function sanitizeOrder(order) {
  const key = VALID_ORDER_KEYS.includes(order.key) ? order.key : 'filename';
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

export const videoRepository = {
  /**
   * Get paginated videos with filtering and sorting
   */
  async getAll({ limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER, filters = {} }) {
    const db = getDB();
    const { key, dir } = sanitizeOrder(order);
    const { where, values } = buildWhereClause(filters);

    const query = `
      SELECT * FROM videos
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
    const query = `SELECT COUNT(*) as count FROM videos ${where}`;
    const row = await db.getFirstAsync(query, values);
    return row?.count ?? 0;
  },

  /**
   * Get favorite videos with pagination
   */
  async getFavorites({ limit = DEFAULT_LIMIT, offset = 0, order = DEFAULT_ORDER }) {
    return this.getAll({ limit, offset, order, filters: { favorite: true } });
  },

  /**
   * Get recently added videos
   */
  async getRecentlyAdded({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Get recently played videos
   */
  async getRecentlyPlayed({ limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM videos WHERE last_played_at IS NOT NULL ORDER BY last_played_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  /**
   * Search videos using FTS5
   */
  async search(query, { limit = DEFAULT_LIMIT, offset = 0 }) {
    const db = getDB();
    const searchQuery = query.trim();
    if (!searchQuery) return [];

    return db.getAllAsync(
      `SELECT v.* FROM videos v
       JOIN videos_fts fts ON v.rowid = fts.rowid
       WHERE videos_fts MATCH ?
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
      `SELECT COUNT(*) as count FROM videos_fts WHERE videos_fts MATCH ?`,
      [searchQuery]
    );
    return row?.count ?? 0;
  },

  /**
   * Insert videos in batch (transaction)
   */
  async insertBatch(videos) {
    if (!videos || videos.length === 0) return 0;
    const db = getDB();

    const BATCH = 50;
    let totalInserted = 0;

    for (let i = 0; i < videos.length; i += BATCH) {
      const batch = videos.slice(i, i + BATCH);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = batch.flatMap((v) => [
        v.id,
        v.uri,
        v.filename || null,
        v.duration || 0,
        v.width || 0,
        v.height || 0,
        v.file_size || 0,
        v.title || null,
        v.artist || null,
        v.album || null,
        v.genre || null,
        v.year || null,
        v.thumbnail_path || null,
        v.metadata_loaded ? 1 : 0,
        v.creation_time || null,
        v.modification_time || null,
      ]);

      const result = await db.runAsync(
        `INSERT OR IGNORE INTO videos (
          id, uri, filename, duration, width, height, file_size,
          title, artist, album, genre, year, thumbnail_path,
          metadata_loaded, creation_time, modification_time
        ) VALUES ${placeholders}`,
        values
      );
      totalInserted += result.changes || 0;
    }

    return totalInserted;
  },

  /**
   * Update videos in batch (transaction)
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
          `UPDATE videos SET ${setClauses.join(', ')} WHERE id = ?`,
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
   * Delete videos by IDs
   */
  async deleteBatch(ids) {
    if (!ids || ids.length === 0) return 0;
    const db = getDB();

    const placeholders = ids.map(() => '?').join(', ');
    const result = await db.runAsync(
      `DELETE FROM videos WHERE id IN (${placeholders})`,
      ids
    );
    return result.changes || 0;
  },

  /**
   * Update play count and last played
   */
  async updatePlayStats(id, position = 0) {
    const db = getDB();
    const now = Date.now();
    return db.runAsync(
      `UPDATE videos SET 
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
      `UPDATE videos SET playback_position = ? WHERE id = ?`,
      [position, id]
    );
  },

  /**
   * Toggle favorite
   */
  async toggleFavorite(id) {
    const db = getDB();
    return db.runAsync(
      `UPDATE videos SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`,
      [id]
    );
  },

  /**
   * Get video by ID
   */
  async getById(id) {
    const db = getDB();
    return db.getFirstAsync(`SELECT * FROM videos WHERE id = ?`, [id]);
  },

  /**
   * Get videos without thumbnails (for Phase 2)
   */
  async getWithoutThumbnails(limit = 50) {
    const db = getDB();
    return db.getAllAsync(
      `SELECT * FROM videos WHERE metadata_loaded = 0 LIMIT ?`,
      [limit]
    );
  },
};