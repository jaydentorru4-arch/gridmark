import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { formatRelativeTime } from '../../lib/gameLogic';
import { sendLoungeMessage, subscribeToLoungeMessages } from '../../services/chatService';
import { CHAT_MESSAGE_MAX, type ChatMessage, type PlayerProfile } from '../../types/game';
import { AvatarBadge } from '../AvatarBadge';

interface PublicChillChatDrawerProps {
  currentUser: PlayerProfile;
  onlineCount: number;
}

const CHILL_QUICK_PROMPTS = ["Who's down to play?", 'GG everyone!', 'Chill vibes'];

export function PublicChillChatDrawer({
  currentUser,
  onlineCount,
}: PublicChillChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isOpenRef = useRef(open);
  isOpenRef.current = open;

  useEffect(() => {
    const unsub = subscribeToLoungeMessages(
      (next) => {
        if (!initializedRef.current) {
          initializedRef.current = true;
          prevIdsRef.current = new Set(next.map((m) => m.id));
        } else {
          let newOthers = 0;
          for (const msg of next) {
            if (!prevIdsRef.current.has(msg.id) && msg.senderUid !== currentUser.uid) {
              newOthers += 1;
            }
          }
          prevIdsRef.current = new Set(next.map((m) => m.id));
          if (!isOpenRef.current && newOthers > 0) {
            setUnreadCount((c) => Math.min(99, c + newOthers));
          }
        }
        setMessages(next);
      },
      (err) => {
        setErrorMsg(err.message);
      },
    );

    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [open, messages.length]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setErrorMsg('');
    try {
      await sendLoungeMessage(currentUser, trimmed);
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

  if (!open) {
    return (
      <div className="fixed bottom-16 md:bottom-5 right-4 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-sm font-bold shadow-[0_4px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[2px] active:shadow-[0_1px_0_0_#0F172A] cursor-pointer whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Chill Chat</span>
          <span className="px-1.5 py-0.5 rounded-md border border-slate-900 bg-white text-[11px] font-mono font-bold tabular-nums">
            {onlineCount}
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md border border-slate-900 bg-rose-500 text-white text-[11px] font-bold tabular-nums">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 md:bottom-5 right-4 z-40 w-[calc(100vw-2rem)] sm:w-96 max-h-[75vh] flex flex-col bg-white border-2 border-slate-900 rounded-2xl shadow-[0_6px_0_0_#0F172A] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-300 border-b-2 border-slate-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 text-slate-900 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-slate-900 leading-tight">
              Public Chill Chat
            </h2>
            <p className="text-[11px] font-semibold text-slate-800">
              {onlineCount} {onlineCount === 1 ? 'player' : 'players'} online · Global lounge
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Minimize Chill Chat"
          className="p-1.5 rounded-lg border-2 border-slate-900 bg-white text-slate-900 hover:bg-amber-50 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto p-3.5 space-y-3 bg-[#FFFDF7]">
        {messages.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center px-4">
            <p className="font-display text-sm font-bold text-slate-800">Lounge is quiet</p>
            <p className="text-xs text-slate-500 mt-1">
              Kick off the conversation or invite someone to a match!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderUid === currentUser.uid;
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                <AvatarBadge
                  avatarId={msg.senderAvatar}
                  name={msg.senderName}
                  emblemIcon={msg.senderEmblem}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-0.5">
                    <span className={`font-bold ${isMine ? 'text-blue-700' : 'text-slate-900'}`}>
                      {msg.senderName}
                      {isMine ? ' (You)' : ''}
                    </span>
                    {msg.senderTitle ? (
                      <span className="px-1.5 py-0.5 rounded border border-slate-300 bg-amber-100 text-[10px] font-bold text-slate-800">
                        {msg.senderTitle}
                      </span>
                    ) : null}
                    <span className="text-slate-400">
                      {formatRelativeTime(msg.createdAt?.toDate() ?? null)}
                    </span>
                  </div>
                  <p className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 leading-relaxed break-words">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Quick Prompts & Composer */}
      <div className="p-3 border-t-2 border-slate-900 bg-white space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {CHILL_QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => void sendText(prompt)}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-amber-50 hover:bg-amber-200 hover:border-slate-900 text-[11px] font-bold text-slate-800 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              {prompt}
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
            placeholder="Say something in chill chat..."
            aria-label="Public chill chat message"
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
    </div>
  );
}
