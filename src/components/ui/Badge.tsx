import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', icon }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold',
    warning: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    danger: 'bg-rose-100 text-rose-950 border-rose-400 font-black',
    info: 'bg-sky-100 text-sky-950 border-sky-400 font-bold',
    neutral: 'bg-stone-100 text-stone-900 border-stone-300 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-base border-2 shadow-xs ${styles[variant]}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
