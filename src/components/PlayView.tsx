import { useState, type FormEvent } from 'react';
import { ArrowRight, Bot, Plus, Swords, Users } from 'lucide-react';
import type { BotDifficulty } from '../lib/botAi';
import { formatRelativeTime, normalizeInviteCode } from '../lib/gameLogic';
import {
  createGameRoom,
  joinGameRoom,
  resolveInviteCode,
  sendChallenge,
} from '../services/firestoreService';
import type { Challenge, GameMark, GameRoom, GameVisibility, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';
import { BotGameBoard } from './BotGameBoard';
import { GameBoard } from './GameBoard';
import { LocalGameBoard } from './LocalGameBoard';

interface PlayViewProps {
  currentUser: PlayerProfile;
  activeRoom: GameRoom | null;
  openRooms: GameRoom[];
  myActiveGames: GameRoom[];
  onlinePlayers: PlayerProfile[];
  outgoingChallenges: Challenge[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenGame: (gameId: string) => void;
  onLeaveRoom: () => void;
}

export function PlayView({
  currentUser,
  activeRoom,
  openRooms,
  myActiveGames,
  onlinePlayers,
  outgoingChallenges,
  soundEnabled,
  onToggleSound,
  onOpenGame,
  onLeaveRoom,
}: PlayViewProps) {
  const [visibility, setVisibility] = useState<GameVisibility>('public');
  const [joinCode, setJoinCode] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [challengingUid, setChallengingUid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [challengeNotice, setChallengeNotice] = useState('');
  const [botMode, setBotMode] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('tactical');
  const [botPlayerMark, setBotPlayerMark] = useState<GameMark>('X');

  if (activeRoom) {
    return (
      <GameBoard
        room={activeRoom}
        currentUser={currentUser}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onOpenGame={onOpenGame}
        onLeaveToLobby={onLeaveRoom}
      />
    );
  }

  if (localMode) {
    return (
      <LocalGameBoard
        defaultPlayerOneName={currentUser.displayName}
        defaultPlayerOneAvatar={currentUser.avatarId}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onBack={() => setLocalMode(false)}
      />
    );
  }

  if (botMode) {
    return (
      <BotGameBoard
        playerName={currentUser.displayName}
        playerAvatar={currentUser.avatarId}
        initialDifficulty={botDifficulty}
        initialMark={botPlayerMark}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onBack={() => setBotMode(false)}
      />
    );
  }

  const handleCreateRoom = async () => {
    setErrorMsg('');
    setBusyCreate(true);
    try {
      const { gameId } = await createGameRoom(currentUser, visibility);
      onOpenGame(gameId);
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
      const gameId = await resolveInviteCode(joinCode);
      await joinGameRoom(gameId, currentUser);
      setJoinCode('');
      onOpenGame(gameId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setBusyJoin(false);
    }
  };

  const handleJoinPublicRoom = async (room: GameRoom) => {
    setErrorMsg('');
    setJoiningId(room.id);
    try {
      await joinGameRoom(room.id, currentUser);
      onOpenGame(room.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleSendChallenge = async (target: PlayerProfile) => {
    setErrorMsg('');
    setChallengeNotice('');
    setChallengingUid(target.uid);
    try {
      await sendChallenge(currentUser, target);
      setChallengeNotice(`Challenge sent to ${target.displayName}. You will enter the match automatically once they accept.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send challenge.');
    } finally {
      setChallengingUid(null);
    }
  };

  const availablePublicRooms = openRooms.filter((r) => r.playerXUid !== currentUser.uid);
  const pendingTargetUids = new Set(
    outgoingChallenges.filter((c) => c.status === 'pending').map((c) => c.targetUid),
  );
  const opponents = onlinePlayers.filter((p) => p.uid !== currentUser.uid);

  return (
    <div className="space-y-8">
      {/* Primary Two-Column Lobby */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Focal Anchor: Create or Join Room */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
              Jump into a live match
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Open a public table or generate a 6-character invite code for your friends.
            </p>

            {/* Visibility Segmented Control */}
            <div className="mt-6">
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
                  ? 'Create Public Room'
                  : 'Create Private Room'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-slate-100">
            <form onSubmit={handleJoinByCode} className="space-y-2.5">
              <label htmlFor="invite-code-input" className="block text-xs font-bold text-slate-700">
                Got an Invite Code?
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  id="invite-code-input"
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
            {challengeNotice && (
              <p className="mt-3 text-xs text-emerald-800 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3 py-2 font-medium">
                {challengeNotice}
              </p>
            )}
          </div>
        </div>

        {/* Right: Open Public Rooms & Resume Active Matches */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] flex flex-col">
          {myActiveGames.length > 0 && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Your Active Rooms
              </h2>
              <div className="mt-3 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
                {myActiveGames.map((game) => {
                  const opponentName =
                    game.playerXUid === currentUser.uid
                      ? game.playerOName || 'Waiting for opponent'
                      : game.playerXName;
                  const myTurn =
                    game.status === 'playing' &&
                    ((game.currentTurn === 'X' && game.playerXUid === currentUser.uid) ||
                      (game.currentTurn === 'O' && game.playerOUid === currentUser.uid));
                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {game.status === 'waiting' ? 'Open Room' : `vs ${opponentName}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">{game.inviteCode}</span>
                          <span aria-hidden="true" className="mx-1.5">·</span>
                          {game.status === 'waiting'
                            ? 'Waiting for player'
                            : myTurn
                              ? 'Your turn'
                              : 'Opponent turn'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenGame(game.id)}
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
              <h2 className="font-display text-lg font-bold text-slate-900">
                Open Lobby Rooms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Public tables ready for an opponent
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              {availablePublicRooms.length} open
            </span>
          </div>

          {availablePublicRooms.length === 0 ? (
            <div className="mt-6 flex-1 min-h-[180px] rounded-xl border-2 border-dashed border-slate-300 bg-amber-50/40 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-bold text-slate-800">No open public rooms right now</p>
              <p className="mt-1 text-xs text-slate-500">
                Create a public room on the left or challenge an online player below.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
              {availablePublicRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={room.playerXAvatar} name={room.playerXName} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {room.playerXName}
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
                    onClick={() => handleJoinPublicRoom(room)}
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

      {/* Offline Modes: Pass & Play + Solo vs Bot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* In-person Friend Pass & Play */}
        <section className="lg:col-span-5 bg-rose-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-rose-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Play Together in Person
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
              Hand the device back and forth with a friend right next to you. Custom player names and round scoreboard included.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocalMode(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-900 bg-rose-500 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-rose-600 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            Start Pass & Play
          </button>
        </section>

        {/* Solo Practice vs Bot */}
        <section className="lg:col-span-7 bg-sky-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-blue-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Practice Alone vs Bot
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
              Play solo against our arcade AI — pick your difficulty and mark without risking ranked points.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white border-2 border-slate-900 rounded-xl">
              {(['casual', 'tactical', 'unbeatable'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setBotDifficulty(level)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize cursor-pointer transition-colors whitespace-nowrap ${
                    botDifficulty === level
                      ? 'bg-amber-300 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border-2 border-slate-900 rounded-xl">
              {(['X', 'O'] as const).map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => setBotPlayerMark(mark)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                    botPlayerMark === mark
                      ? 'bg-amber-300 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Play {mark}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setBotMode(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-100 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
            >
              <Bot className="w-4 h-4" />
              Play vs Bot
            </button>
          </div>
        </section>
      </div>

      {/* Online Players Directory for Direct Challenges */}
      <section className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Players Online
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Send a direct match challenge to any active player
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {opponents.length} available
          </span>
        </div>

        {opponents.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No other players are currently active in the lobby. Share a room invite link to invite friends.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opponents.map((player) => {
              const alreadyChallenged = pendingTargetUids.has(player.uid);
              return (
                <div
                  key={player.uid}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-slate-900 bg-white shadow-[0_3px_0_0_#0F172A]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={player.avatarId} name={player.displayName} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {player.displayName}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums truncate">
                        @{player.username}
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {player.wins}W-{player.losses}L-{player.draws}D
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyChallenged || challengingUid === player.uid}
                    onClick={() => handleSendChallenge(player)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      alreadyChallenged
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : 'bg-amber-300 text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    {alreadyChallenged
                      ? 'Pending'
                      : challengingUid === player.uid
                        ? 'Sending...'
                        : 'Challenge'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
