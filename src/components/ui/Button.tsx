import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { triggerHapticFeedback } from '../../utils/communication';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-emerald-700/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer';

  const variants = {
    primary:
      'bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white shadow-md border-2 border-emerald-900/30 font-black',
    secondary:
      'bg-white hover:bg-emerald-50 text-emerald-950 border-2 border-emerald-800/40 font-bold shadow-sm',
    accent:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-md font-black border-2 border-amber-700/30',
    danger:
      'bg-rose-700 hover:bg-rose-800 text-white shadow-md font-black border-2 border-rose-900/30',
    ghost:
      'bg-transparent hover:bg-emerald-100/60 text-emerald-950 border-2 border-transparent font-bold',
  };

  const sizes = {
    md: 'px-5 py-3 text-lg gap-2.5 min-h-[50px]',
    lg: 'px-6 py-3.5 text-xl gap-3 min-h-[58px]',
    xl: 'px-8 py-4.5 text-2xl gap-4 min-h-[68px]',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHapticFeedback(30);
    if (onClick) onClick(e);
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
