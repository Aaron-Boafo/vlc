import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CacheMonitor from '../utils/CacheMonitor';
import MediaCacheManager from '../utils/MediaCacheManager';

/**
 * Cache Manager Component
 * Provides UI for monitoring and managing media cache
 */
const CacheManagerComponent = ({ onClose }) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [healthCheck, setHealthCheck] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadCacheData();
  }, []);

  const loadCacheData = async () => {
    setIsLoading(true);
    try {
      const [stats, health] = await Promise.all([
        CacheMonitor.getCacheStatistics(),
        CacheMonitor.performHealthCheck()
      ]);
      
      setCacheStats(stats);
      setHealthCheck(health);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load cache data:', error);
      Alert.alert('Error', 'Failed to load cache information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = (mediaType) => {
    Alert.alert(
      'Clear Cache',
      `Are you sure you want to clear the ${mediaType} cache? This will require a full rescan on next load.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await MediaCacheManager.clearCache(mediaType);
              await loadCacheData();
              Alert.alert('Success', `${mediaType} cache cleared successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to clear ${mediaType} cache`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRefreshCache = async (mediaType) => {
    try {
      setIsLoading(true);
      await MediaCacheManager.forceRefresh(mediaType, (progress) => {
        console.log(`Refresh progress: ${progress.phase}`);
      });
      await loadCacheData();
      Alert.alert('Success', `${mediaType} cache refreshed successfully`);
    } catch (error) {
      Alert.alert('Error', `Failed to refresh ${mediaType} cache`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeCache = async () => {
    try {
      setIsLoading(true);
      const result = await CacheMonitor.optimizeCache();
      
      if (result.success) {
        await loadCacheData();
        Alert.alert(
          'Optimization Complete',
          `Applied ${result.optimizations.length} optimizations:\n${result.optimizations.join('\n')}`
        );
      } else {
        Alert.alert('Optimization Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to optimize cache');
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'unhealthy': return '#F44336';
      case 'error': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getHealthStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'unhealthy': return 'alert-circle';
      case 'error': return 'bug';
      default: return 'help-circle';
    }
  };

  if (isLoading && !cacheStats) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Loading cache information...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Cache Manager</Text>
        <TouchableOpacity onPress={onClose} className="p-2">
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Health Status */}
        {healthCheck && (
          <View className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <View className="flex-row items-center mb-2">
              <Ionicons 
                name={getHealthStatusIcon(healthCheck.status)} 
                size={24} 
                color={getHealthStatusColor(healthCheck.status)} 
              />
              <Text className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                Cache Health: {healthCheck.status.toUpperCase()}
              </Text>
            </View>
            
            {healthCheck.issues.length > 0 && (
              <View className="mb-2">
                <Text className="font-medium text-red-600 dark:text-red-400">Issues:</Text>
                {healthCheck.issues.map((issue, index) => (
                  <Text key={index} className="text-red-600 dark:text-red-400 ml-2">• {issue}</Text>
                ))}
              </View>
            )}
            
            {healthCheck.warnings.length > 0 && (
              <View className="mb-2">
                <Text className="font-medium text-orange-600 dark:text-orange-400">Warnings:</Text>
                {healthCheck.warnings.map((warning, index) => (
                  <Text key={index} className="text-orange-600 dark:text-orange-400 ml-2">• {warning}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Cache Statistics */}
        {cacheStats && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Cache Statistics</Text>
            
            {/* Audio Cache */}
            <View className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-medium text-blue-900 dark:text-blue-100">Audio Cache</Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity 
                    onPress={() => handleRefreshCache('audio')}
                    className="px-3 py-1 bg-blue-500 rounded"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-sm">Refresh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleClearCache('audio')}
                    className="px-3 py-1 bg-red-500 rounded"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-sm">Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-blue-800 dark:text-blue-200">Files: {cacheStats.audio.cachedFiles}</Text>
              <Text className="text-blue-800 dark:text-blue-200">
                Last Scan: {cacheStats.audio.lastScan > 0 ? new Date(cacheStats.audio.lastScan).toLocaleString() : 'Never'}
              </Text>
            </View>

            {/* Video Cache */}
            <View className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-medium text-green-900 dark:text-green-100">Video Cache</Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity 
                    onPress={() => handleRefreshCache('video')}
                    className="px-3 py-1 bg-green-500 rounded"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-sm">Refresh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleClearCache('video')}
                    className="px-3 py-1 bg-red-500 rounded"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-sm">Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-green-800 dark:text-green-200">Files: {cacheStats.video.cachedFiles}</Text>
              <Text className="text-green-800 dark:text-green-200">
                Last Scan: {cacheStats.video.lastScan > 0 ? new Date(cacheStats.video.lastScan).toLocaleString() : 'Never'}
              </Text>
            </View>

            {/* Disk Usage */}
            <View className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Text className="font-medium text-purple-900 dark:text-purple-100 mb-2">Disk Usage</Text>
              <Text className="text-purple-800 dark:text-purple-200">Total Size: {cacheStats.diskUsage.totalSizeMB} MB</Text>
              <Text className="text-purple-800 dark:text-purple-200">Total Files: {cacheStats.totalCachedFiles}</Text>
            </View>
          </View>
        )}

        {/* Recommendations */}
        {cacheStats?.recommendations && cacheStats.recommendations.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recommendations</Text>
            {cacheStats.recommendations.map((rec, index) => (
              <View key={index} className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <View className="flex-row items-start">
                  <Ionicons 
                    name={rec.priority === 'high' ? 'warning' : rec.priority === 'medium' ? 'information-circle' : 'bulb'} 
                    size={20} 
                    color={rec.priority === 'high' ? '#F59E0B' : '#6B7280'} 
                  />
                  <Text className="ml-2 flex-1 text-gray-800 dark:text-gray-200">{rec.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Actions</Text>
          
          <TouchableOpacity 
            onPress={handleOptimizeCache}
            className="mb-3 p-4 bg-indigo-500 rounded-lg"
            disabled={isLoading}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="flash" size={20} color="white" />
              <Text className="ml-2 text-white font-medium">Optimize Cache</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={loadCacheData}
            className="mb-3 p-4 bg-gray-500 rounded-lg"
            disabled={isLoading}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="ml-2 text-white font-medium">Refresh Data</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Last Updated */}
        {lastUpdated && (
          <Text className="text-center text-gray-500 dark:text-gray-400 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

export default CacheManagerComponent;