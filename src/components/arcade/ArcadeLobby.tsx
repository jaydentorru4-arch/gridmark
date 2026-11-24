import { useState, type FormEvent } from 'react';
import { ArrowRight, LayoutGrid, Plus, Users } from 'lucide-react';
import { getCatalogEntry } from '../../data/arcadeCatalog';
import { formatRelativeTime, normalizeInviteCode } from '../../lib/gameLogic';
import {
  createArcadeRoom,
  joinArcadeRoom,
  resolveArcadeCode,
} from '../../services/arcadeService';
import type { ArcadeGameType, ArcadeRoom } from '../../types/arcade';
import type { GameVisibility, PlayerProfile } from '../../types/game';
import { AvatarBadge } from '../AvatarBadge';
import { GameIcon } from './GameIcon';

interface ArcadeLobbyProps {
  gameType: ArcadeGameType;
  currentUser: PlayerProfile;
  openRooms: ArcadeRoom[];
  myActiveRooms: ArcadeRoom[];
  onOpenRoom: (roomId: string) => void;
  onStartLocal: (p1Name: string, p2Name: string) => void;
  onOpenSwitcher: () => void;
}

export function ArcadeLobby({
  gameType,
  currentUser,
  openRooms,
  myActiveRooms,
  onOpenRoom,
  onStartLocal,
  onOpenSwitcher,
}: ArcadeLobbyProps) {
  const catalog = getCatalogEntry(gameType);
  const [visibility, setVisibility] = useState<GameVisibility>('public');
  const [joinCode, setJoinCode] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [localP1, setLocalP1] = useState(currentUser.displayName || 'Player 1');
  const [localP2, setLocalP2] = useState('Player 2');

  const gameOpenRooms = openRooms.filter(
    (r) => r.gameType === gameType && r.player1Uid !== currentUser.uid,
  );
  const gameActiveRooms = myActiveRooms.filter((r) => r.gameType === gameType);

  const handleCreateRoom = async () => {
    setErrorMsg('');
    setBusyCreate(true);
    try {
      const { roomId } = await createArcadeRoom(currentUser, gameType, visibility);
      onOpenRoom(roomId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setBusyCreate(false);
    }
  };

  const handleJoinByCode = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBusyJoin(true);
    try {
      const { roomId } = await resolveArcadeCode(joinCode);
      await joinArcadeRoom(roomId, currentUser);
      setJoinCode('');
      onOpenRoom(roomId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setBusyJoin(false);
    }
  };

  const handleJoinPublic = async (room: ArcadeRoom) => {
    setErrorMsg('');
    setJoiningId(room.id);
    try {
      await joinArcadeRoom(room.id, currentUser);
      onOpenRoom(room.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Header Banner */}
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl border-2 border-slate-900 ${catalog.accentBg} ${catalog.accentText} flex items-center justify-center shrink-0`}
          >
            <GameIcon gameId={gameType} className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {catalog.name}
              </h1>
              <span className="px-2 py-0.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 whitespace-nowrap">
                {catalog.shortTag}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">{catalog.description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSwitcher}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
        >
          <LayoutGrid className="w-4 h-4" />
          Switch Game
        </button>
      </div>

      {/* Main Online Lobby Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Create or Join */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Online {catalog.name} Match
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Open a public table or create a private 6-character code to invite a friend.
            </p>

            <div className="mt-5">
              <span className="block text-xs font-bold text-slate-700 mb-2">
                Room Visibility
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-xl border-2 border-slate-900/10">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    visibility === 'public'
                      ? 'bg-amber-300 text-slate-900 border border-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Public Lobby
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    visibility === 'private'
                      ? 'bg-amber-300 text-slate-900 border border-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Private Invite
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={busyCreate}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {busyCreate
                ? 'Creating Room...'
                : visibility === 'public'
                  ? `Create Public ${catalog.name} Room`
                  : `Create Private ${catalog.name} Room`}
            </button>
          </div>

          <div className="mt-7 pt-6 border-t-2 border-slate-100">
            <form onSubmit={handleJoinByCode} className="space-y-2.5">
              <label htmlFor="arcade-code-input" className="block text-xs font-bold text-slate-700">
                Join with Invite Code
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  id="arcade-code-input"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(normalizeInviteCode(e.target.value))}
                  placeholder="K7M9P2"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-50/40 font-mono text-sm font-bold tracking-widest uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={busyJoin || joinCode.length !== 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[2px] active:shadow-none disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {busyJoin ? 'Joining...' : 'Join'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {errorMsg && (
              <p className="mt-3 text-xs text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2 font-medium">
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        {/* Right: Active Rooms & Open Tables */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] flex flex-col">
          {gameActiveRooms.length > 0 && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h3 className="font-display text-base font-bold text-slate-900">
                Your Active {catalog.name} Rooms
              </h3>
              <div className="mt-3 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
                {gameActiveRooms.map((room) => {
                  const opponent =
                    room.player1Uid === currentUser.uid
                      ? room.player2Name || 'Waiting for player'
                      : room.player1Name;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {room.status === 'waiting' ? 'Open Room' : `vs ${opponent}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">
                            {room.inviteCode}
                          </span>
                          <span aria-hidden="true" className="mx-1.5">·</span>
                          {room.status === 'waiting'
                            ? 'Waiting for opponent'
                            : room.currentTurnUid === currentUser.uid
                              ? 'Your turn'
                              : room.currentTurnUid === ''
                                ? 'In progress'
                                : 'Opponent turn'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenRoom(room.id)}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Resume
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Open {catalog.name} Rooms
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Public tables waiting for an opponent
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              {gameOpenRooms.length} open
            </span>
          </div>

          {gameOpenRooms.length === 0 ? (
            <div className="mt-6 flex-1 min-h-[160px] rounded-xl border-2 border-dashed border-slate-300 bg-amber-50/40 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-bold text-slate-800">
                No open {catalog.name} rooms yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create a public room on the left or start Pass & Play below.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
              {gameOpenRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={room.player1Avatar} name={room.player1Name} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {room.player1Name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Code <span className="font-mono font-bold text-slate-700">{room.inviteCode}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {formatRelativeTime(room.createdAt?.toDate() ?? null)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinPublic(room)}
                    disabled={joiningId === room.id}
                    className="px-4 py-2 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {joiningId === room.id ? 'Joining...' : 'Join Match'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-Person Pass & Play Card */}
      <section className="bg-rose-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-rose-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Play {catalog.name} Together in Person (Pass & Play)
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Share one device with a friend right next to you — includes privacy shields for hidden-card and secret-word games.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              maxLength={24}
              value={localP1}
              onChange={(e) => setLocalP1(e.target.value)}
              placeholder="Player 1"
              aria-label="Player 1 name"
              className="w-36 px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900"
            />
            <span className="text-xs font-bold text-slate-500">vs</span>
            <input
              type="text"
              maxLength={24}
              value={localP2}
              onChange={(e) => setLocalP2(e.target.value)}
              placeholder="Player 2"
              aria-label="Player 2 name"
              className="w-36 px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900"
            />
            <button
              type="button"
              onClick={() => onStartLocal(localP1.trim() || 'Player 1', localP2.trim() || 'Player 2')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-rose-500 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-rose-600 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              Start Pass & Play
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
