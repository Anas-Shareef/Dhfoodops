import React from 'react';
import { cn } from '@/lib/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'attending' | 'not_attending' | 'no_response';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const variantClasses = {
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    info: 'bg-sky-50 text-sky-800 border border-sky-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    attending: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
    not_attending: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold',
    no_response: 'bg-slate-100 text-slate-600 border border-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full transition-colors whitespace-nowrap',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
