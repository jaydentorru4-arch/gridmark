import { useEffect, useRef, useState } from 'react';
import {
  chooseBattleshipBotShot,
  chooseCheckersBotMove,
  chooseChessBotMove,
  chooseConnect4BotCol,
  chooseCrazyEightsBotAction,
  chooseDotsBoxesBotMove,
  chooseHangmanBotLetter,
  chooseReversiBotMove,
  chooseRpsBotPick,
  chooseWordGuessBotWord,
} from '../../games/engines/arcadeBotAi';
import {
  fireBattleshipShot,
  generateRandomFleet,
  lockBattleshipFleet,
  type BattleshipState,
} from '../../games/engines/battleshipEngine';
import {
  executeCheckerMove,
  type CheckersState,
} from '../../games/engines/checkersEngine';
import {
  executeChessMove,
  type ChessState,
} from '../../games/engines/chessEngine';
import {
  dropConnect4Disc,
  type Connect4State,
} from '../../games/engines/connect4Engine';
import {
  drawCrazyEightsCard,
  passCrazyEightsTurn,
  playCrazyEightsCard,
  type CrazyEightsState,
} from '../../games/engines/crazyEightsEngine';
import {
  claimDotsBoxesEdge,
  type DotsBoxesState,
} from '../../games/engines/dotsBoxesEngine';
import {
  getRandomHangmanPrompt,
  guessHangmanLetter,
  setHangmanSecret,
  type HangmanState,
} from '../../games/engines/hangmanEngine';
import { createInitialArcadeState } from '../../games/engines/initialStates';
import {
  playReversiMove,
  type ReversiState,
} from '../../games/engines/reversiEngine';
import {
  submitRpsPick,
  type RpsState,
} from '../../games/engines/rpsEngine';
import {
  submitWordGuess,
  type WordGuessState,
} from '../../games/engines/wordGuessEngine';
import type { BotDifficulty } from '../../lib/botAi';
import { soundFx } from '../../lib/sound';
import {
  cancelArcadeWaitingRoom,
  clearArcadeCodeFromUrl,
  commitArcadeMove,
  createArcadeRematchRoom,
  subscribeToArcadeRoom,
  syncArcadeCodeToUrl,
} from '../../services/arcadeService';
import type {
  ArcadeGameProps,
  ArcadeGameType,
  ArcadeMatchPlayer,
  ArcadeRoom,
} from '../../types/arcade';
import type { PlayerProfile } from '../../types/game';
import { ArcadeLobby } from './ArcadeLobby';
import { ArcadeMatchShell } from './ArcadeMatchShell';
import { BattleshipBoard } from './BattleshipBoard';
import { CheckersBoard } from './CheckersBoard';
import { ChessBoard } from './ChessBoard';
import { ConnectFourBoard } from './ConnectFourBoard';
import { CrazyEightsBoard } from './CrazyEightsBoard';
import { DotsBoxesBoard } from './DotsBoxesBoard';
import { HangmanArena } from './HangmanArena';
import { ReversiBoard } from './ReversiBoard';
import { RpsArena } from './RpsArena';
import { WordGuessArena } from './WordGuessArena';

interface LocalSession {
  gameType: ArcadeGameType;
  p1Name: string;
  p2Name: string;
  state: Record<string, unknown>;
  isFinished: boolean;
  winnerUid: string;
  resultSummary: string;
  roundKey: number;
}

interface BotSession {
  gameType: ArcadeGameType;
  difficulty: BotDifficulty;
  humanIsPlayer1: boolean;
  state: Record<string, unknown>;
  isFinished: boolean;
  winnerUid: string;
  resultSummary: string;
  roundKey: number;
}

interface ArcadeWorkspaceProps {
  gameType: ArcadeGameType;
  currentUser: PlayerProfile;
  openRooms: ArcadeRoom[];
  myActiveRooms: ArcadeRoom[];
  activeRoomId: string | null;
  soundEnabled: boolean;
  isGuest?: boolean;
  onRequestSignIn?: () => void;
  onToggleSound: () => void;
  onSelectRoom: (roomId: string | null) => void;
  onOpenSwitcher: () => void;
}

const BOT_LABELS: Record<BotDifficulty, string> = {
  casual: 'Casual Bot',
  tactical: 'Tactical Bot',
  unbeatable: 'Unbeatable Bot',
};

function computeBotPlayers(
  currentUser: PlayerProfile,
  difficulty: BotDifficulty,
  humanIsPlayer1: boolean,
): { p1: ArcadeMatchPlayer; p2: ArcadeMatchPlayer; botSide: '1' | '2' } {
  const humanPlayer: ArcadeMatchPlayer = {
    uid: 'bot_human',
    name: currentUser.displayName || 'You',
    avatar: currentUser.avatarId,
  };
  const botPlayer: ArcadeMatchPlayer = {
    uid: 'bot_ai',
    name: BOT_LABELS[difficulty],
    avatar: 'slate',
  };
  return humanIsPlayer1
    ? { p1: humanPlayer, p2: botPlayer, botSide: '2' }
    : { p1: botPlayer, p2: humanPlayer, botSide: '1' };
}

function isBotTurnNow(
  gameType: ArcadeGameType,
  rawState: Record<string, unknown>,
  botSide: '1' | '2',
): boolean {
  switch (gameType) {
    case 'chess': {
      const s = rawState as unknown as ChessState;
      return s.outcome === '' && s.turn === (botSide === '1' ? 'w' : 'b');
    }
    case 'connect4': {
      const s = rawState as unknown as Connect4State;
      return s.winner === '' && s.turn === botSide;
    }
    case 'battleship': {
      const s = rawState as unknown as BattleshipState;
      if (s.phase === 'setup') {
        return botSide === '1' ? !s.p1Ready : !s.p2Ready;
      }
      return s.phase === 'playing' && s.winner === '' && s.turn === botSide;
    }
    case 'rps': {
      const s = rawState as unknown as RpsState;
      if (s.phase !== 'picking' || s.winner !== '') return false;
      const humanChoice = botSide === '1' ? s.p2Choice : s.p1Choice;
      const botChoice = botSide === '1' ? s.p1Choice : s.p2Choice;
      return humanChoice !== '' && botChoice === '';
    }
    case 'checkers': {
      const s = rawState as unknown as CheckersState;
      return s.winner === '' && s.turn === (botSide === '1' ? 'r' : 'b');
    }
    case 'wordguess': {
      const s = rawState as unknown as WordGuessState;
      return s.winner === '' && s.turn === botSide;
    }
    case 'hangman': {
      const s = rawState as unknown as HangmanState;
      if (s.phase === 'setup') return s.setter === botSide;
      return s.phase === 'playing' && s.winner === '' && s.guesser === botSide;
    }
    case 'dotsboxes': {
      const s = rawState as unknown as DotsBoxesState;
      return s.winner === '' && s.turn === botSide;
    }
    case 'crazyeights': {
      const s = rawState as unknown as CrazyEightsState;
      return s.winner === '' && s.turn === botSide;
    }
    case 'reversi': {
      const s = rawState as unknown as ReversiState;
      return s.winner === '' && s.turn === (botSide === '1' ? 'B' : 'W');
    }
  }
}

function executeBotStep(
  gameType: ArcadeGameType,
  rawState: Record<string, unknown>,
  botSide: '1' | '2',
  difficulty: BotDifficulty,
  p1: ArcadeMatchPlayer,
  p2: ArcadeMatchPlayer,
): {
  nextState: Record<string, unknown>;
  finished: boolean;
  winnerUid: string;
  resultSummary: string;
} | null {
  switch (gameType) {
    case 'chess': {
      const s = rawState as unknown as ChessState;
      const move = chooseChessBotMove(s, difficulty);
      if (!move) return null;
      const next = executeChessMove(s, move.from, move.to, move.promo);
      const finished = next.outcome !== '';
      const winnerUid =
        next.outcome === 'w'
          ? p1.uid
          : next.outcome === 'b'
            ? p2.uid
            : next.outcome === 'draw'
              ? 'draw'
              : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: next.outcomeReason,
      };
    }
    case 'connect4': {
      const s = rawState as unknown as Connect4State;
      const col = chooseConnect4BotCol(s, difficulty);
      if (col < 0) return null;
      const next = dropConnect4Disc(s, col);
      const finished = next.winner !== '';
      const winnerUid =
        next.winner === '1'
          ? p1.uid
          : next.winner === '2'
            ? p2.uid
            : next.winner === 'draw'
              ? 'draw'
              : '';
      const resultSummary =
        next.winner === 'draw'
          ? 'All 42 slots filled — Draw match!'
          : next.winner === '1'
            ? `${p1.name} connected four!`
            : next.winner === '2'
              ? `${p2.name} connected four!`
              : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary,
      };
    }
    case 'battleship': {
      const s = rawState as unknown as BattleshipState;
      if (s.phase === 'setup') {
        const next = lockBattleshipFleet(s, botSide, generateRandomFleet());
        return {
          nextState: next as unknown as Record<string, unknown>,
          finished: false,
          winnerUid: '',
          resultSummary: '',
        };
      }
      const targetIdx = chooseBattleshipBotShot(s, botSide, difficulty);
      if (targetIdx < 0) return null;
      const next = fireBattleshipShot(s, botSide, targetIdx);
      const finished = next.winner !== '';
      const winnerUid = next.winner === '1' ? p1.uid : next.winner === '2' ? p2.uid : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: next.lastAction,
      };
    }
    case 'rps': {
      const s = rawState as unknown as RpsState;
      const pick = chooseRpsBotPick(s, botSide, difficulty);
      const next = submitRpsPick(s, botSide, pick);
      const finished = next.winner !== '';
      const winnerUid = next.winner === '1' ? p1.uid : next.winner === '2' ? p2.uid : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: finished ? `Final Score ${next.p1Score}–${next.p2Score}` : '',
      };
    }
    case 'checkers': {
      const s = rawState as unknown as CheckersState;
      const move = chooseCheckersBotMove(s, difficulty);
      if (!move) return null;
      const next = executeCheckerMove(s, move.from, move.to);
      const finished = next.winner !== '';
      const winnerUid = next.winner === 'r' ? p1.uid : next.winner === 'b' ? p2.uid : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: next.outcomeReason,
      };
    }
    case 'wordguess': {
      const s = rawState as unknown as WordGuessState;
      const word = chooseWordGuessBotWord(s, botSide, difficulty);
      const next = submitWordGuess(s, botSide, word);
      const finished = next.winner !== '';
      const winnerUid =
        next.winner === '1'
          ? p1.uid
          : next.winner === '2'
            ? p2.uid
            : next.winner === 'draw'
              ? 'draw'
              : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: next.outcomeReason,
      };
    }
    case 'hangman': {
      const s = rawState as unknown as HangmanState;
      if (s.phase === 'setup') {
        const prompt = getRandomHangmanPrompt();
        const next = setHangmanSecret(s, prompt.word, prompt.hint);
        return {
          nextState: next as unknown as Record<string, unknown>,
          finished: false,
          winnerUid: '',
          resultSummary: '',
        };
      }
      const letter = chooseHangmanBotLetter(s, difficulty);
      const next = guessHangmanLetter(s, letter);
      const finished = next.winner !== '';
      const winnerUid = next.winner === '1' ? p1.uid : next.winner === '2' ? p2.uid : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: next.outcomeReason,
      };
    }
    case 'dotsboxes': {
      const s = rawState as unknown as DotsBoxesState;
      const move = chooseDotsBoxesBotMove(s, difficulty);
      if (!move) return null;
      const next = claimDotsBoxesEdge(s, move.kind, move.row, move.col);
      const finished = next.winner !== '';
      const winnerUid =
        next.winner === '1'
          ? p1.uid
          : next.winner === '2'
            ? p2.uid
            : next.winner === 'draw'
              ? 'draw'
              : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: finished ? `Final Score ${next.p1Score}–${next.p2Score}` : '',
      };
    }
    case 'crazyeights': {
      const s = rawState as unknown as CrazyEightsState;
      const action = chooseCrazyEightsBotAction(s, botSide, difficulty);
      const next =
        action.type === 'play'
          ? playCrazyEightsCard(s, botSide, action.cardId, action.suit)
          : action.type === 'draw'
            ? drawCrazyEightsCard(s, botSide)
            : passCrazyEightsTurn(s, botSide);
      const finished = next.winner !== '';
      const winnerUid = next.winner === '1' ? p1.uid : next.winner === '2' ? p2.uid : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: finished
          ? `${next.winner === '1' ? p1.name : p2.name} emptied their hand!`
          : '',
      };
    }
    case 'reversi': {
      const s = rawState as unknown as ReversiState;
      const idx = chooseReversiBotMove(s, difficulty);
      if (idx < 0) return null;
      const next = playReversiMove(s, idx);
      const finished = next.winner !== '';
      const winnerUid =
        next.winner === 'B'
          ? p1.uid
          : next.winner === 'W'
            ? p2.uid
            : next.winner === 'draw'
              ? 'draw'
              : '';
      return {
        nextState: next as unknown as Record<string, unknown>,
        finished,
        winnerUid,
        resultSummary: finished
          ? `Final Discs: Black ${next.blackCount} – White ${next.whiteCount}`
          : '',
      };
    }
  }
}

export function ArcadeWorkspace({
  gameType,
  currentUser,
  openRooms,
  myActiveRooms,
  activeRoomId,
  soundEnabled,
  isGuest = false,
  onRequestSignIn,
  onToggleSound,
  onSelectRoom,
  onOpenSwitcher,
}: ArcadeWorkspaceProps) {
  const [activeRoom, setActiveRoom] = useState<ArcadeRoom | null>(null);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const [botSession, setBotSession] = useState<BotSession | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const lastSoundStatusRef = useRef<string>('');

  // Clear local / bot session if user switches game type
  useEffect(() => {
    setLocalSession((prev) => (prev && prev.gameType !== gameType ? null : prev));
    setBotSession((prev) => (prev && prev.gameType !== gameType ? null : prev));
    setErrorMsg('');
  }, [gameType]);

  // Automatic Bot Turn Execution
  useEffect(() => {
    if (!botSession || botSession.gameType !== gameType || botSession.isFinished) {
      setBotThinking(false);
      return;
    }

    const { p1, p2, botSide } = computeBotPlayers(
      currentUser,
      botSession.difficulty,
      botSession.humanIsPlayer1,
    );

    if (!isBotTurnNow(gameType, botSession.state, botSide)) {
      setBotThinking(false);
      return;
    }

    setBotThinking(true);
    const delayMs =
      gameType === 'battleship' && (botSession.state as unknown as BattleshipState).phase === 'setup'
        ? 140
        : gameType === 'hangman' && (botSession.state as unknown as HangmanState).phase === 'setup'
          ? 140
          : 220;

    const timer = window.setTimeout(() => {
      const step = executeBotStep(
        gameType,
        botSession.state,
        botSide,
        botSession.difficulty,
        p1,
        p2,
      );
      if (step) {
        if (step.finished) {
          if (step.winnerUid === 'draw') soundFx.playDraw();
          else soundFx.playWin();
        } else {
          soundFx.playMove('O');
        }
        setBotSession((prev) =>
          prev
            ? {
                ...prev,
                state: step.nextState,
                isFinished: step.finished,
                winnerUid: step.winnerUid,
                resultSummary: step.resultSummary,
              }
            : null,
        );
      }
      setBotThinking(false);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [botSession, gameType, currentUser.uid, currentUser.displayName, currentUser.avatarId]);

  // Real-time subscription to active online room
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      return;
    }

    const unsub = subscribeToArcadeRoom(
      activeRoomId,
      (room) => {
        setActiveRoom(room);
        if (room?.inviteCode) {
          syncArcadeCodeToUrl(room.inviteCode);
        }
        if (room) {
          const sig = `${room.status}-${room.winnerUid}`;
          if (lastSoundStatusRef.current && lastSoundStatusRef.current !== sig) {
            if (room.status === 'finished') {
              if (room.winnerUid === 'draw') soundFx.playDraw();
              else soundFx.playWin();
            } else {
              soundFx.playMove('X');
            }
          }
          lastSoundStatusRef.current = sig;
        }
      },
      (err) => {
        setErrorMsg(err.message);
      },
    );
    return () => unsub();
  }, [activeRoomId]);

  const handleStartLocal = (p1Name: string, p2Name: string) => {
    setErrorMsg('');
    setBotSession(null);
    setLocalSession({
      gameType,
      p1Name,
      p2Name,
      state: createInitialArcadeState(gameType),
      isFinished: false,
      winnerUid: '',
      resultSummary: '',
      roundKey: 1,
    });
  };

  const handleStartBot = (difficulty: BotDifficulty) => {
    setErrorMsg('');
    setLocalSession(null);
    // In Hangman, start with Bot as Setter ('1') and Human as Guesser ('2') so human guesses first!
    const humanIsPlayer1 = gameType !== 'hangman';
    setBotSession({
      gameType,
      difficulty,
      humanIsPlayer1,
      state: createInitialArcadeState(gameType),
      isFinished: false,
      winnerUid: '',
      resultSummary: '',
      roundKey: 1,
    });
  };

  // ---------------------------------------------------------
  // 1. RENDER SOLO VS BOT SESSION
  // ---------------------------------------------------------
  if (botSession && botSession.gameType === gameType) {
    const { p1, p2, botSide } = computeBotPlayers(
      currentUser,
      botSession.difficulty,
      botSession.humanIsPlayer1,
    );

    const botTurnActive = isBotTurnNow(gameType, botSession.state, botSide);

    const handleBotCommit: ArcadeGameProps<Record<string, unknown>>['onCommitState'] = ({
      nextState,
      finished,
      winnerUid,
      resultSummary,
    }) => {
      if (finished) {
        if (winnerUid === 'draw') soundFx.playDraw();
        else soundFx.playWin();
      } else {
        soundFx.playMove('X');
      }
      setBotSession((prev) =>
        prev
          ? {
              ...prev,
              state: nextState,
              isFinished: Boolean(finished),
              winnerUid: winnerUid || '',
              resultSummary: resultSummary || '',
            }
          : null,
      );
    };

    const handleBotRematch = () => {
      setBotSession((prev) =>
        prev
          ? {
              gameType,
              difficulty: prev.difficulty,
              humanIsPlayer1: !prev.humanIsPlayer1,
              state: createInitialArcadeState(gameType),
              isFinished: false,
              winnerUid: '',
              resultSummary: '',
              roundKey: prev.roundKey + 1,
            }
          : null,
      );
    };

    return (
      <ArcadeMatchShell
        key={`bot-${gameType}-${botSession.roundKey}`}
        mode="bot"
        gameType={gameType}
        isFinished={botSession.isFinished}
        winnerUid={botSession.winnerUid}
        resultSummary={botSession.resultSummary}
        player1={p1}
        player2={p2}
        activeTurnLabel={
          botThinking || botTurnActive
            ? `${BOT_LABELS[botSession.difficulty]} is thinking...`
            : 'Your Turn!'
        }
        soundEnabled={soundEnabled}
        busy={botThinking}
        errorMsg={errorMsg}
        onToggleSound={onToggleSound}
        onRematch={handleBotRematch}
        onLeave={() => setBotSession(null)}
        onSwitchGame={onOpenSwitcher}
      >
        {renderGameBoard(gameType, {
          mode: 'bot',
          state: botSession.state,
          player1: p1,
          player2: p2,
          viewerUid: 'bot_human',
          isFinished: botSession.isFinished,
          winnerUid: botSession.winnerUid,
          resultSummary: botSession.resultSummary,
          busy: botThinking,
          onCommitState: handleBotCommit,
          onRematch: handleBotRematch,
          onLeave: () => setBotSession(null),
          onSwitchGame: onOpenSwitcher,
        })}
      </ArcadeMatchShell>
    );
  }

  // ---------------------------------------------------------
  // 2. RENDER LOCAL PASS & PLAY SESSION
  // ---------------------------------------------------------
  if (localSession && localSession.gameType === gameType) {
    const p1: ArcadeMatchPlayer = {
      uid: 'local_p1',
      name: localSession.p1Name,
      avatar: currentUser.avatarId,
    };
    const p2: ArcadeMatchPlayer = {
      uid: 'local_p2',
      name: localSession.p2Name,
      avatar: 'coral',
    };

    const handleLocalCommit: ArcadeGameProps<Record<string, unknown>>['onCommitState'] = ({
      nextState,
      finished,
      winnerUid,
      resultSummary,
    }) => {
      if (finished) {
        if (winnerUid === 'draw') soundFx.playDraw();
        else soundFx.playWin();
      } else {
        soundFx.playMove('X');
      }
      setLocalSession((prev) =>
        prev
          ? {
              ...prev,
              state: nextState,
              isFinished: Boolean(finished),
              winnerUid: winnerUid || '',
              resultSummary: resultSummary || '',
            }
          : null,
      );
    };

    const handleLocalRematch = () => {
      setLocalSession((prev) =>
        prev
          ? {
              gameType,
              p1Name: prev.p2Name,
              p2Name: prev.p1Name,
              state: createInitialArcadeState(gameType),
              isFinished: false,
              winnerUid: '',
              resultSummary: '',
              roundKey: prev.roundKey + 1,
            }
          : null,
      );
    };

    return (
      <ArcadeMatchShell
        key={`local-${gameType}-${localSession.roundKey}`}
        mode="local"
        gameType={gameType}
        isFinished={localSession.isFinished}
        winnerUid={localSession.winnerUid}
        resultSummary={localSession.resultSummary}
        player1={p1}
        player2={p2}
        activeTurnLabel="Pass & Play Active"
        soundEnabled={soundEnabled}
        errorMsg={errorMsg}
        onToggleSound={onToggleSound}
        onRematch={handleLocalRematch}
        onLeave={() => setLocalSession(null)}
        onSwitchGame={onOpenSwitcher}
      >
        {renderGameBoard(gameType, {
          mode: 'local',
          state: localSession.state,
          player1: p1,
          player2: p2,
          viewerUid: 'local_p1',
          isFinished: localSession.isFinished,
          winnerUid: localSession.winnerUid,
          resultSummary: localSession.resultSummary,
          busy: false,
          onCommitState: handleLocalCommit,
          onRematch: handleLocalRematch,
          onLeave: () => setLocalSession(null),
          onSwitchGame: onOpenSwitcher,
        })}
      </ArcadeMatchShell>
    );
  }

  // ---------------------------------------------------------
  // 3. RENDER ONLINE MULTIPLAYER ROOM
  // ---------------------------------------------------------
  if (activeRoomId && activeRoom && activeRoom.gameType === gameType) {
    const p1: ArcadeMatchPlayer = {
      uid: activeRoom.player1Uid,
      name: activeRoom.player1Name,
      avatar: activeRoom.player1Avatar,
    };
    const p2: ArcadeMatchPlayer = {
      uid: activeRoom.player2Uid || 'waiting',
      name: activeRoom.player2Name || 'Waiting...',
      avatar: activeRoom.player2Avatar || 'amber',
    };

    const isWaiting = activeRoom.status === 'waiting';
    const isFinished = activeRoom.status === 'finished';

    const activeTurnLabel =
      activeRoom.currentTurnUid === ''
        ? 'Simultaneous Play'
        : activeRoom.currentTurnUid === currentUser.uid
          ? 'Your Turn!'
          : `${activeRoom.currentTurnUid === p1.uid ? p1.name : p2.name}'s Turn`;

    const handleOnlineCommit: ArcadeGameProps<Record<string, unknown>>['onCommitState'] = async (
      params,
    ) => {
      setErrorMsg('');
      setBusy(true);
      try {
        await commitArcadeMove(activeRoom.id, currentUser.uid, params);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to submit move.');
      } finally {
        setBusy(false);
      }
    };

    const handleCancelWaiting = async () => {
      setBusy(true);
      try {
        await cancelArcadeWaitingRoom(activeRoom.id);
        clearArcadeCodeFromUrl();
        onSelectRoom(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to cancel room.');
      } finally {
        setBusy(false);
      }
    };

    const handleOnlineRematch = async () => {
      setBusy(true);
      setErrorMsg('');
      try {
        const newId = await createArcadeRematchRoom(activeRoom, currentUser.uid);
        onSelectRoom(newId);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to create rematch.');
      } finally {
        setBusy(false);
      }
    };

    const handleLeaveRoom = () => {
      clearArcadeCodeFromUrl();
      onSelectRoom(null);
    };

    return (
      <ArcadeMatchShell
        mode="online"
        gameType={activeRoom.gameType}
        roomId={activeRoom.id}
        currentUser={currentUser}
        inviteCode={activeRoom.inviteCode}
        isWaiting={isWaiting}
        isHost={activeRoom.hostUid === currentUser.uid}
        isFinished={isFinished}
        winnerUid={activeRoom.winnerUid}
        resultSummary={activeRoom.resultSummary}
        rematchRoomId={activeRoom.rematchRoomId}
        player1={p1}
        player2={p2}
        activeTurnLabel={activeTurnLabel}
        soundEnabled={soundEnabled}
        busy={busy}
        errorMsg={errorMsg}
        onToggleSound={onToggleSound}
        onCancelWaiting={() => void handleCancelWaiting()}
        onRematch={() => void handleOnlineRematch()}
        onJoinRematch={(rematchId) => onSelectRoom(rematchId)}
        onLeave={handleLeaveRoom}
        onSwitchGame={onOpenSwitcher}
      >
        {renderGameBoard(activeRoom.gameType, {
          mode: 'online',
          state: activeRoom.state,
          player1: p1,
          player2: p2,
          viewerUid: currentUser.uid,
          isFinished,
          winnerUid: activeRoom.winnerUid,
          resultSummary: activeRoom.resultSummary,
          busy,
          onCommitState: handleOnlineCommit,
          onRematch: () => void handleOnlineRematch(),
          onLeave: handleLeaveRoom,
          onSwitchGame: onOpenSwitcher,
        })}
      </ArcadeMatchShell>
    );
  }

  // ---------------------------------------------------------
  // 4. RENDER GAME LOBBY
  // ---------------------------------------------------------
  return (
    <ArcadeLobby
      gameType={gameType}
      currentUser={currentUser}
      openRooms={openRooms}
      myActiveRooms={myActiveRooms}
      isGuest={isGuest}
      onRequestSignIn={onRequestSignIn}
      onOpenRoom={(roomId) => onSelectRoom(roomId)}
      onStartLocal={handleStartLocal}
      onStartBot={handleStartBot}
      onOpenSwitcher={onOpenSwitcher}
    />
  );
}

function renderGameBoard(
  gameType: ArcadeGameType,
  props: ArcadeGameProps<Record<string, unknown>>,
) {
  switch (gameType) {
    case 'chess':
      return <ChessBoard {...(props as unknown as ArcadeGameProps<ChessState>)} />;
    case 'connect4':
      return <ConnectFourBoard {...(props as unknown as ArcadeGameProps<Connect4State>)} />;
    case 'battleship':
      return <BattleshipBoard {...(props as unknown as ArcadeGameProps<BattleshipState>)} />;
    case 'rps':
      return <RpsArena {...(props as unknown as ArcadeGameProps<RpsState>)} />;
    case 'checkers':
      return <CheckersBoard {...(props as unknown as ArcadeGameProps<CheckersState>)} />;
    case 'wordguess':
      return <WordGuessArena {...(props as unknown as ArcadeGameProps<WordGuessState>)} />;
    case 'hangman':
      return <HangmanArena {...(props as unknown as ArcadeGameProps<HangmanState>)} />;
    case 'dotsboxes':
      return <DotsBoxesBoard {...(props as unknown as ArcadeGameProps<DotsBoxesState>)} />;
    case 'crazyeights':
      return <CrazyEightsBoard {...(props as unknown as ArcadeGameProps<CrazyEightsState>)} />;
    case 'reversi':
      return <ReversiBoard {...(props as unknown as ArcadeGameProps<ReversiState>)} />;
  }
}
