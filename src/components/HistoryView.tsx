import { useMemo, useState } from 'react';
import { formatRelativeTime } from '../lib/gameLogic';
import type { GameRoom, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface HistoryViewProps {
  currentUser: PlayerProfile;
  myGames: GameRoom[];
  onOpenGame: (gameId: string) => void;
}

type HistoryFilter = 'all' | 'win' | 'loss' | 'draw';

function MiniBoard({ board, winningLine }: { board: GameRoom['board']; winningLine: number[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-16 h-16 p-1.5 bg-amber-100/80 border-2 border-slate-900 rounded-xl shrink-0">
      {board.map((cell, idx) => {
        const isWin = winningLine.includes(idx);
        return (
          <div
            key={idx}
            className={`rounded-[4px] border border-slate-900/20 flex items-center justify-center text-[10px] font-display font-bold ${
              isWin
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-white text-slate-700'
            }`}
          >
            <span
              className={
                cell === 'X' ? 'text-rose-500' : cell === 'O' ? 'text-blue-600' : ''
              }
            >
              {cell}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HistoryView({ currentUser, myGames, onOpenGame }: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const finishedGames = useMemo(() => {
    return myGames.filter((g) => g.status === 'finished');
  }, [myGames]);

  const filteredGames = useMemo(() => {
    return finishedGames.filter((g) => {
      if (filter === 'all') return true;
      if (filter === 'draw') return g.winner === 'draw';
      if (filter === 'win') return g.winnerUid === currentUser.uid;
      return g.winner !== 'draw' && g.winnerUid !== currentUser.uid;
    });
  }, [finishedGames, filter, currentUser.uid]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Match History</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review every completed match, opponent, mark assignment, and final board state.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1.5 bg-white border-2 border-slate-900 rounded-xl shadow-[0_3px_0_0_#0F172A]">
          {(['all', 'win', 'loss', 'draw'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize cursor-pointer transition-colors ${
                filter === key
                  ? 'bg-amber-300 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {key === 'all' ? 'All' : key === 'win' ? 'Wins' : key === 'loss' ? 'Losses' : 'Draws'}
            </button>
          ))}
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[0_5px_0_0_#0F172A] p-10 text-center">
          <p className="text-sm font-bold text-slate-900">
            {finishedGames.length === 0 ? 'No completed matches yet' : 'No matches match this filter'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Finish a game in the Play lobby to record your first match result here.
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[0_5px_0_0_#0F172A] divide-y-2 divide-slate-100 overflow-hidden">
          {filteredGames.map((game) => {
            const iAmX = game.playerXUid === currentUser.uid;
            const opponentName = iAmX ? game.playerOName : game.playerXName;
            const opponentAvatar = iAmX ? game.playerOAvatar : game.playerXAvatar;
            const myMark = iAmX ? 'X' : 'O';

            let outcomeLabel = 'Draw';
            let outcomeColor = 'text-slate-600';
            if (game.winner !== 'draw') {
              if (game.winnerUid === currentUser.uid) {
                outcomeLabel = 'Victory';
                outcomeColor = 'text-emerald-700';
              } else {
                outcomeLabel = 'Defeat';
                outcomeColor = 'text-rose-700';
              }
            }

            return (
              <div
                key={game.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <MiniBoard board={game.board} winningLine={game.winningLine} />
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={opponentAvatar} name={opponentName || 'Opponent'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        vs {opponentName || 'Opponent'}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Played as <span className="font-semibold text-slate-700">{myMark}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {game.moveCount} moves
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        Room <span className="font-mono">{game.inviteCode}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {formatRelativeTime((game.finishedAt ?? game.updatedAt)?.toDate() ?? null)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <span className={`text-sm font-bold ${outcomeColor}`}>{outcomeLabel}</span>
                  <button
                    type="button"
                    onClick={() => onOpenGame(game.id)}
                    className="px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-100 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
