import { useState } from 'react';
import { CheckCircle2, FileText, Hand, Scissors, Shield } from 'lucide-react';
import {
  advanceRpsRound,
  submitRpsPick,
  switchRpsMode,
  type RpsChoice,
  type RpsMode,
  type RpsState,
} from '../../games/engines/rpsEngine';
import type { ArcadeGameProps } from '../../types/arcade';
import { PassCurtain } from './PassCurtain';

const CHOICES: Array<{
  id: Exclude<RpsChoice, ''>;
  label: string;
  beats: string;
  bg: string;
}> = [
  { id: 'rock', label: 'Rock', beats: 'Crushes Scissors', bg: 'bg-rose-100' },
  { id: 'paper', label: 'Paper', beats: 'Covers Rock', bg: 'bg-sky-100' },
  { id: 'scissors', label: 'Scissors', beats: 'Cuts Paper', bg: 'bg-amber-100' },
];

function ChoiceEmblem({ choice, className = 'w-8 h-8' }: { choice: RpsChoice; className?: string }) {
  if (choice === 'rock') return <Shield className={className} />;
  if (choice === 'paper') return <FileText className={className} />;
  if (choice === 'scissors') return <Scissors className={className} />;
  return <Hand className={className} />;
}

export function RpsArena({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<RpsState>) {
  const [curtainFor, setCurtainFor] = useState<'1' | '2' | null>(
    mode === 'local' ? '1' : null,
  );

  const me: '1' | '2' =
    mode === 'local'
      ? state.p1Choice === ''
        ? '1'
        : '2'
      : viewerUid === player2.uid
        ? '2'
        : '1';

  const canChangeFormat =
    state.history.length === 0 && state.p1Choice === '' && state.p2Choice === '';

  const handleModeChange = async (rpsMode: RpsMode) => {
    if (!canChangeFormat || busy) return;
    const nextState = switchRpsMode(state, rpsMode);
    await onCommitState({ nextState, nextTurnUid: '' });
  };

  const handlePick = async (choice: Exclude<RpsChoice, ''>) => {
    if (busy || state.phase !== 'picking') return;
    const currentMyPick = me === '1' ? state.p1Choice : state.p2Choice;
    if (currentMyPick !== '') return;

    const nextState = submitRpsPick(state, me, choice);
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === '1' ? player1.uid : nextState.winner === '2' ? player2.uid : '';
    const resultSummary = finished
      ? `Final Score ${nextState.p1Score}–${nextState.p2Score}`
      : '';

    if (mode === 'local') {
      if (nextState.phase === 'picking' && nextState.p2Choice === '') {
        setCurtainFor('2');
      } else {
        setCurtainFor(null);
      }
    }

    await onCommitState({
      nextState,
      nextTurnUid: '',
      finished,
      winnerUid,
      resultSummary,
    });
  };

  const handleNextRound = async () => {
    if (busy || state.phase !== 'reveal') return;
    const nextState = advanceRpsRound(state);
    if (mode === 'local') setCurtainFor('1');
    await onCommitState({ nextState, nextTurnUid: '' });
  };

  if (mode === 'local' && state.phase === 'picking' && curtainFor) {
    const targetName = curtainFor === '1' ? player1.name : player2.name;
    return (
      <PassCurtain
        nextPlayerName={targetName}
        subtitle="Lock in your secret Rock, Paper, or Scissors choice."
        onReveal={() => setCurtainFor(null)}
      />
    );
  }

  const myPick = me === '1' ? state.p1Choice : state.p2Choice;
  const oppPick = me === '1' ? state.p2Choice : state.p1Choice;
  const latestRound = state.history[state.history.length - 1];

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-2xl mx-auto space-y-6">
      {/* Mode & Scoreboard Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Round {state.roundNumber} · First to {state.targetWins}
          </span>
          <div className="mt-1 flex items-center gap-4 text-lg font-display font-bold text-slate-900 tabular-nums">
            <span>
              {player1.name}: {state.p1Score}
            </span>
            <span className="text-slate-400">vs</span>
            <span>
              {player2.name}: {state.p2Score}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 border-2 border-slate-900 rounded-xl">
          {(['bo3', 'bo5'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={!canChangeFormat}
              onClick={() => void handleModeChange(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap ${
                state.mode === m ? 'bg-amber-300 text-slate-900 border border-slate-900' : 'text-slate-600'
              }`}
            >
              {m === 'bo3' ? 'Best of 3' : 'Best of 5'}
            </button>
          ))}
        </div>
      </div>

      {/* Picking Phase */}
      {state.phase === 'picking' && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-800 text-center">
            {myPick !== ''
              ? 'Your pick is locked in! Waiting for opponent...'
              : `${me === '1' ? player1.name : player2.name}, make your secret choice:`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHOICES.map((c) => {
              const selected = myPick === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={myPick !== '' || busy}
                  onClick={() => void handlePick(c.id)}
                  className={`p-5 rounded-2xl border-2 border-slate-900 flex flex-col items-center text-center gap-2.5 transition-all cursor-pointer disabled:cursor-default ${
                    selected
                      ? 'bg-amber-300 shadow-[0_5px_0_0_#0F172A] scale-[1.02]'
                      : myPick !== ''
                        ? 'bg-slate-50 opacity-50'
                        : `${c.bg} shadow-[0_4px_0_0_#0F172A] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none`
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-center">
                    <ChoiceEmblem choice={c.id} className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-600">{c.beats}</p>
                  </div>
                  {selected && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {mode === 'online' && (
            <p className="text-xs text-center text-slate-500">
              Opponent status: {oppPick !== '' ? 'Locked in ✓' : 'Choosing...'}
            </p>
          )}
        </div>
      )}

      {/* Reveal / Finished Clash Display */}
      {(state.phase === 'reveal' || isFinished) && latestRound && (
        <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/70 p-6 text-center space-y-4">
          <div className="grid grid-cols-3 items-center gap-3">
            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 flex flex-col items-center gap-1.5">
              <ChoiceEmblem choice={latestRound.p1Choice} className="w-8 h-8 text-rose-600" />
              <span className="text-xs font-bold text-slate-900 truncate max-w-full">
                {player1.name}
              </span>
              <span className="text-xs uppercase font-mono font-bold text-slate-500">
                {latestRound.p1Choice}
              </span>
            </div>

            <div className="font-display text-xl font-extrabold text-slate-900">VS</div>

            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 flex flex-col items-center gap-1.5">
              <ChoiceEmblem choice={latestRound.p2Choice} className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 truncate max-w-full">
                {player2.name}
              </span>
              <span className="text-xs uppercase font-mono font-bold text-slate-500">
                {latestRound.p2Choice}
              </span>
            </div>
          </div>

          <p className="font-display text-lg font-bold text-slate-900">
            {latestRound.winner === 'draw'
              ? `Round ${latestRound.round} Draw! Replay round.`
              : latestRound.winner === '1'
                ? `${player1.name} wins Round ${latestRound.round}!`
                : `${player2.name} wins Round ${latestRound.round}!`}
          </p>

          {state.phase === 'reveal' && !isFinished && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleNextRound()}
              className="px-6 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 cursor-pointer"
            >
              Start Next Round
            </button>
          )}
        </div>
      )}

      {/* Round History */}
      {state.history.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Round Log
          </h3>
          <div className="flex flex-wrap gap-2">
            {state.history.map((h) => (
              <div
                key={h.round}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-800"
              >
                R{h.round}: <span className="font-bold capitalize">{h.p1Choice}</span> vs{' '}
                <span className="font-bold capitalize">{h.p2Choice}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
