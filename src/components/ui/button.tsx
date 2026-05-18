import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'default' | 'lg' | 'sm';
  asChild?: boolean;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
  const Comp = asChild ? 'span' : 'button';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
    outline: 'border border-primary-600 hover:bg-primary-50 text-primary-600 hover:text-primary-700',
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2 rounded-md font-medium',
    lg: 'h-12 px-6 py-3 rounded-md font-medium text-lg',
    sm: 'h-8 px-3 rounded-md font-medium text-sm',
  };
  
  return (
    <Comp
      className={cn(
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';