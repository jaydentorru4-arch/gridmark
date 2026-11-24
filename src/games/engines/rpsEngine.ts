export type RpsChoice = '' | 'rock' | 'paper' | 'scissors';
export type RpsMode = 'bo3' | 'bo5';

export interface RpsRoundLog {
  round: number;
  p1Choice: Exclude<RpsChoice, ''>;
  p2Choice: Exclude<RpsChoice, ''>;
  winner: '1' | '2' | 'draw';
}

export interface RpsState {
  mode: RpsMode; // bo3 => first to 2, bo5 => first to 3
  targetWins: number;
  roundNumber: number;
  phase: 'picking' | 'reveal' | 'finished';
  p1Choice: RpsChoice;
  p2Choice: RpsChoice;
  p1Score: number;
  p2Score: number;
  history: RpsRoundLog[];
  winner: '' | '1' | '2';
}

export function createInitialRpsState(mode: RpsMode = 'bo3'): RpsState {
  return {
    mode,
    targetWins: mode === 'bo5' ? 3 : 2,
    roundNumber: 1,
    phase: 'picking',
    p1Choice: '',
    p2Choice: '',
    p1Score: 0,
    p2Score: 0,
    history: [],
    winner: '',
  };
}

export function switchRpsMode(state: RpsState, mode: RpsMode): RpsState {
  if (state.history.length > 0 || state.p1Choice !== '' || state.p2Choice !== '') {
    return state;
  }
  return createInitialRpsState(mode);
}

function resolveRpsRound(
  c1: Exclude<RpsChoice, ''>,
  c2: Exclude<RpsChoice, ''>,
): '1' | '2' | 'draw' {
  if (c1 === c2) return 'draw';
  if (
    (c1 === 'rock' && c2 === 'scissors') ||
    (c1 === 'scissors' && c2 === 'paper') ||
    (c1 === 'paper' && c2 === 'rock')
  ) {
    return '1';
  }
  return '2';
}

export function submitRpsPick(
  state: RpsState,
  player: '1' | '2',
  choice: Exclude<RpsChoice, ''>,
): RpsState {
  if (state.phase !== 'picking' || state.winner !== '') {
    return state;
  }

  const nextP1 = player === '1' ? choice : state.p1Choice;
  const nextP2 = player === '2' ? choice : state.p2Choice;

  if (nextP1 !== '' && nextP2 !== '') {
    const roundWinner = resolveRpsRound(nextP1, nextP2);
    const p1Score = state.p1Score + (roundWinner === '1' ? 1 : 0);
    const p2Score = state.p2Score + (roundWinner === '2' ? 1 : 0);
    const matchWinner: RpsState['winner'] =
      p1Score >= state.targetWins ? '1' : p2Score >= state.targetWins ? '2' : '';

    const logEntry: RpsRoundLog = {
      round: state.roundNumber,
      p1Choice: nextP1,
      p2Choice: nextP2,
      winner: roundWinner,
    };

    return {
      ...state,
      p1Choice: nextP1,
      p2Choice: nextP2,
      p1Score,
      p2Score,
      history: [...state.history, logEntry],
      phase: matchWinner ? 'finished' : 'reveal',
      winner: matchWinner,
    };
  }

  return {
    ...state,
    p1Choice: nextP1,
    p2Choice: nextP2,
  };
}

export function advanceRpsRound(state: RpsState): RpsState {
  if (state.phase !== 'reveal' || state.winner !== '') return state;
  return {
    ...state,
    roundNumber: state.roundNumber + 1,
    phase: 'picking',
    p1Choice: '',
    p2Choice: '',
  };
}
