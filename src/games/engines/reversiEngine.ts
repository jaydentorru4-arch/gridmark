export type ReversiDisc = '' | 'B' | 'W';
export type ReversiSide = 'B' | 'W'; // B = Player 1, W = Player 2

export interface ReversiState {
  board: ReversiDisc[]; // 64 squares
  turn: ReversiSide;
  lastMoveIdx: number;
  lastFlipped: number[];
  blackCount: number;
  whiteCount: number;
  passNotice: string;
  winner: '' | 'B' | 'W' | 'draw';
}

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;

export function createInitialReversiState(): ReversiState {
  const board: ReversiDisc[] = Array<ReversiDisc>(64).fill('');
  // Standard Othello starting cross
  board[3 * 8 + 3] = 'W';
  board[3 * 8 + 4] = 'B';
  board[4 * 8 + 3] = 'B';
  board[4 * 8 + 4] = 'W';

  return {
    board,
    turn: 'B',
    lastMoveIdx: -1,
    lastFlipped: [],
    blackCount: 2,
    whiteCount: 2,
    passNotice: '',
    winner: '',
  };
}

export function getFlipsForReversiMove(
  board: ReversiDisc[],
  idx: number,
  side: ReversiSide,
): number[] {
  if (idx < 0 || idx >= 64 || board[idx] !== '') return [];
  const enemy: ReversiSide = side === 'B' ? 'W' : 'B';
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  const flips: number[] = [];

  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const nIdx = nr * 8 + nc;
      const cell = board[nIdx];
      if (cell === enemy) {
        line.push(nIdx);
      } else if (cell === side) {
        if (line.length > 0) {
          flips.push(...line);
        }
        break;
      } else {
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return flips;
}

export function getLegalReversiMoves(
  board: ReversiDisc[],
  side: ReversiSide,
): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (let i = 0; i < 64; i++) {
    if (board[i] !== '') continue;
    const flips = getFlipsForReversiMove(board, i, side);
    if (flips.length > 0) {
      map[i] = flips;
    }
  }
  return map;
}

export function playReversiMove(state: ReversiState, idx: number): ReversiState {
  if (state.winner !== '') {
    throw new Error('This match has already finished.');
  }

  const flips = getFlipsForReversiMove(state.board, idx, state.turn);
  if (flips.length === 0) {
    throw new Error('Must outflank at least one opponent disc.');
  }

  const nextBoard = [...state.board];
  nextBoard[idx] = state.turn;
  for (const fIdx of flips) {
    nextBoard[fIdx] = state.turn;
  }

  let blackCount = 0;
  let whiteCount = 0;
  for (const cell of nextBoard) {
    if (cell === 'B') blackCount++;
    else if (cell === 'W') whiteCount++;
  }

  const opponent: ReversiSide = state.turn === 'B' ? 'W' : 'B';
  const opponentMoves = getLegalReversiMoves(nextBoard, opponent);
  const opponentCanPlay = Object.keys(opponentMoves).length > 0;

  if (opponentCanPlay) {
    return {
      board: nextBoard,
      turn: opponent,
      lastMoveIdx: idx,
      lastFlipped: flips,
      blackCount,
      whiteCount,
      passNotice: '',
      winner: '',
    };
  }

  // Opponent has no legal moves: check if current side can still play
  const selfMoves = getLegalReversiMoves(nextBoard, state.turn);
  const selfCanPlay = Object.keys(selfMoves).length > 0;

  if (selfCanPlay) {
    const passedName = opponent === 'B' ? 'Black' : 'White';
    const nextName = state.turn === 'B' ? 'Black' : 'White';
    return {
      board: nextBoard,
      turn: state.turn,
      lastMoveIdx: idx,
      lastFlipped: flips,
      blackCount,
      whiteCount,
      passNotice: `${passedName} has no legal moves — ${nextName} plays again!`,
      winner: '',
    };
  }

  // Neither player can play -> match finished
  const winner: ReversiState['winner'] =
    blackCount > whiteCount ? 'B' : whiteCount > blackCount ? 'W' : 'draw';

  return {
    board: nextBoard,
    turn: state.turn,
    lastMoveIdx: idx,
    lastFlipped: flips,
    blackCount,
    whiteCount,
    passNotice: '',
    winner,
  };
}
