// Advanced search and filtering capabilities
class AdvancedSearch {
  constructor() {
    this.searchIndex = new Map();
    this.filters = {
      duration: { min: 0, max: Infinity },
      year: { min: 0, max: new Date().getFullYear() },
      fileSize: { min: 0, max: Infinity },
    };
  }

  // Build search index for faster searching
  buildSearchIndex(files) {
    this.searchIndex.clear();
    
    files.forEach(file => {
      const searchableText = [
        file.title,
        file.artist,
        file.album,
        file.filename
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Create word index
      const words = searchableText.split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) { // Skip very short words
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, new Set());
          }
          this.searchIndex.get(word).add(file.id);
        }
      });
    });
  }

  // Fast fuzzy search using index
  search(query, files, options = {}) {
    if (!query.trim()) return files;

    const {
      fuzzy = true,
      maxResults = 100,
      sortBy = 'relevance'
    } = options;

    const queryWords = query.toLowerCase().split(/\s+/);
    const matchingIds = new Set();
    const scores = new Map();

    // Find matches using index
    queryWords.forEach(word => {
      if (fuzzy) {
        // Fuzzy matching
        for (const [indexWord, fileIds] of this.searchIndex.entries()) {
          if (this.fuzzyMatch(word, indexWord)) {
            fileIds.forEach(id => {
              matchingIds.add(id);
              scores.set(id, (scores.get(id) || 0) + this.calculateScore(word, indexWord));
            });
          }
        }
      } else {
        // Exact matching
        if (this.searchIndex.has(word)) {
          this.searchIndex.get(word).forEach(id => {
            matchingIds.add(id);
            scores.set(id, (scores.get(id) || 0) + 1);
          });
        }
      }
    });

    // Get matching files
    let results = files.filter(file => matchingIds.has(file.id));

    // Sort by relevance
    if (sortBy === 'relevance') {
      results.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
    }

    return results.slice(0, maxResults);
  }

  // Fuzzy matching algorithm
  fuzzyMatch(query, target, threshold = 0.6) {
    if (target.includes(query)) return true;
    
    const distance = this.levenshteinDistance(query, target);
    const similarity = 1 - (distance / Math.max(query.length, target.length));
    
    return similarity >= threshold;
  }

  // Calculate relevance score
  calculateScore(query, match) {
    if (match === query) return 10;
    if (match.startsWith(query)) return 8;
    if (match.includes(query)) return 6;
    return 3; // Fuzzy match
  }

  // Levenshtein distance for fuzzy matching
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Advanced filtering
  applyFilters(files, filters = {}) {
    return files.filter(file => {
      // Duration filter
      if (filters.minDuration && file.duration < filters.minDuration) return false;
      if (filters.maxDuration && file.duration > filters.maxDuration) return false;
      
      // Year filter
      if (filters.minYear && file.year && file.year < filters.minYear) return false;
      if (filters.maxYear && file.year && file.year > filters.maxYear) return false;
      
      // File type filter
      if (filters.fileTypes && filters.fileTypes.length > 0) {
        const extension = file.filename.split('.').pop().toLowerCase();
        if (!filters.fileTypes.includes(extension)) return false;
      }
      
      // Custom filters
      if (filters.hasArtwork && !file.artwork) return false;
      if (filters.isRecent) {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (file.modificationTime < oneWeekAgo) return false;
      }
      
      return true;
    });
  }

  // Smart suggestions
  getSuggestions(query, files, limit = 5) {
    if (!query.trim()) return [];
    
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    files.forEach(file => {
      [file.title, file.artist, file.album].forEach(field => {
        if (field && field.toLowerCase().startsWith(queryLower)) {
          suggestions.add(field);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }
}

export default new AdvancedSearch();