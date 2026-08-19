export function parsePlaylistId(value) {
  const input = String(value || '').trim();
  const uriMatch = input.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  try {
    const url = new URL(input);
    if (!url.hostname.endsWith('spotify.com')) return null;
    const match = url.pathname.match(/^\/playlist\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function normalizePlaylistItem(entry) {
  const track = entry?.item || entry?.track;
  if (!track || track.type !== 'track' || track.is_local || track.is_playable === false) return null;
  const releaseDate = track.album?.release_date;
  const year = Number.parseInt(String(releaseDate || '').slice(0, 4), 10);
  if (!track.id || !Number.isInteger(year)) return null;
  return {
    id: track.id,
    uri: track.uri,
    title: track.name,
    artists: (track.artists || []).map(artist => artist.name),
    year,
    releaseDate,
    releaseDatePrecision: track.album?.release_date_precision || 'year',
    album: track.album?.name || '',
    artwork: track.album?.images?.[0]?.url || null,
    spotifyUrl: track.external_urls?.spotify || null,
    addedBy: entry.added_by?.id || null
  };
}

export function normalizePlaylistItems(entries) {
  const seen = new Set();
  const tracks = [];
  for (const entry of entries) {
    const track = normalizePlaylistItem(entry);
    if (!track || seen.has(track.id)) continue;
    seen.add(track.id);
    tracks.push(track);
  }
  return tracks;
}