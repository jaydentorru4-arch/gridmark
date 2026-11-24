import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import { formatRelativeTime } from '../../lib/gameLogic';
import { sendMatchMessage, subscribeToMatchMessages } from '../../services/chatService';
import { CHAT_MESSAGE_MAX, type ChatMessage, type PlayerProfile } from '../../types/game';
import { AvatarBadge } from '../AvatarBadge';

interface MatchChatPanelProps {
  roomCollection: 'games' | 'arcadeRooms';
  roomId: string;
  currentUser: PlayerProfile;
  defaultExpanded?: boolean;
}

const QUICK_MATCH_MESSAGES = ['GLHF!', 'Nice move!', 'GG!', 'Rematch?'];

export function MatchChatPanel({
  roomCollection,
  roomId,
  currentUser,
  defaultExpanded = true,
}: MatchChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [unreadCount, setUnreadCount] = useState(0);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    initializedRef.current = false;
    prevLengthRef.current = 0;
    setMessages([]);
    setUnreadCount(0);
    setErrorMsg('');

    const unsub = subscribeToMatchMessages(
      roomCollection,
      roomId,
      (next) => {
        if (!initializedRef.current) {
          initializedRef.current = true;
          prevLengthRef.current = next.length;
        } else if (next.length > prevLengthRef.current) {
          const added = next.slice(prevLengthRef.current);
          const fromOpponent = added.filter((m) => m.senderUid !== currentUser.uid).length;
          if (!expanded && fromOpponent > 0) {
            setUnreadCount((c) => c + fromOpponent);
          }
          prevLengthRef.current = next.length;
        }
        setMessages(next);
      },
      (err) => {
        setErrorMsg(err.message);
      },
    );

    return () => unsub();
  }, [roomCollection, roomId, currentUser.uid]);

  useEffect(() => {
    if (expanded) {
      setUnreadCount(0);
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, expanded]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setErrorMsg('');
    try {
      await sendMatchMessage(roomCollection, roomId, currentUser, trimmed);
      setDraft('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendText(draft);
  };

  return (
    <section
      aria-label="In-game match chat"
      className="bg-white border-2 border-slate-900 rounded-2xl shadow-[0_5px_0_0_#0F172A] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3.5 bg-amber-50/80 border-b-2 border-slate-900 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/70 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-slate-900 shrink-0" />
          <h3 className="font-display text-sm font-bold text-slate-900">Match Chat</h3>
          {messages.length > 0 && (
            <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              ({messages.length})
            </span>
          )}
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md border border-slate-900 bg-rose-500 text-white text-[10px] font-bold tabular-nums">
              {unreadCount} new
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-700 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-700 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          <div className="h-48 overflow-y-auto pr-1 space-y-2.5 bg-[#FFFDF7] rounded-xl border border-slate-200 p-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-slate-500">
                  No messages yet. Say hello or drop a quick reaction below!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderUid === currentUser.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <AvatarBadge
                      avatarId={msg.senderAvatar}
                      name={msg.senderName}
                      emblemIcon={msg.senderEmblem}
                      size="sm"
                    />
                    <div className={`min-w-0 max-w-[78%] ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`flex items-baseline gap-1.5 text-[11px] text-slate-500 mb-0.5 ${
                          isMine ? 'justify-end' : ''
                        }`}
                      >
                        <span className="font-bold text-slate-800 truncate">
                          {isMine ? 'You' : msg.senderName}
                        </span>
                        <span className="shrink-0">
                          {formatRelativeTime(msg.createdAt?.toDate() ?? null)}
                        </span>
                      </div>
                      <p
                        className={`inline-block rounded-xl border px-3 py-1.5 text-xs leading-relaxed break-words text-left ${
                          isMine
                            ? 'bg-sky-50 border-slate-900 text-slate-900'
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
            <div ref={listEndRef} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_MATCH_MESSAGES.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={sending}
                onClick={() => void sendText(preset)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-amber-50 hover:bg-amber-200 hover:border-slate-900 text-[11px] font-bold text-slate-800 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              maxLength={CHAT_MESSAGE_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message opponent..."
              aria-label="In-game chat message"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
