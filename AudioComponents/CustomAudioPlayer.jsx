import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, Image, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as MediaSession from 'expo-media-session';
import useAudioStore from '../store/AudioHeadStore';
import * as Notifications from 'expo-notifications';

export default function CustomAudioPlayer() {
  // Request notification permission on Android 13+
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.requestPermissionsAsync();
    }
  }, []);

  // Test notification function
  const testNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Visura.',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('[Test] Error sending test notification:', error);
    }
  };

  const audioFiles = useAudioStore((state) => state.audioFiles);
  const currentTrack = useAudioStore((state) => state.currentTrack);
  const setCurrentTrack = useAudioStore((state) => state.setCurrentTrack);

  // Find the current index in the playlist
  const currentIndex = currentTrack && audioFiles.length > 0
    ? audioFiles.findIndex((t) => t.id === currentTrack.id)
    : 0;
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  // Setup audio mode for background playback
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Load and play track
  const playTrack = async (trackIndex) => {
    if (trackIndex < 0 || trackIndex >= audioFiles.length) return;
    
    try {
      console.log('[Audio] Playing track:', trackIndex, audioFiles[trackIndex]?.filename);
      
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioFiles[trackIndex].uri },
        { shouldPlay: true }
      );
      soundRef.current = newSound;

      // Update current track
      setCurrentTrack(trackIndex);
      setIsPlaying(true);

      // Update media session
      const track = audioFiles[trackIndex];
      console.log('[MediaSession] Setting track info:', {
        title: track.filename,
        artist: 'Unknown Artist',
        artwork: null
      });
      
      await MediaSession.setTrack({
        title: track.filename,
        artist: 'Unknown Artist',
        artwork: null,
      });
      
      console.log('[MediaSession] Setting playback state to playing');
      await MediaSession.setPlaybackState('playing');

      // Set up onPlaybackStatusUpdate
      soundRef.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setPosition(status.positionMillis);
          setDuration(status.durationMillis);
          
          // Auto-advance to next track when current finishes
          if (status.didJustFinish) {
            console.log('[Audio] Track finished, advancing to next');
            playNext();
          }
        }
      });

    } catch (error) {
      console.error('[Audio] Error playing track:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) {
      if (audioFiles.length > 0) {
        await playTrack(currentTrack);
      }
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          console.log('[Audio] Pausing playback');
          await soundRef.current.pauseAsync();
          await MediaSession.setPlaybackState('paused');
        } else {
          console.log('[Audio] Resuming playback');
          await soundRef.current.playAsync();
          await MediaSession.setPlaybackState('playing');
        }
      }
    } catch (error) {
      console.error('[Audio] Error toggling play/pause:', error);
    }
  };

  const playNext = async () => {
    console.log('[Audio] Playing next track');
    const nextIndex = (currentTrack + 1) % audioFiles.length;
    await playTrack(nextIndex);
  };

  const playPrevious = async () => {
    console.log('[Audio] Playing previous track');
    const prevIndex = currentTrack > 0 ? currentTrack - 1 : audioFiles.length - 1;
    await playTrack(prevIndex);
  };

  // Play track when currentTrack or playlist changes
  useEffect(() => {
    if (audioFiles && audioFiles.length > 0) {
      playTrack(currentIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, audioFiles]);

  // Media session controls
  useEffect(() => {
    const playListener = MediaSession.addListener('play', () => {
      soundRef.current?.playAsync();
      setIsPlaying(true);
      MediaSession.setPlaybackState('playing');
    });
    const pauseListener = MediaSession.addListener('pause', () => {
      soundRef.current?.pauseAsync();
      setIsPlaying(false);
      MediaSession.setPlaybackState('paused');
    });
    const nextListener = MediaSession.addListener('next', () => {
      if (currentIndex + 1 < audioFiles.length) playTrack(currentIndex + 1);
    });
    const prevListener = MediaSession.addListener('previous', () => {
      if (currentIndex > 0) playTrack(currentIndex - 1);
    });

    return () => {
      playListener.remove();
      pauseListener.remove();
      nextListener.remove();
      prevListener.remove();
    };
  }, [currentIndex, audioFiles]);

  if (!audioFiles || audioFiles.length === 0) {
    return <Text>No tracks in playlist.</Text>;
  }

  const track = audioFiles[currentIndex];

  return (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
      {/* Test Notification Button - always at the top */}
      <Button title="Test Notification" onPress={testNotification} />
      
      {audioFiles.length === 0 ? (
        <Text>No audio files available</Text>
      ) : (
        <>
          <Text style={{ marginBottom: 10 }}>
            Track {currentTrack + 1} of {audioFiles.length}: {audioFiles[currentTrack]?.filename}
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
            <Button title="⏮️" onPress={playPrevious} disabled={audioFiles.length <= 1} />
            <Button title={isPlaying ? "⏸️" : "▶️"} onPress={togglePlayPause} />
            <Button title="⏭️" onPress={playNext} disabled={audioFiles.length <= 1} />
          </View>
          
          {duration > 0 && (
            <Text>
              {Math.floor(position / 1000)}s / {Math.floor(duration / 1000)}s
            </Text>
          )}
        </>
      )}
    </View>
  );
} 