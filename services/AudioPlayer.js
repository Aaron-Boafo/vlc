/**
 * AudioPlayer Singleton — wraps expo-audio for global playback management.
 *
 * Usage:
 *   import { audioPlayer } from '../services/AudioPlayer';
 *   await audioPlayer.loadAndPlay('file:///path/to/song.mp3');
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

class AudioPlayer {
  constructor() {
    /** @type {import('expo-audio').AudioPlayer | null} */
    this._player = null;
    /** @type {import('expo-audio').EventSubscription | null} */
    this._statusSubscription = null;
    /** @type {((status: object) => void) | null} */
    this._statusCallback = null;
    this._audioModeConfigured = false;
  }

  // ─── Audio Mode ────────────────────────────────────────────────
  /**
   * Configure the global audio session (call once at app startup).
   */
  async configureAudioMode(options = {}) {
    if (this._audioModeConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: options.shouldPlayInBackground ?? true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: "duckOthers",
        ...options,
      });
      this._audioModeConfigured = true;
    } catch (error) {
      console.warn("[AudioPlayer] Failed to configure audio mode:", error);
    }
  }

  // ─── Player lifecycle ──────────────────────────────────────────
  /**
   * Ensure a native player instance exists. Creates one lazily.
   * @returns {import('expo-audio').AudioPlayer}
   */
  _ensurePlayer() {
    if (!this._player) {
      // createAudioPlayer accepts an optional source; we pass null
      // and use replace() to set the source later.
      this._player = createAudioPlayer(null);
      this._attachStatusListener();
    }
    return this._player;
  }

  _attachStatusListener() {
    if (!this._player) return;
    // Remove previous subscription if any
    if (this._statusSubscription) {
      this._statusSubscription.remove();
      this._statusSubscription = null;
    }
    this._statusSubscription = this._player.addListener(
      "playbackStatusUpdate",
      (status) => {
        if (this._statusCallback) {
          this._statusCallback(status);
        }
      }
    );
  }

  /**
   * Register a callback that is invoked on every playback status update.
   * @param {(status: object) => void} callback
   */
  onStatusUpdate(callback) {
    this._statusCallback = callback;
  }

  // ─── Playback controls ─────────────────────────────────────────
  /**
   * Load a new audio source and optionally start playing.
   * @param {string} uri — file or http URI
   * @param {{ shouldPlay?: boolean, volume?: number, rate?: number }} opts
   */
  async loadAndPlay(uri, opts = {}) {
    if (!this._audioModeConfigured) {
      await this.configureAudioMode();
    }
    const player = this._ensurePlayer();
    // Replace the current source with the new URI
    player.replace({ uri });
    // Apply settings
    player.volume = opts.volume ?? 1.0;
    if (opts.rate && opts.rate !== 1.0) {
      player.setPlaybackRate(opts.rate, "high");
    }
    // Start playback
    if (opts.shouldPlay !== false) {
      player.play();
    }
  }

  /**
   * Replace the current source without changing other settings.
   * @param {string} uri
   */
  replaceSource(uri) {
    const player = this._ensurePlayer();
    player.replace({ uri });
  }

  play() {
    if (this._player) {
      this._player.play();
    }
  }

  pause() {
    if (this._player) {
      this._player.pause();
    }
  }

  /**
   * Stop playback and reset position to the beginning.
   */
  async stop() {
    if (this._player) {
      this._player.pause();
      await this._player.seekTo(0);
    }
  }

  /**
   * Seek to a position.
   * @param {number} positionMs — position in **milliseconds** (converted to seconds internally)
   */
  async seek(positionMs) {
    if (this._player) {
      await this._player.seekTo(positionMs / 1000);
    }
  }

  /**
   * Set playback rate.
   * @param {number} rate — e.g. 1.0, 1.5, 2.0
   */
  setRate(rate) {
    if (this._player) {
      this._player.setPlaybackRate(rate, "high");
    }
  }

  /**
   * Set volume.
   * @param {number} volume — 0 to 1
   */
  setVolume(volume) {
    if (this._player) {
      this._player.volume = volume;
    }
  }

  // ─── State getters ─────────────────────────────────────────────
  /** @returns {boolean} */
  get isPlaying() {
    return this._player?.playing ?? false;
  }

  /** @returns {boolean} */
  get isLoaded() {
    return this._player?.isLoaded ?? false;
  }

  /** @returns {boolean} */
  get isBuffering() {
    return this._player?.isBuffering ?? false;
  }

  /** Current position in milliseconds */
  get positionMs() {
    return (this._player?.currentTime ?? 0) * 1000;
  }

  /** Total duration in milliseconds */
  get durationMs() {
    return (this._player?.duration ?? 0) * 1000;
  }

  /** Get the underlying expo-audio player (for advanced use) */
  get nativePlayer() {
    return this._player;
  }

  // ─── Cleanup ───────────────────────────────────────────────────
  /**
   * Release the native player and free resources.
   * After calling this, a new player will be created on next loadAndPlay.
   */
  release() {
    if (this._statusSubscription) {
      this._statusSubscription.remove();
      this._statusSubscription = null;
    }
    if (this._player) {
      try {
        this._player.remove();
      } catch (e) {
        console.warn("[AudioPlayer] Error releasing player:", e);
      }
      this._player = null;
    }
    this._statusCallback = null;
  }
}

export const audioPlayer = new AudioPlayer();
export default audioPlayer;
