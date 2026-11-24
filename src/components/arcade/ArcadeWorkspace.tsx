import { useEffect, useRef, useState } from 'react';
import { createInitialArcadeState } from '../../games/engines/initialStates';
import type { BattleshipState } from '../../games/engines/battleshipEngine';
import type { CheckersState } from '../../games/engines/checkersEngine';
import type { ChessState } from '../../games/engines/chessEngine';
import type { Connect4State } from '../../games/engines/connect4Engine';
import type { CrazyEightsState } from '../../games/engines/crazyEightsEngine';
import type { DotsBoxesState } from '../../games/engines/dotsBoxesEngine';
import type { HangmanState } from '../../games/engines/hangmanEngine';
import type { ReversiState } from '../../games/engines/reversiEngine';
import type { RpsState } from '../../games/engines/rpsEngine';
import type { WordGuessState } from '../../games/engines/wordGuessEngine';
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

interface ArcadeWorkspaceProps {
  gameType: ArcadeGameType;
  currentUser: PlayerProfile;
  openRooms: ArcadeRoom[];
  myActiveRooms: ArcadeRoom[];
  activeRoomId: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSelectRoom: (roomId: string | null) => void;
  onOpenSwitcher: () => void;
}

export function ArcadeWorkspace({
  gameType,
  currentUser,
  openRooms,
  myActiveRooms,
  activeRoomId,
  soundEnabled,
  onToggleSound,
  onSelectRoom,
  onOpenSwitcher,
}: ArcadeWorkspaceProps) {
  const [activeRoom, setActiveRoom] = useState<ArcadeRoom | null>(null);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const lastSoundStatusRef = useRef<string>('');

  // Clear local pass & play session if user switches game type
  useEffect(() => {
    setLocalSession((prev) => (prev && prev.gameType !== gameType ? null : prev));
    setErrorMsg('');
  }, [gameType]);

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

  // ---------------------------------------------------------
  // 1. RENDER LOCAL PASS & PLAY SESSION
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
      // Swap player 1 and player 2 on rematch
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
  // 2. RENDER ONLINE MULTIPLAYER ROOM
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
  // 3. RENDER GAME LOBBY
  // ---------------------------------------------------------
  return (
    <ArcadeLobby
      gameType={gameType}
      currentUser={currentUser}
      openRooms={openRooms}
      myActiveRooms={myActiveRooms}
      onOpenRoom={(roomId) => onSelectRoom(roomId)}
      onStartLocal={handleStartLocal}
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
