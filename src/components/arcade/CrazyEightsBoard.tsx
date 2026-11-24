import { useState } from 'react';
import {
  SUIT_NAMES,
  drawCrazyEightsCard,
  isCardPlayable,
  passCrazyEightsTurn,
  playCrazyEightsCard,
  type CardSuit,
  type CrazyEightsState,
  type PlayingCard,
} from '../../games/engines/crazyEightsEngine';
import type { ArcadeGameProps } from '../../types/arcade';
import { PassCurtain } from './PassCurtain';

const SUIT_SYMBOL: Record<CardSuit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

function isRedSuit(suit: CardSuit): boolean {
  return suit === 'H' || suit === 'D';
}

function CardFace({
  card,
  playable,
  onClick,
  disabled,
}: {
  card: PlayingCard;
  playable?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const red = isRedSuit(card.suit);
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={`w-18 h-26 sm:w-20 sm:h-28 rounded-xl border-2 border-slate-900 bg-white p-2 flex flex-col justify-between transition-all select-none ${
        playable
          ? 'shadow-[0_4px_0_0_#0F172A] hover:-translate-y-1.5 cursor-pointer ring-2 ring-amber-400'
          : onClick
            ? 'opacity-60 cursor-not-allowed'
            : 'shadow-[0_3px_0_0_#0F172A] cursor-default'
      }`}
    >
      <div className={`text-left leading-none font-display font-extrabold text-sm ${red ? 'text-rose-600' : 'text-slate-900'}`}>
        <div>{card.rank}</div>
        <div>{SUIT_SYMBOL[card.suit]}</div>
      </div>
      <div className={`text-center text-2xl leading-none ${red ? 'text-rose-600' : 'text-slate-900'}`}>
        {SUIT_SYMBOL[card.suit]}
      </div>
      <div className={`text-right leading-none font-display font-extrabold text-sm rotate-180 ${red ? 'text-rose-600' : 'text-slate-900'}`}>
        <div>{card.rank}</div>
      </div>
    </button>
  );
}

export function CrazyEightsBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<CrazyEightsState>) {
  const [pendingEightCardId, setPendingEightCardId] = useState<string | null>(null);
  const [curtainOpen, setCurtainOpen] = useState<boolean>(mode === 'local');

  const me: '1' | '2' =
    mode === 'local'
      ? state.turn
      : viewerUid === player2.uid
        ? '2'
        : '1';

  const myName = me === '1' ? player1.name : player2.name;
  const oppName = me === '1' ? player2.name : player1.name;

  if (mode === 'local' && !isFinished && curtainOpen) {
    return (
      <PassCurtain
        nextPlayerName={myName}
        subtitle="Take your turn without letting the other player see your cards."
        onReveal={() => setCurtainOpen(false)}
      />
    );
  }

  const myHand = me === '1' ? state.p1Hand : state.p2Hand;
  const oppCount = me === '1' ? state.p2Hand.length : state.p1Hand.length;
  const topDiscard = state.discard[state.discard.length - 1];
  const isMyTurn = !isFinished && !busy && state.turn === me;

  const commitTransition = async (nextState: CrazyEightsState) => {
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === '1' ? player1.uid : nextState.winner === '2' ? player2.uid : '';
    const nextTurnUid = nextState.turn === '1' ? player1.uid : player2.uid;
    if (mode === 'local' && !finished && nextState.turn !== state.turn) {
      setCurtainOpen(true);
    }
    await onCommitState({
      nextState,
      nextTurnUid,
      finished,
      winnerUid,
      resultSummary: finished ? `${nextState.winner === '1' ? player1.name : player2.name} emptied their hand!` : '',
    });
  };

  const handleCardClick = async (card: PlayingCard) => {
    if (!isMyTurn || !isCardPlayable(card, state)) return;
    if (card.rank === '8') {
      setPendingEightCardId(card.id);
      return;
    }
    const nextState = playCrazyEightsCard(state, me, card.id);
    await commitTransition(nextState);
  };

  const handleChooseSuit = async (suit: CardSuit) => {
    if (!pendingEightCardId) return;
    const nextState = playCrazyEightsCard(state, me, pendingEightCardId, suit);
    setPendingEightCardId(null);
    await commitTransition(nextState);
  };

  const handleDraw = async () => {
    if (!isMyTurn || state.drewThisTurn) return;
    const nextState = drawCrazyEightsCard(state, me);
    await commitTransition(nextState);
  };

  const handlePass = async () => {
    if (!isMyTurn || !state.drewThisTurn) return;
    const nextState = passCrazyEightsTurn(state, me);
    await commitTransition(nextState);
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-3xl mx-auto space-y-6 relative">
      {/* Opponent Hand Backs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-slate-700">
            {oppName}&apos;s Hand ({oppCount} {oppCount === 1 ? 'card' : 'cards'})
          </span>
        </div>
        <div className="flex items-center -space-x-4">
          {Array.from({ length: Math.min(oppCount, 8) }, (_, idx) => (
            <div
              key={idx}
              className="w-9 h-12 rounded-lg border-2 border-slate-900 bg-blue-600 shadow-sm flex items-center justify-center"
            >
              <div className="w-5 h-7 rounded border border-white/40 bg-blue-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Center: Stock + Discard + Active Suit */}
      <div className="bg-emerald-50 border-2 border-slate-900 rounded-2xl p-5 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={!isMyTurn || state.drewThisTurn}
            onClick={() => void handleDraw()}
            className={`w-20 h-28 rounded-xl border-2 border-slate-900 bg-blue-600 text-white flex flex-col items-center justify-center gap-1 transition-all ${
              isMyTurn && !state.drewThisTurn
                ? 'shadow-[0_4px_0_0_#0F172A] hover:-translate-y-1 cursor-pointer'
                : 'opacity-65 cursor-default'
            }`}
          >
            <span className="font-display text-sm font-extrabold">DRAW</span>
            <span className="text-xs font-mono font-bold tabular-nums">{state.stock.length}</span>
          </button>
          <span className="text-[11px] font-bold text-slate-600">Stock Pile</span>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-2">
          {topDiscard && <CardFace card={topDiscard} />}
          <span className="text-[11px] font-bold text-slate-600">Top Discard</span>
        </div>

        {/* Active Suit & Last Action */}
        <div className="max-w-[200px] text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold">
            <span>Active Suit:</span>
            <span className={`text-base ${isRedSuit(state.activeSuit) ? 'text-rose-600' : 'text-slate-900'}`}>
              {SUIT_SYMBOL[state.activeSuit]} {SUIT_NAMES[state.activeSuit]}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{state.lastAction}</p>
          {isMyTurn && state.drewThisTurn && (
            <button
              type="button"
              onClick={() => void handlePass()}
              className="px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] cursor-pointer"
            >
              Pass Turn
            </button>
          )}
        </div>
      </div>

      {/* My Hand */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-slate-900">
            {myName}&apos;s Cards ({myHand.length})
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {isMyTurn ? 'Click a highlighted card or draw from Stock' : `Waiting for ${oppName}...`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {myHand.map((card) => {
            const playable = isMyTurn && isCardPlayable(card, state);
            return (
              <CardFace
                key={card.id}
                card={card}
                playable={playable}
                disabled={!playable}
                onClick={() => void handleCardClick(card)}
              />
            );
          })}
        </div>
      </div>

      {/* Wild 8 Suit Picker Overlay */}
      {pendingEightCardId && (
        <div className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center p-4 z-10">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_6px_0_0_#0F172A] text-center max-w-sm w-full">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Wild 8! Pick Next Suit
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(['S', 'H', 'D', 'C'] as const).map((suit) => (
                <button
                  key={suit}
                  type="button"
                  onClick={() => void handleChooseSuit(suit)}
                  className="py-3 px-4 rounded-xl border-2 border-slate-900 bg-amber-50 hover:bg-amber-200 font-display text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className={`text-xl ${isRedSuit(suit) ? 'text-rose-600' : 'text-slate-900'}`}>
                    {SUIT_SYMBOL[suit]}
                  </span>
                  <span>{SUIT_NAMES[suit]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingEightCardId(null)}
              className="mt-4 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
