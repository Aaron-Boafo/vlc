/**
 * Two-Phase Music Scanner
 *
 * Phase 1 — Fast Initial Load:
 *   Scan the device for audio files and insert basic file references
 *   (URI, filename, duration) into SQLite immediately.
 *
 * Phase 2 — Lazy Metadata Extraction:
 *   Process files in small batches, extract metadata (title, artist, album,
 *   artwork), save artwork images to the filesystem, and update SQLite.
 *
 * Background Sync:
 *   On subsequent launches, detect and add new files without blocking the UI.
 */
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { InteractionManager } from "react-native";
import { getAudioMetadata } from "@missingcore/audio-metadata";
import {
  initDB,
  insertSongs,
  getAllSongs,
  getSongsWithoutMetadata,
  updateSongMetadata,
  getAllSongUris,
  getLastScanTime,
  setLastScanTime,
  getSongCount,
} from "./database";

// ─── Configuration ───────────────────────────────────────────────

const SCAN_BATCH_SIZE = 200; // MediaLibrary pagination size
const METADATA_CHUNK_SIZE = 5; // Files per metadata extraction batch
const ARTWORKS_DIR = `${FileSystem.documentDirectory}artworks/`;

// Folders to skip during scanning
const EXCLUDED_FOLDERS = [
  "/WhatsApp/Media/WhatsApp Audio/Sent",
  "/WhatsApp/Media/WhatsApp Audio/Private",
  "/WhatsApp/Media/WhatsApp Voice Notes",
  "/WhatsApp/Media/.Statuses",
  "/WhatsApp/Private",
  "/Telegram",
  "/Instagram",
  "/Snapchat",
  "/.nomedia",
  "/Android/data",
  "/system/",
  "/cache/",
];

// ─── Phase 1: Fast Scan ──────────────────────────────────────────

/**
 * Request permissions and scan for all audio files on the device.
 * Inserts basic file references into SQLite immediately.
 *
 * @param {(progress: { loaded: number, total: number | null }) => void} [onProgress]
 * @returns {Promise<{ granted: boolean, count: number }>}
 */
export async function scanMusicFiles(onProgress) {
  // 1. Init database
  await initDB();

  // 2. Request permission
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    return { granted: false, count: 0 };
  }

  // 3. Paginate through all audio assets
  let after = null;
  let hasNextPage = true;
  let totalInserted = 0;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: SCAN_BATCH_SIZE,
      after,
    });

    // Filter out excluded folders
    const filtered = page.assets.filter(
      (asset) => !EXCLUDED_FOLDERS.some((folder) => asset.uri.includes(folder))
    );

    // Map to DB shape
    const songs = filtered.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename,
      duration: asset.duration || 0,
      creation_time: asset.creationTime || null,
      modification_time: asset.modificationTime || null,
    }));

    // Insert into SQLite (INSERT OR IGNORE handles duplicates)
    await insertSongs(songs);
    totalInserted += songs.length;

    if (onProgress) {
      onProgress({ loaded: totalInserted, total: null });
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  // Update scan state
  await setLastScanTime(totalInserted);

  console.log(
    `[MusicScanner] Phase 1 complete — ${totalInserted} files scanned`
  );
  return { granted: true, count: totalInserted };
}

// ─── Phase 2: Lazy Metadata Extraction ───────────────────────────

/**
 * Process songs that don't have metadata yet, in small batches.
 * Extracts title, artist, album, year, and artwork.
 * Artwork is saved as a .png file to the local filesystem.
 *
 * @param {(progress: { completed: number, total: number }) => void} [onProgress]
 * @param {() => Array} [onBatchComplete] — called after each batch with updated songs
 * @returns {Promise<number>} — number of songs processed
 */
export async function extractMetadataInBackground(onProgress, onBatchComplete) {
  // Ensure artwork directory exists
  await FileSystem.makeDirectoryAsync(ARTWORKS_DIR, {
    intermediates: true,
  }).catch(() => {});

  const pending = await getSongsWithoutMetadata();
  if (pending.length === 0) {
    console.log("[MusicScanner] Phase 2 — no pending metadata extraction");
    return 0;
  }

  console.log(
    `[MusicScanner] Phase 2 — extracting metadata for ${pending.length} files`
  );
  let completed = 0;

  // Process in chunks
  for (let i = 0; i < pending.length; i += METADATA_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + METADATA_CHUNK_SIZE);

    // Wait for UI interactions to finish before processing (prevent jank)
    await new Promise((resolve) => {
      InteractionManager.runAfterInteractions(resolve);
    });

    // Process each file in the chunk
    await Promise.all(chunk.map((song) => _extractAndSaveSongMetadata(song)));

    completed += chunk.length;

    if (onProgress) {
      onProgress({ completed, total: pending.length });
    }

    if (onBatchComplete) {
      onBatchComplete();
    }

    // Small delay between batches to keep UI responsive
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`[MusicScanner] Phase 2 complete — ${completed} files processed`);
  return completed;
}

/**
 * Extract metadata for a single song and update the database.
 * @param {{ id: string, uri: string, filename: string }} song
 * @private
 */
async function _extractAndSaveSongMetadata(song) {
  try {
    const data = await getAudioMetadata(song.uri, [
      "album",
      "artist",
      "name",
      "year",
      "artwork",
    ]);
    const metadata = data.metadata || {};

    // Handle artwork
    let artworkPath = null;
    if (metadata.artwork) {
      artworkPath = await _saveArtwork(song.id, metadata.artwork);
    }

    // Derive a title if metadata doesn't have one
    const title =
      metadata.name ||
      song.filename?.replace(/\.[^/.]+$/, "") ||
      "Unknown Track";

    await updateSongMetadata(song.id, {
      title,
      artist: metadata.artist || "Unknown Artist",
      album: metadata.album || "Unknown Album",
      year: metadata.year || null,
      artwork_path: artworkPath,
    });
  } catch (error) {
    // Gracefully handle missing metadata — mark as loaded with defaults
    console.log(
      `[MusicScanner] Metadata extraction failed for ${song.filename}:`,
      error?.message
    );
    const title = song.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track";
    await updateSongMetadata(song.id, {
      title,
      artist: "Unknown Artist",
      album: "Unknown Album",
      year: null,
      artwork_path: null,
    });
  }
}

/**
 * Save artwork to the filesystem.
 * If the artwork is a base64 string or data URI, decode it and write as .png.
 * @param {string} songId
 * @param {string} artworkData — base64 string or data URI
 * @returns {Promise<string|null>} — local file path, or null on failure
 * @private
 */
async function _saveArtwork(songId, artworkData) {
  try {
    let base64Data = artworkData;

    // Strip data URI prefix if present
    if (artworkData.startsWith("data:image")) {
      const commaIndex = artworkData.indexOf(",");
      if (commaIndex !== -1) {
        base64Data = artworkData.substring(commaIndex + 1);
      }
    }

    // Validate that it looks like base64
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64Data.substring(0, 100))) {
      // Not base64 — might be a URL. Return it directly.
      return artworkData;
    }

    // Clean up any whitespace in base64
    base64Data = base64Data.replace(/\s/g, "");

    const filePath = `${ARTWORKS_DIR}${songId}.png`;
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
  } catch (error) {
    console.log(
      `[MusicScanner] Failed to save artwork for ${songId}:`,
      error?.message
    );
    return null;
  }
}

// ─── Background Sync ─────────────────────────────────────────────

/**
 * Check for new music files added since the last scan.
 * Only inserts new files and extracts their metadata.
 * Designed to run silently in the background.
 *
 * @param {() => void} [onNewFilesFound] — called when new songs are discovered
 * @returns {Promise<number>} — number of new files found
 */
export async function backgroundSync(onNewFilesFound) {
  try {
    await initDB();

    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") return 0;

    // Get all known URIs for fast lookup
    const knownUris = await getAllSongUris();
    let newCount = 0;
    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: SCAN_BATCH_SIZE,
        after,
      });

      // Filter: exclude known URIs and excluded folders
      const newAssets = page.assets.filter(
        (asset) =>
          !knownUris.has(asset.uri) &&
          !EXCLUDED_FOLDERS.some((folder) => asset.uri.includes(folder))
      );

      if (newAssets.length > 0) {
        const songs = newAssets.map((asset) => ({
          id: asset.id,
          uri: asset.uri,
          filename: asset.filename,
          duration: asset.duration || 0,
          creation_time: asset.creationTime || null,
          modification_time: asset.modificationTime || null,
        }));

        await insertSongs(songs);
        newCount += songs.length;
      }

      hasNextPage = page.hasNextPage;
      after = page.endCursor;
    }

    if (newCount > 0) {
      console.log(`[MusicScanner] Background sync found ${newCount} new files`);
      // Extract metadata for the new files
      await extractMetadataInBackground();
      if (onNewFilesFound) onNewFilesFound();
    } else {
      console.log("[MusicScanner] Background sync — no new files");
    }

    // Update scan state
    const totalCount = await getSongCount();
    await setLastScanTime(totalCount);

    return newCount;
  } catch (error) {
    console.warn("[MusicScanner] Background sync error:", error);
    return 0;
  }
}

// ─── Convenience ─────────────────────────────────────────────────

/**
 * Get all songs from the database, formatted for the UI.
 * Maps DB field names to the shape expected by components.
 *
 * @returns {Promise<Array<{
 *   id: string, uri: string, filename: string, duration: number,
 *   title: string, artist: string, album: string, year: string|null,
 *   artwork: string|null, creationTime: number, modificationTime: number
 * }>>}
 */
export async function getSongsForUI() {
  await initDB();
  const songs = await getAllSongs();
  return songs.map((song) => ({
    id: song.id,
    uri: song.uri,
    filename: song.filename,
    duration: song.duration,
    title:
      song.title || song.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track",
    artist: song.artist || "Unknown Artist",
    album: song.album || "Unknown Album",
    year: song.year || null,
    artwork: song.artwork_path || null,
    creationTime: song.creation_time,
    modificationTime: song.modification_time,
    metadataLoaded: song.metadata_loaded === 1,
  }));
}
