export const C4_ROWS = 6;
export const C4_COLS = 7;

export type Connect4Disc = '' | '1' | '2';

export interface Connect4State {
  board: Connect4Disc[]; // 42 cells: row * 7 + col (row 0 is top, row 5 is bottom)
  turn: '1' | '2';
  moveCount: number;
  lastDropIndex: number; // -1 initially
  winner: '' | '1' | '2' | 'draw';
  winCells: number[]; // indices of winning 4 discs
}

export function createInitialConnect4State(): Connect4State {
  return {
    board: Array<Connect4Disc>(C4_ROWS * C4_COLS).fill(''),
    turn: '1',
    moveCount: 0,
    lastDropIndex: -1,
    winner: '',
    winCells: [],
  };
}

export function findDropRow(board: Connect4Disc[], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1;
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r * C4_COLS + col] === '') {
      return r;
    }
  }
  return -1;
}

function checkConnect4Winner(
  board: Connect4Disc[],
  player: '1' | '2',
): number[] | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (board[r * C4_COLS + c] !== player) continue;
      for (const [dr, dc] of dirs) {
        const line = [r * C4_COLS + c];
        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS) break;
          if (board[nr * C4_COLS + nc] !== player) break;
          line.push(nr * C4_COLS + nc);
        }
        if (line.length === 4) {
          return line;
        }
      }
    }
  }
  return null;
}

export function dropConnect4Disc(state: Connect4State, col: number): Connect4State {
  if (state.winner !== '') {
    throw new Error('This match has already finished.');
  }
  const row = findDropRow(state.board, col);
  if (row === -1) {
    throw new Error('That column is full.');
  }

  const dropIdx = row * C4_COLS + col;
  const nextBoard = [...state.board];
  nextBoard[dropIdx] = state.turn;
  const nextMoveCount = state.moveCount + 1;

  const winCells = checkConnect4Winner(nextBoard, state.turn);
  if (winCells) {
    return {
      board: nextBoard,
      turn: state.turn,
      moveCount: nextMoveCount,
      lastDropIndex: dropIdx,
      winner: state.turn,
      winCells,
    };
  }

  if (nextMoveCount >= C4_ROWS * C4_COLS) {
    return {
      board: nextBoard,
      turn: state.turn,
      moveCount: nextMoveCount,
      lastDropIndex: dropIdx,
      winner: 'draw',
      winCells: [],
    };
  }

  return {
    board: nextBoard,
    turn: state.turn === '1' ? '2' : '1',
    moveCount: nextMoveCount,
    lastDropIndex: dropIdx,
    winner: '',
    winCells: [],
  };
}
