import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import {
  submitWordGuess,
  type LetterMark,
  type WordGuessState,
} from '../../games/engines/wordGuessEngine';
import type { ArcadeGameProps } from '../../types/arcade';
import { PassCurtain } from './PassCurtain';

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const MARK_STYLES: Record<LetterMark, string> = {
  correct: 'bg-emerald-500 text-white border-slate-900',
  present: 'bg-amber-300 text-slate-900 border-slate-900',
  absent: 'bg-slate-400 text-white border-slate-900',
};

export function WordGuessArena({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<WordGuessState>) {
  const [draft, setDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [curtainOpen, setCurtainOpen] = useState<boolean>(mode === 'local');

  const me: '1' | '2' =
    mode === 'local'
      ? state.turn
      : viewerUid === player2.uid
        ? '2'
        : '1';

  const canType =
    !isFinished &&
    !busy &&
    !(mode === 'local' && curtainOpen) &&
    state.turn === me;

  const myRows = me === '1' ? state.p1Guesses : state.p2Guesses;
  const oppRows = me === '1' ? state.p2Guesses : state.p1Guesses;
  const myName = me === '1' ? player1.name : player2.name;
  const oppName = me === '1' ? player2.name : player1.name;

  // Build keyboard letter status from my guesses
  const letterStatus: Record<string, LetterMark> = {};
  const priority: Record<LetterMark, number> = { absent: 1, present: 2, correct: 3 };
  for (const row of myRows) {
    for (let i = 0; i < 5; i++) {
      const ch = row.word[i];
      const m = row.marks[i];
      if (!letterStatus[ch] || priority[m] > priority[letterStatus[ch]]) {
        letterStatus[ch] = m;
      }
    }
  }

  const handleSubmit = async () => {
    if (!canType) return;
    setErrorMsg('');
    if (draft.length !== 5) {
      setErrorMsg('Enter a full 5-letter word.');
      return;
    }

    try {
      const nextState = submitWordGuess(state, me, draft);
      setDraft('');
      const finished = nextState.winner !== '';
      const winnerUid =
        nextState.winner === '1'
          ? player1.uid
          : nextState.winner === '2'
            ? player2.uid
            : nextState.winner === 'draw'
              ? 'draw'
              : '';
      const nextTurnUid = nextState.turn === '1' ? player1.uid : player2.uid;

      if (mode === 'local' && !finished) {
        setCurtainOpen(true);
      }

      await onCommitState({
        nextState,
        nextTurnUid,
        finished,
        winnerUid,
        resultSummary: nextState.outcomeReason,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid guess.');
    }
  };

  const handleKeyPress = (key: string) => {
    if (!canType) return;
    setErrorMsg('');
    if (key === 'ENTER') {
      void handleSubmit();
      return;
    }
    if (key === 'BACK') {
      setDraft((d) => d.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(key) && draft.length < 5) {
      setDraft((d) => d + key);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!canType) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
      } else if (e.key === 'Backspace') {
        setDraft((d) => d.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toUpperCase();
        setDraft((d) => (d.length < 5 ? d + ch : d));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (mode === 'local' && !isFinished && curtainOpen) {
    return (
      <PassCurtain
        nextPlayerName={myName}
        subtitle="Make your next 5-letter guess without revealing your board."
        onReveal={() => setCurtainOpen(false)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Active Board & Keyboard */}
      <div className="lg:col-span-8 bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {myName}&apos;s Word Grid
            </h2>
            <p className="text-xs text-slate-500">
              {isFinished
                ? `Secret word was ${state.targetWord}`
                : canType
                  ? 'Type or tap a 5-letter word and press Enter'
                  : `Waiting for ${oppName}'s guess...`}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
            {myRows.length}/6 guesses
          </span>
        </div>

        {/* 6x5 Guess Grid */}
        <div className="grid grid-rows-6 gap-2 max-w-[300px] mx-auto">
          {Array.from({ length: 6 }, (_, r) => {
            const submitted = myRows[r];
            const isActiveRow = !submitted && r === myRows.length && canType;
            return (
              <div key={r} className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, c) => {
                  const char = submitted
                    ? submitted.word[c]
                    : isActiveRow
                      ? draft[c] || ''
                      : '';
                  const mark = submitted?.marks[c];
                  return (
                    <div
                      key={c}
                      className={`aspect-square rounded-xl border-2 flex items-center justify-center font-display text-xl font-extrabold uppercase ${
                        mark
                          ? MARK_STYLES[mark]
                          : char
                            ? 'border-slate-900 bg-amber-50 text-slate-900 animate-mark'
                            : 'border-slate-300 bg-white text-slate-900'
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2 text-center">
            {errorMsg}
          </p>
        )}

        {/* On-Screen Keyboard */}
        <div className="space-y-1.5 max-w-lg mx-auto select-none">
          {KEY_ROWS.map((row, idx) => (
            <div key={idx} className="flex justify-center gap-1 sm:gap-1.5">
              {row.map((key) => {
                const status = letterStatus[key];
                const isWide = key === 'ENTER' || key === 'BACK';
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!canType}
                    onClick={() => handleKeyPress(key)}
                    className={`h-11 ${
                      isWide ? 'px-2.5 sm:px-3.5 text-[11px]' : 'flex-1 max-w-[42px] text-xs sm:text-sm'
                    } rounded-lg border-2 border-slate-900 font-bold flex items-center justify-center cursor-pointer disabled:opacity-60 active:translate-y-[1px] ${
                      status
                        ? MARK_STYLES[status]
                        : key === 'ENTER'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-900 hover:bg-amber-100'
                    }`}
                  >
                    {key === 'BACK' ? <Delete className="w-4 h-4" /> : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Opponent Progress Radar (Colors only while live) */}
      <div className="lg:col-span-4 bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[0_5px_0_0_#0F172A] space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {oppName}&apos;s Progress
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFinished ? 'Guesses revealed' : 'Letters stay hidden until match end'}
          </p>
        </div>

        <div className="grid grid-rows-6 gap-1.5 max-w-[200px] mx-auto">
          {Array.from({ length: 6 }, (_, r) => {
            const row = oppRows[r];
            return (
              <div key={r} className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 5 }, (_, c) => {
                  const mark = row?.marks[c];
                  return (
                    <div
                      key={c}
                      className={`aspect-square rounded-md border flex items-center justify-center text-xs font-bold ${
                        mark ? MARK_STYLES[mark] : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {isFinished && row ? row.word[c] : ''}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
