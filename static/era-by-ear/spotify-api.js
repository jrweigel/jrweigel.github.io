import {accessToken} from './spotify-auth.js';
import {normalizePlaylistItems, parsePlaylistId} from './deck.js';

export async function importPlaylist(value) {
  const playlistId = parsePlaylistId(value);
  if (!playlistId) throw new Error('Enter a valid Spotify playlist URL or URI.');
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=50&additional_types=track`;
  const items = [];
  while (url) {
    const response = await fetch(url, {headers: {Authorization: `Bearer ${await accessToken()}`}});
    if (response.status === 403) throw new Error('This Spotify account is not allowlisted for the developer app.');
    if (response.status === 429) throw new Error('Spotify is rate limiting requests. Try again shortly.');
    if (!response.ok) throw new Error('Spotify could not read that playlist. Make sure it is accessible to this account.');
    const page = await response.json();
    items.push(...page.items);
    url = page.next;
  }
  return normalizePlaylistItems(items);
}