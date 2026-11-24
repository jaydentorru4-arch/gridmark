import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CHAT_MESSAGE_MAX,
  PLAYER_TITLE_MAX,
  type AvatarId,
  type ChatMessage,
  type EmblemIconId,
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
  const q = query(
    collection(db, roomCollection, roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(120),
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
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
      });
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
