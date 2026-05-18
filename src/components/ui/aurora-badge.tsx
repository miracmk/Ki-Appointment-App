import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeColor = 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'orange' | 'glass';

interface AuroraBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

const colorMap: Record<BadgeColor, string> = {
  cyan:   'border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF]',
  blue:   'border-[#0047FF]/30 bg-[#0047FF]/10 text-[#6B9FFF]',
  purple: 'border-[#B000FF]/30 bg-[#B000FF]/10 text-[#D066FF]',
  pink:   'border-[#FF006E]/30 bg-[#FF006E]/10 text-[#FF5599]',
  green:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  glass:  'border-white/15 bg-white/5 text-white/70',
};

export function AuroraBadge({ className, color = 'cyan', children, ...props }: AuroraBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        colorMap[color],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
