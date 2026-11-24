import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, RotateCcw, Users, Volume2, VolumeX } from 'lucide-react';
import { evaluateBoard } from '../lib/gameLogic';
import { soundFx } from '../lib/sound';
import type { AvatarId, CellValue, GameMark } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface LocalGameBoardProps {
  defaultPlayerOneName?: string;
  defaultPlayerOneAvatar?: AvatarId;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBack: () => void;
}

function MarkSvg({ mark, muted = false }: { mark: 'X' | 'O'; muted?: boolean }) {
  if (mark === 'X') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`w-12 h-12 sm:w-14 sm:h-14 ${muted ? 'text-rose-500 opacity-30' : 'text-rose-500 animate-mark'}`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M16 16L48 48M48 16L16 48"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={`w-12 h-12 sm:w-14 sm:h-14 ${muted ? 'text-blue-600 opacity-30' : 'text-blue-600 animate-mark'}`}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth="8.5" />
    </svg>
  );
}

export function LocalGameBoard({
  defaultPlayerOneName = 'Player 1',
  defaultPlayerOneAvatar = 'coral',
  soundEnabled,
  onToggleSound,
  onBack,
}: LocalGameBoardProps) {
  const [playerOneName, setPlayerOneName] = useState(defaultPlayerOneName);
  const [playerTwoName, setPlayerTwoName] = useState('Player 2');
  const [editingNames, setEditingNames] = useState(false);

  // Track which friend plays X in the current round (alternates on swap/next round if desired)
  const [playerOneMark, setPlayerOneMark] = useState<GameMark>('X');
  const [board, setBoard] = useState<CellValue[]>(() => Array(9).fill('') as CellValue[]);
  const [currentTurn, setCurrentTurn] = useState<GameMark>('X');
  const [scores, setScores] = useState({ p1: 0, draws: 0, p2: 0 });

  const evaluation = useMemo(() => evaluateBoard(board), [board]);
  const moveCount = useMemo(() => board.filter((c) => c !== '').length, [board]);

  const playerTwoMark: GameMark = playerOneMark === 'X' ? 'O' : 'X';
  const xPlayerName = playerOneMark === 'X' ? playerOneName : playerTwoName;
  const oPlayerName = playerOneMark === 'O' ? playerOneName : playerTwoName;
  const activePlayerName = currentTurn === 'X' ? xPlayerName : oPlayerName;

  const handleCellClick = (index: number) => {
    if (evaluation.isFinished || board[index] !== '') return;

    const nextBoard = [...board] as CellValue[];
    nextBoard[index] = currentTurn;
    const nextEval = evaluateBoard(nextBoard);

    setBoard(nextBoard);
    if (nextEval.isFinished) {
      if (nextEval.winner === 'draw') {
        soundFx.playDraw();
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        soundFx.playWin();
        const p1Won = nextEval.winner === playerOneMark;
        setScores((prev) => ({
          ...prev,
          p1: prev.p1 + (p1Won ? 1 : 0),
          p2: prev.p2 + (p1Won ? 0 : 1),
        }));
      }
    } else {
      soundFx.playMove(currentTurn);
      setCurrentTurn(currentTurn === 'X' ? 'O' : 'X');
    }
  };

  const startNextRound = (swapStarter = true) => {
    if (swapStarter) {
      setPlayerOneMark((prev) => (prev === 'X' ? 'O' : 'X'));
    }
    setBoard(Array(9).fill('') as CellValue[]);
    setCurrentTurn('X');
  };

  let statusHeadline = '';
  let statusDetail = '';
  let statusTone = 'border-slate-900 bg-white text-slate-900';

  if (evaluation.isFinished) {
    if (evaluation.winner === 'draw') {
      statusHeadline = "It's a tie! Run it back?";
      statusDetail = 'Nobody budged · Play another round';
      statusTone = 'border-slate-900 bg-amber-100 text-slate-900';
    } else {
      const winnerName = evaluation.winner === 'X' ? xPlayerName : oPlayerName;
      statusHeadline = `${winnerName} wins the round!`;
      statusDetail = `${evaluation.winner} lined up three in a row`;
      statusTone = 'border-slate-900 bg-emerald-100 text-emerald-950';
    }
  } else {
    statusHeadline = `${activePlayerName}'s turn (${currentTurn})`;
    statusDetail = `Pass & Play · Move ${moveCount + 1} of 9`;
    statusTone =
      currentTurn === 'X'
        ? 'border-slate-900 bg-rose-50 text-rose-950'
        : 'border-slate-900 bg-sky-50 text-sky-950';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">
            Pass & Play <span aria-hidden="true" className="mx-1.5">·</span> Same Device
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            className="p-2 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 cursor-pointer"
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Couch Versus Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
          <div className={`rounded-xl border-2 px-4 py-3 mb-6 ${statusTone}`}>
            <p className="font-display text-lg font-bold">{statusHeadline}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{statusDetail}</p>
          </div>

          <div
            className="max-w-sm mx-auto bg-amber-100/80 border-2 border-slate-900 rounded-2xl p-3.5 grid grid-cols-3 gap-3 shadow-[0_5px_0_0_#0F172A]"
            role="grid"
            aria-label="Pass and Play Tic-Tac-Toe Board"
          >
            {board.map((cell, idx) => {
              const isWinningCell = evaluation.winningLine.includes(idx);
              const canPlace = !evaluation.isFinished && cell === '';
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canPlace}
                  onClick={() => handleCellClick(idx)}
                  aria-label={`Row ${Math.floor(idx / 3) + 1} Column ${(idx % 3) + 1}: ${
                    cell === '' ? 'Empty' : cell
                  }`}
                  className={`group aspect-square min-h-[88px] sm:min-h-[108px] rounded-xl border-2 border-slate-900 flex items-center justify-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    isWinningCell
                      ? 'bg-emerald-100 shadow-[0_3px_0_0_#0F172A]'
                      : cell !== ''
                        ? 'bg-white shadow-[0_2px_0_0_#0F172A]'
                        : canPlace
                          ? 'bg-white shadow-[0_4px_0_0_#0F172A] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_0_#0F172A] cursor-pointer'
                          : 'bg-white/75 cursor-default'
                  }`}
                >
                  {cell !== '' ? (
                    <MarkSvg mark={cell} />
                  ) : canPlace ? (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <MarkSvg mark={currentTurn} muted />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-7 pt-5 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => startNextRound(evaluation.isFinished)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-[0_1px_0_0_#0F172A] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {evaluation.isFinished ? 'Next Round (Swap First)' : 'Reset Board'}
            </button>

            <button
              type="button"
              onClick={() => startNextRound(true)}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 shadow-[0_3px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_1px_0_0_#0F172A] cursor-pointer whitespace-nowrap"
            >
              Swap X / O
            </button>
          </div>
        </div>

        {/* Right Column: Friends & Couch Scoreboard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-900" />
                <h2 className="font-display text-base font-bold text-slate-900">Players</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingNames((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editingNames ? 'Done' : 'Edit Names'}
              </button>
            </div>

            {editingNames ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="local-p1-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Player 1 Name
                  </label>
                  <input
                    id="local-p1-name"
                    type="text"
                    maxLength={24}
                    value={playerOneName}
                    onChange={(e) => setPlayerOneName(e.target.value || 'Player 1')}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="local-p2-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Player 2 Name
                  </label>
                  <input
                    id="local-p2-name"
                    type="text"
                    maxLength={24}
                    value={playerTwoName}
                    onChange={(e) => setPlayerTwoName(e.target.value || 'Player 2')}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Player 1 */}
                <div
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                    !evaluation.isFinished && currentTurn === playerOneMark
                      ? 'border-slate-900 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={defaultPlayerOneAvatar} name={playerOneName} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{playerOneName}</p>
                      <p className="text-xs text-slate-500">
                        {playerOneMark === 'X' ? 'Goes first' : 'Goes second'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-display text-2xl font-bold shrink-0 ${
                      playerOneMark === 'X' ? 'text-rose-500' : 'text-blue-600'
                    }`}
                  >
                    {playerOneMark}
                  </span>
                </div>

                {/* Player 2 */}
                <div
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                    !evaluation.isFinished && currentTurn === playerTwoMark
                      ? 'border-slate-900 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId="amber" name={playerTwoName} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{playerTwoName}</p>
                      <p className="text-xs text-slate-500">
                        {playerTwoMark === 'X' ? 'Goes first' : 'Goes second'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-display text-2xl font-bold shrink-0 ${
                      playerTwoMark === 'X' ? 'text-rose-500' : 'text-blue-600'
                    }`}
                  >
                    {playerTwoMark}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-display text-sm font-bold text-slate-900">Session Scoreboard</h3>
              <button
                type="button"
                onClick={() => setScores({ p1: 0, draws: 0, p2: 0 })}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Reset Score
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-rose-50 border-2 border-slate-900/15">
                <p className="text-xs font-semibold text-slate-700 truncate">{playerOneName}</p>
                <p className="font-display text-2xl font-bold text-rose-600 tabular-nums mt-0.5">
                  {scores.p1}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-slate-900/15">
                <p className="text-xs font-semibold text-slate-700">Ties</p>
                <p className="font-display text-2xl font-bold text-slate-800 tabular-nums mt-0.5">
                  {scores.draws}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-sky-50 border-2 border-slate-900/15">
                <p className="text-xs font-semibold text-slate-700 truncate">{playerTwoName}</p>
                <p className="font-display text-2xl font-bold text-blue-600 tabular-nums mt-0.5">
                  {scores.p2}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
