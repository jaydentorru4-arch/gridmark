export type ChessColor = 'w' | 'b';
export type ChessKind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';
export type ChessPiece = '' | `${ChessColor}${ChessKind}`;
export type PromoKind = 'Q' | 'R' | 'B' | 'N';

export interface ChessCastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessMoveOption {
  from: number;
  to: number;
  isEnPassant: boolean;
  isCastle: 'K' | 'Q' | '';
  isPromotion: boolean;
}

export interface ChessState {
  board: ChessPiece[]; // 64 squares, index = r*8 + c (r=0 is rank 8 black side, r=7 is rank 1 white side)
  turn: ChessColor;
  castling: ChessCastlingRights;
  epTarget: number; // -1 if none
  halfMoveClock: number;
  fullMoveNumber: number;
  inCheck: ChessColor | '';
  lastFrom: number;
  lastTo: number;
  moves: string[];
  capturedByWhite: ChessPiece[];
  capturedByBlack: ChessPiece[];
  outcome: '' | 'w' | 'b' | 'draw';
  outcomeReason: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export function createInitialChessState(): ChessState {
  const board: ChessPiece[] = [
    'bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR',
    'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP',
    'wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR',
  ];
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    epTarget: -1,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    inCheck: '',
    lastFrom: -1,
    lastTo: -1,
    moves: [],
    capturedByWhite: [],
    capturedByBlack: [],
    outcome: '',
    outcomeReason: '',
  };
}

export function indexToSquare(idx: number): string {
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  return `${FILES[c]}${8 - r}`;
}

function pieceColor(p: ChessPiece): ChessColor | '' {
  if (!p) return '';
  return p[0] as ChessColor;
}

function pieceKind(p: ChessPiece): ChessKind | '' {
  if (!p) return '';
  return p[1] as ChessKind;
}

function otherColor(color: ChessColor): ChessColor {
  return color === 'w' ? 'b' : 'w';
}

export function isSquareAttacked(
  board: ChessPiece[],
  targetIdx: number,
  byColor: ChessColor,
): boolean {
  const tr = Math.floor(targetIdx / 8);
  const tc = targetIdx % 8;

  // Pawn attacks: a pawn of `byColor` attacks forward onto `targetIdx`
  const pawnFromRow = byColor === 'w' ? tr + 1 : tr - 1;
  if (pawnFromRow >= 0 && pawnFromRow < 8) {
    for (const dc of [-1, 1]) {
      const pc = tc + dc;
      if (pc >= 0 && pc < 8 && board[pawnFromRow * 8 + pc] === `${byColor}P`) {
        return true;
      }
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = tr + dr;
    const c = tc + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === `${byColor}N`) {
      return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = tr + dr;
      const c = tc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === `${byColor}K`) {
        return true;
      }
    }
  }

  // Rook / Queen orthogonal rays
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r * 8 + c];
      if (p !== '') {
        if (p === `${byColor}R` || p === `${byColor}Q`) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Bishop / Queen diagonal rays
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r * 8 + c];
      if (p !== '') {
        if (p === `${byColor}B` || p === `${byColor}Q`) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function findKingIndex(board: ChessPiece[], color: ChessColor): number {
  return board.findIndex((p) => p === `${color}K`);
}

function isKingInCheck(board: ChessPiece[], color: ChessColor): boolean {
  const kIdx = findKingIndex(board, color);
  if (kIdx === -1) return false;
  return isSquareAttacked(board, kIdx, otherColor(color));
}

function generatePseudoMovesForSquare(
  state: ChessState,
  from: number,
): ChessMoveOption[] {
  const piece = state.board[from];
  if (!piece) return [];
  const color = pieceColor(piece) as ChessColor;
  const kind = pieceKind(piece) as ChessKind;
  const enemy = otherColor(color);
  const r = Math.floor(from / 8);
  const c = from % 8;
  const moves: ChessMoveOption[] = [];

  if (kind === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;

    const r1 = r + dir;
    if (r1 >= 0 && r1 < 8) {
      const oneStep = r1 * 8 + c;
      if (state.board[oneStep] === '') {
        moves.push({
          from,
          to: oneStep,
          isEnPassant: false,
          isCastle: '',
          isPromotion: r1 === promoRow,
        });
        const r2 = r + dir * 2;
        if (r === startRow && state.board[r2 * 8 + c] === '') {
          moves.push({
            from,
            to: r2 * 8 + c,
            isEnPassant: false,
            isCastle: '',
            isPromotion: false,
          });
        }
      }

      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc >= 8) continue;
        const capIdx = r1 * 8 + nc;
        const target = state.board[capIdx];
        if (target !== '' && pieceColor(target) === enemy) {
          moves.push({
            from,
            to: capIdx,
            isEnPassant: false,
            isCastle: '',
            isPromotion: r1 === promoRow,
          });
        } else if (state.epTarget === capIdx) {
          moves.push({
            from,
            to: capIdx,
            isEnPassant: true,
            isCastle: '',
            isPromotion: false,
          });
        }
      }
    }
    return moves;
  }

  if (kind === 'N') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
      const to = nr * 8 + nc;
      if (pieceColor(state.board[to]) !== color) {
        moves.push({ from, to, isEnPassant: false, isCastle: '', isPromotion: false });
      }
    }
    return moves;
  }

  if (kind === 'B' || kind === 'R' || kind === 'Q') {
    const dirs: number[][] = [];
    if (kind === 'B' || kind === 'Q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (kind === 'R' || kind === 'Q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const to = nr * 8 + nc;
        const targetColor = pieceColor(state.board[to]);
        if (targetColor === '') {
          moves.push({ from, to, isEnPassant: false, isCastle: '', isPromotion: false });
        } else {
          if (targetColor === enemy) {
            moves.push({ from, to, isEnPassant: false, isCastle: '', isPromotion: false });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }

  if (kind === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
        const to = nr * 8 + nc;
        if (pieceColor(state.board[to]) !== color) {
          moves.push({ from, to, isEnPassant: false, isCastle: '', isPromotion: false });
        }
      }
    }

    // Castling
    if (color === 'w' && from === 60 && !isSquareAttacked(state.board, 60, 'b')) {
      if (
        state.castling.wK &&
        state.board[61] === '' &&
        state.board[62] === '' &&
        state.board[63] === 'wR' &&
        !isSquareAttacked(state.board, 61, 'b') &&
        !isSquareAttacked(state.board, 62, 'b')
      ) {
        moves.push({ from: 60, to: 62, isEnPassant: false, isCastle: 'K', isPromotion: false });
      }
      if (
        state.castling.wQ &&
        state.board[59] === '' &&
        state.board[58] === '' &&
        state.board[57] === '' &&
        state.board[56] === 'wR' &&
        !isSquareAttacked(state.board, 59, 'b') &&
        !isSquareAttacked(state.board, 58, 'b')
      ) {
        moves.push({ from: 60, to: 58, isEnPassant: false, isCastle: 'Q', isPromotion: false });
      }
    }

    if (color === 'b' && from === 4 && !isSquareAttacked(state.board, 4, 'w')) {
      if (
        state.castling.bK &&
        state.board[5] === '' &&
        state.board[6] === '' &&
        state.board[7] === 'bR' &&
        !isSquareAttacked(state.board, 5, 'w') &&
        !isSquareAttacked(state.board, 6, 'w')
      ) {
        moves.push({ from: 4, to: 6, isEnPassant: false, isCastle: 'K', isPromotion: false });
      }
      if (
        state.castling.bQ &&
        state.board[3] === '' &&
        state.board[2] === '' &&
        state.board[1] === '' &&
        state.board[0] === 'bR' &&
        !isSquareAttacked(state.board, 3, 'w') &&
        !isSquareAttacked(state.board, 2, 'w')
      ) {
        moves.push({ from: 4, to: 2, isEnPassant: false, isCastle: 'Q', isPromotion: false });
      }
    }
  }

  return moves;
}

function applyRawMove(
  board: ChessPiece[],
  move: ChessMoveOption,
  color: ChessColor,
  promo: PromoKind = 'Q',
): { nextBoard: ChessPiece[]; captured: ChessPiece } {
  const nextBoard = [...board];
  const movingPiece = nextBoard[move.from];
  let captured: ChessPiece = nextBoard[move.to];

  nextBoard[move.to] = move.isPromotion ? (`${color}${promo}` as ChessPiece) : movingPiece;
  nextBoard[move.from] = '';

  if (move.isEnPassant) {
    const fromRow = Math.floor(move.from / 8);
    const toCol = move.to % 8;
    const epCapIdx = fromRow * 8 + toCol;
    captured = nextBoard[epCapIdx];
    nextBoard[epCapIdx] = '';
  }

  if (move.isCastle === 'K') {
    const rookFrom = color === 'w' ? 63 : 7;
    const rookTo = color === 'w' ? 61 : 5;
    nextBoard[rookTo] = nextBoard[rookFrom];
    nextBoard[rookFrom] = '';
  } else if (move.isCastle === 'Q') {
    const rookFrom = color === 'w' ? 56 : 0;
    const rookTo = color === 'w' ? 59 : 3;
    nextBoard[rookTo] = nextBoard[rookFrom];
    nextBoard[rookFrom] = '';
  }

  return { nextBoard, captured };
}

export function getLegalMovesForSquare(
  state: ChessState,
  from: number,
): ChessMoveOption[] {
  if (state.outcome !== '') return [];
  const piece = state.board[from];
  if (!piece || pieceColor(piece) !== state.turn) return [];

  const pseudo = generatePseudoMovesForSquare(state, from);
  return pseudo.filter((move) => {
    const { nextBoard } = applyRawMove(state.board, move, state.turn);
    return !isKingInCheck(nextBoard, state.turn);
  });
}

export function getAllLegalMoves(state: ChessState, color: ChessColor): ChessMoveOption[] {
  const savedTurn = state.turn;
  const tempState: ChessState = savedTurn === color ? state : { ...state, turn: color };
  const all: ChessMoveOption[] = [];
  for (let i = 0; i < 64; i++) {
    if (pieceColor(tempState.board[i]) === color) {
      all.push(...getLegalMovesForSquare(tempState, i));
    }
  }
  return all;
}

function hasInsufficientMaterial(board: ChessPiece[]): boolean {
  const nonKings: { piece: ChessPiece; idx: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p !== '' && pieceKind(p) !== 'K') {
      nonKings.push({ piece: p, idx: i });
    }
  }
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1) {
    const k = pieceKind(nonKings[0].piece);
    return k === 'B' || k === 'N';
  }
  if (nonKings.length === 2) {
    const k1 = pieceKind(nonKings[0].piece);
    const k2 = pieceKind(nonKings[1].piece);
    if (k1 === 'B' && k2 === 'B') {
      const sq1 = (Math.floor(nonKings[0].idx / 8) + (nonKings[0].idx % 8)) % 2;
      const sq2 = (Math.floor(nonKings[1].idx / 8) + (nonKings[1].idx % 8)) % 2;
      return sq1 === sq2;
    }
  }
  return false;
}

export function executeChessMove(
  state: ChessState,
  from: number,
  to: number,
  promo: PromoKind = 'Q',
): ChessState {
  if (state.outcome !== '') {
    throw new Error('This chess match is already over.');
  }
  const legal = getLegalMovesForSquare(state, from);
  const move = legal.find((m) => m.to === to);
  if (!move) {
    throw new Error('Illegal chess move.');
  }

  const color = state.turn;
  const nextColor = otherColor(color);
  const movingPiece = state.board[from];
  const kind = pieceKind(movingPiece) as ChessKind;

  const { nextBoard, captured } = applyRawMove(state.board, move, color, promo);

  // Update castling rights
  const nextCastling: ChessCastlingRights = { ...state.castling };
  if (movingPiece === 'wK') {
    nextCastling.wK = false;
    nextCastling.wQ = false;
  } else if (movingPiece === 'bK') {
    nextCastling.bK = false;
    nextCastling.bQ = false;
  }
  if (from === 63 || to === 63) nextCastling.wK = false;
  if (from === 56 || to === 56) nextCastling.wQ = false;
  if (from === 7 || to === 7) nextCastling.bK = false;
  if (from === 0 || to === 0) nextCastling.bQ = false;

  // Update en passant target
  let nextEp = -1;
  if (kind === 'P' && Math.abs(Math.floor(to / 8) - Math.floor(from / 8)) === 2) {
    nextEp = (from + to) / 2;
  }

  const nextHalfMove = kind === 'P' || captured !== '' ? 0 : state.halfMoveClock + 1;
  const nextFullMove = color === 'b' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const capturedByWhite =
    color === 'w' && captured !== '' ? [...state.capturedByWhite, captured] : state.capturedByWhite;
  const capturedByBlack =
    color === 'b' && captured !== '' ? [...state.capturedByBlack, captured] : state.capturedByBlack;

  // Build provisional state to compute opponent legal moves & check status
  const provisional: ChessState = {
    board: nextBoard,
    turn: nextColor,
    castling: nextCastling,
    epTarget: nextEp,
    halfMoveClock: nextHalfMove,
    fullMoveNumber: nextFullMove,
    inCheck: '',
    lastFrom: from,
    lastTo: to,
    moves: state.moves,
    capturedByWhite,
    capturedByBlack,
    outcome: '',
    outcomeReason: '',
  };

  const opponentInCheck = isKingInCheck(nextBoard, nextColor);
  const opponentLegalMoves = getAllLegalMoves(provisional, nextColor);

  let outcome: ChessState['outcome'] = '';
  let outcomeReason = '';
  if (opponentLegalMoves.length === 0) {
    if (opponentInCheck) {
      outcome = color;
      outcomeReason = `Checkmate! ${color === 'w' ? 'White' : 'Black'} wins.`;
    } else {
      outcome = 'draw';
      outcomeReason = 'Stalemate — Draw!';
    }
  } else if (hasInsufficientMaterial(nextBoard)) {
    outcome = 'draw';
    outcomeReason = 'Draw by insufficient material.';
  } else if (nextHalfMove >= 100) {
    outcome = 'draw';
    outcomeReason = 'Draw by 50-move rule.';
  }

  // Build readable notation
  let notation = '';
  if (move.isCastle === 'K') {
    notation = 'O-O';
  } else if (move.isCastle === 'Q') {
    notation = 'O-O-O';
  } else {
    const destSq = indexToSquare(to);
    const fromFile = FILES[from % 8];
    if (kind === 'P') {
      notation = captured !== '' ? `${fromFile}x${destSq}` : destSq;
      if (move.isPromotion) notation += `=${promo}`;
    } else {
      notation = `${kind}${captured !== '' ? 'x' : ''}${destSq}`;
    }
  }
  if (outcome === color) {
    notation += '#';
  } else if (opponentInCheck) {
    notation += '+';
  }

  return {
    ...provisional,
    inCheck: opponentInCheck ? nextColor : '',
    moves: [...state.moves, notation],
    outcome,
    outcomeReason,
  };
}
