export const ROUNDS = [
  {key:'white', name:'Pre-Flop', instruction:'Deal 3 community cards.', next:'Start Flop'},
  {key:'yellow', name:'Flop', instruction:'Deal 1 community card.', next:'Start Turn'},
  {key:'orange', name:'Turn', instruction:'Deal 1 community card.', next:'Start River'},
  {key:'red', name:'River', instruction:'', next:'Showdown'}
];
export const emptyStats = () => ({games:0,wins:0,losses:0,streak:0,bestStreak:0,heists:0,successes:0,failures:0});
export function newGame(names){return {players:names.map((name,i)=>({id:`p${i}`,name:name.trim()||`Player ${i+1}`})),round:0,assignments:{white:{},yellow:{},orange:{},red:{}},locked:false,vaults:0,alarms:0,view:'table',pendingResult:null};}
export function chipsFor(game){return Array.from({length:game.players.length},(_,i)=>i+1);}
export function assignChip(game, playerId, chip){
  if(game.locked) return {game,error:'Round is locked.'};
  const key=ROUNDS[game.round].key, current=game.assignments[key];
  const next=structuredClone(game);
  const previousOwner=Object.keys(current).find(id=>current[id]===chip);
  if(previousOwner&&previousOwner!==playerId) delete next.assignments[key][previousOwner];
  next.assignments[key][playerId]=chip;
  return {game:next,error:null};
}
export function returnChip(game,playerId){if(game.locked)return game; const next=structuredClone(game);delete next.assignments[ROUNDS[next.round].key][playerId];return next;}
export function confirmRound(game){const key=ROUNDS[game.round].key;if(Object.keys(game.assignments[key]).length!==game.players.length)return {game,error:'Every player needs a chip.'};const next=structuredClone(game);next.locked=true;return {game:next,error:null};}
export function unlock(game){const next=structuredClone(game);next.locked=false;return next;}
export function advance(game){const next=structuredClone(game);if(next.round===3)next.view='showdown';else {next.round++;next.locked=false;}return next;}
export function showdown(game){return game.players.map(p=>({name:p.name,chip:game.assignments.red[p.id]})).sort((a,b)=>a.chip-b.chip);}
export function recordResult(game,result,stats){const next=structuredClone(game), s=structuredClone(stats);result==='vault'?next.vaults++:next.alarms++;s.heists++;result==='vault'?s.successes++:s.failures++;next.pendingResult=null;if(next.vaults===3||next.alarms===3){next.view='end';s.games++;if(next.vaults===3){s.wins++;s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);}else{s.losses++;s.streak=0;}}else next.view='between';return {game:next,stats:s};}
export function nextHeist(game){const next=structuredClone(game);next.round=0;next.assignments={white:{},yellow:{},orange:{},red:{}};next.locked=false;next.view='table';return next;}