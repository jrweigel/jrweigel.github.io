import {accessToken} from './spotify-auth.js';

let sdkPromise;

function loadSdk() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onerror = () => reject(new Error('Spotify player could not load.'));
    document.head.append(script);
  });
  return sdkPromise;
}

export class SpotifyPlayer {
  async prepare() {
    if (this.player) return;
    await loadSdk();
    this.player = new window.Spotify.Player({name: 'Era by Ear', getOAuthToken: async callback => callback(await accessToken()), volume: 0.7});
    this.player.addListener('ready', ({device_id: deviceId}) => { this.deviceId = deviceId; });
    this.player.addListener('authentication_error', ({message}) => { this.error = message; });
    this.player.addListener('account_error', () => { this.error = 'Spotify Premium is required.'; });
  }

  async connect() {
    if (this.deviceId) return;
    await this.prepare();
    const connected = await this.player.connect();
    if (!connected) throw new Error('Spotify player could not connect.');
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (this.deviceId) { clearInterval(timer); resolve(); }
        else if (Date.now() - started > 10_000) { clearInterval(timer); reject(new Error(this.error || 'Spotify player did not become ready.')); }
      }, 100);
    });
  }

  async play(uri) {
    if (!this.player) {
      void this.prepare();
      throw new Error('Spotify player is still loading. Tap play again.');
    }
    this.player.activateElement();
    await this.connect();
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({uris: [uri]})
    });
    if (!response.ok) throw new Error('Spotify could not start this track. Check Premium playback and active devices.');
  }

  async pause() {
    if (this.player) await this.player.pause();
  }
}