/**
 * VideoManager — Global singleton for video playback state.
 *
 * Unlike audio, video requires a UI component (<VideoView>), so this class
 * manages only the *state* (current video, queue, position). The actual
 * player instance is created in React via useVideoPlayer.
 *
 * Usage:
 *   import { videoManager } from '../services/VideoManager';
 *   videoManager.setQueue(videos, 0);
 *   videoManager.playVideo(video);
 */

class VideoManager {
  constructor() {
    this._currentVideo = null;
    this._queue = [];
    this._currentIndex = -1;
    this._isPlaying = false;
    this._position = 0; // seconds
    this._duration = 0; // seconds
    this._listeners = new Set();
    this._pipEnabled = true;
  }

  // ─── Queue Management ────────────────────────────────────────────

  /**
   * Set the playback queue and optionally start at a given index.
   * @param {Array} videos
   * @param {number} [startIndex=0]
   */
  setQueue(videos, startIndex = 0) {
    this._queue = [...videos];
    this._currentIndex = Math.min(startIndex, videos.length - 1);
    if (this._queue.length > 0) {
      this._currentVideo = this._queue[this._currentIndex];
    }
    this._notify();
  }

  /**
   * Play a specific video. If it's in the queue, jump to it; otherwise
   * create a single-item queue.
   * @param {object} video — must have { id, uri, filename }
   */
  playVideo(video) {
    if (!video || !video.uri) {
      console.warn("VideoManager.playVideo(): invalid video", video);
      return;
    }

    const idx = this._queue.findIndex((v) => v.id === video.id);
    if (idx >= 0) {
      this._currentIndex = idx;
      this._currentVideo = this._queue[idx];
    } else {
      this._queue = [video];
      this._currentIndex = 0;
      this._currentVideo = video;
    }

    this._isPlaying = true;
    this._position = 0;
    this._duration = video.duration || 0;
    this._notify();
  }

  // ─── Playback Controls ───────────────────────────────────────────

  play() {
    this._isPlaying = true;
    this._notify();
  }

  pause() {
    this._isPlaying = false;
    this._notify();
  }

  stop() {
    this._isPlaying = false;
    this._position = 0;
    this._notify();
  }

  /**
   * Update position (called from the player's timeUpdate listener).
   * @param {number} positionSec
   * @param {number} [durationSec]
   */
  updatePosition(positionSec, durationSec) {
    this._position = positionSec;
    if (durationSec !== undefined) {
      this._duration = durationSec;
    }
    // Don't call _notify() for every time update — consumers poll state.
  }

  /**
   * Seek to a position in seconds.
   * @param {number} positionSec
   */
  seek(positionSec) {
    this._position = positionSec;
    this._notify();
  }

  // ─── Navigation ──────────────────────────────────────────────────

  /**
   * Advance to the next video in the queue.
   * @returns {object|null} the next video, or null if at end
   */
  next() {
    if (this._currentIndex < this._queue.length - 1) {
      this._currentIndex++;
      this._currentVideo = this._queue[this._currentIndex];
      this._position = 0;
      this._isPlaying = true;
      this._notify();
      return this._currentVideo;
    }
    return null;
  }

  /**
   * Go to the previous video in the queue.
   * @returns {object|null}
   */
  previous() {
    if (this._currentIndex > 0) {
      this._currentIndex--;
      this._currentVideo = this._queue[this._currentIndex];
      this._position = 0;
      this._isPlaying = true;
      this._notify();
      return this._currentVideo;
    }
    return null;
  }

  /**
   * Check if there is a next video.
   * @returns {boolean}
   */
  hasNext() {
    return this._currentIndex < this._queue.length - 1;
  }

  /**
   * Check if there is a previous video.
   * @returns {boolean}
   */
  hasPrevious() {
    return this._currentIndex > 0;
  }

  // ─── State Getters ───────────────────────────────────────────────

  get currentVideo() {
    return this._currentVideo;
  }

  get queue() {
    return this._queue;
  }

  get currentIndex() {
    return this._currentIndex;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get position() {
    return this._position;
  }

  get duration() {
    return this._duration;
  }

  get pipEnabled() {
    return this._pipEnabled;
  }

  set pipEnabled(value) {
    this._pipEnabled = !!value;
    this._notify();
  }

  // ─── Listener Pattern ────────────────────────────────────────────

  /**
   * Subscribe to state changes.
   * @param {() => void} callback
   * @returns {() => void} unsubscribe function
   */
  addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /** @private */
  _notify() {
    for (const cb of this._listeners) {
      try {
        cb();
      } catch (err) {
        console.warn("VideoManager listener error:", err);
      }
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────

  reset() {
    this._currentVideo = null;
    this._queue = [];
    this._currentIndex = -1;
    this._isPlaying = false;
    this._position = 0;
    this._duration = 0;
    this._notify();
  }
}

export const videoManager = new VideoManager();
export default VideoManager;
