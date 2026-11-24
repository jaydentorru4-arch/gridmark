import { useMemo, useState } from 'react';
import { RotateCw, Shuffle, Target, Trash2 } from 'lucide-react';
import {
  BS_SIZE,
  SHIP_SPECS,
  canPlaceShip,
  fireBattleshipShot,
  generateRandomFleet,
  isShipSunk,
  lockBattleshipFleet,
  type BattleshipState,
  type PlacedShip,
  type ShipId,
} from '../../games/engines/battleshipEngine';
import type { ArcadeGameProps } from '../../types/arcade';
import { PassCurtain } from './PassCurtain';

const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function BattleshipBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<BattleshipState>) {
  // Pass & Play active viewpoint + curtain
  const [localActivePlayer, setLocalActivePlayer] = useState<'1' | '2'>('1');
  const [curtainOpen, setCurtainOpen] = useState<boolean>(mode === 'local');

  // Setup draft state
  const [draftShips, setDraftShips] = useState<PlacedShip[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<ShipId>('carrier');
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [hoverStart, setHoverStart] = useState<number | null>(null);
  const [setupError, setSetupError] = useState('');

  const activeSide: '1' | '2' =
    mode === 'local'
      ? state.phase === 'setup'
        ? !state.p1Ready
          ? '1'
          : '2'
        : state.turn
      : viewerUid === player2.uid
        ? '2'
        : '1';

  const activePlayerName = activeSide === '1' ? player1.name : player2.name;

  // In Pass & Play, show privacy curtain when player switches
  if (mode === 'local' && !isFinished && curtainOpen) {
    return (
      <PassCurtain
        nextPlayerName={activePlayerName}
        subtitle={
          state.phase === 'setup'
            ? 'Position your secret fleet without your opponent looking.'
            : 'Take your turn on the Radar without revealing your fleet!'
        }
        onReveal={() => {
          setLocalActivePlayer(activeSide);
          setCurtainOpen(false);
        }}
      />
    );
  }

  const me: '1' | '2' = mode === 'local' ? localActivePlayer : activeSide;
  const myReady = me === '1' ? state.p1Ready : state.p2Ready;

  // ---------------------------------------------------------
  // PHASE 1: FLEET PLACEMENT SETUP
  // ---------------------------------------------------------
  if (state.phase === 'setup') {
    if (myReady) {
      return (
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_5px_0_0_#0F172A] text-center max-w-lg mx-auto">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Your Fleet is Locked In!
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Waiting for {me === '1' ? player2.name : player1.name} to finish positioning their ships...
          </p>
        </div>
      );
    }

    const activeSpec = SHIP_SPECS.find((s) => s.id === selectedShipId) || SHIP_SPECS[0];
    const previewCells =
      hoverStart !== null
        ? canPlaceShip(draftShips, activeSpec.id, hoverStart, activeSpec.size, orientation)
        : null;

    const occupiedMap = new Map<number, ShipId>();
    for (const ship of draftShips) {
      for (const c of ship.cells) occupiedMap.set(c, ship.id);
    }

    const handlePlaceCell = (idx: number) => {
      setSetupError('');
      const cells = canPlaceShip(draftShips, activeSpec.id, idx, activeSpec.size, orientation);
      if (!cells) {
        setSetupError('Ship cannot go off the board or overlap another ship.');
        return;
      }
      const nextShips = [
        ...draftShips.filter((s) => s.id !== activeSpec.id),
        { id: activeSpec.id, name: activeSpec.name, size: activeSpec.size, cells },
      ];
      setDraftShips(nextShips);
      // Auto-advance to next unplaced ship
      const nextUnplaced = SHIP_SPECS.find(
        (sp) => !nextShips.some((placed) => placed.id === sp.id),
      );
      if (nextUnplaced) setSelectedShipId(nextUnplaced.id);
    };

    const handleLockFleet = async () => {
      setSetupError('');
      try {
        const nextState = lockBattleshipFleet(state, me, draftShips);
        setDraftShips([]);
        setSelectedShipId('carrier');
        if (mode === 'local') {
          setCurtainOpen(true);
        }
        await onCommitState({
          nextState,
          nextTurnUid: nextState.phase === 'playing' ? player1.uid : '',
        });
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : 'Unable to lock fleet.');
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A] space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {activePlayerName}: Deploy Fleet
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Select a ship below, rotate H/V, and click your 10x10 ocean grid to position all 5 ships.
            </p>
          </div>

          <div className="space-y-2">
            {SHIP_SPECS.map((spec) => {
              const placed = draftShips.find((s) => s.id === spec.id);
              const isSel = selectedShipId === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setSelectedShipId(spec.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold cursor-pointer transition-colors ${
                    isSel ? 'bg-amber-300 text-slate-900' : placed ? 'bg-emerald-50 text-emerald-900' : 'bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    {spec.name} ({spec.size})
                  </span>
                  <span>{placed ? 'Placed ✓' : 'Unplaced'}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'H' ? 'V' : 'H'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 hover:bg-amber-50 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Orientation: {orientation === 'H' ? 'Horizontal' : 'Vertical'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupError('');
                setDraftShips(generateRandomFleet());
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-sky-100 text-xs font-bold text-slate-900 hover:bg-sky-200 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Randomize
            </button>
            <button
              type="button"
              onClick={() => setDraftShips([])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {setupError && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2">
              {setupError}
            </p>
          )}

          <button
            type="button"
            disabled={draftShips.length !== SHIP_SPECS.length || busy}
            onClick={() => void handleLockFleet()}
            className="w-full py-3 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
          >
            Lock In Fleet ({draftShips.length}/{SHIP_SPECS.length})
          </button>
        </div>

        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A]">
          <BattleshipPlacementGrid
            occupiedMap={occupiedMap}
            previewCells={previewCells}
            onHover={setHoverStart}
            onSelect={handlePlaceCell}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // PHASE 2 & 3: BATTLE RADAR + OWN FLEET
  // ---------------------------------------------------------
  const myShips = me === '1' ? state.p1Ships : state.p2Ships;
  const enemyShips = me === '1' ? state.p2Ships : state.p1Ships;
  const myShots = me === '1' ? state.p1Shots : state.p2Shots; // shots I fired at enemy
  const incomingShots = me === '1' ? state.p2Shots : state.p1Shots; // enemy shots at me

  const myShipCellSet = useMemo(() => {
    const s = new Set<number>();
    for (const ship of myShips) for (const c of ship.cells) s.add(c);
    return s;
  }, [myShips]);

  const canFire = !isFinished && !busy && state.turn === me;

  const handleFire = async (idx: number) => {
    if (!canFire || myShots[idx] !== '') return;
    const nextState = fireBattleshipShot(state, me, idx);
    const nextTurnUid = nextState.turn === '1' ? player1.uid : player2.uid;
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === '1' ? player1.uid : nextState.winner === '2' ? player2.uid : '';

    if (mode === 'local' && !finished) {
      setCurtainOpen(true);
    }

    await onCommitState({
      nextState,
      nextTurnUid,
      finished,
      winnerUid,
      resultSummary: nextState.lastAction,
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-sky-50 border-2 border-slate-900 rounded-2xl px-5 py-3.5 shadow-[0_3px_0_0_#0F172A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Target className="w-4 h-4 text-blue-600" />
          <span>{state.lastAction}</span>
        </div>
        {!isFinished && (
          <span className="text-xs font-bold text-slate-700">
            {canFire ? 'Your turn to fire!' : `Waiting for ${state.turn === '1' ? player1.name : player2.name}...`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack Radar (Opponent's Waters) */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-5 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-slate-900">
              Attack Radar (Enemy Waters)
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
              {enemyShips.filter((s) => !isShipSunk(s, myShots)).length}/5 afloat
            </span>
          </div>

          <div className="grid grid-cols-11 gap-1 max-w-[420px] mx-auto select-none">
            <div />
            {COL_LABELS.map((c) => (
              <div key={c} className="text-center text-[10px] font-mono font-bold text-slate-500 py-0.5">
                {c}
              </div>
            ))}
            {ROW_LABELS.map((rLabel, r) => (
              <FragmentRow
                key={rLabel}
                rLabel={rLabel}
                rowIndex={r}
                shots={myShots}
                interactive={canFire}
                onClickCell={(idx) => void handleFire(idx)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {enemyShips.map((s) => {
              const sunk = isShipSunk(s, myShots);
              return (
                <span
                  key={s.id}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                    sunk
                      ? 'border-rose-300 bg-rose-50 text-rose-700 line-through'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  {s.name} ({s.size})
                </span>
              );
            })}
          </div>
        </div>

        {/* Own Fleet Grid */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-5 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-slate-900">
              Your Fleet ({activePlayerName})
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
              {myShips.filter((s) => !isShipSunk(s, incomingShots)).length}/5 afloat
            </span>
          </div>

          <div className="grid grid-cols-11 gap-1 max-w-[420px] mx-auto select-none">
            <div />
            {COL_LABELS.map((c) => (
              <div key={c} className="text-center text-[10px] font-mono font-bold text-slate-500 py-0.5">
                {c}
              </div>
            ))}
            {ROW_LABELS.map((rLabel, r) => (
              <FragmentRow
                key={rLabel}
                rLabel={rLabel}
                rowIndex={r}
                shots={incomingShots}
                shipCells={myShipCellSet}
                interactive={false}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {myShips.map((s) => {
              const sunk = isShipSunk(s, incomingShots);
              return (
                <span
                  key={s.id}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                    sunk
                      ? 'border-rose-300 bg-rose-50 text-rose-700 line-through'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {s.name} ({s.size})
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BattleshipPlacementGrid({
  occupiedMap,
  previewCells,
  onHover,
  onSelect,
}: {
  occupiedMap: Map<number, ShipId>;
  previewCells: number[] | null;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
}) {
  const previewSet = new Set(previewCells || []);
  return (
    <div
      className="grid grid-cols-11 gap-1 max-w-[430px] mx-auto select-none"
      onMouseLeave={() => onHover(null)}
    >
      <div />
      {COL_LABELS.map((c) => (
        <div key={c} className="text-center text-[10px] font-mono font-bold text-slate-500 py-0.5">
          {c}
        </div>
      ))}
      {ROW_LABELS.map((rLabel, r) => (
        <RowPlacement
          key={rLabel}
          rLabel={rLabel}
          r={r}
          occupiedMap={occupiedMap}
          previewSet={previewSet}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function RowPlacement({
  rLabel,
  r,
  occupiedMap,
  previewSet,
  onHover,
  onSelect,
}: {
  rLabel: string;
  r: number;
  occupiedMap: Map<number, ShipId>;
  previewSet: Set<number>;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center text-[10px] font-mono font-bold text-slate-500">
        {rLabel}
      </div>
      {Array.from({ length: BS_SIZE }, (_, c) => {
        const idx = r * BS_SIZE + c;
        const isShip = occupiedMap.has(idx);
        const isPreview = previewSet.has(idx);
        return (
          <button
            key={idx}
            type="button"
            onMouseEnter={() => onHover(idx)}
            onClick={() => onSelect(idx)}
            aria-label={`Place at ${rLabel}${c + 1}`}
            className={`aspect-square rounded border border-slate-900/30 transition-colors cursor-pointer ${
              isPreview
                ? 'bg-amber-300 border-slate-900'
                : isShip
                  ? 'bg-slate-800 border-slate-900'
                  : 'bg-sky-100 hover:bg-sky-200'
            }`}
          />
        );
      })}
    </>
  );
}

function FragmentRow({
  rLabel,
  rowIndex,
  shots,
  shipCells,
  interactive,
  onClickCell,
}: {
  rLabel: string;
  rowIndex: number;
  shots: ('miss' | 'hit' | '')[];
  shipCells?: Set<number>;
  interactive: boolean;
  onClickCell?: (idx: number) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center text-[10px] font-mono font-bold text-slate-500">
        {rLabel}
      </div>
      {Array.from({ length: BS_SIZE }, (_, c) => {
        const idx = rowIndex * BS_SIZE + c;
        const shot = shots[idx];
        const hasShip = shipCells?.has(idx) ?? false;
        const clickable = interactive && shot === '';

        let bg = hasShip ? 'bg-slate-700' : 'bg-sky-100';
        if (shot === 'hit') bg = 'bg-rose-500';
        else if (shot === 'miss') bg = hasShip ? 'bg-slate-700' : 'bg-slate-200';

        return (
          <button
            key={idx}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onClickCell?.(idx)}
            aria-label={`Coordinate ${rLabel}${c + 1}`}
            className={`aspect-square rounded border border-slate-900/30 flex items-center justify-center ${bg} ${
              clickable ? 'hover:bg-amber-200 cursor-pointer' : 'cursor-default'
            }`}
          >
            {shot === 'hit' && <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-900" />}
            {shot === 'miss' && <span className="w-2 h-2 rounded-full bg-slate-500" />}
          </button>
        );
      })}
    </>
  );
}
