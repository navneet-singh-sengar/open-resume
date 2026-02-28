import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  onRemove?: () => void;
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
};

export function Badge({ children, variant = 'default', onRemove }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-red-500 transition-colors">&times;</button>
      )}
    </span>
  );
}
