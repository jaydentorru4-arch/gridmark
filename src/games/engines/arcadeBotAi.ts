import type { BotDifficulty } from '../../lib/botAi';
import {
  BS_SIZE,
  isShipSunk,
  type BattleshipState,
} from './battleshipEngine';
import {
  executeCheckerMove,
  getAllLegalCheckerMoves,
  type CheckersState,
} from './checkersEngine';
import {
  executeChessMove,
  getAllLegalMoves,
  type ChessPiece,
  type ChessState,
  type PromoKind,
} from './chessEngine';
import {
  C4_COLS,
  C4_ROWS,
  dropConnect4Disc,
  findDropRow,
  type Connect4State,
} from './connect4Engine';
import {
  isCardPlayable,
  type CardSuit,
  type CrazyEightsState,
} from './crazyEightsEngine';
import {
  DB_BOXES,
  DB_DOTS,
  type BoxOwner,
  type DotsBoxesState,
} from './dotsBoxesEngine';
import { HANGMAN_BANK, type HangmanState } from './hangmanEngine';
import {
  getLegalReversiMoves,
  playReversiMove,
  type ReversiState,
} from './reversiEngine';
import type { RpsChoice, RpsState } from './rpsEngine';
import {
  WORD_GUESS_BANK,
  evaluateWordGuess,
  type WordGuessState,
} from './wordGuessEngine';

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// =========================================================
// 1. CHESS BOT AI
// =========================================================
const CHESS_VALUES: Record<string, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

function evaluateChessBoard(state: ChessState, botColor: 'w' | 'b'): number {
  if (state.outcome === botColor) return 100000;
  if (state.outcome !== '' && state.outcome !== 'draw') return -100000;
  if (state.outcome === 'draw') return 0;

  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p: ChessPiece = state.board[i];
    if (!p) continue;
    const color = p[0];
    const kind = p[1];
    const val = CHESS_VALUES[kind] || 0;
    const r = Math.floor(i / 8);
    const c = i % 8;
    const centerBonus = (3.5 - Math.abs(3.5 - r)) * 4 + (3.5 - Math.abs(3.5 - c)) * 5;
    const total = val + (kind !== 'K' ? centerBonus : 0);
    score += color === botColor ? total : -total;
  }
  if (state.inCheck && state.inCheck !== botColor) score += 45;
  if (state.inCheck === botColor) score -= 45;
  return score;
}

export function chooseChessBotMove(
  state: ChessState,
  difficulty: BotDifficulty,
): { from: number; to: number; promo: PromoKind } | null {
  const botColor = state.turn;
  const moves = getAllLegalMoves(state, botColor);
  if (moves.length === 0) return null;

  if (difficulty === 'casual') {
    const captures = moves.filter((m) => state.board[m.to] !== '');
    const chosen = captures.length > 0 && Math.random() < 0.45 ? pickRandom(captures) : pickRandom(moves);
    return { from: chosen.from, to: chosen.to, promo: 'Q' };
  }

  let bestScore = -Infinity;
  let bestMoves: typeof moves = [];

  // Limit candidate sorting on deeper search
  for (const move of moves) {
    const promo: PromoKind = move.isPromotion ? 'Q' : 'Q';
    const next = executeChessMove(state, move.from, move.to, promo);

    let score = evaluateChessBoard(next, botColor);
    if (difficulty === 'unbeatable' && next.outcome === '') {
      const replies = getAllLegalMoves(next, next.turn);
      // Evaluate worst opponent reply (sampled/all up to 35 for speed)
      const prioritized = replies.sort((a, b) => {
        const capA = next.board[a.to] !== '' ? 1 : 0;
        const capB = next.board[b.to] !== '' ? 1 : 0;
        return capB - capA;
      }).slice(0, 28);

      let worstReply = Infinity;
      for (const reply of prioritized) {
        const afterReply = executeChessMove(next, reply.from, reply.to, 'Q');
        const repScore = evaluateChessBoard(afterReply, botColor);
        if (repScore < worstReply) worstReply = repScore;
      }
      if (prioritized.length > 0) score = worstReply;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  const finalMove = pickRandom(bestMoves);
  return { from: finalMove.from, to: finalMove.to, promo: 'Q' };
}

// =========================================================
// 2. CONNECT FOUR BOT AI
// =========================================================
const C4_COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

function scoreConnect4Window(cells: string[], bot: '1' | '2', human: '1' | '2'): number {
  let bCount = 0;
  let hCount = 0;
  let empty = 0;
  for (const c of cells) {
    if (c === bot) bCount++;
    else if (c === human) hCount++;
    else empty++;
  }
  if (bCount === 4) return 10000;
  if (hCount === 4) return -10000;
  if (bCount === 3 && empty === 1) return 18;
  if (bCount === 2 && empty === 2) return 4;
  if (hCount === 3 && empty === 1) return -22;
  if (hCount === 2 && empty === 2) return -3;
  return 0;
}

function evaluateConnect4(state: Connect4State, bot: '1' | '2'): number {
  const human: '1' | '2' = bot === '1' ? '2' : '1';
  if (state.winner === bot) return 100000;
  if (state.winner === human) return -100000;
  if (state.winner === 'draw') return 0;

  let score = 0;
  // Center column preference
  for (let r = 0; r < C4_ROWS; r++) {
    if (state.board[r * C4_COLS + 3] === bot) score += 6;
  }

  // Horizontal
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      score += scoreConnect4Window(
        [0, 1, 2, 3].map((k) => state.board[r * C4_COLS + (c + k)]),
        bot,
        human,
      );
    }
  }
  // Vertical
  for (let c = 0; c < C4_COLS; c++) {
    for (let r = 0; r <= C4_ROWS - 4; r++) {
      score += scoreConnect4Window(
        [0, 1, 2, 3].map((k) => state.board[(r + k) * C4_COLS + c]),
        bot,
        human,
      );
    }
  }
  // Diagonals
  for (let r = 0; r <= C4_ROWS - 4; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      score += scoreConnect4Window(
        [0, 1, 2, 3].map((k) => state.board[(r + k) * C4_COLS + (c + k)]),
        bot,
        human,
      );
      score += scoreConnect4Window(
        [0, 1, 2, 3].map((k) => state.board[(r + 3 - k) * C4_COLS + (c + k)]),
        bot,
        human,
      );
    }
  }
  return score;
}

function minimaxC4(
  state: Connect4State,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  bot: '1' | '2',
): number {
  if (state.winner !== '' || depth === 0) {
    const base = evaluateConnect4(state, bot);
    if (state.winner === bot) return base + depth * 50;
    if (state.winner !== '' && state.winner !== 'draw') return base - depth * 50;
    return base;
  }

  const validCols = C4_COL_ORDER.filter((c) => findDropRow(state.board, c) !== -1);
  if (maximizing) {
    let best = -Infinity;
    for (const col of validCols) {
      const next = dropConnect4Disc(state, col);
      const val = minimaxC4(next, depth - 1, alpha, beta, false, bot);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const col of validCols) {
    const next = dropConnect4Disc(state, col);
    const val = minimaxC4(next, depth - 1, alpha, beta, true, bot);
    if (val < best) best = val;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseConnect4BotCol(
  state: Connect4State,
  difficulty: BotDifficulty,
): number {
  const validCols = C4_COL_ORDER.filter((c) => findDropRow(state.board, c) !== -1);
  if (validCols.length === 0) return -1;

  const bot = state.turn;
  // Immediate win check
  for (const col of validCols) {
    const next = dropConnect4Disc(state, col);
    if (next.winner === bot && (difficulty !== 'casual' || Math.random() < 0.7)) {
      return col;
    }
  }

  if (difficulty === 'casual') {
    return pickRandom(validCols);
  }

  const depth = difficulty === 'unbeatable' ? 4 : 2;
  let bestScore = -Infinity;
  let bestCols: number[] = [];

  for (const col of validCols) {
    const next = dropConnect4Disc(state, col);
    const score = minimaxC4(next, depth, -Infinity, Infinity, false, bot);
    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }
  return pickRandom(bestCols);
}

// =========================================================
// 3. BATTLESHIP BOT AI
// =========================================================
export function chooseBattleshipBotShot(
  state: BattleshipState,
  botSide: '1' | '2',
  difficulty: BotDifficulty,
): number {
  const myShots = botSide === '1' ? state.p1Shots : state.p2Shots;
  const enemyShips = botSide === '1' ? state.p2Ships : state.p1Ships;

  const openCells: number[] = [];
  for (let i = 0; i < 100; i++) {
    if (myShots[i] === '') openCells.push(i);
  }
  if (openCells.length === 0) return -1;

  if (difficulty !== 'casual') {
    // Find unsunk hits to target adjacent cells
    const unsunkHitCells: number[] = [];
    for (const ship of enemyShips) {
      if (isShipSunk(ship, myShots)) continue;
      for (const c of ship.cells) {
        if (myShots[c] === 'hit') unsunkHitCells.push(c);
      }
    }

    if (unsunkHitCells.length > 0) {
      const targetCandidates: number[] = [];
      const hitSet = new Set(unsunkHitCells);

      // Prefer aligned extensions when 2+ hits are in a row/col
      if (difficulty === 'unbeatable' && unsunkHitCells.length >= 2) {
        for (const h of unsunkHitCells) {
          const r = Math.floor(h / BS_SIZE);
          const c = h % BS_SIZE;
          const horizNeighbor = (c > 0 && hitSet.has(h - 1)) || (c < 9 && hitSet.has(h + 1));
          const vertNeighbor = (r > 0 && hitSet.has(h - 10)) || (r < 9 && hitSet.has(h + 10));
          if (horizNeighbor) {
            if (c > 0 && myShots[h - 1] === '') targetCandidates.push(h - 1);
            if (c < 9 && myShots[h + 1] === '') targetCandidates.push(h + 1);
          }
          if (vertNeighbor) {
            if (r > 0 && myShots[h - 10] === '') targetCandidates.push(h - 10);
            if (r < 9 && myShots[h + 10] === '') targetCandidates.push(h + 10);
          }
        }
      }

      if (targetCandidates.length > 0) {
        return pickRandom(targetCandidates);
      }

      const adj: number[] = [];
      for (const h of unsunkHitCells) {
        const r = Math.floor(h / BS_SIZE);
        const c = h % BS_SIZE;
        if (r > 0 && myShots[(r - 1) * 10 + c] === '') adj.push((r - 1) * 10 + c);
        if (r < 9 && myShots[(r + 1) * 10 + c] === '') adj.push((r + 1) * 10 + c);
        if (c > 0 && myShots[r * 10 + (c - 1)] === '') adj.push(r * 10 + (c - 1));
        if (c < 9 && myShots[r * 10 + (c + 1)] === '') adj.push(r * 10 + (c + 1));
      }
      if (adj.length > 0) {
        return pickRandom(adj);
      }
    }

    // Checkerboard parity search
    const parity = openCells.filter((idx) => (Math.floor(idx / 10) + (idx % 10)) % 2 === 0);
    if (parity.length > 0) {
      return pickRandom(parity);
    }
  }

  return pickRandom(openCells);
}

// =========================================================
// 4. ROCK PAPER SCISSORS BOT AI
// =========================================================
const RPS_OPTIONS: Array<Exclude<RpsChoice, ''>> = ['rock', 'paper', 'scissors'];

export function chooseRpsBotPick(
  state: RpsState,
  botSide: '1' | '2',
  difficulty: BotDifficulty,
): Exclude<RpsChoice, ''> {
  if (difficulty === 'unbeatable' && state.history.length > 0 && Math.random() < 0.65) {
    const last = state.history[state.history.length - 1];
    const humanLast = botSide === '1' ? last.p2Choice : last.p1Choice;
    // Slight pattern counter: counter human's last pick or what beats it
    if (humanLast === 'rock') return 'paper';
    if (humanLast === 'paper') return 'scissors';
    return 'rock';
  }
  return pickRandom(RPS_OPTIONS);
}

// =========================================================
// 5. CHECKERS BOT AI
// =========================================================
function evaluateCheckers(state: CheckersState, botSide: 'r' | 'b'): number {
  if (state.winner === botSide) return 10000;
  if (state.winner !== '') return -10000;

  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p) continue;
    const isBot = p.toLowerCase() === botSide;
    const isKing = p === 'R' || p === 'B';
    const r = Math.floor(i / 8);
    const advancement = botSide === 'b' ? r : 7 - r;
    const val = (isKing ? 180 : 100) + advancement * 4;
    score += isBot ? val : -val;
  }
  return score;
}

export function chooseCheckersBotMove(
  state: CheckersState,
  difficulty: BotDifficulty,
): { from: number; to: number } | null {
  const moves = getAllLegalCheckerMoves(state);
  if (moves.length === 0) return null;
  if (difficulty === 'casual') {
    const m = pickRandom(moves);
    return { from: m.from, to: m.to };
  }

  const botSide = state.turn;
  let bestScore = -Infinity;
  let bestMoves: typeof moves = [];

  for (const move of moves) {
    const next = executeCheckerMove(state, move.from, move.to);
    let score = evaluateCheckers(next, botSide);

    if (difficulty === 'unbeatable' && next.winner === '') {
      const oppMoves = getAllLegalCheckerMoves(next);
      if (oppMoves.length > 0) {
        let worst = Infinity;
        for (const rep of oppMoves.slice(0, 16)) {
          const afterRep = executeCheckerMove(next, rep.from, rep.to);
          const s = evaluateCheckers(afterRep, botSide);
          if (s < worst) worst = s;
        }
        score = worst;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  const chosen = pickRandom(bestMoves);
  return { from: chosen.from, to: chosen.to };
}

// =========================================================
// 6. WORD GUESS BOT AI
// =========================================================
export function chooseWordGuessBotWord(
  state: WordGuessState,
  botSide: '1' | '2',
  difficulty: BotDifficulty,
): string {
  const priorRows = botSide === '1' ? state.p1Guesses : state.p2Guesses;

  if (difficulty === 'casual' || priorRows.length === 0) {
    const starters = ['CRANE', 'SLATE', 'TRACE', 'STONE', 'AMBER', 'LIGHT'];
    return difficulty === 'casual' ? pickRandom([...WORD_GUESS_BANK]) : pickRandom(starters);
  }

  // Filter WORD_GUESS_BANK to words consistent with bot's prior clue rows
  const candidates = WORD_GUESS_BANK.filter((candidate) =>
    priorRows.every((row) => {
      const simMarks = evaluateWordGuess(row.word, candidate);
      return simMarks.every((m, idx) => m === row.marks[idx]);
    }),
  );

  if (candidates.length > 0) {
    if (difficulty === 'tactical' && candidates.length > 3 && Math.random() < 0.35) {
      return pickRandom([...WORD_GUESS_BANK]);
    }
    return pickRandom(candidates);
  }
  return pickRandom([...WORD_GUESS_BANK]);
}

// =========================================================
// 7. HANGMAN BOT AI
// =========================================================
const LETTER_FREQ = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'.split('');

export function chooseHangmanBotLetter(
  state: HangmanState,
  difficulty: BotDifficulty,
): string {
  const remaining = LETTER_FREQ.filter((ch) => !state.guessedLetters.includes(ch));
  if (remaining.length === 0) return 'A';

  if (difficulty === 'casual') {
    return pickRandom(remaining);
  }

  if (difficulty === 'unbeatable') {
    // Check if secret word pattern matches HANGMAN_BANK entries for ultra-smart deduction
    const matchingWords = HANGMAN_BANK.map((w) => w.word).filter((word) => {
      if (word.length !== state.secretWord.length) return false;
      for (const wrong of state.wrongLetters) {
        if (word.includes(wrong)) return false;
      }
      for (let i = 0; i < word.length; i++) {
        const revealed = state.guessedLetters.includes(state.secretWord[i]);
        if (revealed && word[i] !== state.secretWord[i]) return false;
        if (!revealed && state.guessedLetters.includes(word[i])) return false;
      }
      return true;
    });

    if (matchingWords.length > 0 && matchingWords.length <= 10) {
      const counts: Record<string, number> = {};
      for (const w of matchingWords) {
        for (const ch of new Set(w.split(''))) {
          if (!state.guessedLetters.includes(ch)) {
            counts[ch] = (counts[ch] || 0) + 1;
          }
        }
      }
      const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (ranked.length > 0) return ranked[0][0];
    }
  }

  // Tactical / fallback: pick among top 3 most frequent unguessed letters
  const top = remaining.slice(0, difficulty === 'unbeatable' ? 1 : 3);
  return pickRandom(top);
}

// =========================================================
// 8. DOTS AND BOXES BOT AI
// =========================================================
function countBoxSides(
  hLines: BoxOwner[],
  vLines: BoxOwner[],
  br: number,
  bc: number,
): number {
  let count = 0;
  if (hLines[br * DB_BOXES + bc] !== 0) count++;
  if (hLines[(br + 1) * DB_BOXES + bc] !== 0) count++;
  if (vLines[br * DB_DOTS + bc] !== 0) count++;
  if (vLines[br * DB_DOTS + (bc + 1)] !== 0) count++;
  return count;
}

export function chooseDotsBoxesBotMove(
  state: DotsBoxesState,
  difficulty: BotDifficulty,
): { kind: 'h' | 'v'; row: number; col: number } | null {
  const candidates: Array<{
    kind: 'h' | 'v';
    row: number;
    col: number;
    completes: number;
    givesThird: boolean;
  }> = [];

  for (let r = 0; r < DB_DOTS; r++) {
    for (let c = 0; c < DB_BOXES; c++) {
      if (state.hLines[r * DB_BOXES + c] !== 0) continue;
      let completes = 0;
      let givesThird = false;
      for (const br of [r - 1, r]) {
        if (br < 0 || br >= DB_BOXES) continue;
        const sides = countBoxSides(state.hLines, state.vLines, br, c);
        if (sides === 3) completes++;
        else if (sides === 2) givesThird = true;
      }
      candidates.push({ kind: 'h', row: r, col: c, completes, givesThird });
    }
  }

  for (let r = 0; r < DB_BOXES; r++) {
    for (let c = 0; c < DB_DOTS; c++) {
      if (state.vLines[r * DB_DOTS + c] !== 0) continue;
      let completes = 0;
      let givesThird = false;
      for (const bc of [c - 1, c]) {
        if (bc < 0 || bc >= DB_BOXES) continue;
        const sides = countBoxSides(state.hLines, state.vLines, r, bc);
        if (sides === 3) completes++;
        else if (sides === 2) givesThird = true;
      }
      candidates.push({ kind: 'v', row: r, col: c, completes, givesThird });
    }
  }

  if (candidates.length === 0) return null;

  const closingMoves = candidates.filter((m) => m.completes > 0);
  if (closingMoves.length > 0 && (difficulty !== 'casual' || Math.random() < 0.7)) {
    return pickRandom(closingMoves);
  }

  if (difficulty !== 'casual') {
    const safeMoves = candidates.filter((m) => !m.givesThird);
    if (safeMoves.length > 0) {
      return pickRandom(safeMoves);
    }
  }

  return pickRandom(candidates);
}

// =========================================================
// 9. CRAZY EIGHTS BOT AI
// =========================================================
export function chooseCrazyEightsBotAction(
  state: CrazyEightsState,
  botSide: '1' | '2',
  difficulty: BotDifficulty,
):
  | { type: 'play'; cardId: string; suit?: CardSuit }
  | { type: 'draw' }
  | { type: 'pass' } {
  const hand = botSide === '1' ? state.p1Hand : state.p2Hand;
  const playable = hand.filter((c) => isCardPlayable(c, state));

  if (playable.length === 0) {
    return state.drewThisTurn ? { type: 'pass' } : { type: 'draw' };
  }

  const nonEights = playable.filter((c) => c.rank !== '8');
  const chosen =
    nonEights.length > 0 && difficulty !== 'casual'
      ? nonEights[0]
      : pickRandom(playable);

  if (chosen.rank === '8') {
    const suitCounts: Record<CardSuit, number> = { S: 0, H: 0, D: 0, C: 0 };
    for (const c of hand) {
      if (c.id !== chosen.id) suitCounts[c.suit]++;
    }
    const bestSuit = (Object.keys(suitCounts) as CardSuit[]).sort(
      (a, b) => suitCounts[b] - suitCounts[a],
    )[0];
    return { type: 'play', cardId: chosen.id, suit: bestSuit };
  }

  return { type: 'play', cardId: chosen.id };
}

// =========================================================
// 10. REVERSI BOT AI
// =========================================================
const REVERSI_WEIGHTS = [
  120, -25, 20,  5,  5, 20, -25, 120,
  -25, -45, -5, -5, -5, -5, -45, -25,
   20,  -5, 15,  3,  3, 15,  -5,  20,
    5,  -5,  3,  3,  3,  3,  -5,   5,
    5,  -5,  3,  3,  3,  3,  -5,   5,
   20,  -5, 15,  3,  3, 15,  -5,  20,
  -25, -45, -5, -5, -5, -5, -45, -25,
  120, -25, 20,  5,  5, 20, -25, 120,
];

function evaluateReversi(state: ReversiState, botSide: 'B' | 'W'): number {
  if (state.winner === botSide) return 100000;
  if (state.winner !== '' && state.winner !== 'draw') return -100000;
  if (state.winner === 'draw') return 0;

  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (state.board[i] === botSide) score += REVERSI_WEIGHTS[i];
    else if (state.board[i] !== '') score -= REVERSI_WEIGHTS[i];
  }
  return score;
}

export function chooseReversiBotMove(
  state: ReversiState,
  difficulty: BotDifficulty,
): number {
  const legalMap = getLegalReversiMoves(state.board, state.turn);
  const indices = Object.keys(legalMap).map(Number);
  if (indices.length === 0) return -1;

  if (difficulty === 'casual') {
    return pickRandom(indices);
  }

  const botSide = state.turn;
  let bestScore = -Infinity;
  let bestIndices: number[] = [];

  for (const idx of indices) {
    const next = playReversiMove(state, idx);
    let score = evaluateReversi(next, botSide) + legalMap[idx].length * 2;

    if (difficulty === 'unbeatable' && next.winner === '' && next.turn !== botSide) {
      const oppLegal = Object.keys(getLegalReversiMoves(next.board, next.turn)).map(Number);
      let worst = Infinity;
      for (const oIdx of oppLegal.slice(0, 14)) {
        const afterOpp = playReversiMove(next, oIdx);
        const s = evaluateReversi(afterOpp, botSide);
        if (s < worst) worst = s;
      }
      if (oppLegal.length > 0) score = worst;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndices = [idx];
    } else if (score === bestScore) {
      bestIndices.push(idx);
    }
  }

  return pickRandom(bestIndices);
}
