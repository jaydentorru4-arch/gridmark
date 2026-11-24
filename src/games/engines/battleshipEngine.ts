export const BS_SIZE = 10;

export type ShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface ShipSpec {
  id: ShipId;
  name: string;
  size: number;
}

export const SHIP_SPECS: ShipSpec[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

export interface PlacedShip {
  id: ShipId;
  name: string;
  size: number;
  cells: number[]; // flat indices 0..99
}

export type ShotMark = '' | 'miss' | 'hit';

export interface BattleshipState {
  phase: 'setup' | 'playing' | 'finished';
  p1Ready: boolean;
  p2Ready: boolean;
  p1Ships: PlacedShip[];
  p2Ships: PlacedShip[];
  p1Shots: ShotMark[]; // length 100: shots fired BY p1 AT p2's grid
  p2Shots: ShotMark[]; // length 100: shots fired BY p2 AT p1's grid
  turn: '1' | '2';
  lastAction: string;
  winner: '' | '1' | '2';
}

export function createInitialBattleshipState(): BattleshipState {
  return {
    phase: 'setup',
    p1Ready: false,
    p2Ready: false,
    p1Ships: [],
    p2Ships: [],
    p1Shots: Array<ShotMark>(100).fill(''),
    p2Shots: Array<ShotMark>(100).fill(''),
    turn: '1',
    lastAction: 'Position all 5 ships on your ocean grid.',
    winner: '',
  };
}

export function computeShipCells(
  startIdx: number,
  size: number,
  orientation: 'H' | 'V',
): number[] | null {
  const r = Math.floor(startIdx / BS_SIZE);
  const c = startIdx % BS_SIZE;
  const cells: number[] = [];

  for (let i = 0; i < size; i++) {
    const nr = orientation === 'V' ? r + i : r;
    const nc = orientation === 'H' ? c + i : c;
    if (nr < 0 || nr >= BS_SIZE || nc < 0 || nc >= BS_SIZE) {
      return null;
    }
    cells.push(nr * BS_SIZE + nc);
  }
  return cells;
}

export function canPlaceShip(
  existingShips: PlacedShip[],
  shipId: ShipId,
  startIdx: number,
  size: number,
  orientation: 'H' | 'V',
): number[] | null {
  const cells = computeShipCells(startIdx, size, orientation);
  if (!cells) return null;

  const occupied = new Set<number>();
  for (const s of existingShips) {
    if (s.id === shipId) continue;
    for (const cell of s.cells) occupied.add(cell);
  }
  for (const cell of cells) {
    if (occupied.has(cell)) return null;
  }
  return cells;
}

export function generateRandomFleet(): PlacedShip[] {
  const fleet: PlacedShip[] = [];
  for (const spec of SHIP_SPECS) {
    let placed = false;
    for (let attempt = 0; attempt < 250; attempt++) {
      const start = Math.floor(Math.random() * 100);
      const orientation: 'H' | 'V' = Math.random() < 0.5 ? 'H' : 'V';
      const cells = canPlaceShip(fleet, spec.id, start, spec.size, orientation);
      if (cells) {
        fleet.push({
          id: spec.id,
          name: spec.name,
          size: spec.size,
          cells,
        });
        placed = true;
        break;
      }
    }
    if (!placed) {
      return generateRandomFleet();
    }
  }
  return fleet;
}

export function lockBattleshipFleet(
  state: BattleshipState,
  player: '1' | '2',
  ships: PlacedShip[],
): BattleshipState {
  if (ships.length !== SHIP_SPECS.length) {
    throw new Error('Place all 5 ships before locking your fleet.');
  }
  const seen = new Set<number>();
  for (const ship of ships) {
    for (const c of ship.cells) {
      if (c < 0 || c >= 100 || seen.has(c)) {
        throw new Error('Ships must stay inside the 10x10 grid and cannot overlap.');
      }
      seen.add(c);
    }
  }

  const nextP1Ships = player === '1' ? ships : state.p1Ships;
  const nextP2Ships = player === '2' ? ships : state.p2Ships;
  const nextP1Ready = player === '1' ? true : state.p1Ready;
  const nextP2Ready = player === '2' ? true : state.p2Ready;
  const bothReady = nextP1Ready && nextP2Ready;

  return {
    ...state,
    p1Ships: nextP1Ships,
    p2Ships: nextP2Ships,
    p1Ready: nextP1Ready,
    p2Ready: nextP2Ready,
    phase: bothReady ? 'playing' : 'setup',
    lastAction: bothReady
      ? 'Both fleets deployed! Player 1 fires first.'
      : `Player ${player} fleet locked in.`,
  };
}

export function isShipSunk(ship: PlacedShip, incomingShots: ShotMark[]): boolean {
  return ship.cells.every((idx) => incomingShots[idx] === 'hit');
}

export function formatBsCoord(idx: number): string {
  const rowLetter = String.fromCharCode(65 + Math.floor(idx / BS_SIZE));
  const colNum = (idx % BS_SIZE) + 1;
  return `${rowLetter}${colNum}`;
}

export function fireBattleshipShot(
  state: BattleshipState,
  player: '1' | '2',
  targetIdx: number,
): BattleshipState {
  if (state.phase !== 'playing' || state.winner !== '') {
    throw new Error('Cannot fire right now.');
  }
  if (state.turn !== player) {
    throw new Error('Wait for your turn to fire.');
  }
  if (targetIdx < 0 || targetIdx >= 100) {
    throw new Error('Invalid target coordinate.');
  }

  const myShots = player === '1' ? [...state.p1Shots] : [...state.p2Shots];
  if (myShots[targetIdx] !== '') {
    throw new Error('You already fired at that coordinate.');
  }

  const enemyShips = player === '1' ? state.p2Ships : state.p1Ships;
  const hitShip = enemyShips.find((s) => s.cells.includes(targetIdx));
  myShots[targetIdx] = hitShip ? 'hit' : 'miss';

  const coord = formatBsCoord(targetIdx);
  let lastAction = `${coord} — Miss!`;
  if (hitShip) {
    const sunkNow = isShipSunk(hitShip, myShots);
    lastAction = sunkNow
      ? `${coord} — HIT! ${hitShip.name} sunk!`
      : `${coord} — Direct HIT!`;
  }

  const allSunk = enemyShips.every((s) => isShipSunk(s, myShots));

  return {
    ...state,
    p1Shots: player === '1' ? myShots : state.p1Shots,
    p2Shots: player === '2' ? myShots : state.p2Shots,
    turn: allSunk ? player : player === '1' ? '2' : '1',
    phase: allSunk ? 'finished' : 'playing',
    lastAction,
    winner: allSunk ? player : '',
  };
}
