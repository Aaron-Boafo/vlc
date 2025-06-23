import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Icons from "lucide-react-native";
import useThemeStore from "../store/theme";
import AppLogo from "../components/AppLogo";

const AudioHeader = ({ onSearch, onFilter, onMore }) => {
  const { themeColors } = useThemeStore();
  
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <AppLogo width={30} height={30} />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Visura</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onSearch} style={styles.iconButton}>
          <Icons.Search size={22} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onFilter} style={styles.iconButton}>
          <Icons.SlidersHorizontal size={22} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMore} style={styles.iconButton}>
          <Icons.MoreVertical size={22} color={themeColors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
