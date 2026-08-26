import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  FlatList,
  Keyboard 
} from 'react-native';
import { Search, X, Filter, Clock } from 'lucide-react-native';
import useThemeStore from '../store/theme';
import AdvancedSearch from '../utils/advancedSearch';
import PerformanceAnalytics from '../utils/performanceAnalytics';

const EnhancedSearchBar = memo(({ 
  onSearch, 
  onClose, 
  placeholder = "Search...", 
  files = [],
  showFilters = false,
  onFilterPress,
  visible = false 
}) => {
  const { themeColors } = useThemeStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // 🔍 Memoized search function for performance
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      onSearch([]);
      return;
    }

    const startTime = Date.now();
    const results = AdvancedSearch.search(searchQuery, files, {
      fuzzy: true,
      maxResults: 100,
      sortBy: 'relevance'
    });
    
    const duration = Date.now() - startTime;
    PerformanceAnalytics.trackSearchTime(searchQuery, results.length, duration);
    
    onSearch(results);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
      return updated;
    });
  }, [files, onSearch]);

  // 🎯 Debounced search for better performance
  const debouncedSearch = useMemo(() => {
    let timeoutId;
    return (searchQuery) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => performSearch(searchQuery), 300);
    };
  }, [performSearch]);

  // 💡 Get smart suggestions
  const updateSuggestions = useCallback((searchQuery) => {
    if (searchQuery.length > 1) {
      const suggestions = AdvancedSearch.getSuggestions(searchQuery, files, 5);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [files]);

  const handleTextChange = useCallback((text) => {
    setQuery(text);
    debouncedSearch(text);
    updateSuggestions(text);
  }, [debouncedSearch, updateSuggestions]);

  const handleSuggestionPress = useCallback((suggestion) => {
    setQuery(suggestion);
    performSearch(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();
  }, [performSearch]);

  const handleRecentSearchPress = useCallback((recentQuery) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
    setShowSuggestions(false);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch([]);
  }, [onSearch]);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Search size={20} color={themeColors.textSecondary} style={styles.searchIcon} />
        
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.textSecondary}
          value={query}
          onChangeText={handleTextChange}
          autoFocus={true}
          returnKeyType="search"
          onSubmitEditing={() => {
            performSearch(query);
            setShowSuggestions(false);
            Keyboard.dismiss();
          }}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {showFilters && (
            <TouchableOpacity onPress={onFilterPress} style={styles.actionButton}>
              <Filter size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.actionButton}>
              <X size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleClose} style={styles.actionButton}>
            <Text style={[styles.cancelText, { color: themeColors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions & Recent Searches */}
      {(showSuggestions || (query.length === 0 && recentSearches.length > 0)) && (
        <View style={[styles.suggestionsContainer, { backgroundColor: themeColors.card }]}>
          {query.length === 0 && recentSearches.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                Recent Searches
              </Text>
              {recentSearches.map((recentQuery, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleRecentSearchPress(recentQuery)}
                >
                  <Clock size={16} color={themeColors.textSecondary} />
                  <Text style={[styles.suggestionText, { color: themeColors.text }]}>
                    {recentQuery}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {showSuggestions && (
            <>
              <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                Suggestions
              </Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Search size={16} color={themeColors.textSecondary} />
                  <Text style={[styles.suggestionText, { color: themeColors.text }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});

EnhancedSearchBar.displayName = 'EnhancedSearchBar';

export default EnhancedSearchBar;