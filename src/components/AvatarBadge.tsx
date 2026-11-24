import {
  Crown,
  Flame,
  Ghost,
  Shield,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { AvatarId, BannerThemeId, EmblemIconId } from '../types/game';

interface AvatarMeta {
  bg: string;
  fg: string;
  label: string;
}

export const AVATAR_STYLES: Record<AvatarId, AvatarMeta> = {
  coral: { bg: 'bg-rose-600', fg: 'text-white', label: 'Crimson' },
  cobalt: { bg: 'bg-blue-600', fg: 'text-white', label: 'Cobalt' },
  emerald: { bg: 'bg-emerald-600', fg: 'text-white', label: 'Emerald' },
  amber: { bg: 'bg-amber-600', fg: 'text-white', label: 'Amber' },
  slate: { bg: 'bg-slate-800', fg: 'text-white', label: 'Obsidian' },
  plum: { bg: 'bg-indigo-700', fg: 'text-white', label: 'Indigo' },
};

export const EMBLEM_LABELS: Record<EmblemIconId, string> = {
  letter: 'Initial',
  crown: 'Crown',
  flame: 'Flame',
  star: 'Star',
  zap: 'Bolt',
  shield: 'Shield',
  sparkles: 'Sparkles',
  ghost: 'Ghost',
};

interface BannerThemeMeta {
  label: string;
  cardBg: string;
  swatchBg: string;
  text: string;
  subText: string;
  badgeBg: string;
  badgeText: string;
}

export const BANNER_THEME_STYLES: Record<BannerThemeId, BannerThemeMeta> = {
  classic: {
    label: 'Classic Cream',
    cardBg: 'bg-white',
    swatchBg: 'bg-amber-50',
    text: 'text-slate-900',
    subText: 'text-slate-500',
    badgeBg: 'bg-amber-200',
    badgeText: 'text-slate-900',
  },
  amber: {
    label: 'Golden Sun',
    cardBg: 'bg-amber-100',
    swatchBg: 'bg-amber-300',
    text: 'text-slate-900',
    subText: 'text-slate-700',
    badgeBg: 'bg-white',
    badgeText: 'text-slate-900',
  },
  sky: {
    label: 'Arcade Sky',
    cardBg: 'bg-sky-100',
    swatchBg: 'bg-sky-300',
    text: 'text-slate-900',
    subText: 'text-slate-700',
    badgeBg: 'bg-white',
    badgeText: 'text-blue-700',
  },
  rose: {
    label: 'Coral Punch',
    cardBg: 'bg-rose-100',
    swatchBg: 'bg-rose-300',
    text: 'text-slate-900',
    subText: 'text-rose-900/75',
    badgeBg: 'bg-white',
    badgeText: 'text-rose-700',
  },
  emerald: {
    label: 'Mint Arena',
    cardBg: 'bg-emerald-100',
    swatchBg: 'bg-emerald-300',
    text: 'text-slate-900',
    subText: 'text-emerald-950/75',
    badgeBg: 'bg-white',
    badgeText: 'text-emerald-800',
  },
  slate: {
    label: 'Midnight Ink',
    cardBg: 'bg-slate-900',
    swatchBg: 'bg-slate-800',
    text: 'text-white',
    subText: 'text-slate-300',
    badgeBg: 'bg-amber-300',
    badgeText: 'text-slate-900',
  },
};

interface AvatarBadgeProps {
  avatarId: AvatarId | '';
  name: string;
  size?: 'sm' | 'md' | 'lg';
  emblemIcon?: EmblemIconId;
}

export function EmblemGlyph({
  emblemIcon = 'letter',
  initial,
  className = 'w-4 h-4',
}: {
  emblemIcon?: EmblemIconId;
  initial: string;
  className?: string;
}) {
  switch (emblemIcon) {
    case 'crown':
      return <Crown className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'ghost':
      return <Ghost className={className} />;
    case 'letter':
    default:
      return <span>{initial}</span>;
  }
}

export function AvatarBadge({
  avatarId,
  name,
  size = 'md',
  emblemIcon = 'letter',
}: AvatarBadgeProps) {
  const style = AVATAR_STYLES[(avatarId || 'slate') as AvatarId] ?? AVATAR_STYLES.slate;
  const initial = (name.trim()[0] || '?').toUpperCase();

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 text-xs rounded-lg'
      : size === 'lg'
        ? 'w-14 h-14 text-xl rounded-xl'
        : 'w-10 h-10 text-sm rounded-lg';

  const iconClasses =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div
      className={`${sizeClasses} ${style.bg} ${style.fg} font-display font-bold flex items-center justify-center shrink-0 select-none`}
      aria-hidden="true"
    >
      <EmblemGlyph emblemIcon={emblemIcon} initial={initial} className={iconClasses} />
    </div>
  );
}
