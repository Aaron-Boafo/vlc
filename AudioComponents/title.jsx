import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo, useCallback } from "react";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import AppLogo from "../components/AppLogo";

const AudioHeader = memo(({ onSearch, onFilter, onMore }) => {
  const themeColors = useThemeStore(state => state.themeColors);
  
  const handleSearch = useCallback(() => onSearch?.(), [onSearch]);
  const handleFilter = useCallback(() => onFilter?.(), [onFilter]);
  const handleMore = useCallback(() => onMore?.(), [onMore]);
  
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <AppLogo width={60} height={60} />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Visura</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={handleSearch} style={styles.iconButton}>
          <Icons.Search size={22} color={themeColors.text} />
        </TouchableOpacity>
        {onFilter && (
          <TouchableOpacity onPress={handleFilter} style={styles.iconButton}>
            <Icons.SlidersHorizontal size={22} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleMore} style={styles.iconButton}>
          <Icons.MoreVertical size={22} color={themeColors.text} />
        </TouchableOpacity>
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
    paddingVertical: 10,
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconButton: { 
    marginLeft: 16 
  },
});

export default AudioHeader;
