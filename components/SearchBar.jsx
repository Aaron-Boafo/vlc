import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const SearchBar = ({ value, onChangeText, placeholder, themeColors, onClose }) => {
  return (
    <View style={[styles.searchContainer, { backgroundColor: themeColors.sectionBackground }]}> 
      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: themeColors.card,
          color: themeColors.text,
          borderColor: themeColors.primary
        }]}
        placeholder={placeholder}
        placeholderTextColor={themeColors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoFocus
      />
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={22} color={themeColors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
});

export default SearchBar; 