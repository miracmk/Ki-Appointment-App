import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: 'cyan' | 'blue' | 'purple' | 'none';
}

export function GlassCard({ className, hover = false, glow = 'none', children, ...props }: GlassCardProps) {
  const glowMap = {
    cyan:   'hover:shadow-glow-cyan',
    blue:   'hover:shadow-glow-blue',
    purple: 'hover:shadow-glow-purple',
    none:   '',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md',
        'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/8',
        glow !== 'none' && glowMap[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
