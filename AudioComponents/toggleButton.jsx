import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo, useCallback } from "react";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import useGlobalAudioStore from "../store/globalAudioStore";

const ToggleBar = memo(() => {
  const themeColors = useThemeStore(state => state.themeColors);
  const activeTab = useGlobalAudioStore(state => state.activeTab);
  const setActiveTab = useGlobalAudioStore(state => state.setActiveTab);

  const handleToggle = useCallback((tagName) => {
    setActiveTab(tagName);
  }, [setActiveTab]);

  return (
    <View style={styles.container}>
      {tags.map((tag) => {
        const isActive = activeTab === tag.name;
        return (
          <TouchableOpacity
            key={tag.name}
            onPress={() => handleToggle(tag.name)}
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
  { name: "album", icon: Icons.Disc3 },
  { name: "artist", icon: Icons.SquareUserRound },
  { name: "favourite", icon: Icons.Heart },
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
    borderRadius: 24,
    height: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 2,
    minWidth: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 0.3,
    includeFontPadding: false,
    textTransform: 'capitalize',
    paddingBottom: 1, // Fix text vertical alignment
  },
});

export default ToggleBar;
