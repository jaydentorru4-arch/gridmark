import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageSquare, Send, UserPlus, Users, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/gameLogic';
import {
  addFriendByUsername,
  removeFriend,
  sendDirectMessage,
  subscribeToDirectMessages,
  subscribeToFriendships,
} from '../services/chatService';
import { sendChallenge } from '../services/firestoreService';
import {
  CHAT_MESSAGE_MAX,
  type DirectMessage,
  type Friendship,
  type PlayerProfile,
} from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface FriendsViewProps {
  currentUser: PlayerProfile;
  onlinePlayers: PlayerProfile[];
  onOpenGame: (gameId: string) => void;
}

export function FriendsView({ currentUser, onlinePlayers, onOpenGame }: FriendsViewProps) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [addInput, setAddInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [dmDraft, setDmDraft] = useState('');
  const [sendingDm, setSendingDm] = useState(false);
  const [challengingUid, setChallengingUid] = useState<string | null>(null);

  const dmListEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = subscribeToFriendships(
      currentUser.uid,
      (list) => {
        setFriendships(list);
        if (!selectedFriendUid && list.length > 0) {
          const other = list[0].user1Uid === currentUser.uid ? list[0].user2Uid : list[0].user1Uid;
          setSelectedFriendUid(other);
        }
      },
      (err) => {
        setErrorMsg(err.message);
      },
    );
    return () => unsub();
  }, [currentUser.uid, selectedFriendUid]);

  useEffect(() => {
    if (!selectedFriendUid) {
      setDirectMessages([]);
      return;
    }
    const unsub = subscribeToDirectMessages(
      currentUser.uid,
      selectedFriendUid,
      (msgs) => {
        setDirectMessages(msgs);
      },
      (err) => {
        setErrorMsg(err.message);
      },
    );
    return () => unsub();
  }, [currentUser.uid, selectedFriendUid]);

  useEffect(() => {
    dmListEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [directMessages.length]);

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    const handle = addInput.trim();
    if (!handle || adding) return;
    setAdding(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await addFriendByUsername(currentUser, handle);
      setAddInput('');
      setSuccessMsg(`Successfully added @${handle.replace(/^@/, '')}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not add friend.');
    } finally {
      setAdding(false);
    }
  };

  const handleSendDm = async (e: FormEvent) => {
    e.preventDefault();
    const text = dmDraft.trim();
    if (!text || !selectedFriendUid || sendingDm) return;
    setSendingDm(true);
    setErrorMsg('');
    try {
      await sendDirectMessage(currentUser, selectedFriendUid, text);
      setDmDraft('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSendingDm(false);
    }
  };

  const handleChallengeFriend = async (friendUid: string, friendName: string, friendAvatar: any) => {
    setChallengingUid(friendUid);
    setErrorMsg('');
    try {
      const targetProfile: PlayerProfile = {
        uid: friendUid,
        username: friendName.toLowerCase().replace(/\s+/g, '_'),
        displayName: friendName,
        avatarId: friendAvatar,
        bio: '',
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
        lastActiveAt: null,
        createdAt: null,
        updatedAt: null,
      };
      await sendChallenge(currentUser, targetProfile);
      setSuccessMsg(`Direct duel challenge sent to ${friendName}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send challenge.');
    } finally {
      setChallengingUid(null);
    }
  };

  const selectedFriendShip = friendships.find((f) => f.user1Uid === selectedFriendUid || f.user2Uid === selectedFriendUid);
  const selectedFriendName = selectedFriendShip
    ? selectedFriendShip.user1Uid === selectedFriendUid
      ? selectedFriendShip.user1Name
      : selectedFriendShip.user2Name
    : 'Friend';
  const selectedFriendAvatar = selectedFriendShip
    ? selectedFriendShip.user1Uid === selectedFriendUid
      ? selectedFriendShip.user1Avatar
      : selectedFriendShip.user2Avatar
    : 'slate';

  const onlineUidSet = new Set(onlinePlayers.map((p) => p.uid));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Friends & Direct Chat</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add friends by username, chat in real time, and challenge them directly to duels.
          </p>
        </div>

        {/* Add Friend Form */}
        <form onSubmit={handleAddFriend} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            required
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="Add by username (@handle)..."
            aria-label="Friend username"
            className="flex-1 sm:w-64 px-3.5 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={adding || !addInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add Friend'}
          </button>
        </form>
      </div>

      {errorMsg && (
        <p className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3">
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-4 py-3">
          {successMsg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Friends List */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-900" />
              <h2 className="font-display text-base font-bold text-slate-900">Your Friends</h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
              {friendships.length}
            </span>
          </div>

          {friendships.length === 0 ? (
            <div className="py-12 text-center px-4">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-display text-sm font-bold text-slate-800">No friends added yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Type a player's username in the box above to connect with them instantly.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {friendships.map((f) => {
                const isUser1 = f.user1Uid === currentUser.uid;
                const friendUid = isUser1 ? f.user2Uid : f.user1Uid;
                const friendName = isUser1 ? f.user2Name : f.user1Name;
                const friendAvatar = isUser1 ? f.user2Avatar : f.user1Avatar;
                const isOnline = onlineUidSet.has(friendUid);
                const isSelected = selectedFriendUid === friendUid;

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFriendUid(friendUid)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-amber-50 shadow-[0_2px_0_0_#0F172A]'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <AvatarBadge avatarId={friendAvatar} name={friendName} size="sm" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{friendName}</p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {isOnline ? 'Online now' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={challengingUid === friendUid}
                        onClick={() => void handleChallengeFriend(friendUid, friendName, friendAvatar)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-900 bg-amber-300 hover:bg-amber-400 text-[11px] font-bold text-slate-900 cursor-pointer whitespace-nowrap min-h-[36px]"
                      >
                        Duel
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeFriend(f.id)}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Remove friend"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Direct Messages Panel */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl shadow-[0_5px_0_0_#0F172A] overflow-hidden flex flex-col h-[520px]">
          {selectedFriendUid ? (
            <>
              {/* DM Header */}
              <div className="px-5 py-3.5 bg-amber-100/70 border-b-2 border-slate-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarBadge avatarId={selectedFriendAvatar} name={selectedFriendName} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-slate-900 truncate">
                      {selectedFriendName}
                    </h3>
                    <p className="text-[11px] text-slate-600">Direct Message Channel</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={challengingUid === selectedFriendUid}
                  onClick={() => void handleChallengeFriend(selectedFriendUid, selectedFriendName, selectedFriendAvatar)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-amber-300 hover:bg-amber-400 text-xs font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  Challenge to Match
                </button>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFDF7]">
                {directMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-display text-sm font-bold text-slate-800">No messages yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Send a direct message to start chatting with {selectedFriendName}!
                    </p>
                  </div>
                ) : (
                  directMessages.map((msg) => {
                    const isMine = msg.senderUid === currentUser.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse text-right' : ''}`}
                      >
                        <div className={`min-w-0 max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`flex items-baseline gap-1.5 text-[11px] text-slate-500 mb-0.5 ${
                              isMine ? 'justify-end' : ''
                            }`}
                          >
                            <span className="font-bold text-slate-800 truncate">
                              {isMine ? 'You' : selectedFriendName}
                            </span>
                            <span className="shrink-0">
                              {formatRelativeTime(msg.createdAt?.toDate() ?? null)}
                            </span>
                          </div>
                          <p
                            className={`inline-block rounded-xl border px-3.5 py-2 text-xs leading-relaxed break-words text-left ${
                              isMine
                                ? 'bg-sky-100 border-slate-900 text-slate-900'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={dmListEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSendDm} className="p-3.5 border-t-2 border-slate-900 bg-white flex items-center gap-2">
                <input
                  type="text"
                  maxLength={CHAT_MESSAGE_MAX}
                  value={dmDraft}
                  onChange={(e) => setDmDraft(e.target.value)}
                  placeholder={`Message ${selectedFriendName}...`}
                  aria-label="Direct message input"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={sendingDm || !dmDraft.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FFFDF7]">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-display text-base font-bold text-slate-800">Select a friend to chat</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Choose a friend from your list on the left or add a new friend by their username.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
