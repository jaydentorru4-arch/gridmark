import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { AuthScreen } from './components/AuthScreen';
import { ChallengesView } from './components/ChallengesView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { HistoryView } from './components/HistoryView';
import { LeaderboardView } from './components/LeaderboardView';
import { PlayView } from './components/PlayView';
import { ProfileView } from './components/ProfileView';
import { auth } from './lib/firebase';
import {
  clearRoomCodeFromUrl,
  extractRoomCodeFromLocation,
  syncRoomCodeToUrl,
} from './lib/gameLogic';
import { soundFx } from './lib/sound';
import {
  getPrivateUser,
  joinGameRoom,
  resolveInviteCode,
  subscribeToGameRoom,
  subscribeToIncomingChallenges,
  subscribeToMyGames,
  subscribeToOpenRooms,
  subscribeToOutgoingChallenges,
  subscribeToPlayerProfile,
  subscribeToPlayers,
  updatePresence,
  updateSoundPreference,
} from './services/firestoreService';
import type { Challenge, GameRoom, NavTab, PlayerProfile } from './types/game';

function GridmarkApp() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [activeTab, setActiveTab] = useState<NavTab>('play');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string>(() =>
    extractRoomCodeFromLocation(),
  );
  const [inviteJoinError, setInviteJoinError] = useState('');

  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [openRooms, setOpenRooms] = useState<GameRoom[]>([]);
  const [myGames, setMyGames] = useState<GameRoom[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<Challenge[]>([]);

  const knownPendingOutgoingRef = useRef<Set<string>>(new Set());

  // 1. Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setProfileLoaded(false);
        setActiveGameId(null);
        setActiveRoom(null);
        setPlayers([]);
        setOpenRooms([]);
        setMyGames([]);
        setIncomingChallenges([]);
        setOutgoingChallenges([]);
      }
    });
    return unsub;
  }, []);

  // 2. Profile & private settings subscription (only when verified)
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    setProfileLoaded(false);
    const unsubProfile = subscribeToPlayerProfile(firebaseUser.uid, (data) => {
      setProfile(data);
      setProfileLoaded(true);
    });

    void getPrivateUser(firebaseUser.uid)
      .then((priv) => {
        if (priv) {
          setSoundEnabled(priv.soundEnabled);
          soundFx.setEnabled(priv.soundEnabled);
        }
      })
      .catch(() => {
        // Private doc may not exist yet before onboarding completes
      });

    return () => {
      unsubProfile();
    };
  }, [authReady, firebaseUser]);

  // 3. Presence heartbeat while active in lobby/game
  useEffect(() => {
    if (!profile) return;
    const uid = profile.uid;
    void updatePresence(uid, true);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updatePresence(uid, true);
      }
    }, 45_000);

    const handleVisibility = () => {
      void updatePresence(uid, document.visibilityState === 'visible');
    };
    const handleUnload = () => {
      void updatePresence(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [profile?.uid]);

  // 4. Core real-time subscriptions once profile is ready
  useEffect(() => {
    if (!profile) return;
    const uid = profile.uid;

    const unsubPlayers = subscribeToPlayers(setPlayers);
    const unsubOpen = subscribeToOpenRooms(setOpenRooms);
    const unsubMyGames = subscribeToMyGames(uid, setMyGames);
    const unsubIncoming = subscribeToIncomingChallenges(uid, setIncomingChallenges);
    const unsubOutgoing = subscribeToOutgoingChallenges(uid, (items) => {
      // Auto-enter room when a pending challenge we sent is accepted
      for (const ch of items) {
        if (
          ch.status === 'accepted' &&
          ch.gameId &&
          knownPendingOutgoingRef.current.has(ch.id)
        ) {
          knownPendingOutgoingRef.current.delete(ch.id);
          setActiveGameId(ch.gameId);
          setActiveTab('play');
        }
      }
      const nextPending = new Set<string>();
      for (const ch of items) {
        if (ch.status === 'pending') nextPending.add(ch.id);
      }
      knownPendingOutgoingRef.current = nextPending;
      setOutgoingChallenges(items);
    });

    return () => {
      unsubPlayers();
      unsubOpen();
      unsubMyGames();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [profile?.uid]);

  // 5. Active GameRoom subscription
  useEffect(() => {
    if (!profile || !activeGameId) {
      setActiveRoom(null);
      return;
    }

    const unsub = subscribeToGameRoom(activeGameId, (room) => {
      setActiveRoom(room);
      if (room?.inviteCode) {
        syncRoomCodeToUrl(room.inviteCode);
      }
    });
    return () => unsub();
  }, [profile?.uid, activeGameId]);

  // 6. Auto-join room from invite URL (?room=XXXXXX or /room/XXXXXX)
  useEffect(() => {
    if (!profile || !pendingInviteCode) return;
    const code = pendingInviteCode;
    setPendingInviteCode('');

    void (async () => {
      try {
        const gameId = await resolveInviteCode(code);
        await joinGameRoom(gameId, profile);
        setActiveGameId(gameId);
        setActiveTab('play');
      } catch (err) {
        setInviteJoinError(
          err instanceof Error ? err.message : `Could not join room ${code}.`,
        );
        clearRoomCodeFromUrl();
      }
    })();
  }, [profile, pendingInviteCode]);

  const handleOpenGame = useCallback((gameId: string) => {
    setInviteJoinError('');
    setActiveGameId(gameId);
    setActiveTab('play');
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setActiveGameId(null);
    setActiveRoom(null);
    clearRoomCodeFromUrl();
  }, []);

  const handleSelectTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== 'play') {
      // Preserve activeGameId in state if needed, or let user resume from Play
    }
  }, []);

  const handleToggleSound = useCallback(async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
    if (profile) {
      try {
        await updateSoundPreference(profile.uid, next);
      } catch {
        // Non-blocking preference save
      }
    }
  }, [soundEnabled, profile]);

  const onlinePlayers = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 1000;
    return players.filter((p) => {
      if (!p.isOnline) return false;
      const last = p.lastActiveAt?.toMillis() ?? 0;
      return last === 0 || last >= cutoff;
    });
  }, [players]);

  const myActiveGames = useMemo(
    () => myGames.filter((g) => g.status === 'waiting' || g.status === 'playing'),
    [myGames],
  );

  const pendingChallengesCount = useMemo(
    () => incomingChallenges.filter((c) => c.status === 'pending').length,
    [incomingChallenges],
  );

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <p className="font-display text-sm font-semibold text-slate-600">Loading Gridmark...</p>
      </div>
    );
  }

  // Unauthenticated, unverified email, or first-time profile setup
  if (!firebaseUser || !firebaseUser.emailVerified || (profileLoaded && !profile)) {
    return (
      <AuthScreen
        firebaseUser={firebaseUser}
        needsProfileSetup={Boolean(firebaseUser && firebaseUser.emailVerified && profileLoaded && !profile)}
        pendingInviteCode={pendingInviteCode}
        onProfileCreated={() => {
          setProfileLoaded(false);
        }}
      />
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <p className="font-display text-sm font-semibold text-slate-600">Loading player profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col pb-16 md:pb-10">
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        profile={profile}
        pendingChallengesCount={pendingChallengesCount}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8">
        {inviteJoinError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{inviteJoinError}</span>
            <button
              type="button"
              onClick={() => setInviteJoinError('')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'play' && (
          <PlayView
            currentUser={profile}
            activeRoom={activeRoom}
            openRooms={openRooms}
            myActiveGames={myActiveGames}
            onlinePlayers={onlinePlayers}
            outgoingChallenges={outgoingChallenges}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onOpenGame={handleOpenGame}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesView
            currentUser={profile}
            incomingChallenges={incomingChallenges}
            outgoingChallenges={outgoingChallenges}
            onEnterGame={handleOpenGame}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView players={players} currentUser={profile} />
        )}

        {activeTab === 'history' && (
          <HistoryView
            currentUser={profile}
            myGames={myGames}
            onOpenGame={handleOpenGame}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            email={firebaseUser.email || ''}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GridmarkApp />
    </ErrorBoundary>
  );
}
