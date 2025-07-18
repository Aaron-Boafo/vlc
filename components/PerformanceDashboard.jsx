import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Activity, Clock, Search, Zap, AlertTriangle } from 'lucide-react-native';
import useThemeStore from '../store/theme';
import PerformanceAnalytics from '../utils/performanceAnalytics';

const PerformanceDashboard = memo(({ visible, onClose }) => {
  const { themeColors } = useThemeStore();
  const [metrics, setMetrics] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (visible) {
      const summary = PerformanceAnalytics.getPerformanceSummary();
      setMetrics(summary);
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        const newSummary = PerformanceAnalytics.getPerformanceSummary();
        setMetrics(newSummary);
        setRefreshKey(prev => prev + 1);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [visible, refreshKey]);

  if (!visible || !metrics) return null;

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getPerformanceColor = (value, thresholds) => {
    if (value <= thresholds.good) return '#4CAF50';
    if (value <= thresholds.warning) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.dashboard, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Activity size={24} color={themeColors.primary} />
            <Text style={[styles.title, { color: themeColors.text }]}>
              Performance Dashboard
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: themeColors.primary }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* App Uptime */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.metricHeader}>
              <Clock size={20} color={themeColors.primary} />
              <Text style={[styles.metricTitle, { color: themeColors.text }]}>App Uptime</Text>
            </View>
            <Text style={[styles.metricValue, { color: themeColors.text }]}>
              {formatUptime(metrics.uptime)}
            </Text>
          </View>

          {/* Loading Performance */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.metricHeader}>
              <Zap size={20} color={themeColors.primary} />
              <Text style={[styles.metricTitle, { color: themeColors.text }]}>Loading Performance</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Average Load Time:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: getPerformanceColor(metrics.averageLoadTime, { good: 1000, warning: 3000 })
                }
              ]}>
                {formatTime(metrics.averageLoadTime)}
              </Text>
            </View>
          </View>

          {/* Search Performance */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.metricHeader}>
              <Search size={20} color={themeColors.primary} />
              <Text style={[styles.metricTitle, { color: themeColors.text }]}>Search Performance</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Average Search Time:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: getPerformanceColor(metrics.averageSearchTime, { good: 100, warning: 300 })
                }
              ]}>
                {formatTime(metrics.averageSearchTime)}
              </Text>
            </View>
          </View>

          {/* Render Performance */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.metricHeader}>
              <Activity size={20} color={themeColors.primary} />
              <Text style={[styles.metricTitle, { color: themeColors.text }]}>Render Performance</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Average Render Time:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: getPerformanceColor(metrics.averageRenderTime, { good: 16, warning: 33 })
                }
              ]}>
                {formatTime(metrics.averageRenderTime)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Slow Renders:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: metrics.slowRenders > 5 ? '#F44336' : '#4CAF50'
                }
              ]}>
                {metrics.slowRenders}
              </Text>
            </View>
          </View>

          {/* Memory & Errors */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.metricHeader}>
              <AlertTriangle size={20} color={themeColors.primary} />
              <Text style={[styles.metricTitle, { color: themeColors.text }]}>System Health</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Memory Trend:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: metrics.memoryTrend === 'stable' ? '#4CAF50' : 
                        metrics.memoryTrend === 'increasing' ? '#FF9800' : '#F44336'
                }
              ]}>
                {metrics.memoryTrend}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                Total Errors:
              </Text>
              <Text style={[
                styles.metricValue, 
                { 
                  color: metrics.totalErrors === 0 ? '#4CAF50' : '#F44336'
                }
              ]}>
                {metrics.totalErrors}
              </Text>
            </View>
          </View>

          {/* Performance Tips */}
          <View style={[styles.metricCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.metricTitle, { color: themeColors.text }]}>Performance Tips</Text>
            <View style={styles.tipsList}>
              {metrics.averageLoadTime > 2000 && (
                <Text style={[styles.tip, { color: themeColors.textSecondary }]}>
                  • Consider optimizing media loading for better performance
                </Text>
              )}
              {metrics.slowRenders > 10 && (
                <Text style={[styles.tip, { color: themeColors.textSecondary }]}>
                  • Some components are rendering slowly - check for optimization opportunities
                </Text>
              )}
              {metrics.totalErrors > 0 && (
                <Text style={[styles.tip, { color: themeColors.textSecondary }]}>
                  • Check console for error details and fix issues
                </Text>
              )}
              {metrics.memoryTrend === 'increasing' && (
                <Text style={[styles.tip, { color: themeColors.textSecondary }]}>
                  • Memory usage is increasing - consider cleanup optimizations
                </Text>
              )}
              {metrics.averageLoadTime <= 1000 && metrics.slowRenders <= 5 && metrics.totalErrors === 0 && (
                <Text style={[styles.tip, { color: '#4CAF50' }]}>
                  ✅ Your app is performing excellently!
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dashboard: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  metricCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipsList: {
    marginTop: 8,
  },
  tip: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;