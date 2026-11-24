import {
  Anchor,
  Crown,
  Grid3X3,
  Hand,
  HelpCircle,
  Layers,
  Shuffle,
  Sparkles,
  Type,
} from 'lucide-react';
import type { AllGameId } from '../../types/arcade';

interface GameIconProps {
  gameId: AllGameId;
  className?: string;
}

export function GameIcon({ gameId, className = 'w-5 h-5' }: GameIconProps) {
  switch (gameId) {
    case 'tictactoe':
      return <Grid3X3 className={className} />;
    case 'chess':
      return <Crown className={className} />;
    case 'connect4':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="8" cy="10" r="1.8" fill="currentColor" />
          <circle cx="12" cy="10" r="1.8" />
          <circle cx="16" cy="10" r="1.8" fill="currentColor" />
          <circle cx="8" cy="15" r="1.8" />
          <circle cx="12" cy="15" r="1.8" fill="currentColor" />
          <circle cx="16" cy="15" r="1.8" fill="currentColor" />
        </svg>
      );
    case 'battleship':
      return <Anchor className={className} />;
    case 'rps':
      return <Hand className={className} />;
    case 'checkers':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    case 'wordguess':
      return <Type className={className} />;
    case 'hangman':
      return <HelpCircle className={className} />;
    case 'dotsboxes':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="6" cy="6" r="1.5" fill="currentColor" />
          <circle cx="18" cy="6" r="1.5" fill="currentColor" />
          <circle cx="6" cy="18" r="1.5" fill="currentColor" />
          <circle cx="18" cy="18" r="1.5" fill="currentColor" />
          <line x1="7.5" y1="6" x2="16.5" y2="6" />
          <line x1="6" y1="7.5" x2="6" y2="16.5" />
          <line x1="18" y1="7.5" x2="18" y2="16.5" />
          <line x1="7.5" y1="18" x2="16.5" y2="18" />
        </svg>
      );
    case 'crazyeights':
      return <Layers className={className} />;
    case 'reversi':
      return <Shuffle className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}
