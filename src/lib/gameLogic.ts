import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  INVITE_CODE_REGEX,
  PLAYER_TITLE_MAX,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
  type CellValue,
  type GameWinner,
} from '../types/game';

export const WINNING_LINES: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface BoardEvaluation {
  winner: GameWinner;
  winningLine: number[];
  isFinished: boolean;
}

export function evaluateBoard(board: CellValue[]): BoardEvaluation {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark !== '' && mark === board[b] && mark === board[c]) {
      return {
        winner: mark,
        winningLine: line,
        isFinished: true,
      };
    }
  }

  const isBoardFull = board.every((cell) => cell !== '');
  if (isBoardFull) {
    return {
      winner: 'draw',
      winningLine: [],
      isFinished: true,
    };
  }

  return {
    winner: '',
    winningLine: [],
    isFinished: false,
  };
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * INVITE_ALPHABET.length);
    code += INVITE_ALPHABET[index];
  }
  return code;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isValidInviteCodeFormat(code: string): boolean {
  return INVITE_CODE_REGEX.test(code);
}

export function generateRoomShareUrl(inviteCode: string): string {
  if (typeof window === 'undefined') {
    return `?room=${inviteCode}`;
  }
  return `${window.location.origin}/?room=${inviteCode}`;
}

export function extractRoomCodeFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get('room');
  if (queryRoom) {
    const normalized = normalizeInviteCode(queryRoom);
    if (isValidInviteCodeFormat(normalized)) return normalized;
  }
  const pathMatch = window.location.pathname.match(/^\/room\/([A-Za-z0-9]{6})\/?$/);
  if (pathMatch?.[1]) {
    const normalized = normalizeInviteCode(pathMatch[1]);
    if (isValidInviteCodeFormat(normalized)) return normalized;
  }
  return '';
}

export function clearRoomCodeFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('room') || /^\/room\//.test(url.pathname)) {
    window.history.replaceState({}, '', '/');
  }
}

export function syncRoomCodeToUrl(inviteCode: string): void {
  if (typeof window === 'undefined') return;
  const target = `/?room=${inviteCode}`;
  if (window.location.search !== `?room=${inviteCode}`) {
    window.history.replaceState({}, '', target);
  }
}

export function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = cleaned.slice(0, USERNAME_MAX);
  if (base.length >= USERNAME_MIN) return base;
  return `${base}player`.slice(0, Math.max(USERNAME_MIN, base.length + 6));
}

export function validateProfileInput(input: {
  username: string;
  displayName: string;
  bio: string;
  playerTitle?: string;
}): string | null {
  const username = input.username.trim();
  const displayName = input.displayName.trim();
  const bio = input.bio.trim();
  const playerTitle = (input.playerTitle ?? '').trim();

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'Username can only contain letters, numbers, and underscores.';
  }
  if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX) {
    return `Display name must be between 1 and ${DISPLAY_NAME_MAX} characters.`;
  }
  if (bio.length > BIO_MAX) {
    return `Bio cannot exceed ${BIO_MAX} characters.`;
  }
  if (playerTitle.length > PLAYER_TITLE_MAX) {
    return `Player title cannot exceed ${PLAYER_TITLE_MAX} characters.`;
  }
  return null;
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function computeWinRate(wins: number, gamesPlayed: number): number {
  if (gamesPlayed <= 0) return 0;
  return Math.round((wins / gamesPlayed) * 100);
}
