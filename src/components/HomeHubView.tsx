import { useState } from 'react';
import { ArrowRight, Bot, Compass, Gamepad2, Globe, Play, Users } from 'lucide-react';
import { GAME_CATALOG } from '../data/arcadeCatalog';
import type { AllGameId, ArcadeRoom } from '../types/arcade';
import type { PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';
import { GameIcon } from './arcade/GameIcon';

interface HomeHubViewProps {
  currentUser: PlayerProfile;
  openArcadeRooms: ArcadeRoom[];
  onlinePlayers: PlayerProfile[];
  onSelectGame: (gameId: AllGameId) => void;
  onOpenRoom: (roomId: string) => void;
  onStartLocalQuick: () => void;
  onStartBotQuick: () => void;
}

export function HomeHubView({
  currentUser,
  openArcadeRooms,
  onlinePlayers,
  onSelectGame,
  onOpenRoom,
  onStartBotQuick,
}: HomeHubViewProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'strategy' | 'quick' | 'card' | 'classic'>('all');

  const filteredGames = GAME_CATALOG.filter((game) => {
    if (filterCategory === 'strategy') return ['chess', 'checkers', 'reversi', 'dotsboxes'].includes(game.id);
    if (filterCategory === 'quick') return ['tictactoe', 'connect4', 'rps'].includes(game.id);
    if (filterCategory === 'card') return ['crazyeights', 'wordguess', 'hangman'].includes(game.id);
    if (filterCategory === 'classic') return ['tictactoe', 'battleship', 'chess'].includes(game.id);
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome & Quick Launch Banner */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 p-6 sm:p-10 shadow-[0_6px_0_0_#0F172A]">
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <Gamepad2 className="w-64 h-64 text-slate-900" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Choose your game. Play online or solo.
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
            Welcome back, <span className="font-bold text-slate-900">{currentUser.displayName}</span>! Jump into real-time online matches, practice against unbeatable AI bots, or pass &amp; play in person.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectGame('chess')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none cursor-pointer transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              Play Featured Chess
            </button>

            <button
              type="button"
              onClick={onStartBotQuick}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-900 bg-white text-slate-900 text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[2px] active:shadow-none cursor-pointer transition-all"
            >
              <Bot className="w-4 h-4 text-blue-600" />
              Quick Solo vs Bot
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600" />
            Game Library ({GAME_CATALOG.length} Games)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Select any game below to open its dedicated match lobby and tables.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border-2 border-slate-900 rounded-2xl shadow-[0_2px_0_0_#0F172A] overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Games' },
              { id: 'strategy', label: 'Strategy' },
              { id: 'quick', label: 'Quick' },
              { id: 'card', label: 'Word & Card' },
              { id: 'classic', label: 'Classic' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                filterCategory === cat.id
                  ? 'bg-amber-300 text-slate-900 border border-slate-900 shadow-[0_1px_0_0_#0F172A]'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 11-Game Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGames.map((game) => {
          const gameRoomsCount = openArcadeRooms.filter((r) => r.gameType === game.id).length;
          return (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className="group relative bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_4px_0_0_#0F172A] hover:shadow-[0_6px_0_0_#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-[0_2px_0_0_#0F172A] transition-all cursor-pointer flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl border-2 border-slate-900 ${game.accentBg} ${game.accentText} flex items-center justify-center shrink-0 shadow-[0_2px_0_0_#0F172A] group-hover:scale-105 transition-transform`}
                  >
                    <GameIcon gameId={game.id} className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      {game.shortTag}
                    </span>
                    {gameRoomsCount > 0 && (
                      <span className="px-2 py-1 rounded-lg border border-slate-900 bg-emerald-400 text-slate-900 text-[11px] font-extrabold whitespace-nowrap shadow-[0_1px_0_0_#0F172A]">
                        {gameRoomsCount} online
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 font-display text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {game.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {game.description}
                </p>
              </div>

              <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="inline-flex items-center gap-1.5 text-blue-600 group-hover:translate-x-1 transition-transform">
                  Play Lobby &amp; Tables
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  2 Players
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Live Activity Feed: Open Tables Across All Games & Online Players */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-4">
        {/* Open Online Rooms Across All Games */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-100">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Live Open Tables Online
              </h3>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-900 bg-amber-100 text-slate-900 tabular-nums">
              {openArcadeRooms.length} active
            </span>
          </div>

          {openArcadeRooms.length === 0 ? (
            <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-bold text-slate-800">No open public rooms right now</p>
              <p className="text-xs text-slate-500 mt-1">
                Select any game above to create a public room and invite opponents instantly!
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
              {openArcadeRooms.map((room) => {
                const catalogEntry = GAME_CATALOG.find((g) => g.id === room.gameType) || GAME_CATALOG[0];
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg border-2 border-slate-900 ${catalogEntry.accentBg} ${catalogEntry.accentText} flex items-center justify-center shrink-0`}>
                        <GameIcon gameId={room.gameType} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {room.player1Name}
                          </p>
                          <span className="px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-700">
                            {catalogEntry.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Code <span className="font-mono font-bold text-slate-700">{room.inviteCode}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGame(room.gameType);
                        onOpenRoom(room.id);
                      }}
                      className="px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Join Match
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Online Players Summary */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-100">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Lobby Activity
              </h3>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-900 bg-emerald-100 text-emerald-900 tabular-nums">
              {onlinePlayers.length} online
            </span>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {onlinePlayers.slice(0, 5).map((p) => (
                <div key={p.uid} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarBadge avatarId={p.avatarId} name={p.displayName} size="sm" />
                    <span className="text-xs font-bold text-slate-900 truncate">{p.displayName}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
                    {p.points} pts
                  </span>
                </div>
              ))}
              {onlinePlayers.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No players online right now.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onStartBotQuick}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                Practice vs Bot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
