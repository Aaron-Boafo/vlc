/**
 * Two-Phase Video Scanner with Incremental Sync
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { initDB } from "./database";
import { videoRepository } from "./database/repositories/videoRepository";
import { scanStateRepository } from "./database/repositories/scanStateRepository";
import { artworkManager } from "./media/artworkManager";
import { generateMediaKey } from "./musicScanner";

const SCAN_BATCH_SIZE = 200; // MediaLibrary pagination size
const THUMBNAIL_CHUNK_SIZE = 5; // Videos per thumbnail extraction batch

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

    const videoRows = filtered.map((asset) => {
      const mediaKey = generateMediaKey(asset.uri, asset.fileSize, asset.modificationTime);
      return {
        mediaKey,
        uri: asset.uri,
        filename: asset.filename || "Unknown",
        duration: asset.duration || 0,
        width: asset.width || 0,
        height: asset.height || 0,
        file_size: asset.fileSize || 0,
        creation_time: asset.creationTime || null,
        modification_time: asset.modificationTime || null,
      };
    });

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
  return { granted: true, count: totalInserted };
}

// ─── Phase 2: Lazy Thumbnail Extraction ──────────────────────────

export async function extractThumbnailsInBackground(
  onProgress,
  onBatchComplete
) {
  const pending = await videoRepository.getWithoutThumbnails();
  if (pending.length === 0) {
    console.log("📹 Phase 2: All thumbnails already extracted");
    return 0;
  }

  console.log(`📹 Phase 2: Extracting thumbnails for ${pending.length} videos...`);
  let processed = 0;

  for (let i = 0; i < pending.length; i += THUMBNAIL_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + THUMBNAIL_CHUNK_SIZE);

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

    if (i + THUMBNAIL_CHUNK_SIZE < pending.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return processed;
}

async function _generateAndSaveThumbnail(video) {
  try {
    const { uri: tempUri } = await VideoThumbnails.getThumbnailAsync(
      video.uri,
      {
        time: 1500,
        quality: 0.7,
      }
    );

    if (!tempUri) {
      console.warn(`📹 No thumbnail generated for ${video.filename}`);
      await videoRepository.updateBatch([{ id: video.id, metadata_loaded: 1, thumbnail_path: null }]);
      return;
    }

    const result = await artworkManager.saveVideoThumbnail(video.media_key || video.mediaKey, tempUri);

    await videoRepository.updateBatch([{
      id: video.id,
      thumbnail_path: result.fullPath,
      metadata_loaded: 1,
    }]);
  } catch (error) {
    console.warn(`📹 Thumbnail extraction failed for ${video.filename}:`, error.message);
    try {
      await videoRepository.updateBatch([{ id: video.id, metadata_loaded: 1, thumbnail_path: null }]);
    } catch (dbError) {
      console.warn("📹 Failed to mark video as processed:", dbError.message);
    }
  }
}

// ─── Incremental Sync ────────────────────────────────────────────

export async function incrementalVideoSync(onProgress, onComplete) {
  try {
    await initDB();

    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") return { new: 0, modified: 0, deleted: 0 };

    const knownFiles = await videoRepository.getAllUrisWithMeta();
    console.log(`📹 Incremental sync: ${knownFiles.size} known videos in DB`);

    let newCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    let after = null;
    let hasNextPage = true;
    const seenUris = new Set();

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

        const mediaKey = generateMediaKey(asset.uri, asset.fileSize, asset.modificationTime);

        if (!known) {
          await videoRepository.insertBatch([{
            mediaKey,
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
          await videoRepository.updateBatch([{
            id: known.id,
            media_key: mediaKey,
            filename: asset.filename || "Unknown",
            duration: asset.duration || 0,
            width: asset.width || 0,
            height: asset.height || 0,
            modification_time: asset.modificationTime || null,
            file_size: asset.fileSize || 0,
            metadata_loaded: 0,
          }]);
          modifiedCount++;
        }
      }

      hasNextPage = page.hasNextPage;
      after = page.endCursor;
    }

    for (const [uri, meta] of knownFiles) {
      if (!seenUris.has(uri)) {
        const video = await videoRepository.getById(meta.id);
        if (video) {
          await videoRepository.deleteBatch([video.id]);
          await artworkManager.cleanupArtwork(video.media_key || video.mediaKey, 'video');
        }
        deletedCount++;
      }
    }

    if (onProgress) {
      onProgress({ new: newCount, modified: modifiedCount, deleted: deletedCount });
    }

    if (newCount > 0 || modifiedCount > 0) {
      console.log(`📹 Incremental sync: +${newCount} new, ~${modifiedCount} modified, -${deletedCount} deleted`);
      await extractThumbnailsInBackground();
      if (onComplete) onComplete();
    }

    const totalCount = await videoRepository.getCount();
    await scanStateRepository.setVideoScanState(totalCount);

    return { new: newCount, modified: modifiedCount, deleted: deletedCount };
  } catch (error) {
    console.warn("📹 Incremental sync error:", error);
    return { new: 0, modified: 0, deleted: 0 };
  }
}

export async function getVideosForUI() {
  await initDB();
  const rows = await videoRepository.getAll({ limit: 10000 });
  return rows.map((row) => ({
    dbId: row.id,
    id: row.id,
    mediaKey: row.media_key,
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
    fullArtwork: row.thumbnail_path || null,
    creationTime: row.creation_time || 0,
    modificationTime: row.modification_time || 0,
    metadataLoaded: row.metadata_loaded === 1,
    favorite: row.favorite === 1,
    playCount: row.play_count || 0,
    playbackPosition: row.playback_position || 0,
  }));
}