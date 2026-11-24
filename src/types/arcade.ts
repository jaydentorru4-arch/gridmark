import type { Timestamp } from 'firebase/firestore';
import type { AvatarId, GameVisibility } from './game';

export type AllGameId =
  | 'tictactoe'
  | 'chess'
  | 'connect4'
  | 'battleship'
  | 'rps'
  | 'checkers'
  | 'wordguess'
  | 'hangman'
  | 'dotsboxes'
  | 'crazyeights'
  | 'reversi';

export type ArcadeGameType = Exclude<AllGameId, 'tictactoe'>;

export const ARCADE_GAME_TYPES: ArcadeGameType[] = [
  'chess',
  'connect4',
  'battleship',
  'rps',
  'checkers',
  'wordguess',
  'hangman',
  'dotsboxes',
  'crazyeights',
  'reversi',
];

export type ArcadeRoomStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';

export interface ArcadeRoom<TState = Record<string, unknown>> {
  id: string;
  inviteCode: string;
  gameType: ArcadeGameType;
  visibility: GameVisibility;
  isPublicOpen: boolean;
  status: ArcadeRoomStatus;
  hostUid: string;
  player1Uid: string;
  player1Name: string;
  player1Avatar: AvatarId;
  player2Uid: string;
  player2Name: string;
  player2Avatar: AvatarId | '';
  participantUids: string[];
  currentTurnUid: string;
  winnerUid: string; // '' while active, 'draw' on draw, or winning player UID
  resultSummary: string;
  rematchRoomId: string;
  state: TState;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  finishedAt: Timestamp | null;
}

export interface ArcadeMatchPlayer {
  uid: string;
  name: string;
  avatar: AvatarId;
}

export interface ArcadeGameProps<TState> {
  mode: 'online' | 'local' | 'bot';
  state: TState;
  player1: ArcadeMatchPlayer;
  player2: ArcadeMatchPlayer;
  viewerUid: string;
  isFinished: boolean;
  winnerUid: string;
  resultSummary: string;
  busy: boolean;
  onCommitState: (params: {
    nextState: TState;
    nextTurnUid: string;
    finished?: boolean;
    winnerUid?: string;
    resultSummary?: string;
  }) => Promise<void> | void;
  onRematch: () => void;
  onLeave: () => void;
  onSwitchGame: () => void;
}
