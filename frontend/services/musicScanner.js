/**
 * Two-Phase Music Scanner with Incremental Sync
 *
 * Phase 1 — Fast Initial Load:
 *   Scan the device for audio files and insert basic file references
 *   (URI, filename, duration, file_size) into SQLite immediately.
 *
 * Phase 2 — Lazy Metadata Extraction:
 *   Process files in small batches, extract metadata (title, artist, album,
 *   album_artist, genre, year, track_number, disc_number, bitrate, sample_rate,
 *   channels, artwork), save artwork images to the filesystem, and update SQLite.
 *
 * Incremental Sync:
 *   On subsequent launches, detect new, modified, and deleted files
 *   by comparing modification_time and file_size.
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { InteractionManager } from "react-native";
import { getAudioMetadata } from "@missingcore/audio-metadata";
import {
  initDB,
} from "./database";
import { songRepository } from "./database/repositories/songRepository";
import { scanStateRepository } from "./database/repositories/scanStateRepository";
import { artworkManager } from "./media/artworkManager";

// ─── Configuration ───────────────────────────────────────────────

const SCAN_BATCH_SIZE = 200; // MediaLibrary pagination size
const METADATA_CHUNK_SIZE = 5; // Files per metadata extraction batch
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

function shouldSkipFile(uri) {
  return EXCLUDED_FOLDERS.some((folder) => uri.includes(folder));
}

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
      (asset) => !shouldSkipFile(asset.uri)
    );

    // Map to DB shape - include file_size for incremental sync
    const songs = filtered.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename,
      duration: asset.duration || 0,
      creation_time: asset.creationTime || null,
      modification_time: asset.modificationTime || null,
      file_size: asset.fileSize || null,
      media_type: 'audio',
    }));

    // Insert into SQLite using repository (batch insert with transaction)
    const inserted = await songRepository.insertBatch(songs);
    totalInserted += inserted;

    if (onProgress) {
      onProgress({ loaded: totalInserted, total: page.totalCount || null });
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  // Update scan state
  await scanStateRepository.setMusicScanState(totalInserted);

  console.log(
    `[MusicScanner] Phase 1 complete — ${totalInserted} files scanned`
  );
  return { granted: true, count: totalInserted };
}

// ─── Phase 2: Lazy Metadata Extraction ───────────────────────────

/**
 * Process songs that don't have metadata yet, in small batches.
 * Extracts title, artist, album, album_artist, genre, year, track_number,
 * disc_number, bitrate, sample_rate, channels, and artwork.
 * Artwork is saved as optimized files to the local filesystem.
 *
 * @param {(progress: { completed: number, total: number }) => void} [onProgress]
 * @param {() => void} [onBatchComplete] — called after each batch
 * @returns {Promise<number>} — number of songs processed
 */
export async function extractMetadataInBackground(onProgress, onBatchComplete) {
  const pending = await songRepository.getWithoutMetadata();
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
      "albumartist",
      "genre",
      "track",
      "disk",
      "bitrate",
      "sampleRate",
      "channels",
    ]);
    const metadata = data.metadata || {};

    // Handle artwork - save to cache and get local path
    let artworkPath = null;
    let thumbnailPath = null;
    if (metadata.artwork) {
      const result = await artworkManager.saveArtwork(song.id, metadata.artwork, 'audio');
      artworkPath = result.fullPath;
      thumbnailPath = result.thumbPath;
    }

    // Derive a title if metadata doesn't have one
    const title =
      metadata.name ||
      song.filename?.replace(/\.[^/.]+$/, "") ||
      "Unknown Track";

    // Extract album artist (TPE2 tag)
    const albumArtist = metadata.albumartist || metadata.artist;

    // Extract track number
    let trackNumber = null;
    if (metadata.track) {
      const track = Array.isArray(metadata.track) ? metadata.track[0] : metadata.track;
      trackNumber = typeof track === 'object' ? track.no : parseInt(track, 10);
    }

    // Extract disc number
    let discNumber = null;
    if (metadata.disk) {
      const disk = Array.isArray(metadata.disk) ? metadata.disk[0] : metadata.disk;
      discNumber = typeof disk === 'object' ? disk.no : parseInt(disk, 10);
    }

    // Extract bitrate, sample rate, channels
    const bitrate = metadata.bitrate ? parseInt(metadata.bitrate, 10) : null;
    const sampleRate = metadata.sampleRate ? parseInt(metadata.sampleRate, 10) : null;
    const channels = metadata.channels ? parseInt(metadata.channels, 10) : null;

    await songRepository.updateBatch([{
      id: song.id,
      title,
      artist: metadata.artist || "Unknown Artist",
      album: metadata.album || "Unknown Album",
      album_artist: albumArtist || null,
      genre: metadata.genre || null,
      year: metadata.year ? String(metadata.year) : null,
      track_number: trackNumber,
      disc_number: discNumber,
      bitrate,
      sample_rate: sampleRate,
      channels,
      artwork_path: artworkPath,
      thumbnail_path: thumbnailPath,
    }]);
  } catch (error) {
    // Gracefully handle missing metadata — mark as loaded with defaults
    console.log(
      `[MusicScanner] Metadata extraction failed for ${song.filename}:`,
      error?.message
    );
    const title = song.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track";
    await songRepository.updateBatch([{
      id: song.id,
      title,
      artist: "Unknown Artist",
      album: "Unknown Album",
      album_artist: null,
      genre: null,
      year: null,
      track_number: null,
      disc_number: null,
      bitrate: null,
      sample_rate: null,
      channels: null,
      artwork_path: null,
      thumbnail_path: null,
    }]);
  }
}

// ─── Incremental Sync ────────────────────────────────────────────

/**
 * Perform incremental sync: detect new, modified, and deleted files.
 * Compares modification_time and file_size to detect changes.
 *
 * @param {(progress: { new: number, modified: number, deleted: number }) => void} [onProgress]
 * @param {() => void} [onComplete] — called when sync completes
 * @returns {Promise<{ new: number, modified: number, deleted: number }>}
 */
export async function incrementalSync(onProgress, onComplete) {
  try {
    await initDB();

    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") return { new: 0, modified: 0, deleted: 0 };

    // Get all known files with metadata from database
    const knownFiles = await songRepository.getAllUrisWithMeta();
    console.log(`[MusicScanner] Incremental sync: ${knownFiles.size} known files in DB`);

    let newCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    let after = null;
    let hasNextPage = true;
    const seenUris = new Set();

    // Scan all files on device
    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: SCAN_BATCH_SIZE,
        after,
      });

      for (const asset of page.assets) {
        if (shouldSkipFile(asset.uri)) continue;
        seenUris.add(asset.uri);

        const known = knownFiles.get(asset.uri);
        const currentMtime = asset.modificationTime || 0;
        const currentSize = asset.fileSize || 0;

        if (!known) {
          // New file
          await songRepository.insertBatch([{
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename,
            duration: asset.duration || 0,
            creation_time: asset.creationTime || null,
            modification_time: asset.modificationTime || null,
            file_size: asset.fileSize || null,
            media_type: 'audio',
          }]);
          newCount++;
        } else if (
          known.modification_time !== currentMtime ||
          (known.file_size && known.file_size !== currentSize)
        ) {
          // Modified file - update basic info and mark for metadata re-extraction
          await songRepository.updateBatch([{
            id: known.id || asset.id,
            filename: asset.filename,
            duration: asset.duration || 0,
            modification_time: asset.modificationTime || null,
            file_size: asset.fileSize || null,
            metadata_loaded: 0, // Trigger re-extraction
          }]);
          modifiedCount++;
        }
        // If unchanged, do nothing
      }

      hasNextPage = page.hasNextPage;
      after = page.endCursor;
    }

    // Find deleted files (in DB but not on device)
    for (const [uri, meta] of knownFiles) {
      if (!seenUris.has(uri)) {
        // File deleted - could mark as missing or delete
        // For now, we'll delete from DB
        const song = await songRepository.getById(meta.id);
        if (song) {
          await songRepository.deleteBatch([song.id]);
          // Also cleanup artwork
          await artworkManager.cleanupArtwork(song.id);
        }
        deletedCount++;
      }
    }

    if (onProgress) {
      onProgress({ new: newCount, modified: modifiedCount, deleted: deletedCount });
    }

    if (newCount > 0 || modifiedCount > 0) {
      console.log(`[MusicScanner] Incremental sync: +${newCount} new, ~${modifiedCount} modified, -${deletedCount} deleted`);
      // Extract metadata for new/modified files
      await extractMetadataInBackground();
      if (onComplete) onComplete();
    } else {
      console.log("[MusicScanner] Incremental sync — no changes");
    }

    // Update scan state
    const totalCount = await songRepository.getCount();
    await scanStateRepository.setMusicScanState(totalCount);

    return { new: newCount, modified: modifiedCount, deleted: deletedCount };
  } catch (error) {
    console.warn("[MusicScanner] Incremental sync error:", error);
    return { new: 0, modified: 0, deleted: 0 };
  }
}

// ─── Background Sync (Legacy Compatibility) ──────────────────────

/**
 * Legacy background sync - now uses incremental sync
 * @deprecated Use incrementalSync instead
 */
export async function backgroundSync(onNewFilesFound) {
  const result = await incrementalSync();
  if (result.new > 0 && onNewFilesFound) {
    onNewFilesFound();
  }
  return result.new;
}

// ─── Convenience ─────────────────────────────────────────────────

/**
 * Get all songs from the database, formatted for the UI.
 * Maps DB field names to the shape expected by components.
 *
 * @returns {Promise<Array<{
 *   id: string, uri: string, filename: string, duration: number,
 *   title: string, artist: string, album: string, year: string|null,
 *   albumArtist: string|null, genre: string|null,
 *   trackNumber: number|null, discNumber: number|null,
 *   bitrate: number|null, sampleRate: number|null, channels: number|null,
 *   artwork: string|null, thumbnail: string|null,
 *   creationTime: number, modificationTime: number,
 *   metadataLoaded: boolean,
 *   favorite: boolean, playCount: number, playbackPosition: number
 * }>>}
 */
export async function getSongsForUI() {
  await initDB();
  const songs = await songRepository.getAll({ limit: 10000 }); // Large limit for compatibility
  return songs.map((song) => ({
    id: song.id,
    uri: song.uri,
    filename: song.filename,
    duration: song.duration,
    title:
      song.title || song.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track",
    artist: song.artist || "Unknown Artist",
    album: song.album || "Unknown Album",
    albumArtist: song.album_artist,
    genre: song.genre,
    year: song.year || null,
    trackNumber: song.track_number,
    discNumber: song.disc_number,
    bitrate: song.bitrate,
    sampleRate: song.sample_rate,
    channels: song.channels,
    artwork: song.artwork_path || null,
    thumbnail: song.thumbnail_path || null,
    creationTime: song.creation_time,
    modificationTime: song.modification_time,
    metadataLoaded: song.metadata_loaded === 1,
    favorite: song.favorite === 1,
    playCount: song.play_count || 0,
    playbackPosition: song.playback_position || 0,
  }));
}