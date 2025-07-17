import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/theme';

const FastLoadingIndicator = memo(({ 
  isLoading, 
  isInitialLoadComplete, 
  itemCount = 0, 
  mediaType = 'files',
  showProgress = true 
}) => {
  const { themeColors } = useThemeStore();

  if (!isLoading && isInitialLoadComplete) {
    return null;
  }

  const getLoadingText = () => {
    if (isLoading && !isInitialLoadComplete) {
      return itemCount > 0 
        ? `Loading ${mediaType}... ${itemCount} found`
        : `Scanning for ${mediaType}...`;
    }
    if (isLoading && isInitialLoadComplete) {
      return `Processing metadata... ${itemCount} ${mediaType}`;
    }
    return `Loading ${mediaType}...`;
  };

  const getProgressColor = () => {
    if (itemCount === 0) return themeColors.primary;
    if (itemCount < 50) return '#FF6B6B';
    if (itemCount < 200) return '#4ECDC4';
    return '#45B7D1';
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        {/* Animated loading indicator */}
        <View style={styles.indicatorContainer}>
          <ActivityIndicator 
            size="large" 
            color={getProgressColor()} 
            style={styles.spinner}
          />
          
          {/* Progress ring effect */}
          <View style={[
            styles.progressRing, 
            { borderColor: getProgressColor() + '30' }
          ]} />
        </View>

        {/* Loading text */}
        <Text style={[styles.loadingText, { color: themeColors.text }]}>
          {getLoadingText()}
        </Text>

        {/* Progress bar for initial load */}
        {showProgress && isLoading && !isInitialLoadComplete && (
          <View style={[styles.progressBarContainer, { backgroundColor: themeColors.card }]}>
            <LinearGradient
              colors={[getProgressColor(), getProgressColor() + '80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBar,
                { 
                  width: itemCount > 0 ? '100%' : '20%',
                }
              ]}
            />
          </View>
        )}

        {/* Status indicator */}
        {itemCount > 0 && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getProgressColor() }]} />
            <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>
              {isInitialLoadComplete ? 'Loading metadata in background' : 'Fast scanning in progress'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  indicatorContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  spinner: {
    zIndex: 2,
  },
  progressRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    borderWidth: 2,
    zIndex: 1,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

FastLoadingIndicator.displayName = 'FastLoadingIndicator';

export default FastLoadingIndicator;