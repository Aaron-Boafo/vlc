import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/theme';
import RealDeviceMetadataLoader from '../utils/realDeviceMetadataLoader';

const MetadataLoadingIndicator = memo(({ 
  visible = false,
  totalFiles = 0,
  onStatsUpdate = null
}) => {
  const { themeColors } = useThemeStore();
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    cached: 0,
    fallback: 0,
    successRate: 0
  });
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const currentStats = RealDeviceMetadataLoader.getStats();
      setStats(currentStats);
      
      if (onStatsUpdate) {
        onStatsUpdate(currentStats);
      }

      // Animate progress
      const progress = currentStats.total > 0 
        ? (currentStats.successful + currentStats.fallback) / currentStats.total 
        : 0;
      
      Animated.timing(animatedValue, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, animatedValue, onStatsUpdate]);

  const progressWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isComplete = (stats.successful + stats.fallback + stats.failed) >= stats.total && stats.total > 0;

  if (!visible || totalFiles === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {isComplete ? '✅ Metadata Loading Complete' : '🎵 Loading Metadata...'}
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Enhancing your music library
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: themeColors.background }]}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
          <LinearGradient
            colors={[themeColors.primary, themeColors.primary + '80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
            Progress:
          </Text>
          <Text style={[styles.statValue, { color: themeColors.text }]}>
            {stats.successful + stats.fallback} / {stats.total}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
            Success Rate:
          </Text>
          <Text style={[styles.statValue, { color: themeColors.primary }]}>
            {stats.successRate}%
          </Text>
        </View>

        {stats.cached > 0 && (
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              From Cache:
            </Text>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {stats.cached}
            </Text>
          </View>
        )}

        {stats.fallback > 0 && (
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              Filename-based:
            </Text>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {stats.fallback}
            </Text>
          </View>
        )}
      </View>

      {/* Status Message */}
      <Text style={[styles.statusMessage, { color: themeColors.textSecondary }]}>
        {isComplete 
          ? 'Your music library has been enhanced with metadata!'
          : 'Extracting artist, album, and artwork information...'
        }
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  statsContainer: {
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusMessage: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MetadataLoadingIndicator;