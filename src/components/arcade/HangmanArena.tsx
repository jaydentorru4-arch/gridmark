import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import {
  HANGMAN_MAX_WRONG,
  getRandomHangmanPrompt,
  guessHangmanLetter,
  setHangmanSecret,
  type HangmanState,
} from '../../games/engines/hangmanEngine';
import type { ArcadeGameProps } from '../../types/arcade';
import { PassCurtain } from './PassCurtain';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function HangmanArena({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<HangmanState>) {
  const [wordInput, setWordInput] = useState('');
  const [hintInput, setHintInput] = useState('');
  const [setupError, setSetupError] = useState('');
  const [curtainDismissed, setCurtainDismissed] = useState(false);

  const setterPlayer = state.setter === '1' ? player1 : player2;
  const guesserPlayer = state.guesser === '1' ? player1 : player2;

  const isSetter =
    mode === 'local' ? state.phase === 'setup' : viewerUid === setterPlayer.uid;
  const isGuesser =
    mode === 'local' ? state.phase === 'playing' : viewerUid === guesserPlayer.uid;

  // In Pass & Play, shield screen right after setter locks word so Guesser can step up
  if (mode === 'local' && state.phase === 'playing' && !curtainDismissed && state.guessedLetters.length === 0) {
    return (
      <PassCurtain
        nextPlayerName={guesserPlayer.name}
        subtitle="The secret word is locked in. Step up and try to solve it!"
        onReveal={() => setCurtainDismissed(true)}
      />
    );
  }

  const handleSubmitWord = async (e: FormEvent) => {
    e.preventDefault();
    setSetupError('');
    try {
      const nextState = setHangmanSecret(state, wordInput, hintInput);
      setWordInput('');
      setHintInput('');
      setCurtainDismissed(false);
      await onCommitState({
        nextState,
        nextTurnUid: guesserPlayer.uid,
      });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Invalid secret word.');
    }
  };

  const handleUseRandomWord = () => {
    const prompt = getRandomHangmanPrompt();
    setWordInput(prompt.word);
    setHintInput(prompt.hint);
    setSetupError('');
  };

  const handleGuessLetter = async (letter: string) => {
    if (busy || state.phase !== 'playing' || !isGuesser || isFinished) return;
    if (state.guessedLetters.includes(letter)) return;
    const nextState = guessHangmanLetter(state, letter);
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === '1'
        ? player1.uid
        : nextState.winner === '2'
          ? player2.uid
          : '';
    await onCommitState({
      nextState,
      nextTurnUid: guesserPlayer.uid,
      finished,
      winnerUid,
      resultSummary: nextState.outcomeReason,
    });
  };

  // Setup Phase
  if (state.phase === 'setup') {
    if (!isSetter) {
      return (
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_5px_0_0_#0F172A] text-center max-w-lg mx-auto">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Waiting for {setterPlayer.name}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {setterPlayer.name} is picking a secret word for you to solve...
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-lg mx-auto">
        <h2 className="font-display text-xl font-bold text-slate-900">
          {setterPlayer.name}: Choose Secret Word
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Enter a word (3–14 letters) for {guesserPlayer.name} to guess, or roll a random word.
        </p>

        <form onSubmit={handleSubmitWord} className="mt-5 space-y-4">
          <div>
            <label htmlFor="hm-word" className="block text-xs font-bold text-slate-700 mb-1.5">
              Secret Word (A–Z)
            </label>
            <input
              id="hm-word"
              type="text"
              maxLength={14}
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              placeholder="ELEPHANT"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 font-mono text-base font-bold tracking-widest uppercase text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="hm-hint" className="block text-xs font-bold text-slate-700 mb-1.5">
              Category Hint (optional)
            </label>
            <input
              id="hm-hint"
              type="text"
              maxLength={40}
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              placeholder="e.g. Animal, Space, Food..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-sm text-slate-900"
            />
          </div>

          {setupError && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2">
              {setupError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleUseRandomWord}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Random Word
            </button>
            <button
              type="submit"
              disabled={busy || wordInput.length < 3}
              className="flex-1 py-2.5 px-5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
            >
              Lock Secret Word
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Playing / Finished Phase
  const wrongCount = state.wrongLetters.length;
  const revealAll = isFinished || (mode === 'online' && isSetter);

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-500">
            Setter: {setterPlayer.name} · Guesser: {guesserPlayer.name}
          </span>
          {state.hint && (
            <p className="text-xs font-bold text-blue-700 mt-0.5">
              Hint: {state.hint}
            </p>
          )}
        </div>
        <span className="px-3 py-1 rounded-xl border-2 border-slate-900 bg-rose-50 text-xs font-mono font-bold text-rose-800 tabular-nums">
          Mistakes: {wrongCount}/{HANGMAN_MAX_WRONG}
        </span>
      </div>

      {/* Gallows SVG + Secret Word Slots */}
      <div className="flex flex-col items-center gap-6">
        <svg
          viewBox="0 0 200 180"
          className="w-44 h-40 stroke-slate-900"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Base & Post */}
          <line x1="20" y1="168" x2="110" y2="168" />
          <line x1="55" y1="168" x2="55" y2="20" />
          <line x1="55" y1="20" x2="135" y2="20" />
          <line x1="135" y1="20" x2="135" y2="40" />
          {/* 1: Head */}
          {wrongCount >= 1 && <circle cx="135" cy="56" r="16" className="fill-amber-100" />}
          {/* 2: Body */}
          {wrongCount >= 2 && <line x1="135" y1="72" x2="135" y2="118" />}
          {/* 3: Left Arm */}
          {wrongCount >= 3 && <line x1="135" y1="84" x2="112" y2="104" />}
          {/* 4: Right Arm */}
          {wrongCount >= 4 && <line x1="135" y1="84" x2="158" y2="104" />}
          {/* 5: Left Leg */}
          {wrongCount >= 5 && <line x1="135" y1="118" x2="116" y2="148" />}
          {/* 6: Right Leg */}
          {wrongCount >= 6 && <line x1="135" y1="118" x2="154" y2="148" />}
        </svg>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {state.secretWord.split('').map((ch, idx) => {
            const guessed = state.guessedLetters.includes(ch);
            const shown = guessed || revealAll;
            return (
              <div
                key={idx}
                className={`w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 border-slate-900 flex items-center justify-center font-display text-xl font-extrabold ${
                  guessed
                    ? 'bg-emerald-100 text-slate-900'
                    : isFinished
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-50 text-slate-700'
                }`}
              >
                {shown ? ch : '_'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Letter Keyboard */}
      <div className="grid grid-cols-7 sm:grid-cols-9 gap-2">
        {ALPHABET.map((letter) => {
          const already = state.guessedLetters.includes(letter);
          const isWrong = state.wrongLetters.includes(letter);
          const isHit = already && !isWrong;
          return (
            <button
              key={letter}
              type="button"
              disabled={already || !isGuesser || isFinished || busy}
              onClick={() => void handleGuessLetter(letter)}
              className={`h-11 rounded-xl border-2 border-slate-900 font-display text-sm font-bold transition-all cursor-pointer disabled:cursor-default ${
                isHit
                  ? 'bg-emerald-400 text-slate-900'
                  : isWrong
                    ? 'bg-slate-200 text-slate-400 opacity-60'
                    : isGuesser && !isFinished
                      ? 'bg-white text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-200 active:translate-y-[1px] active:shadow-none'
                      : 'bg-slate-50 text-slate-500'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
