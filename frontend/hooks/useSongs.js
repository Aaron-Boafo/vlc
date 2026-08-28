import { useState, useEffect, useCallback, useRef } from 'react';
import { songRepository } from '../services/database/repositories/songRepository';
import { initDB } from '../services/database';

const DEFAULT_PAGE_SIZE = 50;

export function useSongs(options = {}) {
  const {
    filters = {},
    sort = { key: 'title', dir: 'ASC' },
    pageSize = DEFAULT_PAGE_SIZE,
    enabled = true,
  } = options;

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const loadSongs = useCallback(async (isLoadMore = false) => {
    if (!enabled) return;
    if (isLoadMore && (loadingMore || !hasMore)) return;
    if (!isLoadMore && loading) return;

    await initDB();

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
        songRepository.getAll({
          limit: pageSize,
          offset,
          sort,
          filters,
        }),
        songRepository.getCount(filters),
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
      if (isMountedRef.current) {
        setError(err.message);
        console.error('[useSongs] Error loading songs:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [enabled, filters, sort, pageSize, loading, loadingMore, hasMore]);

  const loadMore = useCallback(() => {
    loadSongs(true);
  }, [loadSongs]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    loadSongs(false);
  }, [loadSongs]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSongs(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadSongs]);

  return {
    songs,
    loading,
    loadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh,
  };
}

export function useSong(id) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (id) {
      (async () => {
        await initDB();
        setLoading(true);
        songRepository.getById(id)
          .then(data => {
            if (mounted) {
              setSong(data);
              setLoading(false);
            }
          })
          .catch(err => {
            if (mounted) {
              setError(err.message);
              setLoading(false);
            }
          });
      })();
    } else {
      setSong(null);
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [id]);

  return { song, loading, error };
}

export function useArtists(options = {}) {
  const { limit = 1000, offset = 0 } = options;
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDB();
      setLoading(true);
      songRepository.getArtists({ limit, offset })
        .then(data => {
          if (mounted) {
            setArtists(data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            setError(err.message);
            setLoading(false);
          }
        });
    })();

    return () => { mounted = false; };
  }, [limit, offset]);

  return { artists, loading, error };
}

export function useAlbums(options = {}) {
  const { limit = 1000, offset = 0 } = options;
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDB();
      setLoading(true);
      songRepository.getAlbums({ limit, offset })
        .then(data => {
          if (mounted) {
            setAlbums(data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            setError(err.message);
            setLoading(false);
          }
        });
    })();

    return () => { mounted = false; };
  }, [limit, offset]);

  return { albums, loading, error };
}

export function useGenres(options = {}) {
  const { limit = 1000, offset = 0 } = options;
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDB();
      setLoading(true);
      songRepository.getGenres({ limit, offset })
        .then(data => {
          if (mounted) {
            setGenres(data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            setError(err.message);
            setLoading(false);
          }
        });
    })();

    return () => { mounted = false; };
  }, [limit, offset]);

  return { genres, loading, error };
}

export function useSongsByArtist(artist, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, sort = { key: 'title', dir: 'ASC' } } = options;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadSongs = useCallback(async (isLoadMore = false) => {
    if (!artist) return;
    if (isLoadMore && !hasMore) return;

    await initDB();

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await songRepository.getByArtist(artist, { limit: pageSize, offset, sort });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setSongs(prev => [...prev, ...data]);
      } else {
        setSongs(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [artist, pageSize, sort, hasMore]);

  const loadMore = useCallback(() => loadSongs(true), [loadSongs]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadSongs(false); }, [loadSongs]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSongs(false);
    return () => { isMountedRef.current = false; };
  }, [loadSongs]);

  return { songs, loading, hasMore, error, loadMore, refresh };
}

export function useSongsByAlbum(album, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, sort = { key: 'track_number', dir: 'ASC' } } = options;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadSongs = useCallback(async (isLoadMore = false) => {
    if (!album) return;
    if (isLoadMore && !hasMore) return;

    await initDB();

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await songRepository.getByAlbum(album, { limit: pageSize, offset, sort });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setSongs(prev => [...prev, ...data]);
      } else {
        setSongs(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [album, pageSize, sort, hasMore]);

  const loadMore = useCallback(() => loadSongs(true), [loadSongs]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadSongs(false); }, [loadSongs]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSongs(false);
    return () => { isMountedRef.current = false; };
  }, [loadSongs]);

  return { songs, loading, hasMore, error, loadMore, refresh };
}

export function useFavoriteSongs(options = {}) {
  return useSongs({ ...options, filters: { ...options.filters, favorite: true } });
}

export function useRecentlyAddedSongs(options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadSongs = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;

    await initDB();

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await songRepository.getRecentlyAdded({ limit: pageSize, offset });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setSongs(prev => [...prev, ...data]);
      } else {
        setSongs(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [pageSize, hasMore]);

  const loadMore = useCallback(() => loadSongs(true), [loadSongs]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadSongs(false); }, [loadSongs]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSongs(false);
    return () => { isMountedRef.current = false; };
  }, [loadSongs]);

  return { songs, loading, hasMore, error, loadMore, refresh };
}

export function useRecentlyPlayedSongs(options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadSongs = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;

    await initDB();

    const offset = isLoadMore ? offsetRef.current : 0;
    if (!isLoadMore) setLoading(true);

    try {
      const data = await songRepository.getRecentlyPlayed({ limit: pageSize, offset });
      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setSongs(prev => [...prev, ...data]);
      } else {
        setSongs(data);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [pageSize, hasMore]);

  const loadMore = useCallback(() => loadSongs(true), [loadSongs]);
  const refresh = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadSongs(false); }, [loadSongs]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSongs(false);
    return () => { isMountedRef.current = false; };
  }, [loadSongs]);

  return { songs, loading, hasMore, error, loadMore, refresh };
}