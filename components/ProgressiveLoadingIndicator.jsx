import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/theme';

const ProgressiveLoadingIndicator = memo(({ 
  isLoading, 
  totalFiles, 
  loadedFiles, 
  isComplete,
  mediaType = 'files'
}) => {
  const { themeColors } = useThemeStore();
  const [animatedValue] = useState(new Animated.Value(0));
  const [displayCount, setDisplayCount] = useState(0);

  // Animate the loading progress
  useEffect(() => {
    if (isLoading && totalFiles > 0) {
      const progress = Math.min(loadedFiles / Math.max(totalFiles, 1), 1);
      Animated.timing(animatedValue, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [loadedFiles, totalFiles, isLoading, animatedValue]);

  // Animate the count display
  useEffect(() => {
    if (loadedFiles !== displayCount) {
      const timer = setTimeout(() => {
        setDisplayCount(loadedFiles);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadedFiles, displayCount]);

  const progressWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!isLoading && !isComplete) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {isComplete ? '✅ Loading Complete' : `🔄 Loading ${mediaType}...`}
        </Text>
        
        <View style={styles.statsContainer}>
          <Text style={[styles.stats, { color: themeColors.textSecondary }]}>
            {displayCount} {mediaType} loaded
            {totalFiles > 0 && ` of ${totalFiles}`}
          </Text>
          
          {!isComplete && (
            <Text style={[styles.status, { color: themeColors.primary }]}>
              Finding more...
            </Text>
          )}
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

        {/* Loading Animation */}
        {isLoading && (
          <View style={styles.loadingDots}>
            <LoadingDot delay={0} color={themeColors.primary} />
            <LoadingDot delay={200} color={themeColors.primary} />
            <LoadingDot delay={400} color={themeColors.primary} />
          </View>
        )}
      </View>
    </View>
  );
});

// Animated loading dot component
const LoadingDot = memo(({ delay, color }) => {
  const [opacity] = useState(new Animated.Value(0.3));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, opacity }
      ]}
    />
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
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  stats: {
    fontSize: 14,
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});

export default ProgressiveLoadingIndicator;