import { evaluateBoard } from './gameLogic';
import type { CellValue, GameMark } from '../types/game';

export type BotDifficulty = 'casual' | 'tactical' | 'unbeatable';

function getAvailableCells(board: CellValue[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') indices.push(i);
  }
  return indices;
}

function findImmediateWinningCell(board: CellValue[], mark: GameMark): number | null {
  const open = getAvailableCells(board);
  for (const idx of open) {
    const next = [...board];
    next[idx] = mark;
    if (evaluateBoard(next).winner === mark) {
      return idx;
    }
  }
  return null;
}

function minimax(
  board: CellValue[],
  depth: number,
  isMaximizing: boolean,
  botMark: GameMark,
  humanMark: GameMark,
): number {
  const evalResult = evaluateBoard(board);
  if (evalResult.isFinished) {
    if (evalResult.winner === botMark) return 10 - depth;
    if (evalResult.winner === humanMark) return depth - 10;
    return 0;
  }

  const open = getAvailableCells(board);
  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of open) {
      board[idx] = botMark;
      const score = minimax(board, depth + 1, false, botMark, humanMark);
      board[idx] = '';
      if (score > best) best = score;
    }
    return best;
  }

  let best = Infinity;
  for (const idx of open) {
    board[idx] = humanMark;
    const score = minimax(board, depth + 1, true, botMark, humanMark);
    board[idx] = '';
    if (score < best) best = score;
  }
  return best;
}

function pickBestMinimaxMove(board: CellValue[], botMark: GameMark): number {
  const humanMark: GameMark = botMark === 'X' ? 'O' : 'X';
  const open = getAvailableCells(board);
  if (open.length === 9) {
    // Opening move optimization: pick center or a corner randomly
    const openings = [0, 2, 4, 6, 8];
    return openings[Math.floor(Math.random() * openings.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  const scratch = [...board];

  for (const idx of open) {
    scratch[idx] = botMark;
    const score = minimax(scratch, 0, false, botMark, humanMark);
    scratch[idx] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export function chooseBotMove(
  board: CellValue[],
  botMark: GameMark,
  difficulty: BotDifficulty,
): number {
  const open = getAvailableCells(board);
  if (open.length === 0) return -1;

  const humanMark: GameMark = botMark === 'X' ? 'O' : 'X';

  if (difficulty === 'casual') {
    const winMove = findImmediateWinningCell(board, botMark);
    if (winMove !== null && Math.random() < 0.6) {
      return winMove;
    }
    return open[Math.floor(Math.random() * open.length)];
  }

  if (difficulty === 'tactical') {
    const winMove = findImmediateWinningCell(board, botMark);
    if (winMove !== null) return winMove;

    const blockMove = findImmediateWinningCell(board, humanMark);
    if (blockMove !== null && Math.random() < 0.85) return blockMove;

    if (board[4] === '' && Math.random() < 0.7) return 4;

    const corners = [0, 2, 6, 8].filter((c) => board[c] === '');
    if (corners.length > 0 && Math.random() < 0.6) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    return open[Math.floor(Math.random() * open.length)];
  }

  return pickBestMinimaxMove(board, botMark);
}
