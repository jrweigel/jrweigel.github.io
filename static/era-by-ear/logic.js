export const GAME_VERSION = 1;
export const MODES = Object.freeze({SHARED: 'shared', PERSONAL: 'personal'});
export const ROUND_OPTIONS = Object.freeze([5, 7, 10]);

function copy(value) {
  return structuredClone(value);
}

function requirePhase(game, phase) {
  if (game.phase !== phase) throw new Error(`Action requires the ${phase} phase.`);
}

function normalizeTrack(track) {
  const year = Number.parseInt(String(track.year), 10);
  if (!track.id || !Number.isInteger(year)) throw new Error('Every track needs an id and Spotify release year.');
  return {...track, year};
}

function activeTimeline(game) {
  return game.mode === MODES.SHARED
    ? game.sharedTimeline
    : game.personalTimelines[game.players[game.turnIndex].id];
}

export function isCorrectGap(timeline, gap, year) {
  if (!Number.isInteger(gap) || gap < 0 || gap > timeline.length) return false;
  const before = timeline[gap - 1];
  const after = timeline[gap];
  return (!before || before.year <= year) && (!after || year <= after.year);
}

export function createGame({names, mode = MODES.SHARED, rounds = 7, tracks}) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 8) throw new Error('Choose 1 to 8 players.');
  if (!Object.values(MODES).includes(mode)) throw new Error('Choose a valid timeline mode.');
  if (!ROUND_OPTIONS.includes(rounds)) throw new Error('Choose 5, 7, or 10 rounds.');

  const players = names.map((name, index) => ({
    id: `p${index}`,
    name: String(name).trim() || `Player ${index + 1}`,
    score: 0
  }));
  const deck = tracks.map(normalizeTrack);
  const seedCount = mode === MODES.SHARED ? 1 : players.length;
  const requiredTracks = seedCount + players.length * rounds;
  if (deck.length < requiredTracks) throw new Error(`This game needs at least ${requiredTracks} playable tracks.`);

  const sharedTimeline = mode === MODES.SHARED ? [{...deck.shift(), ownerId: null}] : [];
  const personalTimelines = Object.fromEntries(players.map(player => [
    player.id,
    mode === MODES.PERSONAL ? [{...deck.shift(), ownerId: player.id}] : []
  ]));

  return {
    version: GAME_VERSION,
    mode,
    rounds,
    round: 1,
    turnIndex: 0,
    phase: 'listen',
    players,
    sharedTimeline,
    personalTimelines,
    deck,
    discard: [],
    pending: deck.shift(),
    clueUsed: false,
    calls: {exactYear: null, contributorId: null, titleArtist: false},
    selectedGap: null,
    lastResult: null,
    winnerIds: []
  };
}

export function useDecadeClue(game) {
  requirePhase(game, 'listen');
  const next = copy(game);
  next.clueUsed = true;
  next.calls.exactYear = null;
  return next;
}

export function submitCalls(game, calls = {}) {
  requirePhase(game, 'listen');
  if (game.clueUsed && calls.exactYear !== undefined && calls.exactYear !== null && calls.exactYear !== '') {
    throw new Error('An exact-year call is unavailable after using a decade clue.');
  }
  const exactYear = calls.exactYear === '' || calls.exactYear === undefined || calls.exactYear === null
    ? null
    : String(calls.exactYear);
  if (exactYear !== null && !/^\d{4}$/.test(exactYear)) throw new Error('Enter an exact four-digit Spotify release year.');
  const next = copy(game);
  next.calls = {
    titleArtist: Boolean(calls.titleArtist),
    exactYear: exactYear === null ? null : Number(exactYear),
    contributorId: calls.contributorId || null
  };
  next.phase = 'place';
  return next;
}

export function selectGap(game, gap) {
  requirePhase(game, 'place');
  const timeline = activeTimeline(game);
  if (!Number.isInteger(gap) || gap < 0 || gap > timeline.length) throw new Error('Choose a valid timeline gap.');
  const next = copy(game);
  next.selectedGap = gap;
  return next;
}

export function revealTrack(game, {titleArtistCorrect = false} = {}) {
  requirePhase(game, 'place');
  if (game.selectedGap === null) throw new Error('Choose a timeline gap before revealing the track.');

  const next = copy(game);
  const player = next.players[next.turnIndex];
  const timeline = activeTimeline(next);
  const placementCorrect = isCorrectGap(timeline, next.selectedGap, next.pending.year);
  const score = {
    placement: placementCorrect ? (next.clueUsed ? 1 : 2) : 0,
    titleArtist: next.calls.titleArtist && titleArtistCorrect ? 1 : 0,
    exactYear: next.calls.exactYear === next.pending.year ? 2 : 0,
    contributor: next.calls.contributorId && next.calls.contributorId === next.pending.addedBy ? 1 : 0
  };
  const points = Object.values(score).reduce((total, value) => total + value, 0);

  if (placementCorrect) timeline.splice(next.selectedGap, 0, {...next.pending, ownerId: player.id});
  else next.discard.push(next.pending);
  player.score += points;
  next.lastResult = {playerId: player.id, track: next.pending, placementCorrect, score, points};
  next.phase = 'reveal';
  return next;
}

export function advanceTurn(game) {
  requirePhase(game, 'reveal');
  const next = copy(game);
  const finalPlayer = next.turnIndex === next.players.length - 1;
  if (finalPlayer && next.round === next.rounds) {
    const highScore = Math.max(...next.players.map(player => player.score));
    next.winnerIds = next.players.filter(player => player.score === highScore).map(player => player.id);
    next.phase = 'complete';
    next.pending = null;
    return next;
  }

  if (finalPlayer) {
    next.round += 1;
    next.turnIndex = 0;
  } else {
    next.turnIndex += 1;
  }
  if (!next.deck.length) throw new Error('The playable deck is exhausted.');
  next.pending = next.deck.shift();
  next.clueUsed = false;
  next.calls = {exactYear: null, contributorId: null, titleArtist: false};
  next.selectedGap = null;
  next.lastResult = null;
  next.phase = 'listen';
  return next;
}