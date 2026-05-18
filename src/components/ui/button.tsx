import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'aurora' | 'glass' | 'ghost';
  size?: 'default' | 'lg' | 'sm' | 'xs';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'span' : 'button';

    const variants: Record<string, string> = {
      primary:   'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
      secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
      outline:   'border border-primary-600 hover:bg-primary-50 text-primary-600 hover:text-primary-700',
      aurora:    'bg-gradient-to-r from-[#0047FF] to-[#00F0FF] text-white shadow-lg shadow-[#0047FF]/30 hover:opacity-90 transition-all',
      glass:     'border border-white/10 bg-white/5 backdrop-blur-md text-white hover:border-white/20 hover:bg-white/10 transition-all',
      ghost:     'border border-white/15 text-white/80 hover:border-white/30 hover:bg-white/5 hover:text-white transition-all',
    };

    const sizes: Record<string, string> = {
      xs:      'h-7 px-3 rounded-lg font-medium text-xs',
      sm:      'h-8 px-3 rounded-lg font-medium text-sm',
      default: 'h-10 px-4 py-2 rounded-xl font-medium',
      lg:      'h-12 px-6 py-3 rounded-xl font-semibold text-base',
    };

    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
