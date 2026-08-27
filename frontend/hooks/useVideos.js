import { useState, useEffect, useCallback, useRef } from 'react';
import { videoRepository } from '../services/database/repositories/videoRepository';

const DEFAULT_PAGE_SIZE = 50;

export function useVideos(options = {}) {
  const {
    filters = {},
    sort = { key: 'filename', dir: 'ASC' },
    pageSize = DEFAULT_PAGE_SIZE,
    enabled = true,
  } = options;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadVideos = useCallback(async (isLoadMore = false) => {
    if (!enabled) return;
    if (isLoadMore && (loadingMore || !hasMore)) return;
    if (!isLoadMore && loading) return;

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const [data, count] = await Promise.all([
        videoRepository.getAll({
          limit: pageSize,
          offset,
          sort,
          filters,
        }),
        videoRepository.getCount(filters),
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
      if (isMountedRef.current) {
        setError(err.message);
        console.error('[useVideos] Error loading videos:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [enabled, filters, sort, pageSize, loading, loadingMore, hasMore]);

  const loadMore = useCallback(() => {
    loadVideos(true);
  }, [loadVideos]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    loadVideos(false);
  }, [loadVideos]);

  useEffect(() => {
    isMountedRef.current = true;
    loadVideos(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadVideos]);

  return {
    videos,
    loading,
    loadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh,
  };
}

export function useVideo(id) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!id) {
      setVideo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    videoRepository.getById(id)
      .then(data => {
        if (mounted) {
          setVideo(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [id]);

  return { video, loading, error };
}

export function useFavoriteVideos(options = {}) {
  return useVideos({ ...options, filters: { ...options.filters, favorite: true } });
}

export function useRecentlyAddedVideos(options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadVideos = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await videoRepository.getRecentlyAdded({ limit: pageSize, offset });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [pageSize, hasMore]);

  const loadMore = useCallback(() => loadVideos(true), [loadVideos]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadVideos(false); }, [loadVideos]);

  useEffect(() => {
    isMountedRef.current = true;
    loadVideos(false);
    return () => { isMountedRef.current = false; };
  }, [loadVideos]);

  return { videos, loading, hasMore, error, loadMore, refresh };
}

export function useRecentlyPlayedVideos(options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadVideos = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await videoRepository.getRecentlyPlayed({ limit: pageSize, offset });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [pageSize, hasMore]);

  const loadMore = useCallback(() => loadVideos(true), [loadVideos]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadVideos(false); }, [loadVideos]);

  useEffect(() => {
    isMountedRef.current = true;
    loadVideos(false);
    return () => { isMountedRef.current = false; };
  }, [loadVideos]);

  return { videos, loading, hasMore, error, loadMore, refresh };
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