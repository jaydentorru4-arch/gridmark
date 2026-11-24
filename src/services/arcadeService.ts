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
import {
  createInitialArcadeState,
  isSimultaneousGame,
} from '../games/engines/initialStates';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  generateInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from '../lib/gameLogic';
import type { ArcadeGameType, ArcadeRoom } from '../types/arcade';
import type { AvatarId, GameVisibility, PlayerProfile } from '../types/game';

async function allocateUniqueArcadeCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateInviteCode();
    const codeSnap = await getDoc(doc(db, 'arcadeCodes', code));
    if (!codeSnap.exists()) {
      return code;
    }
  }
  return generateInviteCode();
}

export function generateArcadeShareUrl(inviteCode: string): string {
  if (typeof window === 'undefined') return `?arcade=${inviteCode}`;
  return `${window.location.origin}/?arcade=${inviteCode}`;
}

export function extractArcadeCodeFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('arcade');
  if (!raw) return '';
  const normalized = normalizeInviteCode(raw);
  return isValidInviteCodeFormat(normalized) ? normalized : '';
}

export function syncArcadeCodeToUrl(inviteCode: string): void {
  if (typeof window === 'undefined') return;
  const target = `/?arcade=${inviteCode}`;
  if (window.location.search !== `?arcade=${inviteCode}`) {
    window.history.replaceState({}, '', target);
  }
}

export function clearArcadeCodeFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('arcade')) {
    window.history.replaceState({}, '', '/');
  }
}

export async function createArcadeRoom(
  player: PlayerProfile,
  gameType: ArcadeGameType,
  visibility: GameVisibility,
): Promise<{ roomId: string; inviteCode: string }> {
  const roomsCol = collection(db, 'arcadeRooms');
  const roomRef = doc(roomsCol);
  const path = `arcadeRooms/${roomRef.id}`;

  try {
    const inviteCode = await allocateUniqueArcadeCode();
    const batch = writeBatch(db);
    const initialState = createInitialArcadeState(gameType);

    batch.set(roomRef, {
      inviteCode,
      gameType,
      visibility,
      isPublicOpen: visibility === 'public',
      status: 'waiting',
      hostUid: player.uid,
      player1Uid: player.uid,
      player1Name: player.displayName,
      player1Avatar: player.avatarId,
      player2Uid: '',
      player2Name: '',
      player2Avatar: '',
      participantUids: [player.uid],
      currentTurnUid: isSimultaneousGame(gameType) ? '' : player.uid,
      winnerUid: '',
      resultSummary: '',
      rematchRoomId: '',
      state: initialState,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: null,
    });

    batch.set(doc(db, 'arcadeCodes', inviteCode), {
      roomId: roomRef.id,
      hostUid: player.uid,
      gameType,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { roomId: roomRef.id, inviteCode };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function resolveArcadeCode(
  rawCode: string,
): Promise<{ roomId: string; gameType: ArcadeGameType }> {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeFormat(code)) {
    throw new Error('Invite codes must be 6 letters or numbers.');
  }
  const path = `arcadeCodes/${code}`;
  let snap;
  try {
    snap = await getDoc(doc(db, 'arcadeCodes', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
  if (!snap.exists()) {
    throw new Error(`No arcade room found with code "${code}".`);
  }
  return snap.data() as { roomId: string; gameType: ArcadeGameType };
}

export async function joinArcadeRoom(
  roomId: string,
  player: PlayerProfile,
): Promise<ArcadeGameType> {
  const path = `arcadeRooms/${roomId}`;
  try {
    return await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'arcadeRooms', roomId);
      const snap = await tx.get(roomRef);
      if (!snap.exists()) {
        throw new Error('This arcade room no longer exists.');
      }
      const data = snap.data() as Omit<ArcadeRoom, 'id'>;
      if (data.participantUids.includes(player.uid)) {
        return data.gameType;
      }
      if (data.status !== 'waiting') {
        throw new Error('This room is already full or has finished.');
      }

      tx.update(roomRef, {
        player2Uid: player.uid,
        player2Name: player.displayName,
        player2Avatar: player.avatarId,
        participantUids: [data.player1Uid, player.uid],
        status: 'playing',
        isPublicOpen: false,
        currentTurnUid: isSimultaneousGame(data.gameType) ? '' : data.player1Uid,
        state: data.state,
        updatedAt: serverTimestamp(),
      });
      return data.gameType;
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

export async function commitArcadeMove<TState>(
  roomId: string,
  actorUid: string,
  params: {
    nextState: TState;
    nextTurnUid: string;
    finished?: boolean;
    winnerUid?: string;
    resultSummary?: string;
  },
): Promise<void> {
  const path = `arcadeRooms/${roomId}`;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'arcadeRooms', roomId);
      const snap = await tx.get(roomRef);
      if (!snap.exists()) {
        throw new Error('Room no longer exists.');
      }
      const room = snap.data() as Omit<ArcadeRoom, 'id'>;
      if (room.status !== 'playing') {
        throw new Error('Match is no longer active.');
      }
      if (!room.participantUids.includes(actorUid)) {
        throw new Error('Only match participants can update this room.');
      }

      const isFinished = Boolean(params.finished);
      tx.update(roomRef, {
        state: params.nextState as Record<string, unknown>,
        currentTurnUid: params.nextTurnUid,
        status: isFinished ? 'finished' : 'playing',
        winnerUid: isFinished ? params.winnerUid || 'draw' : '',
        resultSummary: (params.resultSummary || '').slice(0, 140),
        updatedAt: serverTimestamp(),
        finishedAt: isFinished ? serverTimestamp() : null,
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('no longer exists') ||
        error.message.includes('no longer active') ||
        error.message.includes('participants'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelArcadeWaitingRoom(roomId: string): Promise<void> {
  const path = `arcadeRooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'arcadeRooms', roomId), {
      status: 'abandoned',
      isPublicOpen: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createArcadeRematchRoom(
  finishedRoom: ArcadeRoom,
  currentUid: string,
): Promise<string> {
  const newRoomRef = doc(collection(db, 'arcadeRooms'));
  const path = `arcadeRooms/${newRoomRef.id}`;
  try {
    const inviteCode = await allocateUniqueArcadeCode();
    const batch = writeBatch(db);

    // Swap player1 & player2 so colors/roles/first-turn alternate on rematch
    const nextPlayer1Uid = finishedRoom.player2Uid || finishedRoom.player1Uid;
    const nextPlayer1Name = finishedRoom.player2Name || 'Player 1';
    const nextPlayer1Avatar = (finishedRoom.player2Avatar || 'cobalt') as AvatarId;
    const nextPlayer2Uid = finishedRoom.player1Uid;
    const nextPlayer2Name = finishedRoom.player1Name;
    const nextPlayer2Avatar = finishedRoom.player1Avatar;

    const initialState = createInitialArcadeState(finishedRoom.gameType);

    batch.set(newRoomRef, {
      inviteCode,
      gameType: finishedRoom.gameType,
      visibility: 'private',
      isPublicOpen: false,
      status: 'playing',
      hostUid: currentUid,
      player1Uid: nextPlayer1Uid,
      player1Name: nextPlayer1Name,
      player1Avatar: nextPlayer1Avatar,
      player2Uid: nextPlayer2Uid,
      player2Name: nextPlayer2Name,
      player2Avatar: nextPlayer2Avatar,
      participantUids: [nextPlayer1Uid, nextPlayer2Uid],
      currentTurnUid: isSimultaneousGame(finishedRoom.gameType) ? '' : nextPlayer1Uid,
      winnerUid: '',
      resultSummary: '',
      rematchRoomId: '',
      state: initialState,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: null,
    });

    batch.set(doc(db, 'arcadeCodes', inviteCode), {
      roomId: newRoomRef.id,
      hostUid: currentUid,
      gameType: finishedRoom.gameType,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'arcadeRooms', finishedRoom.id), {
      rematchRoomId: newRoomRef.id,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return newRoomRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function forwardError(
  error: unknown,
  op: OperationType,
  path: string,
  onError?: (err: Error) => void,
): void {
  try {
    handleFirestoreError(error, op, path);
  } catch (err) {
    if (onError && err instanceof Error) {
      onError(err);
      return;
    }
    throw err;
  }
}

export function subscribeToOpenArcadeRooms(
  onData: (rooms: ArcadeRoom[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'arcadeRooms';
  const q = query(
    collection(db, 'arcadeRooms'),
    where('isPublicOpen', '==', true),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ArcadeRoom, 'id'>) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(rooms);
    },
    (error) => forwardError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToMyArcadeRooms(
  uid: string,
  onData: (rooms: ArcadeRoom[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'arcadeRooms';
  const q = query(
    collection(db, 'arcadeRooms'),
    where('participantUids', 'array-contains', uid),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ArcadeRoom, 'id'>) }))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      onData(rooms);
    },
    (error) => forwardError(error, OperationType.LIST, path, onError),
  );
}

export function subscribeToArcadeRoom(
  roomId: string,
  onData: (room: ArcadeRoom | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = `arcadeRooms/${roomId}`;
  return onSnapshot(
    doc(db, 'arcadeRooms', roomId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ id: snap.id, ...(snap.data() as Omit<ArcadeRoom, 'id'>) });
    },
    (error) => forwardError(error, OperationType.GET, path, onError),
  );
}
