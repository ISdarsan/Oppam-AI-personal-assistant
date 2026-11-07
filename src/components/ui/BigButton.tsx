import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { triggerHapticFeedback } from '../../utils/communication';

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'forest' | 'coral' | 'sos' | 'outline' | 'quiet';
  icon?: ReactNode;
  loading?: boolean;
  full?: boolean;
}

const variants = {
  forest: 'bg-brand-forest text-white hover:bg-brand-forestDark border-2 border-brand-forest shadow-sm',
  coral: 'bg-brand-coral text-white hover:bg-brand-coralDark border-2 border-brand-coral shadow-sm',
  sos: 'bg-brand-sos text-white hover:bg-red-900 border-2 border-brand-sos shadow-sm',
  outline: 'bg-white text-brand-forest hover:bg-brand-sage border-2 border-brand-forest',
  quiet: 'bg-transparent text-brand-forest hover:bg-brand-sage border-2 border-transparent',
};

/** Large, labelled button (min 56px high) used for every primary action in the app. */
export const BigButton: React.FC<BigButtonProps> = ({
  children,
  variant = 'forest',
  icon,
  loading = false,
  full = false,
  className = '',
  disabled,
  onClick,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    onClick={(e) => {
      triggerHapticFeedback(25);
      onClick?.(e);
    }}
    className={`inline-flex items-center justify-center gap-3 rounded-2xl px-6 min-h-[56px] py-3 text-lg font-bold leading-snug transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-coral cursor-pointer ${
      variants[variant]
    } ${full ? 'w-full' : ''} ${className}`}
    {...props}
  >
    {loading ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /> : icon}
    <span>{children}</span>
  </button>
);
