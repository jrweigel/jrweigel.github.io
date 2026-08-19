import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlaylistItem, normalizePlaylistItems, parsePlaylistId} from '../deck.js';

function item(overrides = {}) {
  return {
    added_by: {id: 'listener-1'},
    item: {
      id: 'track-1',
      uri: 'spotify:track:track-1',
      type: 'track',
      name: 'A Song',
      artists: [{name: 'An Artist'}],
      external_urls: {spotify: 'https://open.spotify.com/track/track-1'},
      album: {
        name: 'A Reissue',
        release_date: '2004-06-01',
        release_date_precision: 'day',
        images: [{url: 'https://i.scdn.co/image/example'}]
      },
      ...overrides
    }
  };
}

test('parses Spotify playlist URLs and URIs', () => {
  assert.equal(parsePlaylistId('spotify:playlist:abc123'), 'abc123');
  assert.equal(parsePlaylistId('https://open.spotify.com/playlist/abc123?si=xyz'), 'abc123');
  assert.equal(parsePlaylistId('https://example.com/playlist/abc123'), null);
});

test('uses the Spotify album release year without correction', () => {
  const track = normalizePlaylistItem(item());
  assert.equal(track.year, 2004);
  assert.equal(track.releaseDate, '2004-06-01');
  assert.equal(track.releaseDatePrecision, 'day');
  assert.equal(track.addedBy, 'listener-1');
});

test('rejects episodes, local tracks, unavailable tracks, and missing dates', () => {
  assert.equal(normalizePlaylistItem(item({type: 'episode'})), null);
  assert.equal(normalizePlaylistItem(item({is_local: true})), null);
  assert.equal(normalizePlaylistItem(item({is_playable: false})), null);
  assert.equal(normalizePlaylistItem(item({album: {release_date: null}})), null);
});

test('deduplicates normalized tracks by Spotify id', () => {
  assert.equal(normalizePlaylistItems([item(), item()]).length, 1);
});