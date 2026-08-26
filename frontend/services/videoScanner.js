/**
 * Two-Phase Video Scanner
 *
 * Phase 1 — Fast Initial Load:
 *   Scan the device for video files and insert basic file references
 *   (URI, filename, duration, dimensions) into SQLite immediately.
 *
 * Phase 2 — Lazy Thumbnail Extraction:
 *   Process videos in small batches (5 at a time). Generate a thumbnail
 *   via expo-video-thumbnails, save it as a persistent .png via
 *   expo-file-system, and store that path in SQLite.
 *
 * Background Sync:
 *   On subsequent launches, detect new files added since the last scan
 *   and process them without blocking the UI.
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  insertVideos,
  getAllVideos,
  getVideosWithoutThumbnails,
  updateVideoThumbnail,
  getAllVideoUris,
  getVideoScanTime,
  setVideoScanTime,
} from "./database";

const SCAN_BATCH_SIZE = 200; // MediaLibrary pagination size
const THUMBNAIL_CHUNK_SIZE = 5; // Videos per thumbnail extraction batch
const THUMBNAILS_DIR = `${FileSystem.documentDirectory}video_thumbnails/`;

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
  const allAssets = [];
  let hasNextPage = true;
  let endCursor;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: SCAN_BATCH_SIZE,
      after: endCursor,
      sortBy: [MediaLibrary.SortBy.modificationTime],
    });

    const filtered = page.assets.filter(
      (asset) => !EXCLUDED_FOLDERS.some((folder) => asset.uri.includes(folder))
    );

    allAssets.push(...filtered);
    hasNextPage = page.hasNextPage;
    endCursor = page.endCursor;

    if (onProgress) {
      onProgress({ loaded: allAssets.length, total: page.totalCount });
    }
  }

  console.log(`📹 Found ${allAssets.length} video files after filtering`);

  // Map to DB rows
  const videoRows = allAssets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename || "Unknown",
    duration: asset.duration || 0,
    width: asset.width || 0,
    height: asset.height || 0,
    creation_time: asset.creationTime || null,
    modification_time: asset.modificationTime || null,
  }));

  // Bulk insert into SQLite
  await insertVideos(videoRows);
  await setVideoScanTime(videoRows.length);

  console.log(`📹 Phase 1 complete: ${videoRows.length} videos in SQLite`);
  return { granted: true, count: videoRows.length };
}

// ─── Phase 2: Lazy Thumbnail Extraction ──────────────────────────

/**
 * Process videos that don't have thumbnails yet, in small batches.
 * Generates a thumbnail at 1.5s, saves as persistent .png.
 *
 * @param {(progress: { completed: number, total: number }) => void} [onProgress]
 * @param {() => void} [onBatchComplete] — called after each batch
 * @returns {Promise<number>} — number of videos processed
 */
export async function extractThumbnailsInBackground(
  onProgress,
  onBatchComplete
) {
  // Ensure thumbnails directory exists
  const dirInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, {
      intermediates: true,
    });
  }

  const pending = await getVideosWithoutThumbnails();
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

    // Process chunk in parallel
    await Promise.all(chunk.map((video) => _generateAndSaveThumbnail(video)));

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
      await updateVideoThumbnail(video.id, null);
      return;
    }

    // Move/copy to persistent location
    const persistentPath = `${THUMBNAILS_DIR}${video.id.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}.png`;

    // Check if tempUri is a file path — copy to persistent storage
    const fileInfo = await FileSystem.getInfoAsync(tempUri);
    if (fileInfo.exists) {
      await FileSystem.copyAsync({
        from: tempUri,
        to: persistentPath,
      });
    } else {
      // Fallback: just use the temp URI directly
      await updateVideoThumbnail(video.id, tempUri);
      return;
    }

    // Update database with persistent path
    await updateVideoThumbnail(video.id, persistentPath);
  } catch (error) {
    console.warn(
      `📹 Thumbnail extraction failed for ${video.filename}:`,
      error.message
    );
    // Mark as processed (with null) to avoid infinite retries
    try {
      await updateVideoThumbnail(video.id, null);
    } catch (dbError) {
      console.warn("📹 Failed to mark video as processed:", dbError.message);
    }
  }
}

// ─── Background Sync ─────────────────────────────────────────────

/**
 * Check for new video files added since the last scan.
 * Only inserts new files and generates their thumbnails.
 * Designed to run silently in the background.
 *
 * @param {() => void} [onNewFilesFound] — called when new videos are discovered
 * @returns {Promise<number>} — number of new files found
 */
export async function videoBackgroundSync(onNewFilesFound) {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return 0;

    const lastScan = await getVideoScanTime();
    if (!lastScan) {
      console.log("📹 Sync: No previous scan found, skipping background sync");
      return 0;
    }

    console.log("📹 Background sync: checking for new videos...");

    // Get all known URIs for fast duplicate checking
    const knownUris = await getAllVideoUris();

    // Scan for all videos
    const allAssets = [];
    let hasNextPage = true;
    let endCursor;

    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        first: SCAN_BATCH_SIZE,
        after: endCursor,
        sortBy: [MediaLibrary.SortBy.modificationTime],
      });

      const filtered = page.assets.filter(
        (asset) =>
          !EXCLUDED_FOLDERS.some((folder) => asset.uri.includes(folder))
      );

      allAssets.push(...filtered);
      hasNextPage = page.hasNextPage;
      endCursor = page.endCursor;
    }

    // Find new files
    const newAssets = allAssets.filter((asset) => !knownUris.has(asset.uri));

    if (newAssets.length === 0) {
      console.log("📹 Background sync: no new videos found");
      return 0;
    }

    console.log(`📹 Background sync: found ${newAssets.length} new videos`);

    // Insert new videos
    const newRows = newAssets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename || "Unknown",
      duration: asset.duration || 0,
      width: asset.width || 0,
      height: asset.height || 0,
      creation_time: asset.creationTime || null,
      modification_time: asset.modificationTime || null,
    }));

    await insertVideos(newRows);
    await setVideoScanTime(allAssets.length);

    if (onNewFilesFound) {
      onNewFilesFound();
    }

    // Generate thumbnails for new files in background
    const dirInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, {
        intermediates: true,
      });
    }

    for (const video of newRows) {
      await _generateAndSaveThumbnail(video);
    }

    console.log(
      `📹 Background sync complete: ${newAssets.length} new videos processed`
    );
    return newAssets.length;
  } catch (error) {
    console.warn("📹 Background sync error:", error);
    return 0;
  }
}

// ─── Convenience ─────────────────────────────────────────────────

/**
 * Get all videos from the database, formatted for the UI.
 * Maps DB field names to the shape expected by components.
 *
 * @returns {Promise<Array<{
 *   id: string, uri: string, filename: string, duration: number,
 *   width: number, height: number, thumbnail: string|null,
 *   creationTime: number, modificationTime: number
 * }>>}
 */
export async function getVideosForUI() {
  const rows = await getAllVideos();
  return rows.map((row) => ({
    id: row.id,
    uri: row.uri,
    filename: row.filename,
    duration: row.duration || 0,
    width: row.width || 0,
    height: row.height || 0,
    fileSize: row.file_size || 0,
    thumbnail: row.thumbnail_path || null,
    creationTime: row.creation_time || 0,
    modificationTime: row.modification_time || 0,
  }));
}
