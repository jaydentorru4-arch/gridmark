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
        className={`w-11 h-11 sm:w-14 sm:h-14 ${muted ? 'text-rose-600 opacity-25' : 'text-rose-600 animate-mark'}`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M16 16L48 48M48 16L16 48"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={`w-11 h-11 sm:w-14 sm:h-14 ${muted ? 'text-blue-600 opacity-25' : 'text-blue-600 animate-mark'}`}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth="7" />
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
  let statusTone = 'border-slate-200 bg-white text-slate-900';

  if (evaluation.isFinished) {
    if (evaluation.winner === 'draw') {
      statusHeadline = 'Match ended in a draw';
      statusDetail = `${DIFFICULTY_LABELS[difficulty]} Bot · Unranked solo practice`;
      statusTone = 'border-slate-300 bg-slate-50 text-slate-900';
    } else if (evaluation.winner === humanMark) {
      statusHeadline = 'Victory · You beat the bot';
      statusDetail = `Three in a row against ${DIFFICULTY_LABELS[difficulty]} Bot`;
      statusTone = 'border-emerald-300 bg-emerald-50 text-emerald-950';
    } else {
      statusHeadline = `${DIFFICULTY_LABELS[difficulty]} Bot won`;
      statusDetail = 'Three in a row · Try another round or switch sides';
      statusTone = 'border-rose-200 bg-rose-50 text-rose-950';
    }
  } else if (isHumanTurn) {
    statusHeadline = `Your turn · Place ${humanMark}`;
    statusDetail = `Move ${moveCount + 1} of 9 · ${DIFFICULTY_LABELS[difficulty]} Bot`;
    statusTone =
      humanMark === 'X'
        ? 'border-rose-300 bg-rose-50 text-rose-950'
        : 'border-blue-300 bg-blue-50 text-blue-950';
  } else {
    statusHeadline = `${DIFFICULTY_LABELS[difficulty]} Bot is thinking...`;
    statusDetail = `Bot plays ${botMark} · Move ${moveCount + 1} of 9`;
    statusTone = 'border-slate-200 bg-white text-slate-900';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Solo Practice <span aria-hidden="true" className="mx-1.5">·</span> Unranked
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className={`rounded-lg border px-4 py-3 mb-6 ${statusTone}`}>
            <p className="font-display text-base font-bold">{statusHeadline}</p>
            <p className="text-xs opacity-80 mt-0.5">{statusDetail}</p>
          </div>

          <div
            className="max-w-sm mx-auto bg-slate-100 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2.5"
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
                  className={`group aspect-square min-h-[88px] sm:min-h-[108px] rounded-lg border flex items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    isWinningCell
                      ? 'bg-emerald-50 border-emerald-400'
                      : cell !== ''
                        ? 'bg-white border-slate-200'
                        : canPlace
                          ? 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                          : 'bg-white/80 border-slate-200 cursor-default'
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

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => resetMatch(humanMark, difficulty)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {evaluation.isFinished ? 'Play Again' : 'Restart Board'}
            </button>

            <button
              type="button"
              onClick={() => resetMatch(humanMark === 'X' ? 'O' : 'X', difficulty)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Swap Sides (Play as {humanMark === 'X' ? 'O' : 'X'})
            </button>
          </div>
        </div>

        {/* Right Column: Matchup, Difficulty, Session Score */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">Matchup</h2>

            {/* Human */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border ${
                isHumanTurn
                  ? humanMark === 'X'
                    ? 'border-rose-300 bg-rose-50/60'
                    : 'border-blue-300 bg-blue-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarBadge avatarId={playerAvatar} name={playerName} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{playerName}</p>
                  <p className="text-xs text-slate-500">
                    {humanMark === 'X' ? 'Plays first' : 'Plays second'}
                  </p>
                </div>
              </div>
              <span
                className={`font-display text-xl font-bold shrink-0 ${
                  humanMark === 'X' ? 'text-rose-600' : 'text-blue-600'
                }`}
              >
                {humanMark}
              </span>
            </div>

            {/* Bot */}
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border ${
                isBotTurn
                  ? botMark === 'X'
                    ? 'border-rose-300 bg-rose-50/60'
                    : 'border-blue-300 bg-blue-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {DIFFICULTY_LABELS[difficulty]} Bot
                  </p>
                  <p className="text-xs text-slate-500">
                    {botMark === 'X' ? 'Plays first' : 'Plays second'}
                  </p>
                </div>
              </div>
              <span
                className={`font-display text-xl font-bold shrink-0 ${
                  botMark === 'X' ? 'text-rose-600' : 'text-blue-600'
                }`}
              >
                {botMark}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900">Bot Difficulty</h3>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(['casual', 'tactical', 'unbeatable'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => resetMatch(humanMark, level)}
                  className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                    difficulty === level
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Wins</p>
                <p className="font-display text-lg font-bold text-emerald-700 tabular-nums">
                  {sessionStats.wins}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Draws</p>
                <p className="font-display text-lg font-bold text-slate-700 tabular-nums">
                  {sessionStats.draws}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Losses</p>
                <p className="font-display text-lg font-bold text-rose-700 tabular-nums">
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
