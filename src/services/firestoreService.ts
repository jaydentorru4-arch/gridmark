import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  evaluateBoard,
  generateInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from '../lib/gameLogic';
import type {
  AvatarId,
  BannerThemeId,
  CellValue,
  Challenge,
  EmblemIconId,
  GameRoom,
  GameVisibility,
  PlayerProfile,
  PrivateUser,
} from '../types/game';

function computeNextStats(
  player: PlayerProfile,
  outcome: 'win' | 'loss' | 'draw',
  matchId: string,
) {
  const wins = player.wins + (outcome === 'win' ? 1 : 0);
  const losses = player.losses + (outcome === 'loss' ? 1 : 0);
  const draws = player.draws + (outcome === 'draw' ? 1 : 0);
  const gamesPlayed = player.gamesPlayed + 1;
  const points = wins * 3 + draws;
  const winStreak = outcome === 'win' ? player.winStreak + 1 : 0;
  const bestStreak = Math.max(player.bestStreak, winStreak);

  return {
    wins,
    losses,
    draws,
    gamesPlayed,
    points,
    winStreak,
    bestStreak,
    lastMatchId: matchId,
    updatedAt: serverTimestamp(),
  };
}

async function allocateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateInviteCode();
    const codeSnap = await getDoc(doc(db, 'roomCodes', code));
    if (!codeSnap.exists()) {
      return code;
    }
  }
  return generateInviteCode();
}

export async function getPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  const path = `players/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    if (!snap.exists()) return null;
    return snap.data() as PlayerProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getPrivateUser(uid: string): Promise<PrivateUser | null> {
  const path = `privateUsers/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'privateUsers', uid));
    if (!snap.exists()) return null;
    return snap.data() as PrivateUser;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function registerPlayerProfile(
  uid: string,
  email: string,
  input: {
    username: string;
    displayName: string;
    avatarId: AvatarId;
    bio: string;
  },
): Promise<void> {
  const path = `players/${uid}`;
  try {
    const batch = writeBatch(db);
    const playerRef = doc(db, 'players', uid);
    const privateRef = doc(db, 'privateUsers', uid);

    batch.set(playerRef, {
      uid,
      username: input.username.trim(),
      displayName: input.displayName.trim(),
      avatarId: input.avatarId,
      bio: input.bio.trim(),
      emblemIcon: 'letter',
      bannerTheme: 'classic',
      playerTitle: '',
      visibility: 'public',
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      points: 0,
      winStreak: 0,
      bestStreak: 0,
      lastMatchId: '',
      isOnline: true,
      lastActiveAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(privateRef, {
      uid,
      email: email.trim() || 'player@gridmark.app',
      soundEnabled: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePlayerProfile(
  uid: string,
  input: {
    username: string;
    displayName: string;
    avatarId: AvatarId;
    bio: string;
    emblemIcon?: EmblemIconId;
    bannerTheme?: BannerThemeId;
    playerTitle?: string;
  },
): Promise<void> {
  const path = `players/${uid}`;
  try {
    await updateDoc(doc(db, 'players', uid), {
      username: input.username.trim(),
      displayName: input.displayName.trim(),
      avatarId: input.avatarId,
      bio: input.bio.trim(),
      emblemIcon: input.emblemIcon ?? 'letter',
      bannerTheme: input.bannerTheme ?? 'classic',
      playerTitle: (input.playerTitle ?? '').trim().slice(0, 24),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePresence(uid: string, isOnline: boolean): Promise<void> {
  const path = `players/${uid}`;
  try {
    await updateDoc(doc(db, 'players', uid), {
      isOnline,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking presence update
  }
}

export async function updateSoundPreference(uid: string, soundEnabled: boolean): Promise<void> {
  const path = `privateUsers/${uid}`;
  try {
    await updateDoc(doc(db, 'privateUsers', uid), {
      soundEnabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createGameRoom(
  player: PlayerProfile,
  visibility: GameVisibility,
): Promise<{ gameId: string; inviteCode: string }> {
  const gamesCol = collection(db, 'games');
  const gameRef = doc(gamesCol);
  const path = `games/${gameRef.id}`;
  try {
    const inviteCode = await allocateUniqueInviteCode();
    const batch = writeBatch(db);

    batch.set(gameRef, {
      inviteCode,
      visibility,
      isPublicOpen: visibility === 'public',
      status: 'waiting',
      hostUid: player.uid,
      playerXUid: player.uid,
      playerXName: player.displayName,
      playerXAvatar: player.avatarId,
      playerOUid: '',
      playerOName: '',
      playerOAvatar: '',
      participantUids: [player.uid],
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'X',
      moveCount: 0,
      winner: '',
      winnerUid: '',
      winningLine: [],
      rematchGameId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: null,
    });

    batch.set(doc(db, 'roomCodes', inviteCode), {
      gameId: gameRef.id,
      hostUid: player.uid,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { gameId: gameRef.id, inviteCode };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function resolveInviteCode(rawCode: string): Promise<string> {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeFormat(code)) {
    throw new Error('Invite codes must be 6 letters or numbers.');
  }
  const path = `roomCodes/${code}`;
  let snap;
  try {
    snap = await getDoc(doc(db, 'roomCodes', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
  if (!snap.exists()) {
    throw new Error(`No room found with invite code "${code}".`);
  }
  return (snap.data() as { gameId: string }).gameId;
}

export async function joinGameRoom(gameId: string, player: PlayerProfile): Promise<void> {
  const path = `games/${gameId}`;
  try {
    await runTransaction(db, async (tx) => {
      const gameRef = doc(db, 'games', gameId);
      const snap = await tx.get(gameRef);
      if (!snap.exists()) {
        throw new Error('This game room no longer exists.');
      }
      const data = snap.data() as Omit<GameRoom, 'id'>;
      if (data.participantUids.includes(player.uid)) {
        return; // Already a participant
      }
      if (data.status !== 'waiting') {
        throw new Error('This game room is already full or has finished.');
      }
      tx.update(gameRef, {
        playerOUid: player.uid,
        playerOName: player.displayName,
        playerOAvatar: player.avatarId,
        participantUids: [data.playerXUid, player.uid],
        status: 'playing',
        isPublicOpen: false,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('no longer exists') || error.message.includes('already full'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function makeMoveTransaction(
  gameId: string,
  cellIndex: number,
  currentUid: string,
): Promise<{ finished: boolean; winner: GameRoom['winner'] }> {
  const path = `games/${gameId}`;
  try {
    return await runTransaction(db, async (tx) => {
      const gameRef = doc(db, 'games', gameId);
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists()) {
        throw new Error('Game room not found.');
      }
      const game = gameSnap.data() as Omit<GameRoom, 'id'>;
      if (game.status !== 'playing') {
        throw new Error('Match is not currently active.');
      }
      const expectedUid = game.currentTurn === 'X' ? game.playerXUid : game.playerOUid;
      if (expectedUid !== currentUid) {
        throw new Error('It is not your turn.');
      }
      if (cellIndex < 0 || cellIndex > 8 || game.board[cellIndex] !== '') {
        throw new Error('That square is already occupied.');
      }

      const nextBoard = [...game.board] as CellValue[];
      nextBoard[cellIndex] = game.currentTurn;
      const evaluation = evaluateBoard(nextBoard);
      const nextMoveCount = game.moveCount + 1;

      if (evaluation.isFinished) {
        const playerXRef = doc(db, 'players', game.playerXUid);
        const playerORef = doc(db, 'players', game.playerOUid);
        const [pXSnap, pOSnap] = await Promise.all([tx.get(playerXRef), tx.get(playerORef)]);

        const winnerUid =
          evaluation.winner === 'X'
            ? game.playerXUid
            : evaluation.winner === 'O'
              ? game.playerOUid
              : '';

        tx.update(gameRef, {
          board: nextBoard,
          currentTurn: game.currentTurn,
          moveCount: nextMoveCount,
          status: 'finished',
          winner: evaluation.winner,
          winnerUid,
          winningLine: evaluation.winningLine,
          updatedAt: serverTimestamp(),
          finishedAt: serverTimestamp(),
        });

        if (pXSnap.exists()) {
          const pX = pXSnap.data() as PlayerProfile;
          const xOutcome =
            evaluation.winner === 'draw' ? 'draw' : evaluation.winner === 'X' ? 'win' : 'loss';
          tx.update(playerXRef, computeNextStats(pX, xOutcome, gameId));
        }
        if (pOSnap.exists()) {
          const pO = pOSnap.data() as PlayerProfile;
          const oOutcome =
            evaluation.winner === 'draw' ? 'draw' : evaluation.winner === 'O' ? 'win' : 'loss';
          tx.update(playerORef, computeNextStats(pO, oOutcome, gameId));
        }

        return { finished: true, winner: evaluation.winner };
      }

      tx.update(gameRef, {
        board: nextBoard,
        currentTurn: game.currentTurn === 'X' ? 'O' : 'X',
        moveCount: nextMoveCount,
        status: 'playing',
        winner: '',
        winnerUid: '',
        winningLine: [],
        updatedAt: serverTimestamp(),
        finishedAt: null,
      });

      return { finished: false, winner: '' };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('not your turn') ||
        error.message.includes('already occupied') ||
        error.message.includes('not currently active'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resignGameTransaction(gameId: string, resigningUid: string): Promise<void> {
  const path = `games/${gameId}`;
  try {
    await runTransaction(db, async (tx) => {
      const gameRef = doc(db, 'games', gameId);
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists()) return;

      const game = gameSnap.data() as Omit<GameRoom, 'id'>;
      if (game.status !== 'playing') return;
      if (!game.participantUids.includes(resigningUid)) return;

      const playerXRef = doc(db, 'players', game.playerXUid);
      const playerORef = doc(db, 'players', game.playerOUid);
      const [pXSnap, pOSnap] = await Promise.all([tx.get(playerXRef), tx.get(playerORef)]);

      const winnerMark = resigningUid === game.playerXUid ? 'O' : 'X';
      const winnerUid = winnerMark === 'X' ? game.playerXUid : game.playerOUid;

      tx.update(gameRef, {
        status: 'finished',
        winner: winnerMark,
        winnerUid,
        updatedAt: serverTimestamp(),
        finishedAt: serverTimestamp(),
      });

      if (pXSnap.exists()) {
        const pX = pXSnap.data() as PlayerProfile;
        tx.update(playerXRef, computeNextStats(pX, winnerMark === 'X' ? 'win' : 'loss', gameId));
      }
      if (pOSnap.exists()) {
        const pO = pOSnap.data() as PlayerProfile;
        tx.update(playerORef, computeNextStats(pO, winnerMark === 'O' ? 'win' : 'loss', gameId));
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelWaitingRoom(gameId: string): Promise<void> {
  const path = `games/${gameId}`;
  try {
    await updateDoc(doc(db, 'games', gameId), {
      status: 'abandoned',
      isPublicOpen: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createRematchGame(
  finishedGame: GameRoom,
  currentUid: string,
): Promise<string> {
  const newGameRef = doc(collection(db, 'games'));
  const path = `games/${newGameRef.id}`;
  try {
    const inviteCode = await allocateUniqueInviteCode();
    const batch = writeBatch(db);

    // Swap X and O so players alternate first turn on rematch
    const nextPlayerXUid = finishedGame.playerOUid;
    const nextPlayerXName = finishedGame.playerOName || 'Player X';
    const nextPlayerXAvatar = (finishedGame.playerOAvatar || 'cobalt') as AvatarId;
    const nextPlayerOUid = finishedGame.playerXUid;
    const nextPlayerOName = finishedGame.playerXName;
    const nextPlayerOAvatar = finishedGame.playerXAvatar;

    batch.set(newGameRef, {
      inviteCode,
      visibility: 'private',
      isPublicOpen: false,
      status: 'playing',
      hostUid: currentUid,
      playerXUid: nextPlayerXUid,
      playerXName: nextPlayerXName,
      playerXAvatar: nextPlayerXAvatar,
      playerOUid: nextPlayerOUid,
      playerOName: nextPlayerOName,
      playerOAvatar: nextPlayerOAvatar,
      participantUids: [nextPlayerXUid, nextPlayerOUid],
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'X',
      moveCount: 0,
      winner: '',
      winnerUid: '',
      winningLine: [],
      rematchGameId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: null,
    });

    batch.set(doc(db, 'roomCodes', inviteCode), {
      gameId: newGameRef.id,
      hostUid: currentUid,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'games', finishedGame.id), {
      rematchGameId: newGameRef.id,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return newGameRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function sendChallenge(
  challenger: PlayerProfile,
  target: PlayerProfile,
): Promise<string> {
  const challengeRef = doc(collection(db, 'challenges'));
  const path = `challenges/${challengeRef.id}`;
  try {
    const batch = writeBatch(db);
    batch.set(challengeRef, {
      challengerUid: challenger.uid,
      challengerName: challenger.displayName,
      challengerAvatar: challenger.avatarId,
      targetUid: target.uid,
      targetName: target.displayName,
      status: 'pending',
      gameId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return challengeRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function acceptChallenge(
  challenge: Challenge,
  acceptor: PlayerProfile,
): Promise<string> {
  const newGameRef = doc(collection(db, 'games'));
  const path = `challenges/${challenge.id}`;
  try {
    const inviteCode = await allocateUniqueInviteCode();
    const batch = writeBatch(db);

    batch.set(newGameRef, {
      inviteCode,
      visibility: 'private',
      isPublicOpen: false,
      status: 'playing',
      hostUid: acceptor.uid,
      playerXUid: challenge.challengerUid,
      playerXName: challenge.challengerName,
      playerXAvatar: challenge.challengerAvatar,
      playerOUid: acceptor.uid,
      playerOName: acceptor.displayName,
      playerOAvatar: acceptor.avatarId,
      participantUids: [challenge.challengerUid, acceptor.uid],
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'X',
      moveCount: 0,
      winner: '',
      winnerUid: '',
      winningLine: [],
      rematchGameId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: null,
    });

    batch.set(doc(db, 'roomCodes', inviteCode), {
      gameId: newGameRef.id,
      hostUid: acceptor.uid,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'challenges', challenge.id), {
      status: 'accepted',
      gameId: newGameRef.id,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return newGameRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function declineChallenge(challengeId: string): Promise<void> {
  const path = `challenges/${challengeId}`;
  try {
    await updateDoc(doc(db, 'challenges', challengeId), {
      status: 'declined',
      gameId: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  const path = `challenges/${challengeId}`;
  try {
    await updateDoc(doc(db, 'challenges', challengeId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------
// Real-time Subscriptions
// ---------------------------------------------------------

function forwardSnapshotError(
  error: unknown,
  operationType: OperationType,
  path: string,
  onError?: (err: Error) => void,
): void {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (err) {
    if (onError && err instanceof Error) {
      onError(err);
      return;
    }
    throw err;
  }
}

export function subscribeToPlayerProfile(
  uid: string,
  onData: (profile: PlayerProfile | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = `players/${uid}`;
  return onSnapshot(
    doc(db, 'players', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as PlayerProfile) : null);
    },
    (error) => forwardSnapshotError(error, OperationType.GET, path, onError),
  );
}

export function subscribeToPlayers(
  onData: (players: PlayerProfile[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'players';
  const q = query(collection(db, 'players'), where('visibility', '==', 'public'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as PlayerProfile);
      onData(list);
    },
    (error) => forwardSnapshotError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToOpenRooms(
  onData: (rooms: GameRoom[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'games';
  const q = query(collection(db, 'games'), where('isPublicOpen', '==', true), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<GameRoom, 'id'>) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(rooms);
    },
    (error) => forwardSnapshotError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToMyGames(
  uid: string,
  onData: (games: GameRoom[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'games';
  const q = query(
    collection(db, 'games'),
    where('participantUids', 'array-contains', uid),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      const games = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<GameRoom, 'id'>) }))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      onData(games);
    },
    (error) => forwardSnapshotError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToGameRoom(
  gameId: string,
  onData: (room: GameRoom | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = `games/${gameId}`;
  return onSnapshot(
    doc(db, 'games', gameId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ id: snap.id, ...(snap.data() as Omit<GameRoom, 'id'>) });
    },
    (error) => forwardSnapshotError(error, OperationType.GET, path, onError),
  );
}

export function subscribeToIncomingChallenges(
  uid: string,
  onData: (challenges: Challenge[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'challenges';
  const q = query(collection(db, 'challenges'), where('targetUid', '==', uid), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Challenge, 'id'>) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (error) => forwardSnapshotError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToOutgoingChallenges(
  uid: string,
  onData: (challenges: Challenge[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'challenges';
  const q = query(collection(db, 'challenges'), where('challengerUid', '==', uid), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Challenge, 'id'>) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (error) => forwardSnapshotError(error, OperationType.LIST, path, onError),
  );
}
