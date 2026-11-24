import type { AllGameId } from '../types/arcade';

export interface GameCatalogEntry {
  id: AllGameId;
  name: string;
  shortTag: string;
  description: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  hasHiddenInfo: boolean;
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    shortTag: '3x3 Classic',
    description: 'Classic 3-in-a-row duels online, vs Bot, or Pass & Play.',
    accentBg: 'bg-amber-300',
    accentText: 'text-slate-900',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
  {
    id: 'chess',
    name: 'Chess',
    shortTag: '8x8 Strategy',
    description: 'Full classic rules with castling, en passant, promotion, and checkmate.',
    accentBg: 'bg-slate-800',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
  {
    id: 'connect4',
    name: 'Connect Four',
    shortTag: '7x6 Gravity',
    description: 'Drop coloured discs and line up four in any direction to win.',
    accentBg: 'bg-blue-600',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
  {
    id: 'battleship',
    name: 'Battleship',
    shortTag: '10x10 Fleet',
    description: 'Arrange your 5 naval ships in secret and hunt your opponent’s fleet.',
    accentBg: 'bg-sky-400',
    accentText: 'text-slate-900',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: true,
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    shortTag: 'Best of 3 / 5',
    description: 'Simultaneous secret picks with round reveal and live scoreboard.',
    accentBg: 'bg-rose-500',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: true,
  },
  {
    id: 'checkers',
    name: 'Checkers',
    shortTag: '8x8 Jumps',
    description: 'Diagonal hops, mandatory multi-jumps, and crowned Kings.',
    accentBg: 'bg-red-500',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
  {
    id: 'wordguess',
    name: 'Word Guess',
    shortTag: '5-Letter Duel',
    description: 'Race to crack the shared 5-letter word in six guesses with tile clues.',
    accentBg: 'bg-emerald-500',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: true,
  },
  {
    id: 'hangman',
    name: 'Hangman',
    shortTag: 'Word & Guess',
    description: 'Set a secret word or pick one at random before the 6-miss gallows fills.',
    accentBg: 'bg-amber-400',
    accentText: 'text-slate-900',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: true,
  },
  {
    id: 'dotsboxes',
    name: 'Dots and Boxes',
    shortTag: '4x4 Grid',
    description: 'Claim edges between dots to close boxes and chain bonus turns.',
    accentBg: 'bg-violet-500',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
  {
    id: 'crazyeights',
    name: 'Crazy Eights',
    shortTag: '52-Card Deck',
    description: 'Match suit or rank, drop wild 8s to switch suits, and empty your hand first.',
    accentBg: 'bg-orange-500',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: true,
  },
  {
    id: 'reversi',
    name: 'Reversi',
    shortTag: '8x8 Flip',
    description: 'Outflank opponent discs to flip lines and control the most squares.',
    accentBg: 'bg-emerald-700',
    accentText: 'text-white',
    accentBorder: 'border-slate-900',
    hasHiddenInfo: false,
  },
];

export function getCatalogEntry(id: AllGameId): GameCatalogEntry {
  return GAME_CATALOG.find((g) => g.id === id) || GAME_CATALOG[0];
}
