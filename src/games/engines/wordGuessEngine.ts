export type LetterMark = 'correct' | 'present' | 'absent';

export interface WordGuessRow {
  word: string;
  marks: LetterMark[];
}

export interface WordGuessState {
  targetWord: string;
  turn: '1' | '2';
  p1Guesses: WordGuessRow[];
  p2Guesses: WordGuessRow[];
  p1Solved: boolean;
  p2Solved: boolean;
  winner: '' | '1' | '2' | 'draw';
  outcomeReason: string;
}

export const WORD_GUESS_BANK: readonly string[] = [
  'APPLE', 'BRAVE', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART',
  'INDEX', 'JOKER', 'KNIFE', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN', 'PEARL',
  'QUEEN', 'RIVER', 'SMILE', 'TIGER', 'UNITY', 'VIVID', 'WHALE', 'YOUTH',
  'ZEBRA', 'ALERT', 'BENCH', 'CLOUD', 'DREAM', 'EARTH', 'FROST', 'GLIDE',
  'HONEY', 'IVORY', 'JOLLY', 'KARMA', 'LIGHT', 'MAGIC', 'NOBLE', 'OLIVE',
  'PIANO', 'QUEST', 'ROBIN', 'STONE', 'TRAIN', 'URBAN', 'VALID', 'WATER',
  'AMBER', 'BLAZE', 'CHARM', 'DRIFT', 'EMBER', 'FEAST', 'GHOST', 'HAPPY',
  'INPUT', 'JUICE', 'KOALA', 'LASER', 'MAPLE', 'NURSE', 'ORBIT', 'PRIDE',
  'QUIET', 'RADAR', 'SPARK', 'TABLE', 'ULTRA', 'VOICE', 'WORLD', 'ACORN',
  'BEACH', 'CROWN', 'DELTA', 'ELITE', 'FOCUS', 'GIANT', 'HOTEL', 'IMAGE',
  'JELLY', 'KINGS', 'LUNAR', 'METAL', 'NORTH', 'OTTER', 'PLANT', 'QUICK',
  'ROYAL', 'SCALE', 'TRACK', 'USUAL', 'VAULT', 'WHEAT', 'ANGEL', 'BLOOM',
  'CORAL', 'DAISY', 'EPOCH', 'FLUTE', 'GLOBE', 'HAVEN', 'IGLOO', 'JAZZY',
  'KNOTS', 'LOYAL', 'MUSIC', 'NOVEL', 'OPERA', 'PIXEL', 'QUILT', 'RANGE',
  'SOLAR', 'TOAST', 'UNCLE', 'VENOM', 'WINGS', 'BADGE', 'CABIN', 'DEPTH',
  'ENVOY', 'FORGE', 'GRAIN', 'HUMOR', 'INLET', 'JEWEL', 'LATCH', 'MIRTH',
  'NEONX', 'OASIS', 'PULSE', 'QUART', 'RIDGE', 'SHORE', 'TEMPO', 'UPSET',
].filter((w) => /^[A-Z]{5}$/.test(w) && w !== 'NEONX');

export function pickRandomTargetWord(): string {
  return WORD_GUESS_BANK[Math.floor(Math.random() * WORD_GUESS_BANK.length)];
}

export function createInitialWordGuessState(): WordGuessState {
  return {
    targetWord: pickRandomTargetWord(),
    turn: '1',
    p1Guesses: [],
    p2Guesses: [],
    p1Solved: false,
    p2Solved: false,
    winner: '',
    outcomeReason: '',
  };
}

export function evaluateWordGuess(guess: string, target: string): LetterMark[] {
  const g = guess.toUpperCase().split('');
  const t = target.toUpperCase().split('');
  const marks: LetterMark[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const remainingCounts: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) {
      marks[i] = 'correct';
    } else {
      remainingCounts[t[i]] = (remainingCounts[t[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (marks[i] === 'correct') continue;
    const ch = g[i];
    if ((remainingCounts[ch] || 0) > 0) {
      marks[i] = 'present';
      remainingCounts[ch] -= 1;
    }
  }

  return marks;
}

export function submitWordGuess(
  state: WordGuessState,
  player: '1' | '2',
  rawWord: string,
): WordGuessState {
  if (state.winner !== '') {
    throw new Error('This word duel has already ended.');
  }
  if (state.turn !== player) {
    throw new Error('Wait for your turn to guess.');
  }
  const word = rawWord.trim().toUpperCase();
  if (!/^[A-Z]{5}$/.test(word)) {
    throw new Error('Enter a 5-letter word (A–Z).');
  }

  const myRows = player === '1' ? state.p1Guesses : state.p2Guesses;
  if (myRows.length >= 6) {
    throw new Error('You have used all 6 guesses.');
  }

  const marks = evaluateWordGuess(word, state.targetWord);
  const solvedNow = marks.every((m) => m === 'correct');
  const nextRow: WordGuessRow = { word, marks };

  const nextP1 = player === '1' ? [...state.p1Guesses, nextRow] : state.p1Guesses;
  const nextP2 = player === '2' ? [...state.p2Guesses, nextRow] : state.p2Guesses;
  const nextP1Solved = player === '1' ? solvedNow : state.p1Solved;
  const nextP2Solved = player === '2' ? solvedNow : state.p2Solved;

  // Turn-based fairness: P1 guesses round k, then P2 guesses round k.
  // Round ends when both have equal guess counts (and someone solved or both hit 6).
  if (player === '1') {
    if (nextP2Solved || nextP2.length >= 6) {
      // P2 already finished their turn or solved earlier? Resolve now
      return resolveWordDuel(state.targetWord, nextP1, nextP2, nextP1Solved, nextP2Solved);
    }
    return {
      ...state,
      turn: '2',
      p1Guesses: nextP1,
      p2Guesses: nextP2,
      p1Solved: nextP1Solved,
      p2Solved: nextP2Solved,
    };
  }

  // Player 2 just finished round k (both now have equal rows)
  if (nextP1Solved || nextP2Solved || (nextP1.length >= 6 && nextP2.length >= 6)) {
    return resolveWordDuel(state.targetWord, nextP1, nextP2, nextP1Solved, nextP2Solved);
  }

  return {
    ...state,
    turn: '1',
    p1Guesses: nextP1,
    p2Guesses: nextP2,
    p1Solved: nextP1Solved,
    p2Solved: nextP2Solved,
  };
}

function resolveWordDuel(
  targetWord: string,
  p1Guesses: WordGuessRow[],
  p2Guesses: WordGuessRow[],
  p1Solved: boolean,
  p2Solved: boolean,
): WordGuessState {
  let winner: WordGuessState['winner'] = 'draw';
  let outcomeReason = `No one cracked "${targetWord}" in 6 tries — Draw!`;

  if (p1Solved && p2Solved) {
    winner = 'draw';
    outcomeReason = `Both players cracked "${targetWord}" in ${p1Guesses.length} guesses — Draw!`;
  } else if (p1Solved) {
    winner = '1';
    outcomeReason = `Solved "${targetWord}" in ${p1Guesses.length} ${p1Guesses.length === 1 ? 'guess' : 'guesses'}!`;
  } else if (p2Solved) {
    winner = '2';
    outcomeReason = `Solved "${targetWord}" in ${p2Guesses.length} ${p2Guesses.length === 1 ? 'guess' : 'guesses'}!`;
  }

  return {
    targetWord,
    turn: '1',
    p1Guesses,
    p2Guesses,
    p1Solved,
    p2Solved,
    winner,
    outcomeReason,
  };
}
