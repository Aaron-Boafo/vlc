/**
 * Maps raw SQLite song rows to the shape consumed by UI.
 * DB stores metadata in artist/title/album + artwork_path/thumbnail_path columns;
 * those can be NULL before metadata extraction, so we provide sensible fallbacks
 * and expose alias fields the UI already reads (artwork / thumbnail).
 */
export function mapSongRow(row) {
  if (!row) return row;

  const title =
    row.title ||
    (typeof row.filename === 'string' ? row.filename.replace(/\.[^/.]+$/, '') : null) ||
    'Unknown Title';

  return {
    ...row,
    title,
    artist: row.artist || 'Unknown Artist',
    album: row.album || 'Unknown Album',
    artwork: row.artwork || row.artwork_path || row.thumbnail_path || null,
    thumbnail: row.thumbnail || row.thumbnail_path || row.artwork_path || null,
    duration: Number(row.duration) || 0,
  };
}

export function mapSongRows(rows) {
  if (!rows) return [];
  return rows.map(mapSongRow);
}