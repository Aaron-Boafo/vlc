import { useState, useEffect, useCallback, useRef } from 'react';
import { songRepository } from '../services/database/repositories/songRepository';
import { videoRepository } from '../services/database/repositories/videoRepository';
import { initDB } from '../services/database';

const DEFAULT_PAGE_SIZE = 50;

export function useSongSearch(query, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, enabled = true } = options;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);
  const debounceRef = useRef(null);

  const search = useCallback(async (searchQuery, isLoadMore = false) => {
    if (!enabled || !searchQuery.trim()) {
      setSongs([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    if (isLoadMore && (loading || !hasMore)) return;

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    await initDB();

    try {
      const [data, count] = await Promise.all([
        songRepository.search(searchQuery, { limit: pageSize, offset }),
        songRepository.searchCount(searchQuery),
      ]);

      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setSongs(prev => [...prev, ...data]);
      } else {
        setSongs(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
      setTotalCount(count);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [enabled, pageSize, loading, hasMore]);

  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0;
      setHasMore(true);
      search(searchQuery, false);
    }, 300);
  }, [search]);

  const loadMore = useCallback(() => {
    if (query.trim()) search(query, true);
  }, [query, search]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    search(query, false);
  }, [query, search]);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debouncedSearch]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return { songs, loading, hasMore, error, totalCount, loadMore, refresh };
}

export function useVideoSearch(query, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, enabled = true } = options;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);
  const debounceRef = useRef(null);

  const search = useCallback(async (searchQuery, isLoadMore = false) => {
    if (!enabled || !searchQuery.trim()) {
      setVideos([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    if (isLoadMore && (loading || !hasMore)) return;

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    await initDB();

    try {
      const [data, count] = await Promise.all([
        videoRepository.search(searchQuery, { limit: pageSize, offset }),
        videoRepository.searchCount(searchQuery),
      ]);

      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
      setTotalCount(count);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [enabled, pageSize, loading, hasMore]);

  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0;
      setHasMore(true);
      search(searchQuery, false);
    }, 300);
  }, [search]);

  const loadMore = useCallback(() => {
    if (query.trim()) search(query, true);
  }, [query, search]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    search(query, false);
  }, [query, search]);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debouncedSearch]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return { videos, loading, hasMore, error, totalCount, loadMore, refresh };
}

/**
 * Unified search across both songs and videos
 */
export function useUnifiedSearch(query, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, enabled = true } = options;
  const [results, setResults] = useState({ songs: [], videos: [] });
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState({ songs: true, videos: true });
  const [error, setError] = useState(null);
  const [totalCounts, setTotalCounts] = useState({ songs: 0, videos: 0 });
  const offsetRef = useRef({ songs: 0, videos: 0 });
  const isMountedRef = useRef(true);
  const debounceRef = useRef(null);

  const search = useCallback(async (searchQuery, isLoadMore = false) => {
    if (!enabled || !searchQuery.trim()) {
      setResults({ songs: [], videos: [] });
      setTotalCounts({ songs: 0, videos: 0 });
      setHasMore({ songs: false, videos: false });
      return;
    }

    if (isLoadMore && (loading || (!hasMore.songs && !hasMore.videos))) return;

    const songOffset = isLoadMore ? offsetRef.current.songs : 0;
    const videoOffset = isLoadMore ? offsetRef.current.videos : 0;

    if (!isLoadMore) setLoading(true);

    await initDB();

    try {
      const [songsData, songsCount, videosData, videosCount] = await Promise.all([
        songRepository.search(searchQuery, { limit: pageSize, offset: songOffset }),
        songRepository.searchCount(searchQuery),
        videoRepository.search(searchQuery, { limit: pageSize, offset: videoOffset }),
        videoRepository.searchCount(searchQuery),
      ]);

      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setResults(prev => ({
          songs: [...prev.songs, ...songsData],
          videos: [...prev.videos, ...videosData],
        }));
      } else {
        setResults({ songs: songsData, videos: videosData });
      }

      offsetRef.current = {
        songs: songOffset + songsData.length,
        videos: videoOffset + videosData.length,
      };

      setHasMore({
        songs: songsData.length === pageSize,
        videos: videosData.length === pageSize,
      });

      setTotalCounts({ songs: songsCount, videos: videosCount });
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [enabled, pageSize, loading, hasMore]);

  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      offsetRef.current = { songs: 0, videos: 0 };
      setHasMore({ songs: true, videos: true });
      search(searchQuery, false);
    }, 300);
  }, [search]);

  const loadMore = useCallback(() => {
    if (query.trim()) search(query, true);
  }, [query, search]);

  const refresh = useCallback(() => {
    offsetRef.current = { songs: 0, videos: 0 };
    setHasMore({ songs: true, videos: true });
    search(query, false);
  }, [query, search]);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debouncedSearch]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return { results, loading, hasMore, error, totalCounts, loadMore, refresh };
}