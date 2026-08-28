/**
 * Two-Phase Music Scanner with Incremental Sync
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

// Hashing function for stable mediaKey
export function generateMediaKey(uri, fileSize, modificationTime) {
  const input = `${uri}_${fileSize || 0}_${modificationTime || 0}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// ─── Phase 1: Fast Scan ──────────────────────────────────────────

export async function scanMusicFiles(onProgress) {
  await initDB();

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("[MusicScanner] Media library permission not granted, scan aborted");
    return { granted: false, count: 0 };
  }

  let after = null;
  let hasNextPage = true;
  let totalInserted = 0;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: SCAN_BATCH_SIZE,
      after,
    });

    const filtered = page.assets.filter(
      (asset) => !shouldSkipFile(asset.uri)
    );

    const songs = filtered.map((asset) => {
      const mediaKey = generateMediaKey(asset.uri, asset.fileSize, asset.modificationTime);
      return {
        mediaKey,
        uri: asset.uri,
        filename: asset.filename,
        duration: asset.duration || 0,
        creation_time: asset.creationTime || null,
        modification_time: asset.modificationTime || null,
        file_size: asset.fileSize || null,
        media_type: 'audio',
      };
    });

    const inserted = await songRepository.insertBatch(songs);
    totalInserted += inserted;

    if (onProgress) {
      onProgress({ loaded: totalInserted, total: page.totalCount || null });
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  await scanStateRepository.setMusicScanState(totalInserted);

  console.log(`[MusicScanner] Phase 1 complete — ${totalInserted} files scanned`);
  return { granted: true, count: totalInserted };
}

// ─── Phase 2: Lazy Metadata Extraction ───────────────────────────

export async function extractMetadataInBackground(onProgress, onBatchComplete) {
  const pending = await songRepository.getWithoutMetadata();
  if (pending.length === 0) {
    console.log("[MusicScanner] Phase 2 — no pending metadata extraction");
    return 0;
  }

  console.log(`[MusicScanner] Phase 2 — extracting metadata for ${pending.length} files`);
  let completed = 0;

  for (let i = 0; i < pending.length; i += METADATA_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + METADATA_CHUNK_SIZE);

    await new Promise((resolve) => {
      InteractionManager.runAfterInteractions(resolve);
    });

    for (const song of chunk) {
      await _extractAndSaveSongMetadata(song);
    }

    completed += chunk.length;

    if (onProgress) {
      onProgress({ completed, total: pending.length });
    }

    if (onBatchComplete) {
      onBatchComplete();
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return completed;
}

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

    let artworkPath = null;
    let thumbnailPath = null;
    if (metadata.artwork) {
      const result = await artworkManager.saveArtwork(song.media_key || song.mediaKey, metadata.artwork, 'audio');
      artworkPath = result.fullPath;
      thumbnailPath = result.thumbPath;
    }

    const title =
      metadata.name ||
      song.filename?.replace(/\.[^/.]+$/, "") ||
      "Unknown Track";

    const albumArtist = metadata.albumartist || metadata.artist;

    let trackNumber = null;
    if (metadata.track) {
      const track = Array.isArray(metadata.track) ? metadata.track[0] : metadata.track;
      trackNumber = typeof track === 'object' ? track.no : parseInt(track, 10);
    }

    let discNumber = null;
    if (metadata.disk) {
      const disk = Array.isArray(metadata.disk) ? metadata.disk[0] : metadata.disk;
      discNumber = typeof disk === 'object' ? disk.no : parseInt(disk, 10);
    }

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
      metadata_loaded: 1,
    }]);
  } catch (error) {
    console.log(`[MusicScanner] Metadata extraction failed for ${song.filename}:`, error?.message);
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
      metadata_loaded: 1,
    }]);
  }
}

// ─── Incremental Sync ────────────────────────────────────────────

export async function incrementalSync(onProgress, onComplete) {
  try {
    await initDB();

    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") return { new: 0, modified: 0, deleted: 0 };

    const knownFiles = await songRepository.getAllUrisWithMeta();
    console.log(`[MusicScanner] Incremental sync: ${knownFiles.size} known files in DB`);

    let newCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    let after = null;
    let hasNextPage = true;
    const seenUris = new Set();

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

        const mediaKey = generateMediaKey(asset.uri, asset.fileSize, asset.modificationTime);

        if (!known) {
          await songRepository.insertBatch([{
            mediaKey,
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
          await songRepository.updateBatch([{
            id: known.id,
            media_key: mediaKey,
            filename: asset.filename,
            duration: asset.duration || 0,
            modification_time: asset.modificationTime || null,
            file_size: asset.fileSize || null,
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
        const song = await songRepository.getById(meta.id);
        if (song) {
          await songRepository.deleteBatch([song.id]);
          await artworkManager.cleanupArtwork(song.media_key || song.mediaKey);
        }
        deletedCount++;
      }
    }

    if (onProgress) {
      onProgress({ new: newCount, modified: modifiedCount, deleted: deletedCount });
    }

    if (newCount > 0 || modifiedCount > 0) {
      console.log(`[MusicScanner] Incremental sync: +${newCount} new, ~${modifiedCount} modified, -${deletedCount} deleted`);
      await extractMetadataInBackground();
      if (onComplete) onComplete();
    }

    const totalCount = await songRepository.getCount();
    await scanStateRepository.setMusicScanState(totalCount);

    return { new: newCount, modified: modifiedCount, deleted: deletedCount };
  } catch (error) {
    console.warn("[MusicScanner] Incremental sync error:", error);
    return { new: 0, modified: 0, deleted: 0 };
  }
}

export async function getSongsForUI() {
  await initDB();
  const songs = await songRepository.getAll({ limit: 10000 });
  return songs.map((song) => ({
    dbId: song.id,
    id: song.id,
    mediaKey: song.media_key,
    uri: song.uri,
    filename: song.filename,
    duration: song.duration,
    title: song.title || song.filename?.replace(/\.[^/.]+$/, "") || "Unknown Track",
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