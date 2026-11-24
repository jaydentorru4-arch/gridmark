import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CHAT_MESSAGE_MAX,
  PLAYER_TITLE_MAX,
  type AvatarId,
  type ChatMessage,
  type DirectMessage,
  type EmblemIconId,
  type Friendship,
  type PlayerProfile,
} from '../types/game';

export async function sendLoungeMessage(player: PlayerProfile, rawText: string): Promise<void> {
  const text = rawText.trim().slice(0, CHAT_MESSAGE_MAX);
  if (!text) return;

  const path = 'loungeMessages';
  try {
    await addDoc(collection(db, 'loungeMessages'), {
      channel: 'chill',
      senderUid: player.uid,
      senderName: (player.displayName || player.username || 'Player').slice(0, 40),
      senderAvatar: player.avatarId,
      senderEmblem: (player.emblemIcon || 'letter') as EmblemIconId,
      senderTitle: (player.playerTitle || '').trim().slice(0, PLAYER_TITLE_MAX),
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToLoungeMessages(
  onData: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'loungeMessages';
  const q = query(collection(db, 'loungeMessages'), where('channel', '==', 'chill'), limit(200));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' }) as {
            senderUid: string;
            senderName: string;
            senderAvatar: AvatarId;
            senderEmblem?: EmblemIconId;
            senderTitle?: string;
            text: string;
            createdAt: ChatMessage['createdAt'];
          };
          return {
            id: d.id,
            senderUid: data.senderUid,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            senderEmblem: data.senderEmblem || 'letter',
            senderTitle: data.senderTitle || '',
            text: data.text,
            createdAt: data.createdAt,
          } satisfies ChatMessage;
        })
        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

      onData(list.slice(-100));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
          return;
        }
        throw err;
      }
    },
  );
}

export async function sendMatchMessage(
  roomCollection: 'games' | 'arcadeRooms',
  roomId: string,
  player: PlayerProfile,
  rawText: string,
): Promise<void> {
  const text = rawText.trim().slice(0, CHAT_MESSAGE_MAX);
  if (!text) return;

  const path = `${roomCollection}/${roomId}/messages`;
  try {
    await addDoc(collection(db, roomCollection, roomId, 'messages'), {
      senderUid: player.uid,
      senderName: (player.displayName || player.username || 'Player').slice(0, 40),
      senderAvatar: player.avatarId,
      senderEmblem: (player.emblemIcon || 'letter') as EmblemIconId,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToMatchMessages(
  roomCollection: 'games' | 'arcadeRooms',
  roomId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = `${roomCollection}/${roomId}/messages`;
  // Query without orderBy to avoid any composite index requirement; sort client-side
  const q = query(collection(db, roomCollection, roomId, 'messages'), limit(150));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' }) as {
            senderUid: string;
            senderName: string;
            senderAvatar: AvatarId;
            senderEmblem?: EmblemIconId;
            text: string;
            createdAt: ChatMessage['createdAt'];
          };
          return {
            id: d.id,
            senderUid: data.senderUid,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            senderEmblem: data.senderEmblem || 'letter',
            text: data.text,
            createdAt: data.createdAt,
          } satisfies ChatMessage;
        })
        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
          return;
        }
        throw err;
      }
    },
  );
}

// ---------------------------------------------------------
// Friends & Direct Messages Services
// ---------------------------------------------------------

export async function addFriendByUsername(
  currentUser: PlayerProfile,
  rawUsername: string,
): Promise<void> {
  const targetUsername = rawUsername.trim().toLowerCase().replace(/^@/, '');
  if (!targetUsername) {
    throw new Error('Please enter a valid username.');
  }
  if (targetUsername === currentUser.username.toLowerCase()) {
    throw new Error('You cannot add yourself as a friend.');
  }

  const playersRef = collection(db, 'players');
  const q = query(playersRef, where('username', '==', targetUsername), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`No player found with username "@${targetUsername}".`);
  }

  const targetPlayer = snap.docs[0].data() as PlayerProfile;
  if (targetPlayer.uid === currentUser.uid) {
    throw new Error('You cannot add yourself as a friend.');
  }

  // Check if friendship already exists
  const uid1 = currentUser.uid < targetPlayer.uid ? currentUser.uid : targetPlayer.uid;
  const uid2 = currentUser.uid < targetPlayer.uid ? targetPlayer.uid : currentUser.uid;
  const shipId = `${uid1}_${uid2}`;
  const shipRef = doc(db, 'friendships', shipId);
  const existing = await getDocs(
    query(collection(db, 'friendships'), where('participantUids', 'array-contains', currentUser.uid)),
  );

  for (const docSnap of existing.docs) {
    const data = docSnap.data() as Friendship;
    if (data.participantUids.includes(targetPlayer.uid)) {
      throw new Error(`You are already connected with ${targetPlayer.displayName}!`);
    }
  }

  try {
    await setDoc(shipRef, {
      user1Uid: currentUser.uid < targetPlayer.uid ? currentUser.uid : targetPlayer.uid,
      user1Name: currentUser.uid < targetPlayer.uid ? currentUser.displayName : targetPlayer.displayName,
      user1Avatar: currentUser.uid < targetPlayer.uid ? currentUser.avatarId : targetPlayer.avatarId,
      user2Uid: currentUser.uid < targetPlayer.uid ? targetPlayer.uid : currentUser.uid,
      user2Name: currentUser.uid < targetPlayer.uid ? targetPlayer.displayName : currentUser.displayName,
      user2Avatar: currentUser.uid < targetPlayer.uid ? targetPlayer.avatarId : targetPlayer.avatarId,
      participantUids: [currentUser.uid, targetPlayer.uid],
      status: 'accepted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `friendships/${shipId}`);
  }
}

export function subscribeToFriendships(
  uid: string,
  onData: (friendships: Friendship[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'friendships';
  const q = query(collection(db, 'friendships'), where('participantUids', 'array-contains', uid), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Friendship, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
          return;
        }
        throw err;
      }
    },
  );
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const path = `friendships/${friendshipId}`;
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function sendDirectMessage(
  sender: PlayerProfile,
  recipientUid: string,
  rawText: string,
): Promise<void> {
  const text = rawText.trim().slice(0, CHAT_MESSAGE_MAX);
  if (!text) return;

  const path = 'directMessages';
  try {
    await addDoc(collection(db, 'directMessages'), {
      senderUid: sender.uid,
      senderName: sender.displayName,
      senderAvatar: sender.avatarId,
      recipientUid,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToDirectMessages(
  myUid: string,
  friendUid: string,
  onData: (messages: DirectMessage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'directMessages';
  const q = query(collection(db, 'directMessages'), limit(200));

  return onSnapshot(
    q,
    (snap) => {
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DirectMessage, 'id'>),
      }));
      const filtered = all
        .filter(
          (m) =>
            (m.senderUid === myUid && m.recipientUid === friendUid) ||
            (m.senderUid === friendUid && m.recipientUid === myUid),
        )
        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
      onData(filtered);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
          return;
        }
        throw err;
      }
    },
  );
}
