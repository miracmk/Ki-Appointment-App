import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: 'cyan' | 'purple' | 'blue' | 'none';
  className?: string;
}

const sizeMap = {
  sm:  'h-9 w-9 text-sm',
  md:  'h-12 w-12 text-base',
  lg:  'h-16 w-16 text-xl',
  xl:  'h-24 w-24 text-3xl',
};

const ringMap = {
  cyan:   'ring-2 ring-[#00F0FF]/50',
  purple: 'ring-2 ring-[#B000FF]/50',
  blue:   'ring-2 ring-[#0047FF]/50',
  none:   '',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function stringToColor(str: string): string {
  const colors = [
    'from-[#0047FF] to-[#00F0FF]',
    'from-[#B000FF] to-[#0047FF]',
    'from-[#00F0FF] to-[#B000FF]',
    'from-[#FF006E] to-[#B000FF]',
    'from-[#0047FF] to-[#B000FF]',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name, size = 'md', ring = 'none', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizeMap[size],
        ringMap[ring],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white', stringToColor(name))}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
