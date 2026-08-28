import { initDB, getDB } from '../services/database';
import { songRepository } from '../services/database/repositories/songRepository';
import { videoRepository } from '../services/database/repositories/videoRepository';
import { generateMediaKey } from '../services/musicScanner';

export async function runIdCollisionTests() {
  console.log('🧪 Starting ID Collision & Identity system tests...\n');

  try {
    const db = await initDB();

    // Clear existing data in unified media table
    console.log('Step 1: Clearing media table...');
    await db.execAsync('DELETE FROM media;');
    await db.execAsync('DELETE FROM media_fts;');

    // Test 1: Song and Video have the same external ID
    console.log('\nTest 1: Inserting song and video with same external ID...');
    const songAsset = {
      id: 'asset-123',
      uri: 'file:///storage/emulated/0/Music/song1.mp3',
      filename: 'song1.mp3',
      fileSize: 5000000,
      modificationTime: 1700000000
    };

    const videoAsset = {
      id: 'asset-123', // Same external ID
      uri: 'file:///storage/emulated/0/Video/video1.mp4',
      filename: 'video1.mp4',
      fileSize: 45000000,
      modificationTime: 1700000000
    };

    const songKey = generateMediaKey(songAsset.uri, songAsset.fileSize, songAsset.modificationTime);
    const videoKey = generateMediaKey(videoAsset.uri, videoAsset.fileSize, videoAsset.modificationTime);

    console.log(`- Song mediaKey: ${songKey}`);
    console.log(`- Video mediaKey: ${videoKey}`);

    await songRepository.insertBatch([{
      mediaKey: songKey,
      uri: songAsset.uri,
      filename: songAsset.filename,
      duration: 180,
      file_size: songAsset.fileSize,
      creation_time: 1700000000,
      modification_time: songAsset.modificationTime
    }]);

    await videoRepository.insertBatch([{
      mediaKey: videoKey,
      uri: videoAsset.uri,
      filename: videoAsset.filename,
      duration: 3600,
      width: 1920,
      height: 1080,
      file_size: videoAsset.fileSize,
      creation_time: 1700000000,
      modification_time: videoAsset.modificationTime
    }]);

    // Retrieve both from the database
    const dbSong = await songRepository.getByMediaKey(songKey);
    const dbVideo = await videoRepository.getByMediaKey(videoKey);

    console.log('- Retrieved Song:', dbSong ? `ID: ${dbSong.id}, Type: ${dbSong.media_type}` : 'FAILED');
    console.log('- Retrieved Video:', dbVideo ? `ID: ${dbVideo.id}, Type: ${dbVideo.media_type}` : 'FAILED');

    if (dbSong && dbVideo && dbSong.id !== dbVideo.id) {
      console.log('✅ Test 1 Passed: Song and video exist without ID collision!');
    } else {
      throw new Error('Test 1 Failed: Colliding IDs or missing records.');
    }

    // Test 2: Rescanning same file (Duplicate check)
    console.log('\nTest 2: Rescanning same song file...');
    const duplicateInserted = await songRepository.insertBatch([{
      mediaKey: songKey,
      uri: songAsset.uri,
      filename: songAsset.filename,
      duration: 180,
      file_size: songAsset.fileSize,
      creation_time: 1700000000,
      modification_time: songAsset.modificationTime
    }]);

    const count = await songRepository.getCount();
    console.log(`- Insert Batch changes: ${duplicateInserted}`);
    console.log(`- Total songs in DB: ${count}`);

    if (count === 1) {
      console.log('✅ Test 2 Passed: Rescanning did not create duplicate records!');
    } else {
      throw new Error('Test 2 Failed: Duplicate record was created.');
    }

    // Test 3: Same Filename in different directory
    console.log('\nTest 3: Inserting song with same filename in different path...');
    const diffDirSongAsset = {
      id: 'asset-456',
      uri: 'file:///storage/emulated/0/Downloads/song1.mp3', // Different path
      filename: 'song1.mp3', // Same filename
      fileSize: 5000000,
      modificationTime: 1700000000
    };

    const diffDirSongKey = generateMediaKey(diffDirSongAsset.uri, diffDirSongAsset.fileSize, diffDirSongAsset.modificationTime);

    await songRepository.insertBatch([{
      mediaKey: diffDirSongKey,
      uri: diffDirSongAsset.uri,
      filename: diffDirSongAsset.filename,
      duration: 180,
      file_size: diffDirSongAsset.fileSize,
      creation_time: 1700000000,
      modification_time: diffDirSongAsset.modificationTime
    }]);

    const totalCount = await songRepository.getCount();
    console.log(`- Total songs in DB: ${totalCount}`);

    if (totalCount === 2) {
      console.log('✅ Test 3 Passed: Identical filenames in different paths are treated as separate files!');
    } else {
      throw new Error('Test 3 Failed: Path differences were ignored.');
    }

    // Test 4: Delete media file
    console.log('\nTest 4: Deleting song file...');
    await songRepository.deleteBatch([dbSong.id]);
    const remainingSong = await songRepository.getById(dbSong.id);
    const videoStillExists = await videoRepository.getById(dbVideo.id);

    console.log(`- Deleted song exists in DB: ${!!remainingSong}`);
    console.log(`- Video still exists in DB: ${!!videoStillExists}`);

    if (!remainingSong && videoStillExists) {
      console.log('✅ Test 4 Passed: Deleting a song does not affect other records.');
    } else {
      throw new Error('Test 4 Failed: Incorrect deletion behavior.');
    }

    console.log('\n🎉 All ID Collision and Identity system tests passed successfully!');
    return { success: true };
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    return { success: false, error: error.message };
  }
}
