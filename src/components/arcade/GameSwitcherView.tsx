import { ArrowLeft, Check } from 'lucide-react';
import { GAME_CATALOG } from '../../data/arcadeCatalog';
import type { AllGameId } from '../../types/arcade';
import { GameIcon } from './GameIcon';

interface GameSwitcherViewProps {
  selectedGame: AllGameId;
  onSelectGame: (gameId: AllGameId) => void;
  onClose: () => void;
}

export function GameSwitcherView({
  selectedGame,
  onSelectGame,
  onClose,
}: GameSwitcherViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
              Switch Game
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose any of the 11 multiplayer games below. Switch anytime without losing your session.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Game
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_CATALOG.map((game) => {
            const isActive = game.id === selectedGame;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGame(game.id)}
                className={`text-left p-5 rounded-2xl border-2 border-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  isActive
                    ? 'bg-amber-50 shadow-[0_5px_0_0_#0F172A] ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white shadow-[0_4px_0_0_#0F172A] hover:bg-amber-50/50 active:translate-y-[2px] active:shadow-none'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl border-2 border-slate-900 ${game.accentBg} ${game.accentText} flex items-center justify-center shrink-0`}
                    >
                      <GameIcon gameId={game.id} className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {game.shortTag}
                      </span>
                      {isActive && (
                        <span className="w-6 h-6 rounded-lg border-2 border-slate-900 bg-emerald-400 text-slate-900 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
                    {game.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className={isActive ? 'text-blue-700' : 'text-slate-700'}>
                    {isActive ? 'Currently Selected' : 'Play Now →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
