import type { AvatarId } from '../types/game';

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

interface AvatarBadgeProps {
  avatarId: AvatarId | '';
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarBadge({ avatarId, name, size = 'md' }: AvatarBadgeProps) {
  const style = AVATAR_STYLES[(avatarId || 'slate') as AvatarId] ?? AVATAR_STYLES.slate;
  const initial = (name.trim()[0] || '?').toUpperCase();

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 text-xs rounded-lg'
      : size === 'lg'
        ? 'w-14 h-14 text-xl rounded-xl'
        : 'w-10 h-10 text-sm rounded-lg';

  return (
    <div
      className={`${sizeClasses} ${style.bg} ${style.fg} font-display font-bold flex items-center justify-center shrink-0 select-none`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
