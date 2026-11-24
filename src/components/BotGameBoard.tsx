import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { chooseBotMove, type BotDifficulty } from '../lib/botAi';
import { evaluateBoard } from '../lib/gameLogic';
import { soundFx } from '../lib/sound';
import type { AvatarId, CellValue, GameMark } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface BotGameBoardProps {
  playerName: string;
  playerAvatar: AvatarId;
  initialDifficulty?: BotDifficulty;
  initialMark?: GameMark;
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

const DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  casual: 'Casual',
  tactical: 'Tactical',
  unbeatable: 'Unbeatable',
};

export function BotGameBoard({
  playerName,
  playerAvatar,
  initialDifficulty = 'tactical',
  initialMark = 'X',
  soundEnabled,
  onToggleSound,
  onBack,
}: BotGameBoardProps) {
  const [difficulty, setDifficulty] = useState<BotDifficulty>(initialDifficulty);
  const [humanMark, setHumanMark] = useState<GameMark>(initialMark);
  const [board, setBoard] = useState<CellValue[]>(() => Array(9).fill('') as CellValue[]);
  const [currentTurn, setCurrentTurn] = useState<GameMark>('X');
  const [sessionStats, setSessionStats] = useState({ wins: 0, draws: 0, losses: 0 });
  const [botThinking, setBotThinking] = useState(false);

  const botMark: GameMark = humanMark === 'X' ? 'O' : 'X';
  const evaluation = useMemo(() => evaluateBoard(board), [board]);
  const moveCount = useMemo(() => board.filter((c) => c !== '').length, [board]);

  const isHumanTurn = !evaluation.isFinished && currentTurn === humanMark;
  const isBotTurn = !evaluation.isFinished && currentTurn === botMark;

  // Automatic bot turn execution with realistic delay
  useEffect(() => {
    if (!isBotTurn) {
      setBotThinking(false);
      return;
    }

    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const chosenIndex = chooseBotMove(board, botMark, difficulty);
      if (chosenIndex >= 0 && board[chosenIndex] === '') {
        const nextBoard = [...board] as CellValue[];
        nextBoard[chosenIndex] = botMark;
        const nextEval = evaluateBoard(nextBoard);

        setBoard(nextBoard);
        if (nextEval.isFinished) {
          if (nextEval.winner === 'draw') {
            soundFx.playDraw();
            setSessionStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
          } else {
            soundFx.playWin();
            setSessionStats((prev) => ({ ...prev, losses: prev.losses + 1 }));
          }
        } else {
          soundFx.playMove(botMark);
          setCurrentTurn(humanMark);
        }
      }
      setBotThinking(false);
    }, 520);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, board, botMark, humanMark, difficulty]);

  const handleCellClick = (index: number) => {
    if (!isHumanTurn || botThinking || board[index] !== '') return;

    const nextBoard = [...board] as CellValue[];
    nextBoard[index] = humanMark;
    const nextEval = evaluateBoard(nextBoard);

    setBoard(nextBoard);
    if (nextEval.isFinished) {
      if (nextEval.winner === 'draw') {
        soundFx.playDraw();
        setSessionStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        soundFx.playWin();
        setSessionStats((prev) => ({ ...prev, wins: prev.wins + 1 }));
      }
    } else {
      soundFx.playMove(humanMark);
      setCurrentTurn(botMark);
    }
  };

  const resetMatch = (nextHumanMark: GameMark = humanMark, nextDifficulty: BotDifficulty = difficulty) => {
    setHumanMark(nextHumanMark);
    setDifficulty(nextDifficulty);
    setBoard(Array(9).fill('') as CellValue[]);
    setCurrentTurn('X');
    setBotThinking(false);
  };

  let statusHeadline = '';
  let statusDetail = '';
  let statusTone = 'border-slate-900 bg-white text-slate-900';

  if (evaluation.isFinished) {
    if (evaluation.winner === 'draw') {
      statusHeadline = "It's a tie!";
      statusDetail = `${DIFFICULTY_LABELS[difficulty]} Bot · Unranked solo practice`;
      statusTone = 'border-slate-900 bg-amber-100 text-slate-900';
    } else if (evaluation.winner === humanMark) {
      statusHeadline = 'Victory! You outplayed the bot';
      statusDetail = `Three in a row against ${DIFFICULTY_LABELS[difficulty]} Bot`;
      statusTone = 'border-slate-900 bg-emerald-100 text-emerald-950';
    } else {
      statusHeadline = `${DIFFICULTY_LABELS[difficulty]} Bot won!`;
      statusDetail = 'Three in a row · Rematch or swap sides';
      statusTone = 'border-slate-900 bg-rose-100 text-rose-950';
    }
  } else if (isHumanTurn) {
    statusHeadline = `Your move! Place ${humanMark}`;
    statusDetail = `Move ${moveCount + 1} of 9 · ${DIFFICULTY_LABELS[difficulty]} Bot`;
    statusTone =
      humanMark === 'X'
        ? 'border-slate-900 bg-rose-50 text-rose-950'
        : 'border-slate-900 bg-sky-50 text-sky-950';
  } else {
    statusHeadline = `${DIFFICULTY_LABELS[difficulty]} Bot is thinking...`;
    statusDetail = `Bot plays ${botMark} · Move ${moveCount + 1} of 9`;
    statusTone = 'border-slate-900 bg-white text-slate-900';
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
            Solo Practice <span aria-hidden="true" className="mx-1.5">·</span> Unranked
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

      {/* Main Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
          <div className={`rounded-xl border-2 px-4 py-3 mb-6 ${statusTone}`}>
            <p className="font-display text-lg font-bold">{statusHeadline}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{statusDetail}</p>
          </div>

          <div
            className="max-w-sm mx-auto bg-amber-100/80 border-2 border-slate-900 rounded-2xl p-3.5 grid grid-cols-3 gap-3 shadow-[0_5px_0_0_#0F172A]"
            role="grid"
            aria-label="Solo Bot Tic-Tac-Toe Board"
          >
            {board.map((cell, idx) => {
              const isWinningCell = evaluation.winningLine.includes(idx);
              const canPlace = isHumanTurn && !botThinking && cell === '';
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
                      <MarkSvg mark={humanMark} muted />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-7 pt-5 border-t-2 border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => resetMatch(humanMark, difficulty)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {evaluation.isFinished ? 'Play Again' : 'Restart Board'}
            </button>

            <button
              type="button"
              onClick={() => resetMatch(humanMark === 'X' ? 'O' : 'X', difficulty)}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 shadow-[0_3px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
            >
              Swap Sides (Play as {humanMark === 'X' ? 'O' : 'X'})
            </button>
          </div>
        </div>

        {/* Right Column: Matchup, Difficulty, Session Score */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A] space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">Matchup</h2>

            {/* Human */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                isHumanTurn
                  ? 'border-slate-900 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarBadge avatarId={playerAvatar} name={playerName} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{playerName}</p>
                  <p className="text-xs text-slate-500">
                    {humanMark === 'X' ? 'Plays first' : 'Plays second'}
                  </p>
                </div>
              </div>
              <span
                className={`font-display text-2xl font-bold shrink-0 ${
                  humanMark === 'X' ? 'text-rose-500' : 'text-blue-600'
                }`}
              >
                {humanMark}
              </span>
            </div>

            {/* Bot */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
                isBotTurn
                  ? 'border-slate-900 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {DIFFICULTY_LABELS[difficulty]} Bot
                  </p>
                  <p className="text-xs text-slate-500">
                    {botMark === 'X' ? 'Plays first' : 'Plays second'}
                  </p>
                </div>
              </div>
              <span
                className={`font-display text-2xl font-bold shrink-0 ${
                  botMark === 'X' ? 'text-rose-500' : 'text-blue-600'
                }`}
              >
                {botMark}
              </span>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A] space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900">Bot Difficulty</h3>
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 border-2 border-slate-900/10 rounded-xl">
              {(['casual', 'tactical', 'unbeatable'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => resetMatch(humanMark, level)}
                  className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    difficulty === level
                      ? 'bg-amber-300 text-slate-900 border border-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t-2 border-slate-100 grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-slate-900/15">
                <p className="text-xs font-semibold text-slate-600">Wins</p>
                <p className="font-display text-xl font-bold text-emerald-700 tabular-nums">
                  {sessionStats.wins}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-slate-900/15">
                <p className="text-xs font-semibold text-slate-600">Draws</p>
                <p className="font-display text-xl font-bold text-slate-700 tabular-nums">
                  {sessionStats.draws}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-slate-900/15">
                <p className="text-xs font-semibold text-slate-600">Losses</p>
                <p className="font-display text-xl font-bold text-rose-700 tabular-nums">
                  {sessionStats.losses}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
