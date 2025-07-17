import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { memo, useCallback } from "react";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import useOptimizedVideoStore from "../store/optimizedVideoStore";

const VideoToggleBar = memo(() => {
  const themeColors = useThemeStore(state => state.themeColors);
  const activeTab = useOptimizedVideoStore(state => state.activeTab);
  const toggleTabs = useOptimizedVideoStore(state => state.toggleTabs);

  const handleToggle = useCallback((tagName) => {
    toggleTabs(tagName);
  }, [toggleTabs]);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: themeColors.background,
      },
    ]}>
      {tags.map((tag) => {
        const isActive = activeTab === tag.name;
        return (
          <TouchableOpacity
            key={tag.name}
            onPress={() => handleToggle(tag.name)}
            activeOpacity={0.7}
            style={[
              styles.toggleButton,
              { backgroundColor: isActive ? themeColors.primary : themeColors.card },
            ]}
          >
            <tag.icon 
              size={22} 
              color={isActive ? "white" : themeColors.textSecondary} 
            />
            {isActive && (
              <Text style={styles.toggleTextActive}>
                {tag.name.charAt(0).toUpperCase() + tag.name.slice(1)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const tags = [
  { name: "all", icon: Icons.LayoutGrid },
  { name: "playlist", icon: Icons.ListVideo },
  { name: "favourite", icon: Icons.Heart },
  { name: "history", icon: Icons.History },
];

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 13,
    marginBottom: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    height: 44,
    paddingHorizontal: 12,
    gap: 6,
    minWidth: 44,
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});

VideoToggleBar.displayName = 'VideoToggleBar';

export default VideoToggleBar; 