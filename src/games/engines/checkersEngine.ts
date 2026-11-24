export type CheckerPiece = '' | 'r' | 'R' | 'b' | 'B';
export type CheckerSide = 'r' | 'b'; // r = Player 1 (moves up row->0), b = Player 2 (moves down row->7)

export interface CheckerMove {
  from: number;
  to: number;
  capturedIdx: number; // -1 if simple step
}

export interface CheckersState {
  board: CheckerPiece[]; // 64 squares
  turn: CheckerSide;
  chainIdx: number; // -1 unless locked in a multi-jump sequence
  lastFrom: number;
  lastTo: number;
  rCaptured: number; // red pieces captured by black
  bCaptured: number; // black pieces captured by red
  winner: '' | 'r' | 'b';
  outcomeReason: string;
}

export function createInitialCheckersState(): CheckersState {
  const board: CheckerPiece[] = Array<CheckerPiece>(64).fill('');
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r * 8 + c] = 'b';
        else if (r > 4) board[r * 8 + c] = 'r';
      }
    }
  }
  return {
    board,
    turn: 'r',
    chainIdx: -1,
    lastFrom: -1,
    lastTo: -1,
    rCaptured: 0,
    bCaptured: 0,
    winner: '',
    outcomeReason: '',
  };
}

function sideOf(piece: CheckerPiece): CheckerSide | '' {
  if (!piece) return '';
  return piece.toLowerCase() as CheckerSide;
}

function isKing(piece: CheckerPiece): boolean {
  return piece === 'R' || piece === 'B';
}

function getMoveDirs(piece: CheckerPiece): number[] {
  if (isKing(piece)) return [-1, 1];
  return sideOf(piece) === 'r' ? [-1] : [1];
}

function getPieceJumps(board: CheckerPiece[], idx: number): CheckerMove[] {
  const piece = board[idx];
  const side = sideOf(piece);
  if (!side) return [];
  const enemy: CheckerSide = side === 'r' ? 'b' : 'r';
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  const jumps: CheckerMove[] = [];

  for (const dr of getMoveDirs(piece)) {
    for (const dc of [-1, 1]) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;
      const midIdx = mr * 8 + mc;
      const landIdx = lr * 8 + lc;
      if (sideOf(board[midIdx]) === enemy && board[landIdx] === '') {
        jumps.push({ from: idx, to: landIdx, capturedIdx: midIdx });
      }
    }
  }
  return jumps;
}

function getPieceSteps(board: CheckerPiece[], idx: number): CheckerMove[] {
  const piece = board[idx];
  if (!piece) return [];
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  const steps: CheckerMove[] = [];

  for (const dr of getMoveDirs(piece)) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
      const landIdx = nr * 8 + nc;
      if (board[landIdx] === '') {
        steps.push({ from: idx, to: landIdx, capturedIdx: -1 });
      }
    }
  }
  return steps;
}

export function getAllLegalCheckerMoves(state: CheckersState): CheckerMove[] {
  if (state.winner !== '') return [];

  if (state.chainIdx !== -1) {
    return getPieceJumps(state.board, state.chainIdx);
  }

  const allJumps: CheckerMove[] = [];
  const allSteps: CheckerMove[] = [];

  for (let i = 0; i < 64; i++) {
    if (sideOf(state.board[i]) !== state.turn) continue;
    allJumps.push(...getPieceJumps(state.board, i));
    allSteps.push(...getPieceSteps(state.board, i));
  }

  // Mandatory capture rule: if any jump is available, only jumps are legal
  return allJumps.length > 0 ? allJumps : allSteps;
}

export function getLegalCheckerMovesForSquare(
  state: CheckersState,
  from: number,
): CheckerMove[] {
  return getAllLegalCheckerMoves(state).filter((m) => m.from === from);
}

export function hasMandatoryCapture(state: CheckersState): boolean {
  const legal = getAllLegalCheckerMoves(state);
  return legal.length > 0 && legal[0].capturedIdx !== -1;
}

export function executeCheckerMove(
  state: CheckersState,
  from: number,
  to: number,
): CheckersState {
  if (state.winner !== '') {
    throw new Error('Match has already ended.');
  }
  const legal = getLegalCheckerMovesForSquare(state, from);
  const move = legal.find((m) => m.to === to);
  if (!move) {
    throw new Error('Illegal Checkers move.');
  }

  const nextBoard = [...state.board];
  let piece = nextBoard[from];
  nextBoard[from] = '';

  let nextRCap = state.rCaptured;
  let nextBCap = state.bCaptured;
  if (move.capturedIdx !== -1) {
    const cap = nextBoard[move.capturedIdx];
    nextBoard[move.capturedIdx] = '';
    if (sideOf(cap) === 'r') nextRCap++;
    else if (sideOf(cap) === 'b') nextBCap++;
  }

  const toRow = Math.floor(to / 8);
  let promotedNow = false;
  if (piece === 'r' && toRow === 0) {
    piece = 'R';
    promotedNow = true;
  } else if (piece === 'b' && toRow === 7) {
    piece = 'B';
    promotedNow = true;
  }
  nextBoard[to] = piece;

  // Check for forced multi-jump chain (ends on promotion per standard American Checkers)
  if (move.capturedIdx !== -1 && !promotedNow) {
    const followUpJumps = getPieceJumps(nextBoard, to);
    if (followUpJumps.length > 0) {
      return {
        board: nextBoard,
        turn: state.turn,
        chainIdx: to,
        lastFrom: from,
        lastTo: to,
        rCaptured: nextRCap,
        bCaptured: nextBCap,
        winner: '',
        outcomeReason: '',
      };
    }
  }

  const nextTurn: CheckerSide = state.turn === 'r' ? 'b' : 'r';
  const nextState: CheckersState = {
    board: nextBoard,
    turn: nextTurn,
    chainIdx: -1,
    lastFrom: from,
    lastTo: to,
    rCaptured: nextRCap,
    bCaptured: nextBCap,
    winner: '',
    outcomeReason: '',
  };

  // Win condition: opponent has 0 pieces or 0 legal moves
  const opponentMoves = getAllLegalCheckerMoves(nextState);
  if (opponentMoves.length === 0) {
    const remainingOpponentPieces = nextBoard.some((p) => sideOf(p) === nextTurn);
    return {
      ...nextState,
      winner: state.turn,
      outcomeReason: remainingOpponentPieces
        ? 'Opponent has no legal moves left!'
        : 'All opponent pieces captured!',
    };
  }

  return nextState;
}
