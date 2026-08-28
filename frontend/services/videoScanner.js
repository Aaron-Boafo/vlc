/**
 * Two-Phase Video Scanner with Incremental Sync
 *
 * Phase 1 — Fast Initial Load:
 *   Scan the device for video files and insert basic file references
 *   (URI, filename, duration, dimensions, file_size) into SQLite immediately.
 *
 * Phase 2 — Lazy Thumbnail Extraction:
 *   Process videos in small batches. Generate a thumbnail
 *   via expo-video-thumbnails, save it as a persistent file via
 *   expo-file-system, and store that path in SQLite.
 *
 * Incremental Sync:
 *   On subsequent launches, detect new, modified, and deleted files
 *   by comparing modification_time and file_size.
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { initDB } from "./database";
import { videoRepository } from "./database/repositories/videoRepository";
import { scanStateRepository } from "./database/repositories/scanStateRepository";
import { artworkManager } from "./media/artworkManager";

const SCAN_BATCH_SIZE = 200; // MediaLibrary pagination size
const THUMBNAIL_CHUNK_SIZE = 5; // Videos per thumbnail extraction batch

// Folders to skip during scanning
const EXCLUDED_FOLDERS = [
  "/WhatsApp/Media/WhatsApp Video/Sent",
  "/WhatsApp/Media/WhatsApp Video/Private",
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
 * Request permissions and scan for all video files on the device.
 * Inserts basic file references into SQLite immediately.
 *
 * @param {(progress: { loaded: number, total: number | null }) => void} [onProgress]
 * @returns {Promise<{ granted: boolean, count: number }>}
 */
export async function scanVideoFiles(onProgress) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("📹 Media library permission not granted");
    return { granted: false, count: 0 };
  }

  console.log("📹 Phase 1: Starting fast video scan...");

  await initDB();

  let after = null;
  let hasNextPage = true;
  let endCursor;
  let totalInserted = 0;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: SCAN_BATCH_SIZE,
      after: endCursor,
      sortBy: [MediaLibrary.SortBy.modificationTime],
    });

    const filtered = page.assets.filter(
      (asset) => !shouldSkipFile(asset.uri)
    );

    // Map to DB rows - include file_size for incremental sync
    const videoRows = filtered.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename || "Unknown",
      duration: asset.duration || 0,
      width: asset.width || 0,
      height: asset.height || 0,
      file_size: asset.fileSize || 0,
      creation_time: asset.creationTime || null,
      modification_time: asset.modificationTime || null,
    }));

    // Bulk insert into SQLite using repository
    const inserted = await videoRepository.insertBatch(videoRows);
    totalInserted += inserted;

    hasNextPage = page.hasNextPage;
    endCursor = page.endCursor;

    if (onProgress) {
      onProgress({ loaded: totalInserted, total: page.totalCount });
    }
  }

  await scanStateRepository.setVideoScanState(totalInserted);

  console.log(`📹 Phase 1 complete: ${totalInserted} videos in SQLite`);
  if (totalInserted === 0) {
    console.warn(
      "📹 Media library returned 0 videos — the device gallery appears empty or media is unavailable. Add videos to the device, confirm media library permission, then refresh to re-scan."
    );
  }
  return { granted: true, count: totalInserted };
}

// ─── Phase 2: Lazy Thumbnail Extraction ──────────────────────────

/**
 * Process videos that don't have thumbnails yet, in small batches.
 * Generates a thumbnail at 1.5s, saves as persistent file.
 *
 * @param {(progress: { completed: number, total: number }) => void} [onProgress]
 * @param {() => void} [onBatchComplete] — called after each batch
 * @returns {Promise<number>} — number of videos processed
 */
export async function extractThumbnailsInBackground(
  onProgress,
  onBatchComplete
) {
  const pending = await videoRepository.getWithoutThumbnails();
  if (pending.length === 0) {
    console.log("📹 Phase 2: All thumbnails already extracted");
    return 0;
  }

  console.log(
    `📹 Phase 2: Extracting thumbnails for ${pending.length} videos...`
  );
  let processed = 0;

  for (let i = 0; i < pending.length; i += THUMBNAIL_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + THUMBNAIL_CHUNK_SIZE);

    // Process chunk sequentially - expo-sqlite uses a single connection,
    // so parallel writers overlap BEGIN/COMMIT and throw nested-transaction errors
    for (const video of chunk) {
      await _generateAndSaveThumbnail(video);
    }

    processed += chunk.length;

    if (onProgress) {
      onProgress({ completed: processed, total: pending.length });
    }
    if (onBatchComplete) {
      onBatchComplete();
    }

    // Small delay between batches to keep UI responsive
    if (i + THUMBNAIL_CHUNK_SIZE < pending.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`📹 Phase 2 complete: ${processed} thumbnails generated`);
  return processed;
}

/**
 * Generate a thumbnail for a single video and save to filesystem.
 * @param {{ id: string, uri: string, filename: string }} video
 * @private
 */
async function _generateAndSaveThumbnail(video) {
  try {
    // Generate thumbnail at 1.5 seconds
    const { uri: tempUri } = await VideoThumbnails.getThumbnailAsync(
      video.uri,
      {
        time: 1500,
        quality: 0.7,
      }
    );

    if (!tempUri) {
      console.warn(`📹 No thumbnail generated for ${video.filename}`);
      // Mark as processed to avoid retrying indefinitely
      await videoRepository.updateBatch([{ id: video.id, metadata_loaded: 1, thumbnail_path: null }]);
      return;
    }

    // Save using artwork manager (handles copying and thumbnail generation)
    const result = await artworkManager.saveVideoThumbnail(video.id, tempUri);

    // Update database with persistent paths
    await videoRepository.updateBatch([{
      id: video.id,
      thumbnail_path: result.fullPath,
      metadata_loaded: 1,
    }]);
  } catch (error) {
    console.warn(
      `📹 Thumbnail extraction failed for ${video.filename}:`,
      error.message
    );
    // Mark as processed (with null) to avoid infinite retries
    try {
      await videoRepository.updateBatch([{ id: video.id, metadata_loaded: 1, thumbnail_path: null }]);
    } catch (dbError) {
      console.warn("📹 Failed to mark video as processed:", dbError.message);
    }
  }
}

// ─── Incremental Sync ────────────────────────────────────────────

/**
 * Perform incremental sync: detect new, modified, and deleted video files.
 * Compares modification_time and file_size to detect changes.
 *
 * @param {(progress: { new: number, modified: number, deleted: number }) => void} [onProgress]
 * @param {() => void} [onComplete] — called when sync completes
 * @returns {Promise<{ new: number, modified: number, deleted: number }>}
 */
export async function incrementalVideoSync(onProgress, onComplete) {
  try {
    await initDB();

    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") return { new: 0, modified: 0, deleted: 0 };

    // Get all known files with metadata from database
    const knownFiles = await videoRepository.getAllUrisWithMeta();
    console.log(`📹 Incremental sync: ${knownFiles.size} known videos in DB`);

    let newCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    let after = null;
    let hasNextPage = true;
    const seenUris = new Set();

    // Scan all files on device
    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        first: SCAN_BATCH_SIZE,
        after,
        sortBy: [MediaLibrary.SortBy.modificationTime],
      });

      for (const asset of page.assets) {
        if (shouldSkipFile(asset.uri)) continue;
        seenUris.add(asset.uri);

        const known = knownFiles.get(asset.uri);
        const currentMtime = asset.modificationTime || 0;
        const currentSize = asset.fileSize || 0;

        if (!known) {
          // New file
          await videoRepository.insertBatch([{
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename || "Unknown",
            duration: asset.duration || 0,
            width: asset.width || 0,
            height: asset.height || 0,
            file_size: asset.fileSize || 0,
            creation_time: asset.creationTime || null,
            modification_time: asset.modificationTime || null,
          }]);
          newCount++;
        } else if (
          known.modification_time !== currentMtime ||
          (known.file_size && known.file_size !== currentSize)
        ) {
          // Modified file - update basic info and mark for thumbnail re-extraction
          await videoRepository.updateBatch([{
            id: known.id || asset.id,
            filename: asset.filename || "Unknown",
            duration: asset.duration || 0,
            width: asset.width || 0,
            height: asset.height || 0,
            modification_time: asset.modificationTime || null,
            file_size: asset.fileSize || 0,
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
        const video = await videoRepository.getById(meta.id);
        if (video) {
          await videoRepository.deleteBatch([video.id]);
          await artworkManager.cleanupArtwork(video.id, 'video');
        }
        deletedCount++;
      }
    }

    if (onProgress) {
      onProgress({ new: newCount, modified: modifiedCount, deleted: deletedCount });
    }

    if (newCount > 0 || modifiedCount > 0) {
      console.log(`📹 Incremental sync: +${newCount} new, ~${modifiedCount} modified, -${deletedCount} deleted`);
      // Extract thumbnails for new/modified files
      await extractThumbnailsInBackground();
      if (onComplete) onComplete();
    } else {
      console.log("📹 Incremental sync — no changes");
    }

    // Update scan state
    const totalCount = await videoRepository.getCount();
    await scanStateRepository.setVideoScanState(totalCount);

    return { new: newCount, modified: modifiedCount, deleted: deletedCount };
  } catch (error) {
    console.warn("📹 Incremental sync error:", error);
    return { new: 0, modified: 0, deleted: 0 };
  }
}

// ─── Background Sync (Legacy Compatibility) ──────────────────────

/**
 * Legacy background sync - now uses incremental sync
 * @deprecated Use incrementalVideoSync instead
 */
export async function videoBackgroundSync(onNewFilesFound) {
  const result = await incrementalVideoSync();
  if (result.new > 0 && onNewFilesFound) {
    onNewFilesFound();
  }
  return result.new;
}

// ─── Convenience ─────────────────────────────────────────────────

/**
 * Get all videos from the database, formatted for the UI.
 * Maps DB field names to the shape expected by components.
 *
 * @returns {Promise<Array<{
 *   id: string, uri: string, filename: string, duration: number,
 *   width: number, height: number, fileSize: number,
 *   title: string|null, artist: string|null, album: string|null,
 *   genre: string|null, year: string|null,
 *   thumbnail: string|null, fullArtwork: string|null,
 *   creationTime: number, modificationTime: number,
 *   metadataLoaded: boolean,
 *   favorite: boolean, playCount: number, playbackPosition: number
 * }>>}
 */
export async function getVideosForUI() {
  await initDB();
  const rows = await videoRepository.getAll({ limit: 10000 });
  return rows.map((row) => ({
    id: row.id,
    uri: row.uri,
    filename: row.filename,
    duration: row.duration || 0,
    width: row.width || 0,
    height: row.height || 0,
    fileSize: row.file_size || 0,
    title: row.title,
    artist: row.artist,
    album: row.album,
    genre: row.genre,
    year: row.year,
    thumbnail: row.thumbnail_path || null,
    fullArtwork: row.thumbnail_path || null, // Same for now
    creationTime: row.creation_time || 0,
    modificationTime: row.modification_time || 0,
    metadataLoaded: row.metadata_loaded === 1,
    favorite: row.favorite === 1,
    playCount: row.play_count || 0,
    playbackPosition: row.playback_position || 0,
  }));
}