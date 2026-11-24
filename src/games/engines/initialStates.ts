import type { ArcadeGameType } from '../../types/arcade';
import { createInitialBattleshipState } from './battleshipEngine';
import { createInitialCheckersState } from './checkersEngine';
import { createInitialChessState } from './chessEngine';
import { createInitialConnect4State } from './connect4Engine';
import { createInitialCrazyEightsState } from './crazyEightsEngine';
import { createInitialDotsBoxesState } from './dotsBoxesEngine';
import { createInitialHangmanState } from './hangmanEngine';
import { createInitialReversiState } from './reversiEngine';
import { createInitialRpsState } from './rpsEngine';
import { createInitialWordGuessState } from './wordGuessEngine';

export function createInitialArcadeState(gameType: ArcadeGameType): Record<string, unknown> {
  switch (gameType) {
    case 'chess':
      return createInitialChessState() as unknown as Record<string, unknown>;
    case 'connect4':
      return createInitialConnect4State() as unknown as Record<string, unknown>;
    case 'battleship':
      return createInitialBattleshipState() as unknown as Record<string, unknown>;
    case 'rps':
      return createInitialRpsState('bo3') as unknown as Record<string, unknown>;
    case 'checkers':
      return createInitialCheckersState() as unknown as Record<string, unknown>;
    case 'wordguess':
      return createInitialWordGuessState() as unknown as Record<string, unknown>;
    case 'hangman':
      return createInitialHangmanState('1') as unknown as Record<string, unknown>;
    case 'dotsboxes':
      return createInitialDotsBoxesState() as unknown as Record<string, unknown>;
    case 'crazyeights':
      return createInitialCrazyEightsState() as unknown as Record<string, unknown>;
    case 'reversi':
      return createInitialReversiState() as unknown as Record<string, unknown>;
  }
}

export function isSimultaneousGame(gameType: ArcadeGameType): boolean {
  return gameType === 'battleship' || gameType === 'rps';
}
