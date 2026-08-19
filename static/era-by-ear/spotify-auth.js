const AUTH_KEY = 'era-by-ear-spotify-auth-v1';
const CLIENT_KEY = 'era-by-ear-spotify-client-v1';
const VERIFIER_KEY = 'era-by-ear-pkce-verifier';
const STATE_KEY = 'era-by-ear-pkce-state';
const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private'];

export const getClientId = () => localStorage.getItem(CLIENT_KEY) || '';
export const setClientId = value => localStorage.setItem(CLIENT_KEY, String(value).trim());
export const isConnected = () => Boolean(JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')?.refreshToken);

function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), value => chars[value % chars.length]).join('');
}

async function challenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function connect(clientId) {
  setClientId(clientId);
  const verifier = randomString();
  const state = randomString(32);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await challenge(verifier),
    state
  });
  location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

export async function handleCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return;
  if (params.get('state') !== sessionStorage.getItem(STATE_KEY)) throw new Error('Spotify sign-in state did not match.');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: sessionStorage.getItem(VERIFIER_KEY) || ''
    })
  });
  if (!response.ok) throw new Error('Spotify could not complete sign-in. Check the registered redirect URI.');
  storeTokens(await response.json());
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  history.replaceState({}, '', location.pathname);
}

export async function accessToken() {
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  if (!auth) throw new Error('Connect Spotify first.');
  if (Date.now() < auth.expiresAt - 60_000) return auth.accessToken;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: getClientId(), grant_type: 'refresh_token', refresh_token: auth.refreshToken})
  });
  if (!response.ok) throw new Error('Spotify session expired. Connect again.');
  const refreshed = await response.json();
  storeTokens({...refreshed, refresh_token: refreshed.refresh_token || auth.refreshToken});
  return JSON.parse(localStorage.getItem(AUTH_KEY)).accessToken;
}

export function disconnect() {
  localStorage.removeItem(AUTH_KEY);
}

function storeTokens(tokens) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000
  }));
}

function redirectUri() {
  return `${location.origin}${location.pathname}`;
}