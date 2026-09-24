import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base font-bold rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.99] border border-slate-900',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.99] border border-slate-200',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs active:scale-[0.99]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.99] border border-rose-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.99] border border-emerald-600',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
