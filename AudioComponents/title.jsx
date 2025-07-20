import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo, useCallback } from "react";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import AppLogo from "../components/AppLogo";

const AudioHeader = memo(({ onSearch, onFilter, onMore, showIcons = { search: true, filter: true, more: true } }) => {
  const themeColors = useThemeStore(state => state.themeColors);
  
  const handleSearch = useCallback(() => onSearch?.(), [onSearch]);
  const handleFilter = useCallback(() => onFilter?.(), [onFilter]);
  const handleMore = useCallback(() => onMore?.(), [onMore]);
  
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <AppLogo width={40} height={40} />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Visura</Text>
      </View>
      <View style={styles.headerRight}>
        {showIcons.search && (
          <TouchableOpacity onPress={handleSearch} style={styles.iconButton}>
            <Icons.Search size={22} color={themeColors.text} />
          </TouchableOpacity>
        )}
        {showIcons.filter && (
          <TouchableOpacity onPress={handleFilter} style={styles.iconButton}>
            <Icons.SlidersHorizontal size={22} color={themeColors.text} />
          </TouchableOpacity>
        )}
        {showIcons.more && (
          <TouchableOpacity onPress={handleMore} style={styles.iconButton}>
            <Icons.MoreVertical size={22} color={themeColors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 1,
    paddingBottom: 12,
    height: 60,
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default AudioHeader;
