import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  LayoutGrid,
  Link2,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { getCatalogEntry } from '../../data/arcadeCatalog';
import { generateArcadeShareUrl } from '../../services/arcadeService';
import type { ArcadeGameType, ArcadeMatchPlayer } from '../../types/arcade';
import { AvatarBadge } from '../AvatarBadge';
import { GameIcon } from './GameIcon';

interface ArcadeMatchShellProps {
  mode: 'online' | 'local';
  gameType: ArcadeGameType;
  inviteCode?: string;
  isWaiting?: boolean;
  isHost?: boolean;
  isFinished: boolean;
  winnerUid: string;
  resultSummary: string;
  rematchRoomId?: string;
  player1: ArcadeMatchPlayer;
  player2: ArcadeMatchPlayer;
  activeTurnLabel: string;
  soundEnabled: boolean;
  busy?: boolean;
  errorMsg?: string;
  onToggleSound: () => void;
  onCancelWaiting?: () => void;
  onRematch: () => void;
  onJoinRematch?: (roomId: string) => void;
  onLeave: () => void;
  onSwitchGame: () => void;
  children: ReactNode;
}

export function ArcadeMatchShell({
  mode,
  gameType,
  inviteCode = '',
  isWaiting = false,
  isHost = false,
  isFinished,
  winnerUid,
  resultSummary,
  rematchRoomId = '',
  player1,
  player2,
  activeTurnLabel,
  soundEnabled,
  busy = false,
  errorMsg = '',
  onToggleSound,
  onCancelWaiting,
  onRematch,
  onJoinRematch,
  onLeave,
  onSwitchGame,
  children,
}: ArcadeMatchShellProps) {
  const catalog = getCatalogEntry(gameType);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const handleCopy = async (kind: 'code' | 'link') => {
    if (!inviteCode) return;
    const text = kind === 'code' ? inviteCode : generateArcadeShareUrl(inviteCode);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      window.setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const winnerName =
    winnerUid === 'draw'
      ? ''
      : winnerUid === player1.uid
        ? player1.name
        : winnerUid === player2.uid
          ? player2.name
          : '';

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {mode === 'online' ? 'Back to Lobby' : 'Back'}
          </button>

          <button
            type="button"
            onClick={onSwitchGame}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-amber-300 text-xs font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Switch Game
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900">
            <GameIcon gameId={gameType} className="w-4 h-4" />
            <span>{catalog.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inviteCode && (
            <button
              type="button"
              onClick={() => handleCopy('code')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-amber-50 font-mono text-xs font-bold text-slate-900 cursor-pointer hover:bg-amber-100 whitespace-nowrap"
            >
              {copiedType === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              {inviteCode}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="p-2 rounded-xl border-2 border-slate-900 bg-white text-slate-800 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Waiting Room Banner */}
      {isWaiting && (
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Waiting for opponent to join {catalog.name}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Share this 6-character code or link with a friend to start playing in real time.
          </p>

          <div className="mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-900 bg-amber-100">
            <span className="font-mono text-2xl font-extrabold tracking-widest text-slate-900">
              {inviteCode}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleCopy('code')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 cursor-pointer whitespace-nowrap"
            >
              {copiedType === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedType === 'code' ? 'Code Copied' : 'Copy Code'}
            </button>
            <button
              type="button"
              onClick={() => handleCopy('link')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              {copiedType === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copiedType === 'link' ? 'Link Copied' : 'Copy Invite Link'}
            </button>
            {isHost && onCancelWaiting && (
              <button
                type="button"
                onClick={onCancelWaiting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-rose-600 text-xs font-bold hover:bg-rose-50 cursor-pointer whitespace-nowrap"
              >
                <XCircle className="w-4 h-4" />
                Cancel Room
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Match Players + Turn Strip */}
      {!isWaiting && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-4 bg-white border-2 border-slate-900 rounded-xl px-4 py-3 shadow-[0_3px_0_0_#0F172A] flex items-center gap-3 min-w-0">
              <AvatarBadge avatarId={player1.avatar} name={player1.name} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{player1.name}</p>
                <p className="text-xs font-semibold text-slate-500">Player 1</p>
              </div>
            </div>

            <div className="md:col-span-4 bg-amber-100 border-2 border-slate-900 rounded-xl px-4 py-3 shadow-[0_3px_0_0_#0F172A] flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isFinished ? 'Match Complete' : 'Status'}
              </span>
              <span className="font-display text-sm font-bold text-slate-900 mt-0.5">
                {isFinished
                  ? winnerUid === 'draw'
                    ? 'Draw Match!'
                    : `${winnerName || 'Winner'} Wins!`
                  : activeTurnLabel}
              </span>
            </div>

            <div className="md:col-span-4 bg-white border-2 border-slate-900 rounded-xl px-4 py-3 shadow-[0_3px_0_0_#0F172A] flex items-center justify-end gap-3 min-w-0">
              <div className="min-w-0 text-right">
                <p className="text-sm font-bold text-slate-900 truncate">{player2.name}</p>
                <p className="text-xs font-semibold text-slate-500">Player 2</p>
              </div>
              <AvatarBadge avatarId={player2.avatar} name={player2.name} />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Finished Banner */}
          {isFinished && (
            <div className="bg-emerald-50 border-2 border-slate-900 rounded-2xl p-5 shadow-[0_4px_0_0_#0F172A] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {winnerUid === 'draw'
                    ? 'Match Ended in a Draw'
                    : `${winnerName || 'Player'} Wins the Match!`}
                </h3>
                {resultSummary && (
                  <p className="text-sm text-slate-700 mt-0.5">{resultSummary}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {rematchRoomId && onJoinRematch ? (
                  <button
                    type="button"
                    onClick={() => onJoinRematch(rematchRoomId)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Join Rematch
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRematch}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-400 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Play Rematch
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSwitchGame}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 cursor-pointer whitespace-nowrap"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Switch Game
                </button>
              </div>
            </div>
          )}

          {/* Game Board Surface */}
          <div>{children}</div>
        </>
      )}
    </div>
  );
}
