// 5x5 dots => 4x4 boxes = 16 boxes total
export const DB_DOTS = 5;
export const DB_BOXES = 4;

export type BoxOwner = 0 | 1 | 2;

export interface DotsBoxesState {
  // Horizontal edges: (DB_BOXES + 1) rows x DB_BOXES cols = 5 * 4 = 20
  hLines: BoxOwner[];
  // Vertical edges: DB_BOXES rows x (DB_BOXES + 1) cols = 4 * 5 = 20
  vLines: BoxOwner[];
  // Boxes: DB_BOXES x DB_BOXES = 16
  boxes: BoxOwner[];
  turn: '1' | '2';
  p1Score: number;
  p2Score: number;
  lastLineKey: string; // e.g. "h-2-1" or ""
  bonusTurn: boolean;
  winner: '' | '1' | '2' | 'draw';
}

export function createInitialDotsBoxesState(): DotsBoxesState {
  return {
    hLines: Array<BoxOwner>(20).fill(0),
    vLines: Array<BoxOwner>(20).fill(0),
    boxes: Array<BoxOwner>(16).fill(0),
    turn: '1',
    p1Score: 0,
    p2Score: 0,
    lastLineKey: '',
    bonusTurn: false,
    winner: '',
  };
}

function isBoxComplete(
  hLines: BoxOwner[],
  vLines: BoxOwner[],
  boxR: number,
  boxC: number,
): boolean {
  const top = hLines[boxR * DB_BOXES + boxC] !== 0;
  const bottom = hLines[(boxR + 1) * DB_BOXES + boxC] !== 0;
  const left = vLines[boxR * DB_DOTS + boxC] !== 0;
  const right = vLines[boxR * DB_DOTS + (boxC + 1)] !== 0;
  return top && bottom && left && right;
}

export function claimDotsBoxesEdge(
  state: DotsBoxesState,
  kind: 'h' | 'v',
  row: number,
  col: number,
): DotsBoxesState {
  if (state.winner !== '') {
    throw new Error('This match has already ended.');
  }

  const nextHLines = [...state.hLines];
  const nextVLines = [...state.vLines];
  const nextBoxes = [...state.boxes];
  const ownerNum: 1 | 2 = state.turn === '1' ? 1 : 2;

  if (kind === 'h') {
    if (row < 0 || row >= DB_DOTS || col < 0 || col >= DB_BOXES) {
      throw new Error('Invalid horizontal edge.');
    }
    const idx = row * DB_BOXES + col;
    if (nextHLines[idx] !== 0) {
      throw new Error('That line is already claimed.');
    }
    nextHLines[idx] = ownerNum;
  } else {
    if (row < 0 || row >= DB_BOXES || col < 0 || col >= DB_DOTS) {
      throw new Error('Invalid vertical edge.');
    }
    const idx = row * DB_DOTS + col;
    if (nextVLines[idx] !== 0) {
      throw new Error('That line is already claimed.');
    }
    nextVLines[idx] = ownerNum;
  }

  // Check adjacent boxes for completion
  let completedCount = 0;
  const candidateBoxes: Array<[number, number]> =
    kind === 'h'
      ? [
          [row - 1, col],
          [row, col],
        ]
      : [
          [row, col - 1],
          [row, col],
        ];

  for (const [br, bc] of candidateBoxes) {
    if (br < 0 || br >= DB_BOXES || bc < 0 || bc >= DB_BOXES) continue;
    const bIdx = br * DB_BOXES + bc;
    if (nextBoxes[bIdx] === 0 && isBoxComplete(nextHLines, nextVLines, br, bc)) {
      nextBoxes[bIdx] = ownerNum;
      completedCount++;
    }
  }

  const p1Score = state.p1Score + (ownerNum === 1 ? completedCount : 0);
  const p2Score = state.p2Score + (ownerNum === 2 ? completedCount : 0);
  const totalClaimed = p1Score + p2Score;

  let winner: DotsBoxesState['winner'] = '';
  if (totalClaimed >= DB_BOXES * DB_BOXES) {
    winner = p1Score > p2Score ? '1' : p2Score > p1Score ? '2' : 'draw';
  }

  const keepTurn = completedCount > 0 && winner === '';

  return {
    hLines: nextHLines,
    vLines: nextVLines,
    boxes: nextBoxes,
    turn: winner !== '' ? state.turn : keepTurn ? state.turn : state.turn === '1' ? '2' : '1',
    p1Score,
    p2Score,
    lastLineKey: `${kind}-${row}-${col}`,
    bonusTurn: keepTurn,
    winner,
  };
}
