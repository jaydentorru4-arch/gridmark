import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Flag, Link2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { generateRoomShareUrl } from '../lib/gameLogic';
import { soundFx } from '../lib/sound';
import {
  cancelWaitingRoom,
  createRematchGame,
  makeMoveTransaction,
  resignGameTransaction,
} from '../services/firestoreService';
import type { GameRoom, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';
import { MatchChatPanel } from './chat/MatchChatPanel';

interface GameBoardProps {
  room: GameRoom;
  currentUser: PlayerProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenGame: (gameId: string) => void;
  onLeaveToLobby: () => void;
}

function MarkSvg({ mark, muted = false }: { mark: 'X' | 'O'; muted?: boolean }) {
  if (mark === 'X') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`w-12 h-12 sm:w-14 sm:h-14 ${muted ? 'text-rose-500 opacity-30' : 'text-rose-500 animate-mark'}`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M16 16L48 48M48 16L16 48"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={`w-12 h-12 sm:w-14 sm:h-14 ${muted ? 'text-blue-600 opacity-30' : 'text-blue-600 animate-mark'}`}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth="8.5" />
    </svg>
  );
}

export function GameBoard({
  room,
  currentUser,
  soundEnabled,
  onToggleSound,
  onOpenGame,
  onLeaveToLobby,
}: GameBoardProps) {
  const [submittingMove, setSubmittingMove] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [actionError, setActionError] = useState('');

  const prevMoveCountRef = useRef<number>(room.moveCount);
  const prevStatusRef = useRef<string>(room.status);

  useEffect(() => {
    if (room.moveCount > prevMoveCountRef.current) {
      const playedMark = room.moveCount % 2 === 1 ? 'X' : 'O';
      if (room.status === 'finished') {
        if (room.winner === 'draw') {
          soundFx.playDraw();
        } else {
          soundFx.playWin();
        }
      } else {
        soundFx.playMove(playedMark);
      }
    } else if (prevStatusRef.current === 'playing' && room.status === 'finished') {
      soundFx.playWin();
    }
    prevMoveCountRef.current = room.moveCount;
    prevStatusRef.current = room.status;
  }, [room.moveCount, room.status, room.winner]);

  const myMark: 'X' | 'O' | null =
    room.playerXUid === currentUser.uid
      ? 'X'
      : room.playerOUid === currentUser.uid
        ? 'O'
        : null;

  const isMyTurn = room.status === 'playing' && myMark !== null && room.currentTurn === myMark;
  const isWaiting = room.status === 'waiting';
  const isFinished = room.status === 'finished';
  const isAbandoned = room.status === 'abandoned';

  const handleCopy = async (type: 'code' | 'link') => {
    const value = type === 'code' ? room.inviteCode : generateRoomShareUrl(room.inviteCode);
    try {
      await navigator.clipboard.writeText(value);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setActionError('Clipboard copy was blocked by your browser.');
    }
  };

  const handleCellClick = async (index: number) => {
    if (!isMyTurn || submittingMove || room.board[index] !== '') return;
    setActionError('');
    setSubmittingMove(true);
    try {
      await makeMoveTransaction(room.id, index, currentUser.uid);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not place mark.');
    } finally {
      setSubmittingMove(false);
    }
  };

  const handleResign = async () => {
    setActionError('');
    try {
      await resignGameTransaction(room.id, currentUser.uid);
      setConfirmResign(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not resign match.');
    }
  };

  const handleCancelRoom = async () => {
    setActionError('');
    try {
      await cancelWaitingRoom(room.id);
      onLeaveToLobby();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel room.');
    }
  };

  const handleRematch = async () => {
    if (room.rematchGameId) {
      onOpenGame(room.rematchGameId);
      return;
    }
    setActionError('');
    setRematchBusy(true);
    try {
      const nextGameId = await createRematchGame(room, currentUser.uid);
      onOpenGame(nextGameId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start rematch.');
    } finally {
      setRematchBusy(false);
    }
  };

  let statusHeadline = '';
  let statusDetail = '';
  let statusTone = 'border-slate-900 bg-white text-slate-900';

  if (isWaiting) {
    statusHeadline = 'Waiting for your opponent...';
    statusDetail = `Share invite code ${room.inviteCode} or send the link`;
    statusTone = 'border-slate-900 bg-amber-50 text-slate-900';
  } else if (isAbandoned) {
    statusHeadline = 'Room closed';
    statusDetail = 'This waiting room was cancelled before the match started';
    statusTone = 'border-slate-900 bg-slate-100 text-slate-700';
  } else if (isFinished) {
    if (room.winner === 'draw') {
      statusHeadline = "It's a draw!";
      statusDetail = 'Both players earn +1 leaderboard point';
      statusTone = 'border-slate-900 bg-amber-100 text-slate-900';
    } else if (room.winnerUid === currentUser.uid) {
      statusHeadline = 'Victory! You took the match';
      statusDetail =
        room.winningLine.length === 0
          ? 'Opponent resigned · +3 leaderboard points'
          : 'Three in a row · +3 leaderboard points';
      statusTone = 'border-slate-900 bg-emerald-100 text-emerald-950';
    } else {
      const winnerName = room.winner === 'X' ? room.playerXName : room.playerOName;
      statusHeadline = `${winnerName} wins this round`;
      statusDetail =
        room.winningLine.length === 0
          ? 'Match concluded by resignation'
          : `${room.winner} completed a winning line`;
      statusTone = 'border-slate-900 bg-rose-100 text-rose-950';
    }
  } else if (isMyTurn) {
    statusHeadline = `Your move! Place ${myMark}`;
    statusDetail = `Move ${room.moveCount + 1} of 9`;
    statusTone =
      myMark === 'X'
        ? 'border-slate-900 bg-rose-50 text-rose-950'
        : 'border-slate-900 bg-sky-50 text-sky-950';
  } else {
    const turnOwner = room.currentTurn === 'X' ? room.playerXName : room.playerOName;
    statusHeadline = `Waiting for ${turnOwner || 'opponent'}...`;
    statusDetail = `${room.currentTurn} to move · Move ${room.moveCount + 1} of 9`;
    statusTone = 'border-slate-900 bg-white text-slate-900';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Arena Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onLeaveToLobby}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lobby
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">
            Room <span className="font-mono font-bold text-slate-900">{room.inviteCode}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            {room.visibility === 'public' ? 'Public' : 'Private'}
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            className="p-2 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 cursor-pointer"
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Arena Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center: Board & Status */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
          {/* Status Banner */}
          <div className={`rounded-xl border-2 px-4 py-3 mb-6 ${statusTone}`}>
            <p className="font-display text-lg font-bold">{statusHeadline}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{statusDetail}</p>
          </div>

          {/* 3x3 Precision Board */}
          <div
            className="max-w-sm mx-auto bg-amber-100/80 border-2 border-slate-900 rounded-2xl p-3.5 grid grid-cols-3 gap-3 shadow-[0_5px_0_0_#0F172A]"
            role="grid"
            aria-label="Tic-Tac-Toe Board"
          >
            {room.board.map((cell, idx) => {
              const isWinningCell = room.winningLine.includes(idx);
              const canPlace = isMyTurn && cell === '' && !submittingMove;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canPlace}
                  onClick={() => handleCellClick(idx)}
                  aria-label={`Row ${Math.floor(idx / 3) + 1} Column ${(idx % 3) + 1}: ${
                    cell === '' ? 'Empty' : cell
                  }`}
                  className={`group aspect-square min-h-[88px] sm:min-h-[108px] rounded-xl border-2 border-slate-900 flex items-center justify-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    isWinningCell
                      ? 'bg-emerald-100 shadow-[0_3px_0_0_#0F172A]'
                      : cell !== ''
                        ? 'bg-white shadow-[0_2px_0_0_#0F172A]'
                        : canPlace
                          ? 'bg-white shadow-[0_4px_0_0_#0F172A] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_0_#0F172A] cursor-pointer'
                          : 'bg-white/75 cursor-default'
                  }`}
                >
                  {cell !== '' ? (
                    <MarkSvg mark={cell} />
                  ) : canPlace && myMark ? (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <MarkSvg mark={myMark} muted />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {actionError && (
            <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2">
              {actionError}
            </p>
          )}

          {/* Post-game or Waiting Room Action Footer */}
          {isWaiting && (
            <div className="mt-6 pt-6 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopy('code')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-900 shadow-[0_3px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedType === 'code' ? 'Code Copied' : `Copy Code: ${room.inviteCode}`}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('link')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-blue-600 text-sm font-bold text-white shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {copiedType === 'link' ? 'Link Copied' : 'Copy Invite Link'}
                </button>
              </div>
              {room.hostUid === currentUser.uid && (
                <button
                  type="button"
                  onClick={handleCancelRoom}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer whitespace-nowrap"
                >
                  Cancel Room
                </button>
              )}
            </div>
          )}

          {room.status === 'playing' && myMark !== null && (
            <div className="mt-6 pt-5 border-t-2 border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                Move {room.moveCount} of 9
              </span>
              {!confirmResign ? (
                <button
                  type="button"
                  onClick={() => setConfirmResign(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer whitespace-nowrap"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Resign Match
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResign(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Keep Playing
                  </button>
                  <button
                    type="button"
                    onClick={handleResign}
                    className="px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
                  >
                    Confirm Resign
                  </button>
                </div>
              )}
            </div>
          )}

          {isFinished && (
            <div className="mt-6 pt-6 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRematch}
                disabled={rematchBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                {room.rematchGameId
                  ? 'Join Rematch Room'
                  : rematchBusy
                    ? 'Starting Rematch...'
                    : 'Play Rematch'}
              </button>
              <button
                type="button"
                onClick={onLeaveToLobby}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-900 shadow-[0_3px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
              >
                Return to Lobby
              </button>
            </div>
          )}
        </div>

        {/* Right: Players & Match Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A] space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">Players</h2>

            {/* Player X */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                room.status === 'playing' && room.currentTurn === 'X'
                  ? 'border-slate-900 bg-rose-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarBadge avatarId={room.playerXAvatar} name={room.playerXName} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {room.playerXName}
                    {room.playerXUid === currentUser.uid ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    Plays first{room.status === 'playing' && room.currentTurn === 'X' ? ' · Active turn' : ''}
                  </p>
                </div>
              </div>
              <span className="font-display text-2xl font-bold text-rose-500 shrink-0">X</span>
            </div>

            {/* Player O */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                room.status === 'playing' && room.currentTurn === 'O'
                  ? 'border-slate-900 bg-sky-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {room.playerOUid ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={room.playerOAvatar} name={room.playerOName} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {room.playerOName}
                        {room.playerOUid === currentUser.uid ? ' (You)' : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        Plays second{room.status === 'playing' && room.currentTurn === 'O' ? ' · Active turn' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-display text-2xl font-bold text-blue-600 shrink-0">O</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 bg-amber-50 flex items-center justify-center text-slate-500 font-display font-bold">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Open Seat</p>
                      <p className="text-xs text-slate-500">Waiting for opponent</p>
                    </div>
                  </div>
                  <span className="font-display text-2xl font-bold text-blue-600/40 shrink-0">O</span>
                </>
              )}
            </div>
          </div>

          {/* Share Invite Card */}
          <div className="bg-amber-50 border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
            <h3 className="font-display text-sm font-bold text-slate-900">Invite Details</h3>
            <p className="mt-1 text-xs text-slate-700 leading-relaxed">
              Send this room code or direct URL to a friend to jump right in.
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white border-2 border-slate-900">
              <span className="font-mono text-lg font-bold tracking-widest text-slate-900">
                {room.inviteCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy('link')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                {copiedType === 'link' ? 'Copied Link' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* In-Game Real-Time Match Chat */}
          <MatchChatPanel
            roomCollection="games"
            roomId={room.id}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
}
