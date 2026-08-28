import { getDB } from '../../database';

export const scanStateRepository = {
  /**
   * Get music scan state
   */
  async getMusicScanState() {
    const db = getDB();
    return db.getFirstAsync(
      `SELECT last_scan_time, last_scan_count FROM scan_state WHERE id = 1`
    );
  },

  /**
   * Update music scan state
   */
  async setMusicScanState(count) {
    const db = getDB();
    return db.runAsync(
      `UPDATE scan_state SET last_scan_time = datetime('now'), last_scan_count = ? WHERE id = 1`,
      [count]
    );
  },

  /**
   * Get video scan state
   */
  async getVideoScanState() {
    const db = getDB();
    return db.getFirstAsync(
      `SELECT last_scan_time, last_scan_count FROM video_scan_state WHERE id = 1`
    );
  },

  /**
   * Update video scan state
   */
  async setVideoScanState(count) {
    const db = getDB();
    return db.runAsync(
      `UPDATE video_scan_state SET last_scan_time = datetime('now'), last_scan_count = ? WHERE id = 1`,
      [count]
    );
  },

  /**
   * Reset music scan state
   */
  async resetMusicScanState() {
    const db = getDB();
    return db.runAsync(
      `UPDATE scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1`
    );
  },

  /**
   * Reset video scan state
   */
  async resetVideoScanState() {
    const db = getDB();
    return db.runAsync(
      `UPDATE video_scan_state SET last_scan_time = NULL, last_scan_count = 0 WHERE id = 1`
    );
  },
};