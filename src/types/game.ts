import type { Timestamp } from 'firebase/firestore';

export type AvatarId = 'coral' | 'cobalt' | 'emerald' | 'amber' | 'slate' | 'plum';

export const AVATAR_IDS: AvatarId[] = ['coral', 'cobalt', 'emerald', 'amber', 'slate', 'plum'];

export type EmblemIconId =
  | 'letter'
  | 'crown'
  | 'flame'
  | 'star'
  | 'zap'
  | 'shield'
  | 'sparkles'
  | 'ghost';

export const EMBLEM_ICON_IDS: EmblemIconId[] = [
  'letter',
  'crown',
  'flame',
  'star',
  'zap',
  'shield',
  'sparkles',
  'ghost',
];

export type BannerThemeId = 'classic' | 'amber' | 'sky' | 'rose' | 'emerald' | 'slate';

export const BANNER_THEME_IDS: BannerThemeId[] = [
  'classic',
  'amber',
  'sky',
  'rose',
  'emerald',
  'slate',
];

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 160;
export const PLAYER_TITLE_MAX = 24;
export const CHAT_MESSAGE_MAX = 280;
export const INVITE_CODE_REGEX = /^[A-Z0-9]{6}$/;

export interface PlayerProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarId: AvatarId;
  bio: string;
  emblemIcon?: EmblemIconId;
  bannerTheme?: BannerThemeId;
  playerTitle?: string;
  visibility: 'public';
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  points: number;
  winStreak: number;
  bestStreak: number;
  lastMatchId: string;
  isOnline: boolean;
  lastActiveAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderAvatar: AvatarId;
  senderEmblem: EmblemIconId;
  senderTitle?: string;
  text: string;
  createdAt: Timestamp | null;
}

export interface PrivateUser {
  uid: string;
  email: string;
  soundEnabled: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CellValue = '' | 'X' | 'O';
export type GameMark = 'X' | 'O';
export type GameVisibility = 'public' | 'private';
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type GameWinner = '' | 'X' | 'O' | 'draw';

export interface GameRoom {
  id: string;
  inviteCode: string;
  visibility: GameVisibility;
  isPublicOpen: boolean;
  status: GameStatus;
  hostUid: string;
  playerXUid: string;
  playerXName: string;
  playerXAvatar: AvatarId;
  playerOUid: string;
  playerOName: string;
  playerOAvatar: AvatarId | '';
  participantUids: string[];
  board: CellValue[];
  currentTurn: GameMark;
  moveCount: number;
  winner: GameWinner;
  winnerUid: string;
  winningLine: number[];
  rematchGameId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  finishedAt: Timestamp | null;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface Challenge {
  id: string;
  challengerUid: string;
  challengerName: string;
  challengerAvatar: AvatarId;
  targetUid: string;
  targetName: string;
  status: ChallengeStatus;
  gameId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type NavTab = 'play' | 'challenges' | 'leaderboard' | 'history' | 'profile';
