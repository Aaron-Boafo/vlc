/**
 * Artwork Manager
 *
 * Handles extraction, caching, and thumbnail generation for media artwork.
 * Supports both audio (album art) and video (thumbnails/posters).
 */

import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const ARTWORK_DIR = `${FileSystem.documentDirectory}media-cache/artwork/`;
const THUMBNAIL_DIR = `${FileSystem.documentDirectory}media-cache/thumbnails/`;

// Ensure directories exist
async function ensureDirs() {
  await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true }).catch(() => {});
  await FileSystem.makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true }).catch(() => {});
}

/**
 * Save artwork from metadata (base64 or data URI) to filesystem.
 * Generates both full-size artwork and a thumbnail.
 *
 * @param {string} mediaId - Unique media identifier
 * @param {string} artworkData - Base64 string or data URI
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<{fullPath: string|null, thumbPath: string|null}>}
 */
export async function saveArtwork(mediaId, artworkData, type = 'audio') {
  await ensureDirs();

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
      return { fullPath: artworkData, thumbPath: artworkData };
    }

    // Clean up any whitespace in base64
    base64Data = base64Data.replace(/\s/g, "");

    const ext = type === 'video' ? '.jpg' : '.jpg';
    const fullPath = `${ARTWORK_DIR}${mediaId}${ext}`;
    const thumbPath = `${THUMBNAIL_DIR}${mediaId}_thumb${ext}`;

    // Write full-size artwork
    await FileSystem.writeAsStringAsync(fullPath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Generate thumbnail (200x200)
    try {
      const result = await ImageManipulator.manipulateAsync(
        fullPath,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.moveAsync({
        from: result.uri,
        to: thumbPath,
      });
    } catch (thumbError) {
      console.log(`[ArtworkManager] Thumbnail generation failed for ${mediaId}:`, thumbError.message);
      // Fallback: copy full as thumb
      try {
        await FileSystem.copyAsync({ from: fullPath, to: thumbPath });
      } catch (e) {
        // Ignore
      }
    }

    return { fullPath, thumbPath };
  } catch (error) {
    console.log(
      `[ArtworkManager] Failed to save artwork for ${mediaId}:`,
      error?.message
    );
    return { fullPath: null, thumbPath: null };
  }
}

/**
 * Save video thumbnail from temporary URI to persistent storage.
 * Generates both full-size and thumbnail versions.
 *
 * @param {string} mediaId - Unique media identifier
 * @param {string} tempUri - Temporary thumbnail URI from expo-video-thumbnails
 * @returns {Promise<{fullPath: string|null, thumbPath: string|null}>}
 */
export async function saveVideoThumbnail(mediaId, tempUri) {
  await ensureDirs();

  try {
    const fileInfo = await FileSystem.getInfoAsync(tempUri);
    if (!fileInfo.exists) {
      return { fullPath: null, thumbPath: null };
    }

    const fullPath = `${ARTWORK_DIR}${mediaId}.jpg`;
    const thumbPath = `${THUMBNAIL_DIR}${mediaId}_thumb.jpg`;

    // Copy to persistent location
    await FileSystem.copyAsync({
      from: tempUri,
      to: fullPath,
    });

    // Generate thumbnail (200x200)
    try {
      const result = await ImageManipulator.manipulateAsync(
        fullPath,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.moveAsync({
        from: result.uri,
        to: thumbPath,
      });
    } catch (thumbError) {
      console.log(`[ArtworkManager] Video thumbnail generation failed for ${mediaId}:`, thumbError.message);
      try {
        await FileSystem.copyAsync({ from: fullPath, to: thumbPath });
      } catch (e) {
        // Ignore
      }
    }

    return { fullPath, thumbPath };
  } catch (error) {
    console.log(
      `[ArtworkManager] Failed to save video thumbnail for ${mediaId}:`,
      error?.message
    );
    return { fullPath: null, thumbPath: null };
  }
}

/**
 * Check if artwork exists in cache.
 *
 * @param {string} mediaId
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<{fullPath: string|null, thumbPath: string|null}>}
 */
export async function getArtworkPaths(mediaId, type = 'audio') {
  const ext = type === 'video' ? '.jpg' : '.jpg';
  const fullPath = `${ARTWORK_DIR}${mediaId}${ext}`;
  const thumbPath = `${THUMBNAIL_DIR}${mediaId}_thumb${ext}`;

  const [fullInfo, thumbInfo] = await Promise.all([
    FileSystem.getInfoAsync(fullPath),
    FileSystem.getInfoAsync(thumbPath),
  ]);

  return {
    fullPath: fullInfo.exists ? fullPath : null,
    thumbPath: thumbInfo.exists ? thumbPath : null,
  };
}

/**
 * Validate and get artwork paths - checks if files actually exist.
 * If missing, returns null so caller can regenerate.
 *
 * @param {string} mediaId
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<{fullPath: string|null, thumbPath: string|null}>}
 */
export async function validateArtworkCache(mediaId, type = 'audio') {
  const paths = await getArtworkPaths(mediaId, type);
  if (paths.fullPath || paths.thumbPath) {
    return paths;
  }
  return { fullPath: null, thumbPath: null };
}

/**
 * Cleanup artwork files for a media item.
 *
 * @param {string} mediaId
 * @param {string} type - 'audio' or 'video'
 */
export async function cleanupArtwork(mediaId, type = 'audio') {
  const ext = type === 'video' ? '.jpg' : '.jpg';
  const files = [
    `${ARTWORK_DIR}${mediaId}${ext}`,
    `${THUMBNAIL_DIR}${mediaId}_thumb${ext}`,
  ];

  await Promise.all(
    files.map((file) =>
      FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {})
    )
  );
}

/**
 * Get artwork URI for display in React Native Image component.
 * Returns file:// URI for local files.
 *
 * @param {string} mediaId
 * @param {boolean} thumbnail - Whether to return thumbnail (true) or full (false)
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<string|null>}
 */
export async function getArtworkUri(mediaId, thumbnail = false, type = 'audio') {
  const paths = await getArtworkPaths(mediaId, type);
  const path = thumbnail ? paths.thumbPath : paths.fullPath;
  if (!path) return null;
  // Ensure file:// scheme for React Native
  return path.startsWith('file://') ? path : `file://${path}`;
}

export const artworkManager = {
  saveArtwork,
  saveVideoThumbnail,
  getArtworkPaths,
  validateArtworkCache,
  cleanupArtwork,
  getArtworkUri,
};