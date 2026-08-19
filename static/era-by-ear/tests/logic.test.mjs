import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODES,
  advanceTurn,
  createGame,
  isCorrectGap,
  revealTrack,
  selectGap,
  submitCalls,
  useDecadeClue
} from '../logic.js';

const tracks = Array.from({length: 90}, (_, index) => ({
  id: `track-${index}`,
  title: `Track ${index}`,
  artists: [`Artist ${index}`],
  year: 1950 + index,
  addedBy: index === 1 ? 'spotify-user-a' : null
}));

test('valid gaps include either side of an equal Spotify release year', () => {
  const timeline = [{year: 1984}, {year: 1984}, {year: 1991}];
  assert.equal(isCorrectGap(timeline, 0, 1984), true);
  assert.equal(isCorrectGap(timeline, 1, 1984), true);
  assert.equal(isCorrectGap(timeline, 2, 1984), true);
  assert.equal(isCorrectGap(timeline, 3, 1984), false);
});

test('shared mode inserts a correct placement into the central timeline', () => {
  let game = createGame({names: ['Ada', 'Grace'], mode: MODES.SHARED, rounds: 5, tracks});
  game = submitCalls(game);
  game = selectGap(game, 1);
  game = revealTrack(game);
  assert.equal(game.lastResult.placementCorrect, true);
  assert.equal(game.players[0].score, 2);
  assert.equal(game.sharedTimeline.length, 2);
  assert.equal(game.sharedTimeline[1].ownerId, 'p0');
});

test('personal mode changes only the active player timeline', () => {
  let game = createGame({names: ['Ada', 'Grace'], mode: MODES.PERSONAL, rounds: 5, tracks});
  game = submitCalls(game);
  game = selectGap(game, 1);
  game = revealTrack(game);
  assert.equal(game.personalTimelines.p0.length, 2);
  assert.equal(game.personalTimelines.p1.length, 1);
});

test('knowledge calls score independently after an incorrect placement', () => {
  let game = createGame({names: ['Ada'], rounds: 5, tracks});
  game = submitCalls(game, {titleArtist: true, exactYear: 1951, contributorId: 'spotify-user-a'});
  game = selectGap(game, 0);
  game = revealTrack(game, {titleArtistCorrect: true});
  assert.equal(game.lastResult.placementCorrect, false);
  assert.deepEqual(game.lastResult.score, {placement: 0, titleArtist: 1, exactYear: 2, contributor: 1});
  assert.equal(game.players[0].score, 4);
});

test('a decade clue reduces placement value and disables exact-year calls', () => {
  let game = createGame({names: ['Ada'], rounds: 5, tracks});
  game = useDecadeClue(game);
  assert.throws(() => submitCalls(game, {exactYear: 1951}), /unavailable/);
  game = submitCalls(game);
  game = selectGap(game, 1);
  game = revealTrack(game);
  assert.equal(game.lastResult.score.placement, 1);
});

test('exact-year calls require exactly four digits', () => {
  const game = createGame({names: ['Ada'], rounds: 5, tracks});
  assert.throws(() => submitCalls(game, {exactYear: '1951 remix'}), /four-digit/);
  assert.throws(() => submitCalls(game, {exactYear: '951'}), /four-digit/);
});

test('fixed rounds give every player an equal final turn', () => {
  let game = createGame({names: ['Ada', 'Grace'], rounds: 5, tracks});
  for (let turn = 0; turn < 10; turn += 1) {
    game = submitCalls(game);
    game = selectGap(game, game.sharedTimeline.length);
    game = revealTrack(game);
    if (turn < 9) game = advanceTurn(game);
  }
  game = advanceTurn(game);
  assert.equal(game.phase, 'complete');
  assert.equal(game.round, 5);
  assert.deepEqual(game.winnerIds, ['p0', 'p1']);
  assert.deepEqual(game.players.map(player => player.score), [10, 10]);
});