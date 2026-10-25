import React, { ButtonHTMLAttributes, ReactNode } from 'react';

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
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[48px] select-none';

  const variants = {
    primary:
      'bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white shadow-sm border border-transparent font-semibold',
    secondary:
      'bg-white hover:bg-sahaaya-cream text-sahaaya-text border-2 border-sahaaya-border font-semibold',
    accent:
      'bg-sahaaya-accent hover:bg-sahaaya-primary text-white shadow-sm font-semibold',
    danger:
      'bg-sahaaya-alert hover:bg-red-800 text-white font-semibold',
    ghost:
      'bg-transparent hover:bg-sahaaya-cream text-sahaaya-text border border-transparent',
  };

  const sizes = {
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-3 min-h-[52px]',
    xl: 'px-8 py-5 text-xl gap-4 min-h-[64px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
