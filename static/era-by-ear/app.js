import {advanceTurn, createGame, MODES, revealTrack, selectGap, submitCalls, useDecadeClue} from './logic.js';
import {connect, disconnect, getClientId, handleCallback, isConnected} from './spotify-auth.js';
import {importPlaylist} from './spotify-api.js';
import {SpotifyPlayer} from './spotify-player.js';

const STORAGE_KEY = 'era-by-ear-game-v1';
const app = document.getElementById('app');
const player = new SpotifyPlayer();
let game = loadGame();
let message = '';
let confirmingCall = false;

boot();

async function boot() {
  try { await handleCallback(); } catch (error) { message = error.message; }
  if (isConnected()) void player.prepare();
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}

function render() {
  if (!isConnected()) return renderConnect();
  if (!game) return renderSetup();
  if (game.phase === 'complete') return renderComplete();
  renderGame();
}

function shell(content) {
  app.innerHTML = `<header class="mast"><div><p class="eyebrow">Put music in its place</p><h1>Era by Ear</h1></div><button class="icon-button" data-action="reset" title="Start over" aria-label="Start over">↺</button></header>${message ? `<p class="notice">${escapeHtml(message)}</p>` : ''}${content}<footer>Uses Spotify release metadata. Unofficial and not affiliated with Spotify.</footer>`;
  app.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
}

function renderConnect() {
  shell(`<section class="panel intro"><div class="record" aria-hidden="true"><span></span></div><h2>One phone. Every era.</h2><p>Connect an allowlisted Spotify Premium account, then turn any playlist into a music timeline.</p><label>Spotify client ID<input id="clientId" autocomplete="off" value="${escapeHtml(getClientId())}" placeholder="Public client ID"></label><button class="primary" id="connect">Connect Spotify</button><p class="fine">Register this exact redirect in Spotify: <code>${escapeHtml(location.origin + location.pathname)}</code></p></section>`);
  document.getElementById('connect').onclick = async () => {
    const clientId = document.getElementById('clientId').value.trim();
    if (!clientId) return show('Enter the public client ID from Spotify Developer Dashboard.');
    await connect(clientId);
  };
}

function renderSetup() {
  shell(`<section class="panel"><p class="step">Set the table</p><h2>Build tonight’s game</h2><form id="setup"><label>Players or teams<textarea id="names" required>Player 1\nPlayer 2</textarea></label><div class="split"><label>Timeline<select id="mode"><option value="shared">Shared timeline</option><option value="personal">Personal timelines</option></select></label><label>Rounds<select id="rounds"><option>5</option><option selected>7</option><option>10</option></select></label></div><label>Spotify playlist<input id="playlist" required placeholder="https://open.spotify.com/playlist/..."></label><button class="primary" type="submit">Import and start</button></form><button class="text-button" id="logout">Disconnect Spotify</button><p class="fine">Spotify album release dates are used exactly as returned. Reissues and compilations may differ from original release years. Playlist-contributor calls are planned for the next implementation slice.</p></section>`);
  document.getElementById('logout').onclick = () => { disconnect(); render(); };
  document.getElementById('setup').onsubmit = async event => {
    event.preventDefault();
    try {
      show('Reading playlist from Spotify…');
      const tracks = shuffle(await importPlaylist(document.getElementById('playlist').value));
      const names = document.getElementById('names').value.split('\n').map(value => value.trim()).filter(Boolean);
      game = createGame({names, mode: document.getElementById('mode').value, rounds: Number(document.getElementById('rounds').value), tracks});
      save(); message = ''; render();
    } catch (error) { show(error.message); }
  };
}

function renderGame() {
  const active = game.players[game.turnIndex];
  const timeline = game.mode === MODES.SHARED ? game.sharedTimeline : game.personalTimelines[active.id];
  const scoreboard = game.players.map(person => `<li class="${person.id === active.id ? 'active' : ''}"><span>${escapeHtml(person.name)}</span><strong>${person.score}</strong></li>`).join('');
  const board = timeline.map((track, index) => `${gap(index)}<article class="year-card"><small>${track.ownerId ? escapeHtml(game.players.find(person => person.id === track.ownerId)?.name || '') : 'Seed'}</small><strong>${track.year}</strong></article>`).join('') + gap(timeline.length);
  let controls = '';
  if (game.phase === 'listen') controls = `<button class="play" id="play">▶ Play hidden track</button><button class="secondary" id="clue" ${game.clueUsed ? 'disabled' : ''}>${game.clueUsed ? `${Math.floor(game.pending.year / 10) * 10}s clue used` : 'Reveal decade clue'}</button><div class="calls"><label class="check"><input id="titleArtist" type="checkbox"> I can name title and artist (+1)</label><label>Exact Spotify year (+2)<input id="exactYear" inputmode="numeric" maxlength="4" ${game.clueUsed ? 'disabled' : ''}></label></div><button class="primary" id="place">Lock calls and place</button>`;
  if (game.phase === 'place') controls = confirmingCall ? `<div class="confirm"><h3>Before the reveal</h3><p>Does the table confirm the title and artist call?</p><button class="primary confirm-call" data-correct="yes">Yes, both correct</button><button class="secondary confirm-call" data-correct="no">No</button></div>` : `<p class="instruction">Tap a gap in the timeline, then reveal.</p><button class="primary" id="reveal" ${game.selectedGap === null ? 'disabled' : ''}>Reveal Spotify year</button>`;
  if (game.phase === 'reveal') controls = resultMarkup(game.lastResult);
  shell(`<section class="status"><div><span>Round ${game.round} of ${game.rounds}</span><strong>${escapeHtml(active.name)}’s turn</strong></div><ul>${scoreboard}</ul></section><section class="now-playing"><div class="mystery" aria-hidden="true">?</div><div><p class="step">Listen first</p><h2>${game.phase === 'reveal' ? escapeHtml(game.lastResult.track.title) : 'Mystery track'}</h2><p>${game.phase === 'reveal' ? escapeHtml(game.lastResult.track.artists.join(', ')) : 'Metadata stays hidden until reveal.'}</p></div></section><section class="timeline" aria-label="Timeline">${board}</section><section class="controls">${controls}</section>`);
  bindGameControls();
}

function gap(index) {
  const selected = game.selectedGap === index ? ' selected' : '';
  return `<button class="gap${selected}" data-gap="${index}" ${game.phase !== 'place' || confirmingCall ? 'disabled' : ''} aria-label="Place in gap ${index + 1}">+</button>`;
}

function resultMarkup(result) {
  const score = result.score;
  return `<div class="reveal"><p class="spotify-year">${result.track.year}</p><p>${escapeHtml(result.track.album)} · Spotify release date ${escapeHtml(result.track.releaseDate)}</p><ul><li>Placement <strong>+${score.placement}</strong></li><li>Title + artist <strong>+${score.titleArtist}</strong></li><li>Exact year <strong>+${score.exactYear}</strong></li>${score.contributor ? `<li>Playlist contributor <strong>+${score.contributor}</strong></li>` : ''}</ul><p class="turn-total">Turn total <strong>+${result.points}</strong></p><button class="primary" id="next">${game.turnIndex === game.players.length - 1 ? 'Finish round' : 'Next player'}</button></div>`;
}

function bindGameControls() {
  document.getElementById('play')?.addEventListener('click', async () => { try { await player.play(game.pending.uri); show('Playing. Keep lock screens and watches out of sight.'); } catch (error) { show(error.message); } });
  document.getElementById('clue')?.addEventListener('click', () => { game = useDecadeClue(game); save(); render(); });
  document.getElementById('place')?.addEventListener('click', () => { game = submitCalls(game, {titleArtist: document.getElementById('titleArtist').checked, exactYear: document.getElementById('exactYear').value}); save(); render(); });
  document.querySelectorAll('[data-gap]').forEach(button => button.addEventListener('click', () => { game = selectGap(game, Number(button.dataset.gap)); save(); render(); }));
  document.getElementById('reveal')?.addEventListener('click', async () => { try { await player.pause(); } catch { message = 'Playback could not be paused; reveal continued.'; } if (game.calls.titleArtist) { confirmingCall = true; render(); } else finishReveal(false); });
  document.querySelectorAll('.confirm-call').forEach(button => button.addEventListener('click', () => finishReveal(button.dataset.correct === 'yes')));
  document.getElementById('next')?.addEventListener('click', () => { game = advanceTurn(game); save(); render(); });
}

function finishReveal(titleArtistCorrect) { confirmingCall = false; game = revealTrack(game, {titleArtistCorrect}); save(); render(); }

function renderComplete() {
  const winners = game.players.filter(person => game.winnerIds.includes(person.id));
  shell(`<section class="panel winner"><p class="step">Final score</p><h2>${winners.length === 1 ? `${escapeHtml(winners[0].name)} wins` : 'Tie game'}</h2><ol>${[...game.players].sort((a, b) => b.score - a.score).map(person => `<li><span>${escapeHtml(person.name)}</span><strong>${person.score}</strong></li>`).join('')}</ol><button class="primary" id="again">New game</button></section>`);
  document.getElementById('again').onclick = reset;
}

function reset() { if (!game || window.confirm('Start a new game?')) { game = null; localStorage.removeItem(STORAGE_KEY); message = ''; render(); } }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }
function loadGame() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
function show(value) { message = value; render(); }
function shuffle(values) { const next = [...values]; for (let index = next.length - 1; index > 0; index -= 1) { const swap = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1); [next[index], next[swap]] = [next[swap], next[index]]; } return next; }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = String(value ?? ''); return node.innerHTML; }