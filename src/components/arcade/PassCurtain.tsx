import { Eye, ShieldCheck } from 'lucide-react';

interface PassCurtainProps {
  nextPlayerName: string;
  subtitle?: string;
  onReveal: () => void;
}

export function PassCurtain({
  nextPlayerName,
  subtitle = 'Make sure the other player is not peeking at the screen.',
  onReveal,
}: PassCurtainProps) {
  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 sm:p-10 shadow-[0_5px_0_0_#0F172A] text-center max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 flex items-center justify-center mx-auto">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-slate-900">
        Pass Device to {nextPlayerName}
      </h2>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        {subtitle}
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
      >
        <Eye className="w-4 h-4" />
        I am {nextPlayerName} — Reveal Turn
      </button>
    </div>
  );
}
